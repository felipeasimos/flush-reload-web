#include "arr.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

Arr arr_init(unsigned int len) {
  Arr arr = {
    .len = len,
    .arr = calloc(len, sizeof(void**))
  };
  return arr;
}

void arr_free(Arr* arr) {
  free(arr->arr);
  arr->arr = NULL;
  arr->len = 0;
}

Arr arr_clone(Arr* arr) {
  Arr arr_clone = {
    .len = arr->len,
    .arr = calloc(arr->len, sizeof(void*))
  };
  memcpy(arr_clone.arr, arr->arr, arr->len * sizeof(void*));
  return arr_clone;
}

void* arr_pop(Arr* arr) {
  if(!arr->len) return 0;
  void* p = arr->arr[--arr->len];
  arr->arr = realloc(arr->arr, arr->len * sizeof(void*));
  return p;
}

void arr_remove(Arr* arr, unsigned int idx) {
  // swap with final index
  arr->arr[idx] = arr->arr[arr->len - 1];
  // truncate
  arr->arr = realloc(arr->arr, sizeof(void*) * (--arr->len));
}

void* arr_peek(Arr* arr) {
  if(!arr->len) return NULL;
  return arr->arr[arr->len-1];
}

void arr_push(Arr* arr, void* pointer) {
  arr->arr = realloc(arr->arr, (arr->len+1) * sizeof(void*));
  arr->arr[arr->len++] = pointer;
}

Arr* arr_append(Arr* a, Arr* b) {
  unsigned int new_len = a->len + b->len;
  a->arr = realloc(a->arr, new_len * sizeof(void*));
  memcpy(a->arr + a->len, b->arr, b->len * sizeof(void*));
  a->len = new_len;
  return a;
}

void arr_print(Arr a) {
  for(unsigned int i = 0; i < a.len; i++) printf("%p ", a.arr[i]);
  printf("\n");
}

void* arr_to_linked_list(Arr* set) {
  if(!set->len) return NULL;
  void** pointer = &set->arr[0];
  for(unsigned int i = 1; i < set->len; i++) {
    *pointer = set->arr[i];
    pointer = set->arr[i];
  }
  *pointer = NULL;
  return set->arr[0];
}

void arr_remove_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx) {
  nchunks = MIN(arr->len, nchunks);
  unsigned int chunk_size = arr->len / nchunks;
  unsigned int chunk_end = ARR_GET_CHUNK_HEAD(arr->len, nchunks, chunk_idx+1) - 1;
  // move elements after chunk into it
  for(unsigned int i = chunk_end; i < arr->len; i += chunk_size) {
    unsigned int current_chunk_size = MIN(chunk_size, arr->len - i);
    memcpy(&arr->arr[i+1], &arr->arr[i], sizeof(void*) * current_chunk_size);
  }
  arr->len -= chunk_idx == nchunks - 1 ? (arr->len - (nchunks * chunk_size)) : chunk_size;
}

void arr_unlink_chunk(Arr* ev, Arr* unlinked_chunks, unsigned int nchunks, unsigned int chunk_idx) {
  nchunks = MIN(ev->len, nchunks);
  unsigned int chunk_size = ev->len / nchunks;
  unsigned int this_chunk_size = chunk_idx == (nchunks - 1) ? ev->len - ((nchunks-1) * chunk_size) : chunk_size;
  // copy chunk to unlinked_chunks
  Arr* chunk = malloc(sizeof(Arr));
  *chunk = arr_init(this_chunk_size);
  arr_push(unlinked_chunks, chunk);
  memcpy(chunk->arr, ev->arr + (chunk_size * chunk_idx), this_chunk_size * sizeof(void*));
  // skip this chunk
  if(chunk_idx != 0) {
    void** head_prev = ev->arr[ARR_GET_CHUNK_HEAD(ev->len, nchunks, chunk_idx) - 1];
    *head_prev = ev->arr[ARR_GET_CHUNK_HEAD(ev->len, nchunks, chunk_idx+1)];
    void** tail = chunk->arr[chunk->len - 1];
    *tail = NULL;
  }
  // remove chunk from ev
  arr_remove_chunk(ev, nchunks, chunk_idx);
}

// relink last chunk in removed_chunks
void arr_relink_chunk(Arr* ev, Arr* unlinked_chunks, unsigned int nchunks) {
  Arr* chunk = arr_pop(unlinked_chunks);
  void** tail = chunk->arr[chunk->len - 1];
  *tail = ev->arr[0];
  ev->arr = realloc(ev->arr, (ev->len + chunk->len) * sizeof(void*));
  memmove(ev->arr + chunk->len, ev->arr, ev->len * sizeof(void*));
  memcpy(ev->arr, chunk->arr, chunk->len * sizeof(void*));
  ev->len += chunk->len;
  arr_free(chunk);
  free(chunk);
}
