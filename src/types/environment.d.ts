export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_TOKEN: string;
      REDIS_URL: string;
    }
  }
}
