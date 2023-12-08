from debian:bookworm

# install and build requirements
RUN apt update
RUN apt install -y wget bzip2 gcc-multilib make pgpdump gnuplot python3 python3-venv
# setup gpg key
ENV GNUPGHOME=/app/gpg/gnupghome
RUN mkdir --mode=700 -p ${GNUPGHOME}
WORKDIR /app/gpg/
ADD ./gpg/setup-gpg.sh /app/gpg/setup-gpg.sh
RUN ["./setup-gpg.sh"]
ENV GPG /app/gpg/gnupg-1.4.13/g10/gpg
# create dummy file
RUN echo 'Hello World! How are you doing?' > hello.txt
# encrypt it
RUN ${GPG} -r testdev -e hello.txt
ENV TARGET_FILE /app/gpg/hello.txt.gpg
WORKDIR /app
ADD . /app
EXPOSE 8000
# CMD bash -c "make attack && bash"
CMD bash -c "make attack build-reducer parse compare; bash"
