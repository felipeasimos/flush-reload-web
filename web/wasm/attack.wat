(module
    (import "env" "memory" (memory 308 308 shared))
    (func $access (param $offset i32)
        (local $data i64)
        local.get $offset
        i64.atomic.load
        local.set $data
    )
    (; (func $timed_hit (param $offset i32) (result i64) ;)
    (;     (local $time i64) ;)
    (;     (local $data i64) ;)
    (;     local.get $offset ;)
    (;     i64.load ;)
    (;     local.set $data ;)
    (;     ;; get start time and save it to local variable ;)
    (;     i32.const 256 ;)
    (;     i64.load ;)
    (;     local.set $time ;)
    (;     ;; perform read from offset ;)
    (;     local.get $offset ;)
    (;     i64.load ;)
    (;     local.set $data ;)
    (;     ;; get end time and return it ;)
    (;     i32.const 256 ;)
    (;     i64.load ;)
    (;     local.get $time ;)
    (;     i64.sub ;)
    (; ) ;)
    (func $timed_hit (param $victim i32) (result i64)
        (local $t0 i64)
        (local $t1 i64)
        (local $td i64)
        ;; acces victim
        (local.set $td (i64.load (i32.and (i32.const 0xffffffff) (local.get $victim))))
        ;; t0 (mem[0])
        (local.set $t0 (i64.load (i32.and (i32.const 0xffffffff) (i32.or (i32.const 256) (i32.eqz (i64.eqz (local.get $td)))))))
        ;; re-access
        (local.set $td (i64.load (i32.and (i32.const 0xffffffff) (i32.or (local.get $victim) (i64.eqz (local.get $t0))))))
        ;; t1 (mem[0])
        (local.set $t1 (i64.load (i32.and (i32.const 0xffffffff) (i32.or (i32.const 256) (i32.eqz (i64.eqz (local.get $td)))))))
        (i64.sub (local.get $t1) (local.get $t0))
        return)
    (func $timed_access (param $offset i32) (result i64)
        (local $t0 i64)
        (local $t1 i64)
        (local $data i64)
        ;; get start time and save it to local variable
        i32.const 256
        i64.atomic.load
        local.set $t0
        ;; perform read from offset
        local.get $offset
        i64.load
        local.set $data
        ;; get end time and return it
        i32.const 256
        i64.atomic.load
        local.set $t1
        local.get $t0
        local.get $t1
        i64.sub
    )
    (func $get_time (result i64)
        i32.const 256
        i64.atomic.load
    )
    (; (func $timed_miss (param $offset i32) (param $linked_list i32) (result i64) ;)
    (;     (local $time i64) ;)
    (;     (local $data i64) ;)
    (;     (local $ptr i32) ;)
    (;     ;; access victim ;)
    (;     local.get $offset ;)
    (;     i64.load ;)
    (;     local.set $data ;)
    (;     ;; go through linked list ;)
    (;     local.get $linked_list ;)
    (;     i32.load ;)
    (;     local.set $ptr ;)
    (;     ;;  ;)
    (;     ( ;)
    (;         loop $iter ;)
    (;             local.get $ptr ;)
    (;             i32.atomic.load ;)
    (;             local.set $ptr ;)
    (;             local.get $ptr ;)
    (;             i32.eqz ;)
    (;             br_if $iter ;)
    (;     ) ;)
    (;     ;; get start time and save it to local variable ;)
    (;     i32.const 256 ;)
    (;     i64.atomic.load ;)
    (;     local.set $time ;)
    (;     ;; perform read from offset ;)
    (;     local.get $offset ;)
    (;     i64.load ;)
    (;     local.set $data ;)
    (;     ;; get end time and return it ;)
    (;     i32.const 256 ;)
    (;     i64.atomic.load ;)
    (;     local.get $time ;)
    (;     i64.sub ;)
    (; ) ;)
    (func $timed_miss (param $victim i32) (param $ptr i32) (result i64)
        (local $t0 i64)
        (local $t1 i64)
        (local $td i64)
        ;; acces victim
        (local.set $td (i64.load (i32.and (i32.const 0xffffffff) (local.get $victim))))
		;; traverse
        (local.set $td (i64.extend_i32_u (i32.or (i32.eqz (i64.eqz (local.get $td))) (local.get $ptr))))
        (loop $iter
            (local.set $td (i64.load (i32.wrap_i64 (local.get $td))))
            (br_if $iter (i32.eqz (i64.eqz (local.get $td)))))
        ;; t0 (mem[0])
        (local.set $t0 (i64.load (i32.and (i32.const 0xffffffff) (i32.or (i32.const 256) (i32.eqz (i64.eqz (local.get $td)))))))
        ;; re-access
        (local.set $td (i64.load (i32.and (i32.const 0xffffffff) (i32.or (local.get $victim) (i64.eqz (local.get $t0))))))
        ;; t1 (mem[0])
        (local.set $t1 (i64.load (i32.and (i32.const 0xffffffff) (i32.or (i32.const 256) (i32.eqz (i64.eqz (local.get $td)))))))
        (i64.sub (local.get $t1) (local.get $t0))
        return
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
        i32.atomic.load
        local.set $ptr
        ;; 
        (
            loop $iter
                local.get $ptr
                i32.atomic.load
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
