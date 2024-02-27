(module
    (import "env" "memory" (memory 100 100 shared))
    (func $access (param $offset i32)
        local.get $offset
        i64.load8_u
        drop
    )
    (func $timed_access (param $offset i32) (result i64)
        (local i64)
        ;; get start time and save it to local variable
        i32.const 0
        i64.load
        local.set 1
        ;; perform read from offset
        local.get $offset
        i64.load8_u
        drop
        ;; get end time and return it
        i32.const 0
        i64.load
        local.get 1
        i64.sub
    )
    (func $get_time (result i64)
        i32.const 0
        i64.load
    )
    (export "get_time" (func $get_time))
    (export "access" (func $access))
    (export "timed_access" (func $timed_access))
)
