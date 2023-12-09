#!/bin/bash

# download gpg
wget ftp://ftp.gnupg.org/gcrypt/gnupg/gnupg-1.4.13.tar.bz2
# decompress it
tar -xvf gnupg-1.4.13.tar.bz2
cd gnupg-1.4.13
# build it
./configure "CFLAGS=-m32 -g -O2" "LDFLAGS=-m32 -z muldefs" --prefix="${PWD}"
make
# check and install (installation is done at the prefix)
# we end up with an up to date version of gpg and the old vulnerable one at the prefix
# however, both share the same gpg homedir
# (this allows us to use new commands to import/convert keys from ssh and use them with the old version)
make check
make install # will install at PREFIX, not at your system
cd ..
# create homedir
export GPGHOMEDIR=$(pwd)/gpgtesthomedir
mkdir --mode 700 ${GPGHOMEDIR}
export GPG="$(pwd)/gnupg-1.4.13/g10/gpg --homedir $(pwd)/gpgtesthomedir"

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
