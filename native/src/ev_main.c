#include "arr.h"
#include "config.h"
#include "ev.h"
#include <stdio.h>

static inline __attribute__((always_inline)) uint64_t slow_access_time(uint8_t* p) {
    clflush(p);
    fence();
    return load_time(p);
}

int main(int argc, char** argv) {
  Config config;
  if (parse_config(argc, argv, &config) == -1) return 1;
  printf("num_measurements: %lu\n", config.num_measurements);
  printf("num_candidates: %lu\n", config.num_candidates);
  printf("stride: %lu\n", config.stride);
  float percentage = 0;
  for(unsigned int j = 0; j < 100; j++) {
    // 1. generate candidate set (generate pool internally)
    Arr candidates = generate_candidate_set(&config, config.mmap_base);
    // 2. generate candidate set
    Arr ev = generate_eviction_set(&config, config.mmap_base, candidates);
    const unsigned int total = 100000;
    unsigned int fail = 0;

    for(unsigned int i = 0; i < total; i++) {
      unsigned int t = timed_miss(candidates.arr[0], config.mmap_base);
      // printf("\33[48;2;%u;%u;%um \33[0m", t, t, t);
      fail += (t < config.threshold);
    }
    float current_percentage = (float)fail / (float)total;
    printf("current error(%u): %f\n", j, current_percentage);
    percentage += current_percentage;
    printf("total percentage: %f\n", percentage / 100);
    arr_free(&candidates);
    arr_free(&ev);
  }
  free_config(&config);
  return 0;
}
