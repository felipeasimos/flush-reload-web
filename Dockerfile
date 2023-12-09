from debian:bookworm

# install and build requirements
RUN apt update
RUN apt install -y wget bzip2 gcc-multilib make pgpdump gnuplot python3 python3-venv
# setup gpg key
WORKDIR /app/gpg/
ADD ./gpg/setup-gpg.sh /app/gpg/setup-gpg.sh
RUN ["./setup-gpg.sh"]
ENV GPGHOMEDIR /app/gpg/gpgtesthomedir
ENV GPG "/app/gpg/gnupg-1.4.13/g10/gpg -r testdev --homedir ${GPGHOMEDIR}"
ADD . /app
# create dummy file
RUN echo 'Hello World! How are you doing?' > hello.txt
# # encrypt it
RUN ${GPG} -e hello.txt
ENV TARGET_FILE /app/gpg/hello.txt.gpg
CMD bash -c "make attack build-bento parse compare; bash"
WORKDIR /app
ADD . /app
EXPOSE 8000
CMD bash -c "make attack && bash"
