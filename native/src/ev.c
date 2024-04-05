#include "ev.h"
#include "arr.h"

#include <time.h>
#include <stdlib.h>

#include <stdio.h>
#include <sys/mman.h>

Arr generate_candidate_set(Config* config, void* retry_target) {
  srand(time(0));
  const size_t pool_size = config->num_candidates * config->stride;
  uint8_t evicted = 0;
  Arr arr;
  do {
    config->candidate_pool = mmap(
      NULL,
      pool_size,
      PROT_READ | PROT_WRITE,
      MAP_PRIVATE | MAP_ANONYMOUS,
      -1,
      0
    );
    arr = arr_init(config->num_candidates);
    // populate array of candidate indices
    for(unsigned long i = 0; i < arr.len; i++) arr.arr[i] = config->candidate_pool + ((i * config->stride));
    // swap indices around
    for(unsigned int i = 0; i < arr.len; i++) {
      unsigned int to_swap = rand() % arr.len;
      void* tmp = arr.arr[i];
      arr.arr[i] = arr.arr[to_swap];
      arr.arr[to_swap] = tmp;
    }
    arr_to_linked_list(&arr);
    // validate
    if(retry_target) {
      unsigned int t = 0;
      for(unsigned int i = 0; i < config->num_measurements; i++) {
        t += timed_miss(arr.arr[0], retry_target);
      }
      evicted = config->threshold < (t / config->num_measurements);
      if(!evicted) {
        arr_free(&arr);
        munmap(config->candidate_pool, pool_size);
      }
    }
  } while(retry_target && !evicted);
  return arr;
}

uint64_t test_hit_without_chunk(Arr* ev, unsigned int chunk_idx, void* probe, unsigned int threshold) {
  void* linked_list = arr_unlink_chunk(ev, CACHE_ASSOCIATIVITY + 1, chunk_idx);
  unsigned int t = 0;
  for(unsigned int i = 0; i < ROUNDS_PER_SET; i++) t += timed_miss(linked_list, probe);
  t /= ROUNDS_PER_SET;
  // printf("\33[48;2;%u;%u;%um \33[0m", t, t, t);
  arr_link_chunk(ev, CACHE_ASSOCIATIVITY + 1, chunk_idx);
  return threshold < t;
}

Arr generate_eviction_set(void* probe, Arr cand, unsigned int threshold) {
  Arr ev = arr_clone(&cand);
  arr_to_linked_list(&ev);
  while(ev.len > CACHE_ASSOCIATIVITY) {
    // 1. split
    // 2. set i = 0
    unsigned int i = 0;
    // 3. loop until a miss don't occur for (S \ T[i])
    for(; !test_hit_without_chunk(&ev, i, probe, threshold) && i >= CACHE_ASSOCIATIVITY; i++) {
    //    1. increment i
    }
    // printf("ev.len: %u\n", ev.len);
    // 4. S <- S \ T[i]
    arr_remove_chunk(&ev, CACHE_ASSOCIATIVITY + 1, i);
  }
  return ev;
}

void merge_eviction_sets(Arr* a, Arr b) {
  unsigned int old_a_len = a->len;
  arr_append(a, &b);
  // search for duplicates and delete them
  for(unsigned int i = 0; i < old_a_len; i++) {
    for(unsigned int j = old_a_len; j < a->len; j++) {
      if(a->arr[j] == a->arr[i]) {
        // move last element to 'j' and decrement a->len
        // last element won't be a repeat of this value cause
        // every EvSet has unique elements
        a->arr[j] = a->arr[--(a->len)];
        a->arr = realloc(a->arr, a->len * sizeof(void*));
      }
    }
  }
  arr_free(&b);
}

Arr generate_conflict_set(Arr* evs, unsigned long nevs) {
  for(unsigned int i = 1; i < nevs; i++) {
    merge_eviction_sets(&evs[0], evs[i]);
  }
  return evs[0];
}
