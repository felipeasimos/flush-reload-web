#include "arr.h"
#include "config.h"
#include "ev.h"
#include <stdio.h>

static inline __attribute__((always_inline)) uint64_t slow_access_time(uint8_t* p) {
    access_addr(p);
    clflush(p);
    fence();
    return load_time(p);
}

unsigned int get_threshold(void* target) {
  unsigned int t = 0;
  unsigned int num_measurements = 100000;
  for(unsigned int i = 0; i < num_measurements; i++) {
    t += slow_access_time(target);
  }
  return t / num_measurements;
}

int main(int argc, char** argv) {
  Config config;
  if (parse_config(argc, argv, &config) == -1) return 1;
  printf("num_measurements: %lu\n", config.num_measurements);
  printf("num_candidates: %lu\n", config.num_candidates);
  printf("page_size: %lu\n", config.page_size);
  float percentage = 0;
  void* target = config.addrs[0];
  printf("target: %p\n", target);
  // void* target = config.mmap_base;
  printf("threshold (found): %u\n", get_threshold(target));
  for(unsigned int j = 0; j < 100; j++) {
    // 1. generate candidate set
    Arr candidates = generate_candidate_set(&config, target);
    // 2. generate candidate set
    Arr ev = generate_eviction_set(&config, target, candidates);
    while(ev.len != CACHE_ASSOCIATIVITY) {
      arr_free(&ev);
      ev = generate_eviction_set(&config, target, candidates);
    }
    printf("ev.len: %u\n", ev.len);
    const unsigned int total = 1000000;
    unsigned int fail = 0;

    for(unsigned int i = 0; i < total; i++) {
      unsigned int t = timed_miss(ev.arr[0], target);
      // unsigned int t = 
      // printf("\33[48;2;%u;%u;%um \33[0m", t, t, t);
      fail += (t < config.threshold);
    }
    float current_percentage = (float)fail / (float)total;
    printf("current error(%u): %f\n", j, current_percentage);
    percentage += current_percentage;
    printf("running error: %f\n", percentage / (j+1));
    arr_free(&candidates);
    arr_free(&ev);
  }
  free_config(&config);
  return 0;
}
