(module
    (import "env" "memory" (memory 308 308 shared))
    (func (export "counter") ;; load value at offset to the stack, add it to 1 and store the result back at 4096
        (loop $counter_loop 
            i32.const 256
            i32.const 256
            i64.load
            i64.const 1
            i64.add
            i64.store
            (; i32.const 256 ;)
            (; i64.const 1 ;)
            (; i64.atomic.rmw.add ;)
            br $counter_loop
        )
    )
)
