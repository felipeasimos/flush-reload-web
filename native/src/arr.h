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
void arr_remove(Arr* arr, unsigned int idx);
// pop 'a' elements from arr
void** arr_split(Arr* arr, unsigned int a);
void* arr_peek(Arr* arr);
void arr_push(Arr* arr, void* pointer);
// append to 'a' and return it
Arr* arr_append(Arr* a, Arr* b);
void* to_linked_list(Arr* set);
void* to_linked_list_without(Arr* set, unsigned int idx);
void arr_print(Arr a);

#endif
