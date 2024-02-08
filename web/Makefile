mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir := $(dir $(mkfile_path))

.PHONY: build serve
build:
	$(MAKE) -C eagle_timer build
	cargo build --release --target wasm32-unknown-unknown -Zbuild-std=std,panic_abort
serve: build
	cd $(mkfile_dir)
	python3 server.py
show: build
	wasm2wat target/wasm32-unknown-unknown/release/flush_reload.wasm --enable-threads | less
