(module
    (import "env" "memory" (memory 308 308 shared))
    (func $access (param $offset i32)
        (local $data i64)
        local.get $offset
        i64.load
        local.set $data
    )
    (func $timed_access (param $victim i32) (result i64)
        (local $t0 i64)
        (local $t1 i64)
        (local $data i64)
        (; (; (local $data i64) ;) ;)
        (; (local.set $time (call $get_time)) ;)
        (; (; (local.set $time (i64.atomic.load (i32.const 256))) ;) ;)
        (; (call $access (local.get $victim)) ;)
        (; (; local.get $victim ;) ;)
        (; (; i64.load ;) ;)
        (; (; local.set $data ;) ;)
        (; (call $get_time) ;)
        (; (; (i64.atomic.load (i32.const 256)) ;) ;)
        (; (local.get $time) ;)
        (; (i64.sub) ;)
        i32.const 256
        atomic.fence
        i64.atomic.load
        local.set $t0
        (; (call $access (local.get $victim)) ;)
        local.get $t0
        i64.eqz
        local.get $victim
        i32.or
        i64.load
        local.set $data
        ;; get_time
        local.get $data
        i64.eqz
        i32.const 256
        i32.or
        i64.atomic.load
        local.set $t1
        local.get $t1
        local.get $t0
        i64.sub
        return
    )
    (func $get_time (result i64)
        i32.const 256
        i64.atomic.load
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
        (local $t1 i64)
        (local $data i64)
        (; (local $time i64) ;)
        (; (local $data i64) ;)
        (; local.get $victim ;)
        (; i64.load ;)
        (; local.set $data ;)
        (; (local.set $time (call $get_time)) ;)
        (; (local.set $time (i64.atomic.load (i32.const 256))) ;)
        (; (call $access (local.get $victim)) ;)
        (; local.get $victim ;)
        (; i64.load ;)
        (; local.set $data ;)
        (; (call $get_time) ;)
        (; (i64.atomic.load (i32.const 256)) ;)
        (; (local.get $time) ;)
        (; (i64.sub) ;)
        local.get $victim
        i64.load
        local.set $data
        local.get $data
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
        local.set $data
        ;; get_time
        local.get $data
        i64.eqz
        i32.const 256
        i32.or
        i64.atomic.load
        local.set $t1
        local.get $t1
        local.get $t0
        i64.sub
        return
    )

    (func $timed_miss (param $victim i32) (param $linked_list i32) (result i64)
        (local $t0 i64)
        (local $t1 i64)
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
        (; (call $timed_access (local.get $victim)) ;)
        (; (local.set $time (call $get_time)) ;)
        (; (local.set $t0 (i64.atomic.load (i32.const 256))) ;)
        ;; get_time
        local.get $td
        i32.eqz
        i32.eqz
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
        local.set $data
        ;; get_time
        local.get $data
        i64.eqz
        i32.const 256
        i32.or
        i64.atomic.load
        local.set $t1
        local.get $t1
        local.get $t0
        i64.sub
        return
    )
    (export "get_time" (func $get_time))
    (export "access" (func $access))
    (export "timed_access" (func $timed_access))
    (export "timed_hit" (func $timed_hit))
    (export "timed_miss" (func $timed_miss))
    (export "evict" (func $evict))
)
