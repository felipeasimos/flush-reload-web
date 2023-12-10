def LCS(s1, s2):
    #https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Longest_common_substring#Python
    m = [[0] * (1 + len(s2)) for i in range(1 + len(s1))]
    longest, x_longest = 0, 0
    for x in range(1, 1 + len(s1)):
        for y in range(1, 1 + len(s2)):
            if s1[x - 1] == s2[y - 1]:
                m[x][y] = m[x - 1][y - 1] + 1
                if m[x][y] > longest:
                    longest = m[x][y]
                    x_longest = x
            else:
                m[x][y] = 0
    longest_subsequence = s1[x_longest - longest: x_longest]
    second_place_diff = x_longest - longest
    return len(longest_subsequence), longest_subsequence, second_place_diff


def levensthein(list1, list2):

    matrix = [[0 for i in range(len(list2) + 1)] for i in range(len(list1) + 1)]

    for x in range(len(list1) + 1):
        matrix[x][0] = x

    for y in range(len(list2) + 1):
        matrix[0][y] = y

    for x in range(1, len(list1) + 1):
        for y in range(1, len(list2) + 1):
            if list1[x - 1] == list2[y - 1]:
                matrix[x][y] = min(
                    matrix[x - 1][y] + 1,
                    matrix[x - 1][y - 1],
                    matrix[x][y - 1] + 1
                )
            else:
                matrix[x][y] = min(
                    matrix[x - 1][y] + 1,
                    matrix[x - 1][y - 1] + 1,
                    matrix[x][y - 1] + 1
                )

    return matrix[len(list1)][len(list2)], matrix[len(list1)][len(list2)]/len(list2)


def main():
    symbols = {
        'd': "",
        'p': "",
        'q': ""
    }
    for symbol in symbols.keys():
        with open(f"../data/{symbol}.pgpdump") as f:
            symbols[symbol] = f.read()
    parsed = ""
    with open("../data/parsed.bin") as f:
        parsed = f.read()

    # get factors
    d = int(symbols['d'], 2)
    p = int(symbols['p'], 2)
    q = int(symbols['q'], 2)
    dp = "{0:{size}b}".format(d % (p-1), size=1024).strip()
    dq = "{0:{size}b}".format(d % (q-1), size=1024).strip()
    print("levensthein:", levensthein(parsed, dp + dq))
    print("LCS:", LCS(parsed, dp + dq))

    half = (len(parsed)//2)
    print("LCS with dp:", LCS(parsed[half:], dp))
    print("LCS with dq:", LCS(parsed[:half], dp))
    print("levensthein with dp:", levensthein(parsed[half:], dp))
    print("levensthein with dq:", levensthein(parsed[:half], dp))

if __name__ == "__main__":
    main()
