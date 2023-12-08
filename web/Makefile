.PHONY: build-web serve
build-web:
	wasm-pack build --target web
serve: build-web
	python3 -m http.server
