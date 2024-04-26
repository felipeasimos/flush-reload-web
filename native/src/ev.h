#ifndef EV_H
#define EV_H

#include <stdint.h>
#include "arr.h"
#include "fr.h"
#include "config.h"

Arr generate_candidate_set(Config* config, void* target);
Arr generate_eviction_set(Config* config, void* probe, Arr cand);
Arr generate_conflict_set(Arr* evs, unsigned long nevs);

static inline __attribute__((always_inline)) void traverse(void* evset) {
  // while(evset) evset = *(void**)evset;
  __asm__ volatile(
    "loop%=:\n"
      "test %%rcx, %%rcx;\n"
      "jz out%=;\n"
      "movq (%%rcx), %%rcx;\n"
      "jmp loop%=;\n"
    "out%=:\n"
    : 
    : "c" (evset)
    : "cc", "memory"
  );

	// while (evset && *(void**)evset && **(void***)evset)
	// {
	// 	access_addr (evset);
	// 	access_addr (*(void**)evset);
	// 	access_addr (**(void***)evset);
	// 	access_addr (evset);
	// 	access_addr (*(void**)evset);
	// 	access_addr (**(void***)evset);
    //  evset = *(void**)evset;
	// }
}
static inline __attribute__((always_inline)) uint64_t timed_miss(void* evset, uint8_t* p) {
  access_addr(p);
  traverse(evset);
  uint64_t t0 = rdtscp();
  access_addr(p);
  return rdtscp() - t0;
}

#endif
