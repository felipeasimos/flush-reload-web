#include "arr.h"
#include "config.h"
#include "ev.h"
#include <stdio.h>


int main(int argc, char** argv) {
  Config config;
  if (parse_config(argc, argv, &config) == -1) return 1;
  printf("num_measurements: %lu\n", config.num_measurements);
  printf("num_candidates: %lu\n", config.num_candidates);
  printf("stride: %lu\n", config.stride);
  // 1. generate candidate set (generate pool internally)
  Arr candidates = generate_candidate_set(&config, config.mmap_base);
  printf("generated candidate set\n");
  // 2. generate candidate set
  Arr ev = generate_eviction_set(&config, config.mmap_base, candidates);
  printf("generated eviction set\n");
  const unsigned int total = 1000;
  unsigned int fail = 0;
  for(unsigned int i = 0; i < total; i++) {
    unsigned int t = timed_miss(ev.arr[0], config.mmap_base);
    printf("\33[48;2;%u;%u;%um \33[0m", t, t, t);
    fail += t < config.threshold;
  }
  printf("fail: %u\n", fail);
  printf("total: %u\n", total);
  printf("\nerror: %f\n", (float)fail / (float)total);
  free_config(&config);
  arr_free(&candidates);
  arr_free(&ev);

  return 0;
}
