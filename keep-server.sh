#!/bin/bash
cd /home/z/my-project
while true; do
    PORT=3000 HOSTNAME=0.0.0.0 bun .next/standalone/server.js 2>&1
    echo "Server crashed, restarting in 2s..."
    sleep 2
done
