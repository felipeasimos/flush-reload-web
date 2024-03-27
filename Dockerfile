FROM debian:12.5

# install and build requirements
RUN apt update
RUN apt install -y wget bzip2 gcc-multilib make pgpdump gnuplot python3 less vim curl wabt binaryen
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > ./install_rust.sh && chmod +x install_rust.sh && ./install_rust.sh -y
ENV CARGO_BIN /root/.cargo/bin
ENV PATH="${PATH}:${CARGO_BIN}"
RUN rustup toolchain install nightly
RUN rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
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
# build web app
EXPOSE 8000
# CMD bash -c "make attack build-bento parse compare; bash"
# CMD bash
CMD bash -c "make serve"
