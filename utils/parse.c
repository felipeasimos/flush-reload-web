#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define REDUCER 1
// #define BENTO 1
// #define PLUNGER 1

#define LINE_SIZE 1024

#define S 0
#define R 1
#define M 2

typedef enum ParserState {

  Null = 0,
  Square = 1,
  SquareReduce = 2,
#if defined(PLUNGER) || defined(REDUCER)
  SquareReduceMul = 3,
#endif
#if defined(PLUNGER)
  SquareReduceExp = 4,
#endif

} ParserState;

typedef struct Parser {
  ParserState state;
  uint8_t last[3];
  uint8_t now[3];
  uint8_t just_saw_a_hit;
  uint8_t initialized;
} Parser;

int next(Parser* p, FILE* src) {
  char buf[LINE_SIZE];
  memcpy(p->last, p->now, 3);
  if( 3 != fscanf(src, "%hhu %hhu %hhu", &p->now[S], &p->now[R], &p->now[M]) ) {
    return -1;
  }
  if(p->initialized) return 0;
  if(p->now[S] || p->now[R] || p->now[M]) {
    if(p->just_saw_a_hit) p->initialized = 1;
    p->just_saw_a_hit = 1;
  } 
  return 0;
}

#if defined(PLUNGER)
int parse_plunger_nul(Parser* p) {
  if(p->now[M]) return -2;
  if(!p->now[S] && !p->now[R] && !p->now[M]) return -1;
  if(p->now[S] || !p->now[M]) {
    p->state = Square;
    return -1;
  }
  return -1;
}

int parse_plunger_square(Parser* p) {
  if(!p->now[S] && p->now[M]) return -1;
  if(p->now[M]) {
    p->state = Null;
    return -2;
  }
  if(!p->now[S] && !p->now[R] && !p->now[M]) {
    p->state = SquareReduce;
    return -1;
  }
  return -1;
}

int parse_plunger_square_reduce(Parser* p) {
  if(p->now[S] && !p->now[M]) {
    p->state = Null;
    return -2;
  }
  if(p->now[S] && !p->now[M]) {
    p->state = Null;
    return 0;
  }
  if(!p->now[S] && p->now[M]) {
    p->state = SquareReduceMul;
    return -1;
  }
  if(!p->now[S] && !p->now[R] && !p->now[M]) {
    p->state = SquareReduceExp;
    return -1;
  }
  return -1;
}

int parse_plunger_square_reduce_mul(Parser* p) {
  if(p->now[S]) {
    p->state = Null;
    return -2;
  }
  if((!p->now[S] && !p->now[R] && !p->now[M]) || (p->now[R] && !p->now[S] && !p->now[M])) {
    p->state = Null;
    return -1;
  }
  return -1;
}

int parse_plunger_square_reduce_exp(Parser* p) {
  if(p->now[M]) {
    p->state = SquareReduceMul;
    return -1;
  }
  if(!p->now[S] && !p->now[R] && !p->now[M]) return -1;
}
#endif

#if defined(BENTO)
int parse_bento_nul(Parser* p) {
  // loop
  if(!p->now[S]) return -1;
  // above
  if(p->now[S] && p->now[R] && !(p->last[S] && p->last[R])) {
    p->state = SquareReduce;
    return -1;
  }
  // middle
  if(p->now[S] && !(p->now[R] && !(p->last[S] && p->last[R]))) {
    p->state = Square;
    return -1;
  }
  return -1;
}

int parse_bento_square(Parser* p) {
  // loop above
  if(p->now[R] && p->now[M] && p->now[S] && !p->last[S]) {
    return 1;
  }
  // loop below
  if(!p->now[R]) {
    return -1;
  }
  // above left
  if(p->now[R] && p->now[M] && !(p->now[S] && !(p->last[S]))) {
    p->state = Null;
    return 1;
  }
  // below left
  if(p->now[R] && (!p->now[M] || p->now[S] || !p->last[S])) {
    p->state = Null;
    return 0;
  }
  // middle right
  if(p->now[R] && !p->now[M] && !(p->now[S] && !p->last[S])) {
    p->state = SquareReduce;
    return -1;
  }
  return -1;
}

