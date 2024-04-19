(module
    (import "env" "memory" (memory 308 308 shared))
    (func (export "counter") ;; load value at offset to the stack, add it to 1 and store the result back at 4096
        (loop $counter_loop 
            (; i32.const 255 ;)
            (; i32.const 255 ;)
            (; i64.load ;)
            (; i64.const 1 ;)
            (; i64.add ;)
            (; i64.store ;)
            (;;)
            (; i32.const 127 ;)
            (; i32.const 127 ;)
            (; i64.load ;)
            (; i64.const 1 ;)
            (; i64.add ;)
            (; i64.store ;)

            (i64.store (i32.const 256) (i64.add (i64.load (i32.const 256)) (i64.const 1)))

            (; i32.const 128 ;)
            (; i32.const 1 ;)
            (; i32.atomic.rmw.add ;)
            (;;)
            (; i32.const 256 ;)
            (; i32.const 1 ;)
            (; i32.atomic.rmw.add ;)


            (; i32.const 256 ;)
            (; i32.const 256 ;)
            (; i32.atomic.load ;)
            (; i32.const 1 ;)
            (; i32.add ;)
            (; i32.atomic.store ;)

            br $counter_loop
        )
    )
)
