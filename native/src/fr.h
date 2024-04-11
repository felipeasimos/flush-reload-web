#ifndef FR_H
#define FR_H

#include <stdint.h>

// MFENCE - load-from-memory and store-to-memory instructions that come before it are serialized (avoid out of order loads/stores)
static inline __attribute__((always_inline)) void fence(void) {
    asm volatile("mfence");
}   

// access memory
static inline __attribute__((always_inline)) void access_addr(uint8_t* p) {
    *(volatile unsigned char *)p;
}

// CLFLUSH - evict memory line from all levels of cache
static inline __attribute__((always_inline)) void clflush(uint8_t* p) {
    asm volatile("clflush (%0)\n"::"r"(p));
}   

// RDTSCP - get current cpu cycle (difference from RDTSC -> avoids CPU from reordering it)
static inline __attribute__((always_inline)) uint64_t rdtscp(void) {
    uint64_t lo, hi;
    asm volatile("rdtscp\n" : "=a" (lo), "=d" (hi) :: "rcx");
    return (hi << 32) | lo;
}

// get load time
static inline __attribute__((always_inline)) uint64_t load_time(uint8_t* p)
{
    // no need for fence since RDTSCP already serialize the instructions
    uint64_t t0 = rdtscp();
    access_addr(p);
    return rdtscp() - t0;
}

/* flush */
static inline __attribute__((always_inline)) void flush(uint8_t* p) {
    clflush(p);
    fence();
}

static inline __attribute__((always_inline)) uint64_t reload(uint8_t* p) {
    fence();
    return load_time(p);
}

static inline __attribute__((always_inline)) uint64_t timed_hit(uint8_t* p) {
  access_addr(p);
  fence();
  return load_time(p);
}

#endif