int parse_bento_square_reduce(Parser* p) {
  // loop above
  if(!(p->now[M] && !p->last[M]) && (p->now[S] || p->now[M] || p->now[R])) {
    return -1;
  }
  // loop below
  if(!(p->now[M] && !p->last[M]) && p->now[S] && !(p->last[S] && !p->last[R] && p->now[R]) && p->now[R]) {
    return 0;
  }
  // above left
  if(p->now[M] && !p->last[M] && p->now[S] && !p->last[S]) {
    p->state = Square;
    return 1;
  }
  // below left
  if(!(p->now[M] && !p->last[M]) && ((!p->now[S] && !p->now[M] && !p->now[R]) || (p->now[S] && !(p->last[S] && !p->last[R] && p->now[R]) && !p->now[R]) )) {
    p->state = Square;
    return -1;
  }
  return -1;
}
#endif

int parse(FILE* src, FILE* dest) {
  Parser p = {0};
  while( next(&p, src) != - 1) {
    int new_bit = -1;
#if defined(BENTO)
    switch(p.state) {
      case Null:
        new_bit = parse_bento_nul(&p);
        break;
      case Square:
        new_bit = parse_bento_square(&p);
        break;
      case SquareReduce:
        new_bit = parse_bento_square_reduce(&p);
        break;
    }
#endif
#if defined(PLUNGER)
    switch(p.state) {
      case Null:
        new_bit = parse_plunger_nul(&p);
        break;
      case Square:
        new_bit = parse_plunger_square(&p);
        break;
      case SquareReduce:
        new_bit = parse_plunger_square_reduce(&p);
        break;
      case SquareReduceMul:
        new_bit = parse_plunger_square_reduce_mul(&p);
        break;
      case SquareReduceExp:
        new_bit = parse_plunger_square_reduce_exp(&p);
        break;
    }
#endif
#if defined(REDUCER)
    new_bit = -1;
    switch(p.state) {
      case Null: {
        if(p.now[S] && !p.now[M]) {
          p.state = Square;
        }
        break;
      }
      case Square: {
        if(p.now[R] && !p.now[M]) {
          p.state = SquareReduce;
        }
        break;
      }
      case SquareReduce: {
        if(p.now[S] && p.now[M] && p.now[R]) {
          p.state = Null;
        } else if((!p.now[R] && p.now[S] && !p.now[M]) || p.now[R] && !p.now[M]) {
          p.state = Square;
          new_bit = 0;
        } else if(!p.now[S] && p.now[M] && !p.now[R]) {
          p.state = SquareReduceMul;
        }
        break;
      }
      case SquareReduceMul: {
        if(p.now[R]) {
          new_bit = 1;
          p.state = Null;
          if(p.now[S]) {
            p.state = Square;
          }
        } else if(p.now[S]) {
          p.state = Square;
        }
        break;
      }
    }
#endif
    if(new_bit != -1) {
      if(new_bit == -2) {
        fprintf(dest, "_");
        continue;
      }
      fprintf(dest, new_bit == 1 ? "1" : "0");
    }
  }
  return 0;
}

void usage() {
  printf("usage: parser SRC DEST\n");
}

int main(int argc, char** argv) {
  if(argc < 3) {
    printf("ERROR: not enough arguments\n");
    goto error;
  }

  FILE* src = NULL, *dest = NULL;
  if(( src = fopen(argv[1], "r") ) == NULL ) {
    printf("ERROR: couldn't open source file\n");
    goto error;
  }

  if(( dest = fopen(argv[2], "w") ) == NULL ) {
    printf("ERROR: couldn't open dest file\n");
    goto error;
  }

  if( parse(src, dest) == -1 ) {
    printf("ERROR: parsing failed!\n");
    goto error;
  }

  fclose(src);
  fclose(dest);
  return 0;
error:
  usage();
  fclose(src);
  fclose(dest);
  return 1;
}
