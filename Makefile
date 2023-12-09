.PHONY: build-docker run-docker-native plot build-bento build-plunger build-reducer
build-docker:
	docker build -t fr .
run-docker-native: build-docker
	docker run -it --rm -v $$(pwd)/data:/app/data --name "fr" fr
serve:
	$(MAKE) -C web serve
plot:
	$(MAKE) -C utils plot
attack:
	$(MAKE) -C native attack
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
