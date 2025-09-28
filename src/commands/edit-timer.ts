import { SlashCommandBuilder } from 'discord.js';
import {
  getTimer,
  createTimer,
  getAllTimers,
  Timer,
} from '../services/timer.service.js';
import { parseTimerString } from '../services/time.service.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('edit-timer')
    .setDescription('Edits the duration of an existing timer.')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('The ID of the timer you want to edit.')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName('new_time')
        .setDescription('The new duration for the timer.')
        .setRequired(true),
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const timers = await getAllTimers(interaction.guildId!);
    const choices = timers.map((timer: Timer) => timer.id);
    const filtered = choices.filter((choice: string) =>
      choice.startsWith(focusedValue),
    );
    await interaction.respond(
      filtered.map((choice: string) => ({ name: choice, value: choice })),
    );
  },
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;

    const id = interaction.options.getString('id', true);
    const newTime = interaction.options.getString('new_time', true);

    const existingTimer = await getTimer(interaction.guildId!, id);

    if (!existingTimer) {
      return interaction.reply({
        content: `Timer with ID **${id}** not found.`,
        ephemeral: true,
      });
    }

    const durationMs = parseTimerString(newTime);

    if (durationMs <= 0) {
      return interaction.reply({
        content: 'Invalid time format. Please use a valid format (e.g., 30s, 10m, 1h 30m).',
        ephemeral: true,
      });
    }

    const endTime = Date.now() + durationMs;

    await createTimer({
      ...existingTimer,
      endTime,
    });

    await interaction.reply(
      `Timer **${id}** has been updated! It will now end in <t:${Math.floor(
        endTime / 1000,
      )}:R>.`,
    );
  },
};
