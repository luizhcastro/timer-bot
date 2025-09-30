import { redis } from '../client.js';

export interface Timer {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  messageId: string;
  endTime: number;
  sound?: string;
  joinChannel?: boolean;
}

const TIMER_PREFIX = 'timer';

function getTimerKey(guildId: string, timerId: string) {
  return `${TIMER_PREFIX}:${guildId}:${timerId}`;
}

export async function createTimer(timer: Timer): Promise<void> {
  const key = getTimerKey(timer.guildId, timer.id);
  await redis.set(key, JSON.stringify(timer));
}

export async function getTimer(
  guildId: string,
  timerId: string,
): Promise<Timer | null> {
  const key = getTimerKey(guildId, timerId);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function getAllTimers(guildId: string): Promise<Timer[]> {
  const keys = await redis.keys(`${TIMER_PREFIX}:${guildId}:*`);
  if (keys.length === 0) return [];

  const data = await redis.mGet(keys);
  return data.map((d) => JSON.parse(d!));
}

export async function deleteTimer(guildId: string, timerId: string): Promise<void> {
  const key = getTimerKey(guildId, timerId);
  console.log(`Deleting timer with key: ${key}`);
  const result = await redis.del(key);
  console.log(`Deletion result for key ${key}: ${result}`);
}
