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

void check(Arr ev, Config* config) {

  unsigned int num_nulls = 0;
  unsigned int not_a_candidate = 0;
  unsigned int copy = 0;
  void* start = config->candidate_pool;
  void* end = config->candidate_pool + (config->num_candidates * config->stride * sizeof(void*));
  for(unsigned int i = 0; i < ev.len; i++) {
    void* pointer = *(void**)ev.arr[i];
    if((pointer > end || pointer < start)) {
      if(pointer) {
        not_a_candidate++;
      } else {
        num_nulls++;
      }
    }
    for(unsigned int j = i + 1; j < ev.len; j++) {
      if(*(void**)ev.arr[i] == *(void**)ev.arr[j]) {
        copy++;
      }
    }
  }
  if(not_a_candidate) {
    printf("not_a_candidate: %u\n", not_a_candidate);
  }
  if(num_nulls != 1) {
    printf("num_nulls: %u\n", num_nulls);
  }
  if(copy) {
    printf("copy: %u\n", copy);
  }
}

Arr generate_eviction_set(Config* config, void* probe, Arr cand) {
  Arr ev = arr_clone(&cand);
  // store index of head and tail of each deleted chunk
  Arr removed_chunks = arr_init(0);
  arr_to_linked_list(&ev);
  void* start = ev.arr[0];
  void* end = ev.arr[ev.len - 1];
  unsigned int backtrack_counter = 0;
  const unsigned int nchunks = CACHE_ASSOCIATIVITY + 1;
  while(ev.len > CACHE_ASSOCIATIVITY) {
    printf("ev.len: %u\n", ev.len);
    if(ev.len < 100) arr_print(ev);
    // 1. split
    // 2. set i = 0
    uint8_t found = 0;
    unsigned int i = 0;
    // 3. loop until a miss don't occur for (S \ T[i])
    for(; i < nchunks; i++) {
      arr_unlink_chunk(&ev, &removed_chunks, nchunks, i);
      unsigned int t = 0;
      for(unsigned int i = 0; i < config->num_measurements; i++) t += timed_miss(ev.arr[0], probe);
      t /= config->num_measurements;
      if(t < config->threshold) {
        arr_relink_chunk(&ev, &removed_chunks, nchunks);
      } else {
        found = 1;
        break;
      }
    }
    // check if we need to backtrack
    if(!found) {
      backtrack_counter++;
      if(backtrack_counter < config->num_backtracks) {
        arr_relink_chunk(&ev, &removed_chunks, nchunks);
        if(removed_chunks.len == 0) break;
      } else {
        while(removed_chunks.len > 0) { 
          arr_relink_chunk(&ev, &removed_chunks, nchunks);
        }
        break;
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
