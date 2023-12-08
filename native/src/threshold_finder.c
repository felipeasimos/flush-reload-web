#include <stdio.h>
#include <sys/mman.h>
#include <string.h>
#include "fr.h" 

#define TRAIN_ITERATIONS 1000000
#define MMAP_SIZE 4096

typedef struct fr_stats {
  uint64_t avg;
  uint64_t min;
  uint64_t max;
} fr_stats;

#define GET_TRAIN_STATS(p, func, stats)\
  for(uint64_t i = 0; i < TRAIN_ITERATIONS; i++) {\
    uint64_t t = func(p);\
    if(t < stats->min) stats->min = t;\
    if(t > stats->max) stats->max = t;\
    stats->avg += t;\
  }\
  stats->avg /= TRAIN_ITERATIONS;

static inline __attribute__((always_inline)) uint64_t fast_access_time(uint8_t* p) {
    access_addr(p);
    fence();
    return load_time(p);
}

static inline __attribute__((always_inline)) uint64_t slow_access_time(uint8_t* p) {
    clflush(p);
    fence();
    return load_time(p);
}

uint64_t get_threshold(uint8_t quiet) {
  fr_stats fast = {
    .min = (uint64_t)-1,
    .max = 0,
    .avg = 0
  };
  fr_stats slow = {
    .min = (uint64_t)-1,
    .max = 0,
    .avg = 0
  };
  void* memory = mmap(NULL, MMAP_SIZE, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_POPULATE, -1, 0);
  void* p = memory + MMAP_SIZE/2;
  GET_TRAIN_STATS(p, fast_access_time, (&fast));
  GET_TRAIN_STATS(p, slow_access_time, (&slow));
  if(!quiet) {
    printf("fast - avg: %lu, min: %lu, max: %lu\n", fast.avg, fast.min, fast.max);
    printf("slow - avg: %lu, min: %lu, max: %lu\n", slow.avg, slow.min, slow.max);
  }
  munmap(memory, MMAP_SIZE);
  uint64_t avg = (fast.avg + slow.avg) / 2;
  return avg;
}

int main(int argc, char **argv)
{
    uint8_t quiet = 0;
    if(argc > 1) {
      if(strcmp(argv[1], "--quiet") == 0 || strcmp(argv[1], "-q") == 0) {
        quiet = 1;
      }
    }
    uint64_t threshold = get_threshold(quiet);
    if(quiet) {
      printf("%lu\n", threshold);
    } else {
      printf("threshold: %lu\n", threshold);
    }
    return 0;
}
