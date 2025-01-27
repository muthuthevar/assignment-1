import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export const Redis = (): RedisClientType => {
  if (redisClient) {
    return redisClient; // Return existing client if already created
  }

  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPassword = process.env.REDIS_PASSWORD;

  if (!redisHost || !redisPort) {
    console.error(
      "Redis host or port is not defined in the environment variables."
    );
    process.exit(1);
  }

  // Initialize Redis client
  redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword,
  });

  // Event handlers
  redisClient.on("connect", () => console.log("Connected to Redis"));
  redisClient.on("error", (err) =>
    console.error("Redis connection error:", err.message)
  );

  // Connect client
  redisClient.connect().catch((err) => {
    console.error("Failed to connect to Redis:", err.message);
    process.exit(1); // Exit process on connection failure
  });

  return redisClient;
};
