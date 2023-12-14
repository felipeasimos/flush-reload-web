#!/bin/bash	
./fr ../gpg/gpg-native.probe &
FR_PID=$!
sleep 0.01
(echo "GPG start"; ${GPG}  --quiet -d ${TARGET_FILE} > /dev/null; echo "GPG end") &
GPG_PID=$!
trap "echo -e '\tReceived signal'; kill -TERM ${FR_PID} ${GPG_PID}" INT QUIT
wait ${FR_PID}
wait ${GPG_PID}
mv report.plot ../data/
