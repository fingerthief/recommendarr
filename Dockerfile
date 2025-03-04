# Build stage
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage - combined frontend and API
FROM nginx:stable-alpine
WORKDIR /app

# Install Node.js
RUN apk add --update nodejs npm

# Copy built frontend files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy server files
COPY server ./server
COPY package*.json ./
RUN npm install --production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set environment variables
ENV DOCKER_ENV=true
ENV PORT=3050

# Expose ports
EXPOSE 80 3050

# Start both services
CMD sh -c "node /app/server/server.js & nginx -g 'daemon off;'"