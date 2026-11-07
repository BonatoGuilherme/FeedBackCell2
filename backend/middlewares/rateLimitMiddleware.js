const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

function positiveIntegerEnv(name, defaultValue) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

const redisUrl = process.env.RATE_LIMIT_REDIS_URL;
const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

if (redisClient) {
  redisClient.on("error", (error) => {
    console.error("Erro no Redis de rate limit:", error);
  });
}

let configuredLimiter;

const limiter = (req, res, next) => {
  if (!configuredLimiter) {
    return next(new Error("Rate limiter is not initialized"));
  }
  return configuredLimiter(req, res, next);
};

async function connectRateLimitStore() {
  if (!redisClient) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_REDIS_URL is required in production");
    }

    console.warn("Redis de rate limit não configurado; usando memória local.");
    return;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

function initializeRateLimiter() {
  if (redisClient && !redisClient.isReady) {
    throw new Error("Redis rate-limit store must be ready before initialization");
  }

  const options = {
    windowMs: positiveIntegerEnv("RATE_LIMIT_WINDOW_MS", 60_000),
    limit: positiveIntegerEnv("RATE_LIMIT", 100),
    message: "Muitas requisições, tente novamente mais tarde",
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: false,
  };

  if (redisClient) {
    options.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  }

  configuredLimiter = rateLimit(options);
}

async function closeRateLimitStore() {
  if (redisClient?.isOpen) {
    await redisClient.close();
  }
}

function isRateLimitStoreReady() {
  return !redisClient || redisClient.isReady;
}

module.exports = {
  limiter,
  connectRateLimitStore,
  initializeRateLimiter,
  closeRateLimitStore,
  isRateLimitStoreReady,
};
