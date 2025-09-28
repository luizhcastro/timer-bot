import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { env } from '../config.js';
import { command as startTimerCommand } from './start-timer.js';
import { command as listTimersCommand } from './list-timers.js';
import { command as endTimerCommand } from './end-timer.js';
import { command as editTimerCommand } from './edit-timer.js';

export const commands = [
  startTimerCommand,
  listTimersCommand,
  endTimerCommand,
  editTimerCommand,
];

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

export async function registerCommands(clientId: string, guildId: string) {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((c) => c.data.toJSON()),
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
