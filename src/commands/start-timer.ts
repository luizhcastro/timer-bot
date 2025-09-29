import { GuildSoundboardSound, SlashCommandBuilder } from 'discord.js';
import { createTimer } from '../services/timer.service.js';
import { parseTimerString } from '../services/time.service.js';
import { voiceConnections } from '../index.js';
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from '@discordjs/voice';

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
    const choices = sounds.map((sound: GuildSoundboardSound) => sound.name);
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

    const durationMs = parseTimerString(time);

    if (durationMs <= 0) {
      return interaction.reply({
        content: 'Invalid time format. Please use a valid format (e.g., 30s, 10m, 1h 30m).',
        ephemeral: true,
      });
    }

    if (sound && !voiceConnections.has(interaction.guildId!)) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const voiceChannel = member.voice.channel;

      if (voiceChannel) {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
          voiceConnections.delete(interaction.guildId!);
        });
        voiceConnections.set(interaction.guildId!, connection);
        await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
      } else {
        return interaction.reply({
          content: 'You must be in a voice channel to start a timer with sound!',
          ephemeral: true,
        });
      }
    }

    const endTime = Date.now() + durationMs;

    await interaction.reply(
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
      joinChannel: !!sound, // joinChannel is true if a sound is provided
    });
  },
};
