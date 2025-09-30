import { GuildSoundboardSound, SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createTimer } from '../services/timer.service.js';
import { parseTimerString } from '../services/time.service.js';
import { voiceConnections } from '../index.js';
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from '@discordjs/voice';

const DEFAULT_SOUND_NAME = 'Miau timer sound';

export const command = {
  data: new SlashCommandBuilder()
    .setName('start-timer')
    .setDescription('Starts a new timer.')
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('The duration of the timer. Examples: 30s, 10m, 1h 30m')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('A unique name to identify the timer.')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sound')
        .setDescription('A sound from the soundboard to play when the timer ends.')
        .setAutocomplete(true),
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const guild = interaction.guild;
    if (!guild) return;

    const sounds = await guild.soundboardSounds.fetch();
    const soundboardChoices = sounds.map((sound: GuildSoundboardSound) => sound.name);
    
    const choices = [DEFAULT_SOUND_NAME, ...soundboardChoices];

    const filtered = choices.filter((choice: string) =>
      choice.startsWith(focusedValue),
    );
    await interaction.respond(
      filtered.map((choice: string) => ({ name: choice, value: choice })),
    );
  },
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand() || !interaction.member) return;

    const time = interaction.options.getString('time', true);
    const id = interaction.options.getString('id', true);
    const sound = interaction.options.getString('sound');

    await interaction.deferReply();

    const durationMs = parseTimerString(time);

    if (durationMs <= 0) {
      return interaction.editReply({
        content:
          'Invalid time format. Please use a valid format (e.g., 30s, 10m, 1h 30m).',
      });
    }

    if (sound) {
      try {
        if (!voiceConnections.has(interaction.guildId!)) {
          const member = await interaction.guild.members.fetch(
            interaction.user.id,
          );
          const voiceChannel = member.voice.channel;

          if (voiceChannel) {
            const permissions = voiceChannel.permissionsFor(interaction.guild.members.me!)
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
              return interaction.editReply({
                content: 'I need the permissions to join and speak in your voice channel!'
              })
            }

            const connection = joinVoiceChannel({
              channelId: voiceChannel.id,
              guildId: voiceChannel.guild.id,
              adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            connection.on(VoiceConnectionStatus.Disconnected, () => {
              voiceConnections.delete(interaction.guildId!);
            });
            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
            voiceConnections.set(interaction.guildId!, connection);

            if (voiceChannel.type === ChannelType.GuildStageVoice) {
              const isStageMod = permissions.has('MuteMembers') && permissions.has('MoveMembers') && permissions.has('ManageChannels');

              if (isStageMod) {
                await interaction.guild.members.me!.voice.setSuppressed(false);
              } else if (permissions.has('RequestToSpeak')) {
                await interaction.guild.members.me!.voice.setRequestToSpeak(true);
                await interaction.followUp({ 
                  content: "I've requested to speak on the stage. A moderator needs to approve this for the alarm to be heard.",
                  ephemeral: true
                });
              } else {
                await interaction.followUp({ 
                  content: "I don't have enough permissions to speak on this stage. Please grant me 'Request to Speak' permission or make me a Stage Moderator.",
                  ephemeral: true
                });
              }
            }
          } else {
            return interaction.editReply({
              content:
                'You must be in a voice channel to start a timer with sound!',
            });
          }
        }
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        return interaction.editReply({
          content:
            'I could not connect to your voice channel. Please check my permissions!',
        });
      }
    }

    const endTime = Date.now() + durationMs;

    await interaction.editReply(
      `Timer **${id}** started! It will end in <t:${Math.floor(
        endTime / 1000,
      )}:R>.`,
    );
    const message = await interaction.fetchReply();

    await createTimer({
      id,
      guildId: interaction.guildId!,
      channelId: interaction.channelId!,
      userId: interaction.user.id,
      messageId: message.id,
      endTime,
      sound: sound || undefined,
      joinChannel: !!sound,
    });
  },
};
