import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('365d'),
  JWT_REFRESH_EXPIRES: Joi.string().default('365d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  WS_PATH: Joi.string().default('/socket.io'),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(500),
  ONLYOFFICE_SERVER_URL: Joi.string().default('http://localhost:8080'),
  ONLYOFFICE_JWT_SECRET: Joi.string().default('dev-onlyoffice-jwt-secret-change-me'),
  PUBLIC_API_URL: Joi.string().default('http://host.docker.internal:8000/api/v1'),
});
