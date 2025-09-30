import { SlashCommandBuilder, MessageFlags } from 'discord.js';
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
    const allTimers = await getAllTimers(interaction.guildId!);
    const userTimers = allTimers.filter(timer => timer.userId === interaction.user.id);
    const choices = userTimers.map((timer: Timer) => timer.id);
    const filtered = choices.filter((choice: string) =>
      choice.startsWith(focusedValue),
    );
    await interaction.respond(
      filtered.map((choice: string) => ({ name: choice, value: choice })),
    );
  },
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand() || !interaction.guild) return;

    await interaction.deferReply();

    const id = interaction.options.getString('id', true);
    const newTime = interaction.options.getString('new_time', true);

    const existingTimer = await getTimer(interaction.guildId, id);

    if (!existingTimer) {
      return interaction.editReply({
        content: `Timer with ID **${id}** not found.`,
      });
    }

    if (existingTimer.userId !== interaction.user.id) {
      return interaction.editReply({
        content: 'You can only edit timers that you have created.',
      });
    }

    const durationMs = parseTimerString(newTime);

    if (durationMs <= 0) {
      return interaction.editReply({
        content: 'Invalid time format. Please use a valid format (e.g., 30s, 10m, 1h 30m).',
      });
    }

    const endTime = Date.now() + durationMs;
    let messageId = existingTimer.messageId;

    const newContent = `Timer **${id}** has been updated! It will now end in <t:${Math.floor(
        endTime / 1000,
      )}:R>.`;

    try {
        const channel = await interaction.guild.channels.fetch(existingTimer.channelId);
        if (channel?.isTextBased()) {
            const message = await channel.messages.fetch(existingTimer.messageId);
            await message.edit(newContent);
        }
    } catch (error) {
        console.error(`Failed to edit original message for timer ${id}, sending a new one.`, error);
        const channel = await interaction.guild.channels.fetch(existingTimer.channelId);
        if (channel?.isTextBased()) {
            const newMessage = await channel.send(newContent);
            messageId = newMessage.id;
        }
    }

    await createTimer({
      ...existingTimer,
      endTime,
      messageId,
    });

    await interaction.editReply(
      `Timer **${id}** has been updated!`,
    );
  },
};
