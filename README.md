# Flush Reload on the Web

## How to Run

Ultimately there will be 3 ways to execute the attack: on the web with javascript, on the web with webassembly and natively.

To run the attack from docker:
* run native attack: `make run-docker-native`

## How the Attack Works

* pre-step: get copy of target's memory page in an attacker's memory page
    * for native code: make sure to use mmap and get a fresh new page
    * for javascript: large array are page-aligned
    * for webassembly: get large array from javascript
1. evict memory line from all cache levels (`clflush` or eviction sets)
2. wait for victim to potentially access it
3. read memory line, measuring the time it takes (with `rdtscp`, `rdtscp` or a browser API clock)
    * if access is demeed fast, the memory line was in the cache, which means that the victim accessed it
    * if access is demeed not fast, the memory line wasn't in the cache, which means that the victim did not access it

* common false positive causes:
    * data prefetching
        * solution: random access pattern

### Explanation

if two processes have identical pages (common when using shared libraries for example), the OS may point the virtual addresses of these memory pages of each process to the same physical page to save resources.

The LLC is physically addressed, which means that shared pages always share the same memory lines at every offset.

By evicting a specific memory line in an attacker's shared page we also evict the victim's memory line in that same offset (since they are the same).

If any of the two processes write to the page, a memory deduplication happen, and they no longer share the same physical address (a copy is made).

#### Eviction Sets

In the browser we don't have control over low-level instruction like `clflush` to get rid of a memory line in all levels of cache. To do this in the browser we have to generate and access eviction sets to load the cache with specific memory lines until the target is evicted.

#### Native Code Caveats

`__attribute__((always inline))` - inline function even if no optimizations are enabled. Using this with function that use inline asm make sure we can easily inject the same sequence of instructions whenever we want.

#### Avoiding Data Prefetching

#### Calibration

To calculate the threshold: force cache hit and misses and force access afterwards, while measuring the time it takes. The mean between fast average and slow average gives consistent results.
In practice, 160 seems to work really well for most occasions. The following numbers follow the original article (except for wait_cycles) and pack a punch on their own:

```
threshold = 160
wait_cycles = 3
time_slots = 100000
```

## GPG

### Generating GPG key and getting RSA values from it

1. create gpg key
2. get it in file with `gpg --export-secret-key > key.pgp`
3. get RSA values with `pgpdump`
    * `pgpdump -i key.pgp`
    * `-i` let you see the numbers

#### Getting values progamatically

* parse the result of `pgpdump`
1. lines after this belong to the subkey private key: `Old: Secret Subkey Packet`
2. the values can then be easily parsed after a substring like this until the end of the line:
    * `RSA <symbol>(<num> bits) - `

### OpenPGP

`gpg` is an implementation of OpenPGP. In gpg1 (which we are dealing with here), when generating a key we only get two key pairs: master and sub.
* Master -> holds user IDS. Used for signing
* Sub -> signed by Master. Used for encryption/decryption (can also be used for signing)

In our attack, we observer the encryption procedure done by the subkey.
