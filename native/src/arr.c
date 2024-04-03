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

#define MIN(a, b) a < b ? a : b;
void* arr_unlink_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx) {
  nchunks = MIN(arr->len, nchunks);
  unsigned int chunk_size = arr->len / nchunks;
  // if first chunk, return second chunk head
  if(!chunk_idx) return arr->arr[chunk_size];
  void** pointer = arr->arr[(chunk_size * chunk_idx) - 1];
  // if its the last one, set second last chunk tail to NULL
  *pointer = chunk_idx == nchunks - 1 ? NULL : arr->arr[chunk_size * chunk_idx];
  return arr->arr[0];
}

// link back an unlinked chunk
void arr_link_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx) {
  nchunks = MIN(arr->len, nchunks);
  unsigned int chunk_size = arr->len / nchunks;
  // if first chunk, return first address
  if(!chunk_idx) return;
  void** pointer = arr->arr[(chunk_size * chunk_idx) - 1];
  *pointer = arr->arr[chunk_size * chunk_idx];
}

// remove addresses based on chunk (linked list is not accessed)
void arr_remove_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx) {
  nchunks = MIN(arr->len, nchunks);
  unsigned int chunk_size = arr->len / nchunks;
  unsigned int chunk_end = chunk_size * (chunk_idx + 1);
  // move elements after chunk into it
  for(unsigned int i = chunk_end; i < arr->len; i += chunk_size) {
    unsigned int current_chunk_size = MIN(chunk_size, arr->len - i);
    memcpy(&arr->arr[i+1], &arr->arr[i], sizeof(void*) * current_chunk_size);
  }
  arr->len -= chunk_idx == nchunks - 1 ? (arr->len - (nchunks * chunk_size)) : chunk_size;
}
