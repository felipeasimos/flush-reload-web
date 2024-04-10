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
        printf(".");
        fflush(stdout);
        arr_free(&arr);
        munmap(config->candidate_pool, pool_size);
      }
    }
  } while(retry_target && !evicted);
  return arr;
}

Arr generate_eviction_set(void* probe, Arr cand, unsigned int threshold, unsigned int num_backtracks) {
  Arr ev = arr_clone(&cand);
  // store index of head and tail of each deleted chunk
  Arr removed_chunks = arr_init(0);
  arr_to_linked_list(&ev);
  unsigned int backtrack_counter = 0;
  while(ev.len > CACHE_ASSOCIATIVITY) {
    // 1. split
    // 2. set i = 0
    uint8_t found = 0;
    unsigned int i = 0;
    // 3. loop until a miss don't occur for (S \ T[i])
    for(; i < (CACHE_ASSOCIATIVITY +1 ); i++) {  
      arr_unlink_chunk(&ev, &removed_chunks, CACHE_ASSOCIATIVITY + 1, i);
      unsigned int t = 0;
      for(unsigned int i = 0; i < ROUNDS_PER_SET; i++) t += timed_miss(ev.arr[0], probe);
      t /= ROUNDS_PER_SET;
      if(t < threshold) {
        arr_relink_chunk(&ev, &removed_chunks, (CACHE_ASSOCIATIVITY + 1));
      } else {
        found = 1;
        break;
      }
    }
    // check if we need to backtrack
    if(!found) {
      backtrack_counter++;
      if(backtrack_counter < num_backtracks) {
        arr_relink_chunk(&ev, &removed_chunks, CACHE_ASSOCIATIVITY + 1);
        if(removed_chunks.len == 0) break;
      } else {
        while(removed_chunks.len > 0) { 
          arr_relink_chunk(&ev, &removed_chunks, CACHE_ASSOCIATIVITY + 1);
        }
        break;;
      }
    }
    // 4. S <- S \ T[i]
    // arr_unlink_chunk(&ev, &removed_chunks, CACHE_ASSOCIATIVITY + 1, i);
  }
  for(unsigned int i = 0; i < removed_chunks.len; i++) {
    arr_free(removed_chunks.arr[i]);
    free(removed_chunks.arr[i]);
  }
  arr_free(&removed_chunks);
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
