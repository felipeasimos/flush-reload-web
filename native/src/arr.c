#include "arr.h"
#include <stdlib.h>
#include <string.h>

Arr arr_init(unsigned int len) {
  Arr arr = {
    .len = len,
    .arr = calloc(len, sizeof(void**))
  };
  return arr;
}

void arr_free(Arr arr) {
  free(arr.arr);
}

Arr arr_clone(Arr* arr) {
  Arr arr_clone = {
    .len = arr->len,
    .arr = calloc(arr->len, sizeof(void**))
  };
  memcpy(arr->arr, arr_clone.arr, arr->len * sizeof(void**));
  return arr_clone;
}

void* arr_pop(Arr* arr) {
  if(!arr->len) return 0;
  void* p = arr->arr[arr->len--];
  arr->arr = realloc(arr->arr, arr->len * sizeof(void**));
  return p;
}

void arr_push(Arr* arr, void* pointer) {
  arr->arr = realloc(arr->arr, arr->len * sizeof(void**));
  arr->arr[arr->len++] = pointer;
}

Arr* arr_append(Arr* a, Arr* b) {
  Arr c = {
    .len = a->len + b->len,
    .arr = calloc(a->len + b->len, sizeof(void**))
  };
  unsigned int new_len = a->len + b->len;
  a->arr = realloc(a->arr, new_len * sizeof(void**));
  memcpy(b->arr, c.arr + a->len, b->len * sizeof(void**));
  a->len = new_len;
  return a;
}
