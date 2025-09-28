import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';
import { discord, redis } from './client.js';
import { env } from './config.js';
import { registerCommands, commands } from './commands/index.js';
import { getAllTimers, deleteTimer } from './services/timer.service.js';
import { Interaction } from 'discord.js';

discord.on('ready', async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  const guildId = discord.guilds.cache.first()?.id;
  if (guildId) {
    await registerCommands(client.user.id, guildId);
  }
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
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  }
});

async function checkTimers() {
  const guilds = discord.guilds.cache;

  for (const guild of guilds.values()) {
    const timers = await getAllTimers(guild.id);

    for (const timer of timers) {
      if (Date.now() >= timer.endTime) {
        // Delete timer immediately to prevent duplicate processing
        await deleteTimer(timer.guildId, timer.id);

        try {
          const channel = await guild.channels.fetch(timer.channelId);
          if (!channel || !channel.isTextBased()) continue;

          // Edit original message to be static
          try {
            const originalMessage = await channel.messages.fetch(timer.messageId);
            await originalMessage.edit(`Timer **${timer.id}** has finished!`);
          } catch (editError) {
            console.error(`Failed to edit original message for timer ${timer.id}:`, editError);
            // If editing fails, send a new message as a fallback
            await channel.send(`Timer **${timer.id}** has finished!`);
          }

          // Handle voice channel and sound
          if (timer.sound && timer.joinChannel) {
            const member = await guild.members.fetch(timer.userId);
            const voiceChannel = member.voice.channel;

            if (voiceChannel) {
              try {
                const connection = joinVoiceChannel({
                  channelId: voiceChannel.id,
                  guildId: voiceChannel.guild.id,
                  adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer({
                  behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                  },
                });

                const sounds = await guild.soundboardSounds.fetch();
                const soundToPlay = sounds.find(s => s.name === timer.sound);

                if (soundToPlay) {
                  const resource = createAudioResource(soundToPlay.url);
                  player.play(resource);
                  connection.subscribe(player);

                  player.on('stateChange', (oldState, newState) => {
                    if (newState.status === 'idle') {
                      connection.destroy();
                    }
                  });

                  await entersState(
                    connection,
                    VoiceConnectionStatus.Ready,
                    5_000, // Reduced timeout
                  );
                }
              } catch (voiceError) {
                console.error(`Error with voice connection for timer ${timer.id}:`, voiceError);
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
