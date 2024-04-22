#!/bin/bash

sleep 0.02
echo "GPG start";
${GPG} --quiet -d ${TARGET_FILE} > /dev/null
echo "GPG end"
