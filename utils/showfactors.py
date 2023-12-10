
def main():
    symbols = {
        'd': "",
        'p': "",
        'q': ""
    }
    for symbol in symbols.keys():
        with open(f"../data/{symbol}.pgpdump") as f:
            symbols[symbol] = f.read()

    # get factors
    d = int(symbols['d'], 2)
    p = int(symbols['p'], 2)
    q = int(symbols['q'], 2)
    dp = "{0:{size}b}".format(d % (p-1), size=1024).strip()
    dq = "{0:{size}b}".format(d % (q-1), size=1024).strip()
    print(dp)
    print(dq)

if __name__ == "__main__":
    main()
