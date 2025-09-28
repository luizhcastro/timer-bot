import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllTimers } from '../services/timer.service.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('list-timers')
    .setDescription('Lists all active timers on the server.'),
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;

    const timers = await getAllTimers(interaction.guildId!);

    if (timers.length === 0) {
      return interaction.reply({ content: 'No active timers.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Active Timers')
      .setColor('#0099ff');

    for (const timer of timers) {
      embed.addFields({
        name: `Timer: ${timer.id}`,
        value: `Ends in <t:${Math.floor(timer.endTime / 1000)}:R>`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
