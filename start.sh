#!/bin/sh

# Start the Node.js API server in the background
echo "Starting API server..."
cd /app && node server/server.js &

# Start Nginx in the foreground
echo "Starting Nginx server..."
nginx -g "daemon off;"