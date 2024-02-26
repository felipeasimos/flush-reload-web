(module
    (import "js" "mem" (memory 100 100 shared))
    (func (export $counter) ;; load value at offset to the stack, add it to 1 and store the result back at 4096
        (loop $counter_loop 
            i32.const 0
            i32.const 0
            i64.load
            i64.const 1
            i64.add
            i64.store
            br $counter_loop
        )
    )
)
