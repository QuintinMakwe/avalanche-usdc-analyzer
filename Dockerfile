# Development stage
FROM node:20.9.0-alpine3.18 as development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN apk update && apk add curl && apk add bash


# Production stage

FROM node:20.9.0-alpine3.18 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production

COPY . .

RUN yarn build

RUN apk update && apk add curl && apk add bash

CMD ["node", "dist/main"]