(module
    (import "env" "memory" (memory 313 313 shared))
    (func $access (param $offset i32)
        (local $data i64)
        local.get $offset
        i64.load
        local.set $data
    )
    (func $wait (param $wait_cycles i32) (param $time_slot_size i32)
        (local $t i32)
        ;; get initial time
        i32.const 256
        atomic.fence
        i32.atomic.load
        local.set $t
        (loop $iter
            local.get $time_slot_size
            i32.const 256
            i32.atomic.load
            local.get $t
            i32.sub
            i32.gt_u 
            (br_if $iter)
        )
    )
    (func $get_time (result i32)
        i32.const 256
        i32.atomic.load
    )
    (func $evict (param $linked_list i32)
        (local $td i32)
        ;; traverse
        (local.set $td (local.get $linked_list))
        (loop $iter
            (local.set $td (i32.load (local.get $td)))
            (br_if $iter (local.get $td))
        )
    )
    (func $timed_hit (param $victim i32) (result i64)
        (local $t0 i64)
        local.get $victim
        i64.load
        i64.eqz
        i32.const 256
        i32.or
        atomic.fence
        i64.atomic.load
        local.set $t0
        (; (call $access (local.get $victim)) ;)
        local.get $t0
        i64.eqz
        local.get $victim
        i32.or
        i64.load
        (; local.set $data ;)
        ;; get_time
        (; local.get $data ;)
        i64.eqz
        i32.const 256
        i32.or
        (; atomic.fence ;)
        i64.atomic.load
        local.get $t0
        i64.sub
    )
    (func $timed_access (param $victim i32) (result i32)
        (local $time i32)
        i32.const 256
        atomic.fence
        i32.atomic.load
        local.set $time
        (; (call $access (local.get $victim)) ;)
        local.get $time
        i32.eqz
        local.get $victim
        i32.or
        i64.load
        (; local.set $data ;)
        ;; get_time
        (; local.get $data ;)
        i64.eqz
        i32.const 256
        i32.or
        (; atomic.fence ;)
        i32.atomic.load
        local.get $time
        i32.sub
    )
    (func $timed_miss (param $victim i32) (param $linked_list i32) (result i32)
        (local $time i32)
        (local $td i32)
        (local $data i64)
        (; (call $access (local.get $victim)) ;)
        local.get $victim
        i64.load
        local.set $data
        (; (call $evict (local.get $linked_list)) ;)
        (local.set $td (local.get $linked_list))
        (loop $iter
            (local.set $td (i32.load (local.get $td)))
            (br_if $iter (local.get $td))
        )
        ;; get_time
        i32.const 256
        atomic.fence
        i32.atomic.load
        local.set $time
        (; (call $access (local.get $victim)) ;)
        local.get $time
        i32.eqz
        local.get $victim
        i32.or
        i64.load
        (; local.set $data ;)
        ;; get_time
        (; local.get $data ;)
        i64.eqz
        i32.const 256
        i32.or
        (; atomic.fence ;)
        i32.atomic.load
        local.get $time
        i32.sub
    )
    (func $probe (param $victim i32) (param $linked_list i32) (result i32)
        (local $time i32)
        (local $td i32)
        i32.const 256
        atomic.fence
        i32.atomic.load
        local.set $time
        (; (call $access (local.get $victim)) ;)
        local.get $time
        i32.eqz
        local.get $victim
        i32.or
        i64.load
        (; local.set $data ;)
        ;; get_time
        (; local.get $data ;)
        i64.eqz
        i32.const 256
        i32.or
        (; atomic.fence ;)
        i32.atomic.load
        local.get $time
        i32.sub
        local.set $time
        (local.set $td (local.get $linked_list))
        (loop $iter
            (local.set $td (i32.load (local.get $td)))
            (br_if $iter (local.get $td))
        )
        local.get $time
    )
    (export "get_time" (func $get_time))
    (export "access" (func $access))
    (export "timed_access" (func $timed_access))
    (export "timed_hit" (func $timed_hit))
    (export "timed_miss" (func $timed_miss))
    (export "evict" (func $evict))
    (export "wait" (func $wait))
    (export "probe" (func $probe))
)
