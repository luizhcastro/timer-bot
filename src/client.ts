import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from 'redis';

import { env } from './config.js';

export const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

export const redis = createClient({
  url: env.REDIS_URL,
});
