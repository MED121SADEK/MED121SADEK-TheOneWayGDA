#!/bin/bash
cd /home/z/my-project
exec node .next/standalone/server.js -p 3000 -H 0.0.0.0
