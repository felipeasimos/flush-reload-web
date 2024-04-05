#include "ev.h"
#include <stdio.h>

#define NUMBER_OF_TESTS 10000

int main(int argc, char** argv) {
  Config config;
  if (parse_config(argc, argv, &config) == -1) return 1;
  printf("num_measurements: %lu\n", config.num_measurements);
  printf("num_candidates: %lu\n", config.num_candidates);
  printf("stride: %lu\n", config.stride);
  // 1. generate candidate set (generate pool internally)
  Arr candidates = generate_candidate_set(&config, config.mmap_base);
  // 2. generate candidate set

  return 0;
}
