import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState,
  VoiceConnection,
} from '@discordjs/voice';
import { discord, redis } from './client.js';
import { env } from './config.js';
import { registerCommands, commands } from './commands/index.js';
import { getAllTimers, deleteTimer } from './services/timer.service.js';
import { Interaction, MessageFlags } from 'discord.js';
import { Readable } from 'stream';
import path from 'path';

const DEFAULT_SOUND_NAME = 'Miau timer sound';

export const voiceConnections = new Map<string, VoiceConnection>();

export async function checkAndDisconnect(guildId: string) {
  const timers = await getAllTimers(guildId);
  const activeVoiceTimers = timers.filter((timer) => timer.joinChannel);

  if (activeVoiceTimers.length === 0) {
    const connection = voiceConnections.get(guildId);
    if (connection) {
      connection.destroy();
      voiceConnections.delete(guildId);
      console.log(`Disconnected from voice channel in guild ${guildId}`);
    }
  }
}

discord.on('ready', async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  await registerCommands(client.user.id);
});

discord.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

  const command = commands.find(
    (c) => c.data.name === interaction.commandName,
  );

  if (!command) return;

  if (interaction.isAutocomplete()) {
    if ('autocomplete' in command && typeof command.autocomplete === 'function') {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    }
  } else if (interaction.isCommand()) {
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
      }
    }
  }
});

async function checkTimers() {
  const guilds = discord.guilds.cache;

  for (const guild of guilds.values()) {
    const timers = await getAllTimers(guild.id);

    for (const timer of timers) {
      if (Date.now() >= timer.endTime) {
        await deleteTimer(timer.guildId, timer.id);

        try {
          const channel = await guild.channels.fetch(timer.channelId);
          if (!channel || !channel.isTextBased()) continue;

          const finishedMessage = `<@${timer.userId}> Timer **${timer.id}** has finished!`;

          try {
            const originalMessage = await channel.messages.fetch(timer.messageId);
            await originalMessage.edit(finishedMessage);
          } catch (editError) {
            console.error(`Failed to edit original message for timer ${timer.id}:`, editError);
            await channel.send(finishedMessage);
          }

          if (timer.sound) {
            const connection = voiceConnections.get(timer.guildId);
            if (connection) {
              const player = createAudioPlayer();
              connection.subscribe(player);

              let resource;

              if (timer.sound === DEFAULT_SOUND_NAME) {
                const filePath = path.resolve(process.cwd(), 'dist/assets/default_sound.ogg');
                resource = createAudioResource(filePath, { inlineVolume: true });
              } else {
                const sounds = await guild.soundboardSounds.fetch();
                const soundToPlay = sounds.find(s => s.name === timer.sound);
                if (soundToPlay) {
                  const response = await fetch(soundToPlay.url);
                  if (response.body) {
                    resource = createAudioResource(Readable.fromWeb(response.body as any), { inlineVolume: true });
                  }
                }
              }

              if (resource) {
                resource.volume?.setVolume(1.0);
                player.play(resource);

                player.on('stateChange', async (oldState, newState) => {
                  if (newState.status === 'idle') {
                    await checkAndDisconnect(timer.guildId);
                  }
                });
              } else {
                await checkAndDisconnect(timer.guildId);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing timer ${timer.id}:`, error);
        } 
      }
    }
  }
}

async function start() {
  console.log('Starting bot...');

  await redis.connect();
  console.log('Redis connected!');

  await discord.login(env.DISCORD_TOKEN);

  setInterval(checkTimers, 1000);
}

start();
