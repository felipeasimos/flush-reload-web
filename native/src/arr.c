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
