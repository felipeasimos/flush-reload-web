.PHONY: create-key setup-gpg
create-key:
	./create-key.sh
setup-gpg:
	./setup-gpg.sh
objdump:
	objdump -D -M intel --line-numbers --source /app/gpg/gnupg-1.4.13/g10/gpg | less
