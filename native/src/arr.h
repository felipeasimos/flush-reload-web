#ifndef ARR_H
#define ARR_H

typedef struct Arr {
  unsigned int len;
  void** arr;
} Arr;

Arr arr_init(unsigned int len);
void arr_free(Arr* arr);
Arr arr_clone(Arr* arr);
void* arr_pop(Arr* arr);
void arr_push(Arr* arr, void* pointer);
// append to 'a' and return it
Arr* arr_append(Arr* a, Arr* b);
void* to_linked_list(Arr* set);

#endif
