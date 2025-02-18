import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  AVALANCHE_RPC_URL: Joi.string().required(),

  REDIS_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DATABASE: Joi.string().required()
});
