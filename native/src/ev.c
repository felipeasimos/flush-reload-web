#include "ev.h"
#include "arr.h"

#include <time.h>
#include <stdlib.h>

#include <stdio.h>
#include <sys/mman.h>

Arr generate_candidate_set(Config* config, unsigned int target_idx) {
  srand(time(0));
  void* target = config->addrs[target_idx];
  const size_t pool_size = config->num_candidates * config->page_size;
  unsigned int page_offset = ((unsigned long)(target) & (config->page_size-1));
  uint8_t evicted = 0;
  Arr arr;
  do {
    arr = arr_init(config->num_candidates);
    // populate array of candidate indices
    for(unsigned long i = 0; i < arr.len; i++) arr.arr[i] = config->candidate_pools[target_idx] + (i * config->page_size) + page_offset;
    // swap indices around
    for(unsigned int i = 0; i < arr.len; i++) {
      unsigned int to_swap = rand() % arr.len;
      void* tmp = arr.arr[i];
      arr.arr[i] = arr.arr[to_swap];
      arr.arr[to_swap] = tmp;
    }
    arr_to_linked_list(&arr);
    // validate
    if(target) {
      unsigned int t = 0;
      unsigned int hit = 0;
      unsigned int miss = 0;
      for(unsigned int i = 0; i < config->num_measurements; i++) {
        const unsigned int a = timed_miss(arr.arr[0], target);
        if(a < config->threshold) {
          hit++;
        } else {
          miss++;
        }
        t += a;
      }
      const unsigned int miss_ratio = (float)miss / config->num_measurements;
      evicted = config->threshold < (t / config->num_measurements) && miss_ratio >= config->minimal_miss_ratio;
      if(!evicted) {
        printf(".");
        fflush(stdout);
        arr_free(&arr);
        munmap(config->candidate_pools[target_idx], config->num_candidates * config->page_size);
        config->candidate_pools[target_idx] = mmap(NULL, config->num_candidates * config->page_size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
      }
    }
  } while(target && !evicted);
  for(unsigned int i = 0; i < arr.len; i++) arr.arr[i] -= page_offset;
  return arr;
}

void check(Arr ev, Config* config, void* pool) {

  unsigned int num_nulls = 0;
  unsigned int not_a_candidate = 0;
  unsigned int copy = 0;
  void* start = pool;
  void* end = pool + (config->num_candidates * config->page_size * sizeof(void*));
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
  unsigned int page_offset = ((unsigned long)(probe) & (config->page_size-1));
  Arr ev = arr_clone(&cand);
  for(unsigned int i = 0; i < ev.len; i++) ev.arr[i] += page_offset;
  // swap indices around
  for(unsigned int i = 0; i < ev.len; i++) {
    unsigned int to_swap = rand() % ev.len;
    void* tmp = ev.arr[i];
    ev.arr[i] = ev.arr[to_swap];
    ev.arr[to_swap] = tmp;
  }
  // set bits contained in the page offset must be equal in the candidates and probes
  // for(unsigned int i = 0; i < ev.len; i++) ev.arr[i] += ((unsigned long)(probe) & (config->page_size-1));
  // store index of head and tail of each deleted chunk
  Arr removed_chunks = arr_init(0);
  arr_to_linked_list(&ev);
  unsigned int backtrack_counter = 0;
  unsigned int level = 0;
  const unsigned int nchunks = config->associativity + 1;
  while(ev.len > config->associativity) {
    // 1. split
    // 2. set i = 0
    uint8_t found = 0;
    unsigned int i = 0;
    // 3. loop until a miss don't occur for (S \ T[i])
    for(; i < nchunks; i++) {
      arr_unlink_chunk(&ev, &removed_chunks, nchunks, i);
      unsigned int t = 0;
      unsigned int miss = 0;
      unsigned int hit = 0;
      for(unsigned int i = 0; i < config->num_measurements; i++) {
        const unsigned int a = timed_miss(ev.arr[0], probe);
        if(a < config->threshold) {
          hit++;
        } else {
          miss++;
        }
        t += a;
      }
      t /= config->num_measurements;
      const float miss_ratio = (float)miss / config->num_measurements;
      if(t < config->threshold || miss < config->minimal_miss_ratio) {
        arr_relink_chunk(&ev, &removed_chunks, nchunks);
      } else {
        printf("-");
        fflush(stdout);
        level++;
        found = 1;
        break;
      }
    }
    // check if we need to backtrack
    if(!found) {
      if(level && (!config->num_backtracks || backtrack_counter < config->num_backtracks)) {
        backtrack_counter++;
        arr_relink_chunk(&ev, &removed_chunks, nchunks);
        printf("<");
        fflush(stdout);
        level--;
        if(removed_chunks.len == 0) {
          printf("|");
          break;
        };
      } else {
        // return linked list to original state
        while(removed_chunks.len > 0) { 
          arr_relink_chunk(&ev, &removed_chunks, nchunks);
        }
        printf("!");
        fflush(stdout);
        break;
      }
    }
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
        // now repeat j since we don't know the value its in it
        j--;
      }
    }
  }
  a->arr = realloc(a->arr, a->len * sizeof(void*));
  arr_free(&b);
}

Arr generate_conflict_set(Arr* evs, unsigned long nevs) {
  for(unsigned int i = 1; i < nevs; i++) {
    merge_eviction_sets(&evs[0], evs[i]);
  }
  arr_to_linked_list(&evs[0]);
  return evs[0];
}
