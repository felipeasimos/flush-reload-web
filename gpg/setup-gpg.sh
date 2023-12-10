#!/bin/bash

# download gpg
wget ftp://ftp.gnupg.org/gcrypt/gnupg/gnupg-1.4.13.tar.bz2
# decompress it
tar -xvf gnupg-1.4.13.tar.bz2
cd gnupg-1.4.13
# build it
./configure "CFLAGS=-g -O2" "LDFLAGS=-z muldefs" --prefix="${PWD}"
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

