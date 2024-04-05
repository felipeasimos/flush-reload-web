#ifndef EV_H
#define EV_H

#define CACHE_LINE_SIZE 64
#define CACHE_ASSOCIATIVITY 12
#define ROUNDS_PER_SET 100

#include <stdint.h>
#include "arr.h"
#include "fr.h"
#include "config.h"

// set 'retry_target' to NULL if you don't want to retry
Arr generate_candidate_set(Config* config, void* retry_target);
Arr generate_eviction_set(void* probe, Arr cand, unsigned int threshold);
Arr generate_conflict_set(Arr* evs, unsigned long nevs);

static inline __attribute__((always_inline)) void traverse(void* evset) {
  // __asm__ volatile(
  //   "loop3:"
  //     "test %%rcx, %%rcx;"
  //     "jz out3;"
  //     "movq (%%rcx), %%rcx;"
  //     "jmp loop3;"
  //   "out3:"
  //   : 
  //   : "c" (evset)
  //   : "cc", "memory"
  // );
}
static inline __attribute__((always_inline)) uint64_t timed_miss(void* evset, uint8_t* p) {
  access_addr(p);
  traverse(evset);
  uint64_t t0 = rdtscp();
  access_addr(p);
  return rdtscp() - t0;
}

#endif
