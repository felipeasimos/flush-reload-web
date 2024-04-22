.PHONY: build-native run-attack build-finder build-attack
build-attack:
	gcc src/fr.c src/config.c src/ev.c src/arr.c -DWITH_TIMING=0 -DWITH_EV=0 -O0 -o fr
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
build-evset:
	gcc src/ev.c src/config.c src/arr.c src/ev_main.c -O0 -g -o evset
evset: build-evset
	# valgrind --leak-check=full --exit-on-first-error=yes --error-exitcode=1 ./evset ../gpg/gpg-native.probe
	./evset ../gpg/gpg-native.probe
