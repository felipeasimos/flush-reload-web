use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
}


#[inline(always)]
fn evict(p: *const u8) {
    // use clflush
    todo!()
}

#[inline(always)]
fn wait() {
    let mut i = 0;
    for _ in 1..10 {
        i += 1;
    }
}

#[inline(always)]
fn probe(p: *const u8) -> u64 {
    todo!()
}

#[wasm_bindgen]
pub fn find_eviction_sets(p: *const u8) {
    todo!()
}

#[wasm_bindgen]
pub fn flush_reload(p: *const u8) {
    // * pre-processing stage (before calling this function)
    //      * allocate memory page (mmap for native and large array for javascript)
    //      * find eviction set (call find_eviction_sets)
    //      * train to detect misses and hits (train)
    // * attack loop:
    // 1. evict (using target-specific 'evict' function) (done for native)
    for _ in 1..1000 {
        evict(p);
        // 2. wait (do some fast constant time operation)
        wait();
        // 3. probe (measure access time) (done for native)
        probe(p);
    }
}
