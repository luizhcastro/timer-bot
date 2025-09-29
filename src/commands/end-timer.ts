import { SlashCommandBuilder } from 'discord.js';
import {
  deleteTimer,
  getTimer,
  getAllTimers,
  Timer,
} from '../services/timer.service.js';
import { checkAndDisconnect } from '../index.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('end-timer')
    .setDescription('Stops and deletes an active timer.')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('The ID of the timer you want to stop.')
        .setRequired(true)
        .setAutocomplete(true),
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

    const timer = await getTimer(interaction.guildId!, id);

    if (!timer) {
      return interaction.reply({
        content: `Timer with ID **${id}** not found.`,
        ephemeral: true,
      });
    }

    await deleteTimer(interaction.guildId!, id);

    await interaction.reply(`Timer **${id}** has been stopped and deleted.`);

    // Check if the bot should disconnect from voice channel
    await checkAndDisconnect(interaction.guildId!);
  },
};
