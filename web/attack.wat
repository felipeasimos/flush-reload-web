(module
    (import "js" "mem" (memory 100 100 shared))
    (import "wasm" "get_time" (func $get_time (result i64)))
    (func (export "access") (param $offset i32)
        local.get $offset
        i64.load8_u
        drop
    )
    (func (export "timed_access") (param $offset) (result i64)
        (local i64)
        ;; get start time and save it to local variable
        call $get_time
        local.set 1
        ;; perform read from offset
        local.get $offset
        i64.load8_u
        ;; get end time and return it
        call $get_time
        local.get 1
        i64.sub
    )
    (func (export $get_time) (result i64)
        i32.const 0
        i64.load
    )
)
