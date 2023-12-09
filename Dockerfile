from debian:bookworm

# install and build requirements
RUN apt update
RUN apt install -y wget bzip2 gcc-multilib make pgpdump gnuplot python3 python3-venv
# setup gpg key
WORKDIR /app/gpg/
ADD ./gpg/setup-gpg.sh /app/gpg/setup-gpg.sh
ADD ./gpg/Makefile /app/gpg/Makefile
RUN ["make", "setup-gpg"]
ENV GPGHOMEDIR /app/gpg/gpgtesthomedir
ENV GPG "/app/gpg/gnupg-1.4.13/g10/gpg -r testdev --homedir ${GPGHOMEDIR}"
ADD ./gpg/ /app/gpg/
RUN ["make", "create-key"]
ENV TARGET_FILE /app/gpg/hello.txt.gpg
ADD . /app
WORKDIR /app
EXPOSE 8000
CMD bash -c "make attack build-bento parse compare; bash"
