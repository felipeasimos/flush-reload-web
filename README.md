# Flush Reload on the Web

## TODO

* evsets in C for native
    * retry from scratch if needed (start from allocating a new candidate set)
    * bigger candidate set
    * don't use naive approach (use threshold group testing)
    * avg t in 100 rounds before comparing to threshold
1. timed_miss in raw assembly
2. only access one mmap memory region for probing
3. evsets store addresses in that memory region
4. generate conflict set (remove conflicts between evsets in the linked list and get one final evset)


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

#### Probe addresses

The addresses should be pertinent to and only to the Square, Reduce and Multiply operations. Of course, that may be a hard guarantee to enforce, but we need to try as much as we can. Running `make objdump` inside the docker container will show us the dissambled gpg alongside the source.

Although the first cache line of the functions associated with these operations may look like a perfect place, it will also be executed when speculative execution is done.

Ideally the address is part of a loop. Which would give the operation more chances to be detected.

##### Square

Should be inside the `mpih_sqr_n`. A good offset found was `0x9d9c4`, since it takes the end of an if statement and the beginning of an else.

##### Reduce

Should be inside the `mpihelp_divrem`. `0x9cea9` is a loop in the default case of the function's switch statement.

##### Multiply

Should be inside `mul_n`. `0x9d447` takes the end of an if and the beginning of an else.

#### Eviction Sets

In the browser we don't have control over low-level instruction like `clflush` to get rid of a memory line in all levels of cache. To do this in the browser we have to generate and access eviction sets to load the cache with specific memory lines until the target is evicted.

##### Conflict Sets

There are also "conflict sets". Which are the union of the eviction sets of target addresses.
Just joining the eviction sets may not be optimal, since two or more target addresses may live in the same memory line.

* To reduce the conflict set we can test((S \ {x}) U {y}) to see if {x} still evicts. If it does, x and y live in the same cache line.
    * this means we can remove the entire eviction set of one of them and one address from the other (since our targets also evict themselves)

An important details about eviction sets is that the candidates should be accessed by a linked list. This avoids data pretching, that tries to optimize access to sequencial memory data (as it would in an array).

##### Eviction Set Algorithms

The algorithms try to reduce a set that can guarantee to evict the target but its too large (not efficient).

The algorithms test if the current eviction set can evict the target address. So threshold calibration (or fixed setting) must be done beforehand.

All algorithms start with a candidate set. Each candidate set element should potentially live in a different memory line. In practice this means that we would allocate an array and add elements that are <cache line> away from each other to the candidate set.

Caches that follow a permutation-based replacement policy have a fixed minimal number of addresses that need to be loaded before we can guarantee that a target address is evicted. This number will be called `a` (the number of ways, the associativity).

The algorithms below were described in "Theory and Practice of Finding Eviction Sets":

###### Naive Reduction Approach (N²)

```
S = candidate set, x = victim address
R = {} // minimal eviction set
while |R| < a do
    c <- pick(S) // get a random candidate
    if !is_valid_eviction_set(R + (S without c), x) then // check if it fails to evict x
        R <- R + {c} // add candidate to solution set
    end if
    S <- S \ {c} // remove candidate from candidate set
end while
return R
```

###### Reduction via Group Testing

```
S = candidate set, x = victim address
while |S| > a do
    {T[1], ..., T[a+1]} <- split(S, a + 1) // get a + 1 elements from S (without removing)
    i <- 1
    while !is_valid_eviction_set(S \ Ti, x) do
        i <- i + 1
    end while
    S <- S \ Ti
end while
return S
```

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

## WebAssembly

Whether it is Rust (without `wasm_bindgen`), C or C++, the underlying LLVM IR is used to compile to webassembly. This means that the memory layout of the three is the same: 

```
+----------+---------+---------+
|          |         |         |
|   data   | <-stack |  heap-> |
|          |         |         |
+----------+---------+---------+
0    __data_end  __heap_base    max memory
```

`__data_end` and `__heap_base` are exported by the webassembly module.
