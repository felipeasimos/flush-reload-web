.PHONY: build-docker run-docker-web run-docker-native plot build-bento build-plunger build-reducer
build-docker:
	docker build -t fr .
run-docker-native: build-docker
	docker run -it --rm -v $$(pwd)/data:/app/data --name "fr" fr bash -c "make create-key attack build-bento parse compare"
run-docker-web-attack: build-docker
	docker run -it --rm -p 8000:8000 -v $$(pwd)/data:/app/data --name "fr" fr bash -c "make create-key attack-web"
run-docker-web-serve: build-docker
	docker run -it -p 8000:8000 --rm -v $$(pwd)/data:/app/data --name "fr" fr bash -c "make create-key serve"
run-docker-evset:
	docker run -it --rm -v $$(pwd)/data:/app/data --name "fr" fr bash -c "make create-key evset && bash"
evset:
	$(MAKE) -C native evset
attack-web:
	$(MAKE) -C web attack
serve:
	$(MAKE) -C web serve
objdump:
	$(MAKE) -C gpg objdump
create-key:
	$(MAKE) -C gpg create-key
setup-gpg:
	$(MAKE) -C gpg setup-gpg
plot:
	$(MAKE) -C utils plot
attack:
	$(MAKE) -C native attack
probe:
	$(MAKE) -C native probe
compare:
	$(MAKE) -C utils compare
parse:
	$(MAKE) -C utils parse
find-threshold:
	$(MAKE) -C native find-threshold
build-bento:
	$(MAKE) -C utils build-bento
build-plunger:
	$(MAKE) -C utils build-plunger
build-reducer:
	$(MAKE) -C utils build-reducer
