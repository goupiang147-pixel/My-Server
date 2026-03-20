const http = require('http');

// ==========================================
// ROMAX V8 - MATH & UTILS
// ==========================================
const getSize = (n) => n >= 5 ? "BIG" : "SMALL";
const sum = (arr) => arr.reduce((a,b) => a+b, 0);
const dot = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
const getRandn = () => {
    let u = 0, v = 0; while(u === 0) u = Math.random(); while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
function kalmanFilter(seq) {
    const q = 0.1, r = 0.5; let x = seq[0], p = 1, out = [];
    for (let z of seq) { p = p + q; let k = p / (p + r); x = x + k * (z - x); p = (1 - k) * p; out.push(x); }
    return out;
}

// ==========================================
// V8 COMBINED ENGINES
// ==========================================
const EnginesV8 = {
    dragon_v6: (history) => {
        if (history.length < 20) return null;
        let sizes = history.map(getSize);
        for (let depth = 6; depth > 2; depth--) {
            let pattern = sizes.slice(-depth); let big = 0, small = 0;
            for (let i = 0; i < sizes.length - depth - 1; i++) {
                let match = true;
                for(let j=0; j<depth; j++) if(sizes[i+j] !== pattern[j]) match = false;
                if (match) { sizes[i + depth] === "BIG" ? big++ : small++; }
            }
            if (big > small) return "BIG";
            if (small > big) return "SMALL";
        }
        return null;
    },
    fractal_v6: (history) => {
        if (history.length < 30) return null;
        let sizes = history.map(getSize);
        for (let size = 2; size < 6; size++) {
            let pattern = sizes.slice(-size); let matches = 0;
            for (let i = 0; i < sizes.length - size * 2; i++) {
                let match = true;
                for(let j=0; j<size; j++) if(sizes[i+j] !== pattern[j]) match = false;
                if (match) matches++;
            }
            if (matches >= 2) return pattern[0];
        }
        return null;
    },
    markov_v7: (history) => {
        if (history.length < 40) return null;
        let s = history.map(getSize); let trans = {};
        for(let i=0; i<s.length-2; i++) {
            let key = s[i] + s[i+1];
            if(!trans[key]) trans[key] = {BIG:0, SMALL:0};
            trans[key][s[i+2]]++;
        }
        let lastKey = s[s.length-2] + s[s.length-1];
        if(!trans[lastKey]) return null;
        if(trans[lastKey].BIG > trans[lastKey].SMALL) return "BIG";
        if(trans[lastKey].SMALL > trans[lastKey].BIG) return "SMALL";
        return null;
    },
    neural_mlp_v7: (() => {
        let w1 = Array.from({length: 20}, () => Array.from({length: 10}, getRandn));
        let w2 = Array.from({length: 10}, getRandn);
        return (history) => {
            if (history.length < 20) return null;
            let seq = history.slice(-20).map(x => x >= 5 ? 1 : 0);
            seq = kalmanFilter(seq);
            let hidden = Array(10).fill(0);
            for(let i=0; i<10; i++) {
                for(let j=0; j<20; j++) hidden[i] += seq[j] * w1[j][i];
                hidden[i] = Math.max(0, hidden[i]);
            }
            let out = dot(hidden, w2);
            return out > 0 ? "BIG" : "SMALL";
        }
    })(),
    chaos_v7: (history) => {
        if (history.length < 40) return null;
        let seq = history.slice(-40).map(x => x >= 5 ? 1 : 0);
        let p = sum(seq) / seq.length;
        let entropy = -(p * Math.log2(p + 1e-6) + (1 - p) * Math.log2(1 - p + 1e-6));
        let volatility = Math.abs(0.5 - p) * 2;
        let dynamicThreshold = 0.9 + (volatility * 0.05);
        if (entropy < dynamicThreshold) return p > 0.5 ? "BIG" : "SMALL";
        return null;
    }
};

// ==========================================
// SYSTEM CORE & ETERNAL MEMORY
// ==========================================
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let state = {
    historyData: [],
    wins: 0,
    losses: 0,
    weights: { dragon_v6: 1.0, fractal_v6: 1.0, markov_v7: 1.0, neural_mlp_v7: 1.0, chaos_v7: 1.0 }
};

let lastPeriod = null; 
let lastPred = null; 
let lastBackup = [];
let activePredictions = {}; 

function hedge(pred) {
    let pool = pred === "BIG" ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
    return pool.sort(() => 0.5 - Math.random()).slice(0, 2);
}

function evolveWeights(actualSize) {
    let changed = false;
    for (let [engine, pred] of Object.entries(activePredictions)) {
        if (pred === actualSize) {
            state.weights[engine] = Math.min(5.0, state.weights[engine] * 1.1); 
            changed = true;
        } else {
            state.weights[engine] = Math.max(0.1, state.weights[engine] * 0.9); 
            changed = true;
        }
    }
    if(changed) console.log("=> NEURAL PATHWAYS RECALIBRATED (EVOLUTION)");
    activePredictions = {}; 
}

function predictAll() {
    let votes = { "BIG": 0, "SMALL": 0 };
    let totalWeight = 0;

    for (let [name, engine] of Object.entries(EnginesV8)) {
        let p = engine(state.historyData);
        if (p) {
            activePredictions[name] = p; 
            let w = state.weights[name] || 1.0;
            console.log(`[V8] ${name} -> ${p} (Weight: ${w.toFixed(2)})`);
            votes[p] += w;
            totalWeight += w;
        }
    }
    
    if (totalWeight === 0) return { pred: Math.random() > 0.5 ? "BIG" : "SMALL", conf: 50 };

    let finalPred = votes["BIG"] > votes["SMALL"] ? "BIG" : "SMALL";
    let conf = Math.round((votes[finalPred] / totalWeight) * 100);
    return { pred: finalPred, conf: Math.min(conf, 99) };
}

async function fetchLoop() {
    try {
        let response = await fetch(API_URL);
        let data = await response.json();
        let latest = data.data.list[0];
        let currentPeriod = latest.issueNumber;
        let num = parseInt(latest.number);

        if (currentPeriod !== lastPeriod) {
            console.log(`\n--- NEW PERIOD DETECTED: ${currentPeriod} ---`);
            
            if (lastPred) {
                let actualSize = getSize(num);
                evolveWeights(actualSize); 

                if (actualSize === lastPred) {
                    state.wins++; console.log(`*** V8 TARGET NEUTRALIZED (WIN) *** | Result was ${num}`);
                } else if (lastBackup.includes(num)) {
                    state.wins++; console.log(`*** V8 HEDGE DEPLOYED (BACKUP HIT) *** | Result was ${num}`);
                } else {
                    state.losses++; console.log(`!!! V8 PREDICTION MISMATCH (LOSS) !!! | Result was ${num}`);
                }
            }

            state.historyData.push(num);
            if (state.historyData.length > 1000) state.historyData.shift(); 

            let result = predictAll();
            let backup = hedge(result.pred);
            
            lastPred = result.pred; lastBackup = backup; lastPeriod = currentPeriod;

            console.log(`>>> FINAL PREDICTION: ${result.pred} (${result.conf}% Confidence)`);
            console.log(`>>> BACKUP NUMBERS: [${backup.join(", ")}]`);
            console.log(`>>> CURRENT RECORD: ${state.wins} Wins / ${state.losses} Losses\n`);
        }
    } catch (error) {
        console.error("ERROR: V8 Link Lost. Retrying...", error.message);
    }
}

// ==========================================
// UPTIME ROBOT PING SERVER
// ==========================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`ROMAX V8 ETERNAL LEARNING IS ACTIVE.\nLifetime Wins: ${state.wins} | Lifetime Losses: ${state.losses}`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SYSTEM] ROMAX V8 Booting...`);
    console.log(`[SYSTEM] Web Server listening on port ${PORT} for Uptime Robot.`);
    setInterval(fetchLoop, 3000);
    fetchLoop();
});
