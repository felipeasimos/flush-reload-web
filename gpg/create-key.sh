#!/bin/bash

rm -rf ${GPGHOMEDIR}
mkdir --mode 700 ${GPGHOMEDIR}
tmp=$(mktemp)
cat > ${tmp} <<EOF
  %echo Generating OpenPGP key
  Key-Type: RSA
  Key-Length: 2048
  Subkey-Type: RSA
  Subkey-Length: 2048
  Name-Real: testdev
  Expire-Date: 0
  %commit
  %echo done
EOF
${GPG} --verbose --batch --gen-key ${tmp}
rm ${tmp}
export GPG="$GPG -r testdev"

# create dummy file
echo 'Hello World! How are you doing?' > hello.txt
# encrypt it
${GPG} -e hello.txt
export TARGET_FILE=$(pwd)/hello.txt.gpg
