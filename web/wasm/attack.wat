(module
    (import "env" "memory" (memory 295 295 shared))
    (func $access (param $offset i32)
        (local $data i64)
        local.get $offset
        i64.load
        local.set $data
    )
    (func $wait (param $time_slot_size i32)
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
        atomic.fence
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
        atomic.fence
        i32.atomic.load
        local.get $time
        i32.sub
    )
    (func $timed_access_evset (param $evset i32) (result i32)
        (local $time i32)
        (local $td i32)
        i32.const 256
        atomic.fence
        i32.atomic.load
        local.set $time
        (; (call $access (local.get $victim)) ;)
        local.get $time
        i32.eqz
        local.get $evset
        i32.or
        i32.load
        ;; traverse
        (local.set $td)
        (loop $iter
            (local.set $td (i32.load (local.get $td)))
            (br_if $iter (local.get $td))
        )
        (local.get $td)
        (; local.set $data ;)
        ;; get_time
        (; local.get $data ;)
        i32.const 256
        i32.or
        atomic.fence
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
        atomic.fence
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
        atomic.fence
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
    (func $probe_loop (param $num_victims i32) (param $victims i32) (param $evsets i32) (param $results i32) (param $results_max i32) (param $time_slot_size i32)
        (local $victim_idx i32)
        (local $time i32)
        (local $victim i32)
        (local $evset i32)
        (local $td i32)
        (local $wait_time i32)
        local.get $num_victims
        i32.const 4
        i32.mul
        local.set $num_victims
        (loop $result_iter
            (local.set $victim_idx (i32.const 0))
            i32.const 256
            atomic.fence
            i32.atomic.load
            local.set $wait_time
            (loop $victim_iter
                ;; get victim address
                local.get $victims
                local.get $victim_idx
                i32.add
                i32.load
                local.set $victim
                ;; get evset address
                local.get $evsets
                local.get $victim_idx
                i32.add
                i32.load
                local.set $evset
                ;; save to result
                i32.const 256
                atomic.fence
                i32.atomic.load
                local.set $time
                (; (call $access (local.get $victim)) ;)
                local.get $time
                i32.eqz
                local.get $victim
                i32.or
                i32.load
                ;; get_time
                i32.eqz
                i32.const 256
                i32.or
                atomic.fence
                i32.atomic.load
                ;; subtração dos valores temporais
                local.get $time
                i32.sub
                local.set $time
                (local.set $td (local.get $evset))
                (loop $iter
                    (local.set $td (i32.load (local.get $td)))
                    (br_if $iter (local.get $td))
                )
                local.get $results
                local.get $time
                i32.store
                ;; update results pointer
                (local.set $results (i32.add (i32.const 4) (local.get $results)))
                ;; update victim_idx
                (local.set $victim_idx (i32.add (i32.const 4) (local.get $victim_idx)))
                ;; victim loop condition
                (i32.lt_u (local.get $victim_idx) (local.get $num_victims))
                (br_if $victim_iter)
            )
            ;; wait
            (loop $wait_iter
                local.get $time_slot_size
                i32.const 256
                atomic.fence
                i32.atomic.load
                local.get $wait_time
                i32.sub
                i32.gt_u 
                (br_if $wait_iter)
            )
            (i32.lt_u (local.get $results) (local.get $results_max))
            (br_if $result_iter)
        )
    )
    (export "get_time" (func $get_time))
    (export "access" (func $access))
    (export "timed_access" (func $timed_access))
    (export "timed_access_evset" (func $timed_access_evset))
    (export "timed_hit" (func $timed_hit))
    (export "timed_miss" (func $timed_miss))
    (export "evict" (func $evict))
    (export "wait" (func $wait))
    (export "probe" (func $probe))
    (export "probe_loop" (func $probe_loop))
)
