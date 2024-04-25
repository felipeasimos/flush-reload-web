mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir := $(dir $(mkfile_path))

.PHONY: build serve
build:
	wat2wasm wasm/attack.wat --enable-threads -o attack.wasm
	wat2wasm wasm/counter.wat --enable-threads -o counter.wasm
serve: build
	cd $(mkfile_dir)
	python3 server.py
show:
	wasm2wat --enable-threads attack.wasm | less -R
attack: build
	./run-attack.sh
