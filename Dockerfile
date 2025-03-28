# Build stage
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY \
    package*.json \
    vue.config.js \
    babel.config.js \
    jsconfig.json \
    nginx.conf \
    ./

RUN npm install

COPY src ./src
COPY public ./public

# Not sure if needed (please review)
# ENV VUE_APP_API_URL=
# ENV BASE_URL=

RUN npm run build

FROM node:22-alpine

USER root

RUN apk add --no-cache catatonit

WORKDIR /app

COPY package*.json ./

COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/dist ./dist

COPY server ./server

ENV DOCKER_ENV=false
ENV PORT=3000

EXPOSE 3000

USER nobody:nogroup

ENTRYPOINT ["/usr/bin/catatonit", "--", "node", "server/server.js"]
