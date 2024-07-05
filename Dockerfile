FROM debian:12.5

# install and build requirements
RUN apt update && apt install -y wget bzip2 gcc-multilib make pgpdump gnuplot python3 less vim curl wabt binaryen firefox-esr
# setup gpg key
WORKDIR /app/gpg/
ADD ./gpg/setup-gpg.sh /app/gpg/setup-gpg.sh
ADD ./gpg/Makefile /app/gpg/Makefile
RUN ["make", "setup-gpg"]
ENV GPGHOMEDIR /app/gpg/gpgtesthomedir
ENV GPG "/app/gpg/gnupg-1.4.13/g10/gpg -r testdev --homedir ${GPGHOMEDIR}"
ADD ./gpg/ /app/gpg/
ENV TARGET_FILE /app/gpg/hello.txt.gpg
ADD . /app
WORKDIR /app
# build web app
EXPOSE 8000
# CMD bash -c "make attack build-bento parse compare; bash"
# CMD bash
CMD bash -c "make create-key serve"
