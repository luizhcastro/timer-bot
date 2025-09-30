import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays information about the available commands.'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setTitle('Bot Commands Help')
      .setColor('#0099ff')
      .addFields(
        { name: '/start-timer', value: 'Starts a new timer. You must provide the time and can optionally provide a sound from the soundboard.' },
        { name: '/list-timers', value: 'Lists all active timers on the server.' },
        { name: '/edit-timer', value: 'Edits the duration of an existing timer. You must be the creator of the timer.' },
        { name: '/end-timer', value: 'Stops and deletes an active timer. You must be the creator of the timer.' },
        { name: '/ping', value: 'Checks if the bot is online and responsive.' },
        { name: '/help', value: 'Shows this help message.' }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
