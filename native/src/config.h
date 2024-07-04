#ifndef _ARGS_H
#define _ARGS_H

#include <stdint.h>
#include <stdio.h>
#include <sys/stat.h>

typedef struct Config {
  void** addrs;
  uint64_t wait_cycles;
  uint64_t threshold;
  uint64_t time_slots;
  uint64_t time_slot_size;
  size_t num_addrs;
  float minimal_miss_ratio;
  float gpg_delay_secs;
  uint64_t num_measurements;
  uint64_t num_candidates;
  uint64_t num_backtracks;
  uint64_t page_size;
  uint64_t associativity;

  struct stat file_stat;
  int fd;
  void* mmap_base;
  void* candidate_pools[];
} Config;

int parse_config(char* path_to_config, Config** config);
void free_config(Config* config);
void usage();

#endif
