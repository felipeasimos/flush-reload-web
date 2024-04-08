#ifndef ARR_H
#define ARR_H

#define MIN(a, b) a < b ? a : b
#define ARR_GET_CHUNK_HEAD(arr_size, nchunks, chunk_idx) (arr_size / MIN(arr_size, nchunks)) * (chunk_idx)

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
void arr_unshift(Arr* arr, void* pointer);
void arr_print(Arr a);
// append to 'a' and return it
Arr* arr_append(Arr* a, Arr* b);

// LINKED LIST AND CHUNKS FUNCTIONS

void* arr_to_linked_list(Arr* set);
void arr_remove_chunk(Arr* arr, unsigned int nchunks, unsigned int chunk_idx);
void arr_unlink_chunk(Arr* ev, Arr* unlinked_chunks, unsigned int nchunks, unsigned int chunk_idx);
// relink last chunk in removed_chunks
void arr_relink_chunk(Arr* ev, Arr* unlinked_chunks, unsigned int nchunks);

#endif
