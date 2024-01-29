mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir := $(dir $(mkfile_path))

.PHONY: build-web serve
build-web:
	$(MAKE) -C eagle_timer build
	wasm-pack build --target web
serve: build-web
	cd $(mkfile_dir)
	python3 server.py
