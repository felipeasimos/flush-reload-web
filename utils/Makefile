.PHONY: parse
build-bento:
	gcc parse.c -DBENTO=1 -O2 -g -o parse
build-plunger:
	gcc parse.c -DPLUNGER=1 -O2 -g -o parse
build-reducer:
	gcc parse.c -DREDUCER=1 -O2 -g -o parse
parse:
	./parse $(CURDIR)/../data/report.plot $(CURDIR)/../data/parsed.bin
compare:
	python3 compare.py
plot:
	gnuplot plot.plot
