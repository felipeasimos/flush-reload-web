#![no_std]

extern crate alloc;
pub mod attack;

#[cfg(not(test))]
use core::panic::PanicInfo;

#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[cfg(target_family = "wasm")]
use lol_alloc::{FreeListAllocator, LockedAllocator};

#[cfg(target_family = "wasm")]
#[global_allocator]
static ALLOCATOR: LockedAllocator<FreeListAllocator> = LockedAllocator::new(FreeListAllocator::new());
