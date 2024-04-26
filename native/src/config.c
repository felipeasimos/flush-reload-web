#include "config.h"
#include <sys/mman.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

#define BUFFER_SIZE 4096

void usage() {
  printf("usage: CONFIG_FILE\n");
}

#define CHECK_IF_FIELD(field) strncmp(field, buf, size) == 0
#define SSCANF(field, format, cast)\
  do {\
    if( 1 != sscanf(space+1, format, cast &config->field) ) {\
      printf("ERROR: couldn't parse" #field);\
      goto error;\
    }\
    continue;\
  } while(0);

#define PARSE(field, format, cast)\
do {\
  if( CHECK_IF_FIELD(#field) ) {\
    SSCANF(field, format, cast);\
  }\
} while(0);

int parse_config(char* path_to_config, Config* config) {
  char target_filename[BUFFER_SIZE];
  memset(config, 0x00, sizeof(Config));
  FILE* config_file = NULL;
  if(( config_file = fopen(path_to_config, "r")) == NULL ) {
    printf("ERROR: couldn't open config file\n");
    goto error;
  }
  char buf[BUFFER_SIZE];
  // one line per iteration (unless you are playing too much with the gpg-native.probe file)
  while( fgets(buf, BUFFER_SIZE, config_file) ) {
    char* space = strchr(buf, ' ');
    size_t size = space - buf;
    PARSE(wait_cycles, "%lu", (unsigned long*));
    PARSE(threshold, "%lu", (unsigned long*));
    PARSE(minimal_miss_ratio, "%f", (float*))
    PARSE(gpg_delay_secs, "%f", (float*))
    PARSE(time_slots, "%lu", (unsigned long*));
    PARSE(time_slot_size, "%lu", (unsigned long*));
    PARSE(page_size, "%lu", (unsigned long*));
    PARSE(num_candidates, "%lu", (unsigned long*));
    PARSE(num_measurements, "%lu", (unsigned long*));
    PARSE(num_backtracks, "%lu", (unsigned long*));
    PARSE(associativity, "%lu", (unsigned long*));
    // PARSE(candidate_pool, "%p", (void**));
    if( CHECK_IF_FIELD("probe") ) {
      config->addrs = realloc(config->addrs, (++config->num_addrs) * sizeof(void*));
      SSCANF(addrs[config->num_addrs-1], "%lX", (unsigned long*));
    }
    if( CHECK_IF_FIELD("target_file") ) {
      if( 1 != sscanf(space+1, "%s", target_filename) ) {
        printf("ERROR: couldn't parse target_file name\n");
        goto error;
      }
      continue;
    }
  }
  FILE* target_file = NULL;
  if(( target_file = fopen(target_filename, "r") ) == NULL) {
    printf("ERROR: couldn't open target file\n");
    goto error;
  }
  config->fd = fileno(target_file);
  // get file descriptor
  if(config->fd == -1) {
    printf("ERROR: couldn't get file descriptor\n");
    goto error;
  }
  // get file size
  if(fstat(config->fd, &config->file_stat) == -1) {
    printf("ERROR: couldn't get stats about file\n");
    goto error;
  }
  // get mmap memory of target file
  config->mmap_base = mmap(NULL, config->file_stat.st_size, PROT_READ, MAP_SHARED, config->fd, 0);
  if(config->mmap_base == MAP_FAILED) {
    printf("ERROR: couldn't make mmap call successfully\n");
    goto error;
  }
  // get mmap memory for candidate pool
  config->candidate_pool = mmap(NULL, config->num_candidates * config->page_size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
  // update addresses
  for(uint32_t i = 0; i < config->num_addrs; i++) config->addrs[i] += (size_t)config->mmap_base;
  return 0;
error:
  usage();
  return -1;
}

void free_config(Config* config) {
  if(config->mmap_base) munmap(config->mmap_base, config->file_stat.st_size);
  if(config->candidate_pool) munmap(config->candidate_pool, config->num_candidates * config->page_size);
  if(config->fd) {
    close(config->fd);
  }
  free(config->addrs);
  config->addrs = NULL;
  config->num_addrs = config->fd = 0;
  config->mmap_base = NULL;
} 
