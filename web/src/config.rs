use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub threshold: u32,
    pub wait_cycles: u32,
    pub time_slots: u32,
    pub time_slot_size: u32,
    pub probes: Vec<u32>
}
