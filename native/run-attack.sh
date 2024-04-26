#!/bin/bash	
./fr &
FR_PID=$!
# sleep 0.0001
# (echo "GPG start"; ${GPG}  --quiet -d ${TARGET_FILE} > /dev/null; echo "GPG end") &
# GPG_PID=$!
trap "echo -e '\tReceived signal'; kill -TERM ${FR_PID}" INT QUIT
wait ${FR_PID}
# wait ${GPG_PID}
mv report.plot ../data/
