FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY \
    vue.config.js \
    babel.config.js \
    jsconfig.json \
    nginx.conf \
    ./

COPY src ./src
COPY server ./server
COPY public ./public

RUN npm run build

FROM node:22-alpine AS prod-stage

USER root
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache catatonit

COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/server ./server
COPY --from=build-stage /app/package*.json ./

RUN npm ci

EXPOSE 3000

USER nobody:nogroup

ENTRYPOINT ["/usr/bin/catatonit", "--", "node", "server/server.js"]
