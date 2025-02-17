import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Blockchain RPC Configuration
  AVALANCHE_RPC_URL: Joi.string().required(),
  AVALANCHE_NETWORK: Joi.string().valid('mainnet', 'testnet').default('mainnet'),

  REDIS_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DATABASE: Joi.string().required()
});
