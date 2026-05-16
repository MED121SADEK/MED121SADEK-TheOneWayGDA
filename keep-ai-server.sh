#!/bin/bash
while true; do
  PORT=3000 node .next/standalone/server.js -H 0.0.0.0 2>/tmp/next-err.log
  echo "Server crashed, restarting in 2s..."
  sleep 2
done
