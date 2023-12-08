import subprocess

symbols = {
    'd': "",
    'p': "",
    'q': ""
}


def main():
    output = subprocess.getoutput("$GPG -r testdev --export-secret-key --armor | pgpdump -ilp")
    start_idx = output.find("Old: Secret Subkey Packet")
    subkey_lines = output[start_idx:].splitlines()
    for line in subkey_lines:
        line = line.strip()
        for symbol in symbols.keys():
            if line.startswith(f"RSA {symbol}("):
                start_idx = line.find(" - ")
                symbols[symbol] = '{0:b}'.format(int("0x" + "".join(line[start_idx+3:].split(" ")), 16))
    for symbol in symbols.keys():
        with open(f"../data/{symbol}.pgpdump", "w") as f:
            f.write(symbols[symbol])


if __name__ == '__main__':
    main()
