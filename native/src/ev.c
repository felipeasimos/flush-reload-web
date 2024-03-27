#include "ev.h"
#include "arr.h"

#include <time.h>
#include <stdlib.h>

void* to_linked_list(Arr* set) {
  if(!set->len) return NULL;
  void** pointer = &set->arr[0];
  for(unsigned int i = 1; i < set->len; i++) {
    *pointer = set->arr[i];
    pointer = set->arr[i];
  }
  *pointer = NULL;
  return set->arr[0];
}

#include <stdio.h>
Arr generate_candidate_set(void* pool) {
  srand(time(0));
  Arr arr = {
    .len = NUMBER_OF_CANDIDATES,
    .arr = calloc(NUMBER_OF_CANDIDATES, sizeof(void*))
  };
  // populate array of candidate indices
  for(unsigned long i = 0; i < arr.len; i++) arr.arr[i] = pool + ((i * CACHE_LINE_SIZE));
  // swap indices around
  for(unsigned int i = 0; i < arr.len; i++) {
    unsigned int to_swap = rand() % arr.len;
    void* tmp = arr.arr[i];
    arr.arr[i] = arr.arr[to_swap];
    arr.arr[to_swap] = tmp;
  }
  return arr;
}

Arr generate_eviction_set(void* probe, Arr cand, unsigned int threshold) {
  Arr ev = {
    .len = 0,
    .arr = NULL
  };
  cand = arr_clone(&cand);
  unsigned int highest = 0;
  for(void* random_offset = arr_peek(&cand); random_offset && ev.len < CACHE_ASSOCIATIVITY; random_offset = arr_peek(&cand)) {
    Arr ev_clone = arr_clone(&ev);
    arr_append(&ev_clone, &cand);
    void* linked_list = to_linked_list(&ev_clone);
    unsigned int t = 0;
    for(unsigned int i = 0; i < ROUNDS_PER_SET; i++) t += timed_miss(linked_list, probe);
    t /= ROUNDS_PER_SET;
    if(t > highest) highest = t;
    printf("\33[48;2;%u;%u;%um \33[0m", t, t, t);
    if(threshold < t) {
      arr_push(&ev, random_offset);
      arr_pop(&cand);
    }
    arr_free(&ev_clone);
  }
  printf("\nhighest: %u\n", highest);
  arr_free(&cand);
  arr_print(ev);
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
