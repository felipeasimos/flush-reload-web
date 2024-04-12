(module
    (import "env" "memory" (memory 277 277 shared))
    (func $access (param $offset i32)
        (local $data i64)
        local.get $offset
        i64.load
        local.set $data
    )
    (func $timed_hit (param $offset i32) (result i64)
        (local $time i64)
        (local $data i64)
        local.get $offset
        i64.load
        local.set $data
        ;; get start time and save it to local variable
        i32.const 0
        i64.load
        local.set $time
        ;; perform read from offset
        local.get $offset
        i64.load
        local.set $data
        ;; get end time and return it
        i32.const 0
        i64.load
        local.get $time
        i64.sub
    )
    (func $timed_access (param $offset i32) (result i64)
        (local $time i64)
        (local $data i64)
        ;; get start time and save it to local variable
        i32.const 0
        i64.load
        local.set $time
        ;; perform read from offset
        local.get $offset
        i64.load
        local.set $data
        ;; get end time and return it
        i32.const 0
        i64.load
        local.get $time
        i64.sub
    )
    (func $get_time (result i64)
        i32.const 0
        i64.load
    )
    (func $timed_miss (param $offset i32) (param $linked_list i32) (result i64)
        (local $time i64)
        (local $data i64)
        (local $ptr i32)
        ;; access victim
        local.get $offset
        i64.load
        local.set $data
        ;; go through linked list
        local.get $linked_list
        i32.load
        local.set $ptr
        ;; 
        (
            loop $iter
                local.get $ptr
                i32.load
                local.set $ptr
                local.get $ptr
                i32.eqz
                br_if $iter
        )
        ;; get start time and save it to local variable
        i32.const 0
        i64.load
        local.set $time
        ;; perform read from offset
        local.get $offset
        i64.load
        local.set $data
        ;; get end time and return it
        i32.const 0
        i64.load
        local.get $time
        i64.sub
    )
    (func $evict (param $linked_list i32)
        (local $data i64)
        (local $ptr i32)
        ;; access victim
        (; local.get $offset ;)
        (; i64.load ;)
        (; local.set $data ;)
        ;; go through linked list
        local.get $linked_list
        i32.load
        local.set $ptr
        ;; 
        (
            loop $iter
                local.get $ptr
                i32.load
                local.set $ptr
                local.get $ptr
                i32.eqz
                br_if $iter
        )
    )
    (export "get_time" (func $get_time))
    (export "access" (func $access))
    (export "timed_access" (func $timed_access))
    (export "timed_hit" (func $timed_hit))
    (export "timed_miss" (func $timed_miss))
    (export "evict" (func $evict))
)
