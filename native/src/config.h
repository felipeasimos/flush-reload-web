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
  void* candidate_pool;
  uint64_t num_measurements;
  uint64_t num_candidates;
  uint64_t num_backtracks;
  uint64_t stride;

  struct stat file_stat;
  int fd;
  void* mmap_base;
} Config;

int parse_config(int argc, char** argv, Config* config);
void close_config(Config* config);
void usage();

#endif
