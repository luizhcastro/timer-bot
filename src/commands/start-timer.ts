import { GuildSoundboardSound, SlashCommandBuilder } from 'discord.js';
import { createTimer } from '../services/timer.service.js';
import { parseTimerString } from '../services/time.service.js';

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
    )
    .addBooleanOption((option) =>
      option
        .setName('join_channel')
        .setDescription('Whether the bot should join your voice channel. Defaults to true.'),
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
    if (!interaction.isChatInputCommand()) return;

    const time = interaction.options.getString('time', true);
    const id = interaction.options.getString('id', true);
    const sound = interaction.options.getString('sound');
    const joinChannel = interaction.options.getBoolean('join_channel') ?? true;

    const durationMs = parseTimerString(time);

    if (durationMs <= 0) {
      return interaction.reply({
        content: 'Invalid time format. Please use a valid format (e.g., 30s, 10m, 1h 30m).',
        ephemeral: true,
      });
    }

    const endTime = Date.now() + durationMs;

    const message = await interaction.reply({
      content: `Timer **${id}** started! It will end in <t:${Math.floor(
        endTime / 1000,
      )}:R>.`,
      fetchReply: true,
    });

    await createTimer({
      id,
      guildId: interaction.guildId!,
      channelId: interaction.channelId!,
      userId: interaction.user.id,
      messageId: message.id,
      endTime,
      sound: sound || undefined,
      joinChannel,
    });
  },
};
