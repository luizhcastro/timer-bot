import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllTimers } from '../services/timer.service.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('list-timers')
    .setDescription('Lists all your active timers on the server.'),
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;

    const allTimers = await getAllTimers(interaction.guildId!);
    const userTimers = allTimers.filter(timer => timer.userId === interaction.user.id);

    if (userTimers.length === 0) {
      return interaction.reply({ content: 'You have no active timers.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Your Active Timers')
      .setColor('#0099ff');

    for (const timer of userTimers) {
      embed.addFields({
        name: `Timer: ${timer.id}`,
        value: `Ends in <t:${Math.floor(timer.endTime / 1000)}:R>`,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
