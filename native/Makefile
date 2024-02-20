.PHONY: build-native run-attack build-finder build-attack
build-attack:
	gcc src/fr.c src/config.c -DWITH_TIMING=0 -O2 -o fr
build-probe:
	gcc src/fr.c src/config.c -O2 -o fr
build-finder:
	gcc src/threshold_finder.c -O2 -o threshold_finder
build-native: build-finder build-attack
attack: build-native
	./run-attack.sh
probe: build-probe
	./run-attack.sh
find-threshold: build-finder
	./threshold_finder
