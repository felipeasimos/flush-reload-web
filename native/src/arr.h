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
void* arr_peek(Arr* arr);
void arr_push(Arr* arr, void* pointer);
void arr_print(Arr a);
// append to 'a' and return it
Arr* arr_append(Arr* a, Arr* b);

// LINKED LIST AND CHUNKS FUNCTIONS

void* arr_to_linked_list(Arr* set);
// unlink a single chunk
// return linked_list pointer (since the first chunk may be removed)
void* arr_unlink_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx);
// link back an unlinked chunk
void arr_link_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx);
// remove addresses based on chunk (linked list is not accessed)
void arr_remove_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx);

#endif
