#!/bin/bash

python3 server.py &
SERVER_PID=$!
firefox --headless --g-fatal-warnings localhost:8000 &
FIREFOX_PID=$!
trap "echo -e '\tReceived signal'; kill -9 ${FIREFOX_PID}; kill -9 ${SERVER_PID}; exit" INT QUIT
wait $SERVER_PID
kill $FIREFOX_PID
