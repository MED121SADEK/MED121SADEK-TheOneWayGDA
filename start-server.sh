#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
while true; do
  echo "$(date) - Starting production server..."
  node .next/standalone/server.js -H 0.0.0.0 -p 3000 2>&1
  echo "$(date) - Server died, restarting in 3s..."
  sleep 3
done
