#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>
#include "fr.h"
#include "config.h"

// #define WITHOUT_TIMING 1

#define wait(cycles) for(volatile uint64_t _i = 0; _i < cycles; _i++)

static inline __attribute__((always_inline)) uint64_t probe(uint8_t* p) {
  volatile uint64_t t = load_time(p);
  clflush(p);
  fence();
  return t;
}

void spy(void** addrs, uint32_t num_addrs, uint16_t* results, uint32_t num_results, uint64_t wait_cycles, uint64_t time_slot_size, uint64_t threshold) {
  uint32_t total_num_results = num_results * num_addrs;
  for(uint32_t slot_idx = 0; slot_idx < total_num_results; slot_idx+=3) {
#if !defined(WITHOUT_TIMING)
    for(uint32_t addr_idx = 0; addr_idx < num_addrs; addr_idx++) {
      results[slot_idx + addr_idx] = probe(addrs[addr_idx]); 
    }
    wait(wait_cycles);
#else
    uint64_t start_time = rdtscp();
    for(uint32_t addr_idx = 0; addr_idx < num_addrs; addr_idx++) {
      results[slot_idx + addr_idx] |= probe(addrs[addr_idx]) < threshold; 
    }
    do {
      wait(wait_cycles);
    } while(rdtscp() - start_time < time_slot_size);
#endif
  }
}

int main(int argc, char** argv) {
  Config config;
  if( parse_config(argc, argv, &config) == -1 ) return 1;
  // create addresses
  void* addrs[config.num_addrs];
  memcpy(addrs, config.addrs, config.num_addrs * sizeof(unsigned long*));
  uint32_t total_results = config.num_addrs * config.time_slots;
  uint16_t results[total_results];
  memset(results, 0x00, total_results * sizeof(uint16_t));

  printf("num_addrs: %lu\n", config.num_addrs);
  printf("mmap_base: %p\n", config.mmap_base);
  printf("time_slots: %lu\n", config.time_slots);
  printf("wait_cycles: %lu\n", config.wait_cycles);
  printf("time slot size: %lu\n", config.time_slot_size);
  printf("threshold: %lu\n", config.threshold);
  for(uint32_t i = 0; i < config.num_addrs; i++) {
    printf("\taddr[%u] = %p\n", i, config.addrs[i]);
  }
  fprintf(stderr, "\t|||  ...starting spy...  |||\n");
  spy(addrs, config.num_addrs, results, config.time_slots, config.wait_cycles, config.time_slot_size, config.threshold);
  fprintf(stderr, "\t|||   ...closed spy...   |||\n");

  FILE* report = NULL;
  if((report = fopen("report.plot", "w")) == NULL) {
    printf("ERROR: couldn't create report file\n");
    goto report_error;
  }
  for(uint32_t i = 0; i < total_results; i+=config.num_addrs) {
    fprintf(report, "%hu", results[i]);
    for(size_t j = 1; j < config.num_addrs; j++) {
      fprintf(report, " %hu", results[i + j]);
    }
    fprintf(report, "\n");
  } 
  fclose(report);
  close_config(&config);
  return 0;
report_error:
  fclose(report);
error:
  return 1;
}
