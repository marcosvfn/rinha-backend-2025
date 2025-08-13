import { createClient } from "redis";

export const createRedisClient = () => {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      connectTimeout: 2000,
    },
    database: parseInt(process.env.REDIS_DB || "0"),
  });

  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  return client;
};
