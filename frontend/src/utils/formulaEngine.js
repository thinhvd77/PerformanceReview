// Lightweight Excel-like formula engine utilities
// Encapsulates address helpers, input initialization, cell map building,
// dependency extraction, and computed value evaluation.

// Address helpers
const isExcelStringLiteral = (s) => /^"(?:[^"]|"")*"$/.test(String(s).trim());
const unquoteExcel = (s) => String(s).trim().slice(1, -1).replace(/""/g, '"');

const colToNum = (letters) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
const numToCol = (num) => {
    let s = '';
    let n = num;
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};

const isNumeric = (v) => v !== null && v !== '' && !isNaN(Number(v));
const toNumber = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

// Build initial input values from table colored cells
export const buildInitialInputs = (table) => {
    const next = {};
    if (!table?.rows) return next;
    table.rows.forEach((row) => {
        (row.cells || []).forEach((cell) => {
            if (!cell || cell.hidden || !cell.addr) return;
            if (cell.input) {
                const v = (cell.value ?? '').toString();
                next[cell.addr] = v;
            }
        });
    });
    return next;
};

// Normalize data into address -> { value, input, formula }
export const buildCellMap = (table) => {
    const map = {};
    if (table?.rows) {
        table.rows.forEach((row) => {
            (row.cells || []).forEach((cell) => {
                if (cell && cell.addr && !cell.hidden) {
                    map[cell.addr] = {value: cell.value, input: !!cell.input, formula: cell.formula || null};
                }
            });
        });
    }
    return map;
};

// Expand a range to list of addresses
const expandRangeAddrs = (c1, r1, c2, r2) => {
    const cStart = colToNum(c1);
    const cEnd = colToNum(c2);
    const rStart = parseInt(r1, 10);
    const rEnd = parseInt(r2, 10);
    const res = [];
    for (let r = rStart; r <= rEnd; r++) {
        for (let c = cStart; c <= cEnd; c++) {
            res.push(`${numToCol(c)}${r}`);
        }
    }
    return res;
};

// Extract dependencies (addresses) referenced by a formula
export const extractDeps = (formula) => {
    if (!formula) return [];
    let f = formula.trim();
    if (f.startsWith('=')) f = f.slice(1);
    const deps = new Set();
    // Ranges
    f.replace(/([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)/gi, (_, c1, r1, c2, r2) => {
        expandRangeAddrs(c1, r1, c2, r2).forEach(a => deps.add(a));
        return _;
    });
    // Singles
    f.replace(/\b([A-Z]+)(\d+)\b/gi, (m, c, r) => {
        deps.add(`${c.toUpperCase()}${r}`);
        return m;
    });
    return Array.from(deps);
};

// Compute values for formula cells given current inputs
export const computeComputedByAddr = ({table, cellInputs, cellMap}) => {
    if (!table) return {};

    // Base values: original values overlaid by inputs
    const values = {};
    Object.keys(cellMap || {}).forEach((a) => {
        values[a] = cellMap[a].value;
    });
    Object.keys(cellInputs || {}).forEach((a) => {
        values[a] = cellInputs[a];
    });

    const getVal = (addr) => toNumber(values[addr] ?? 0);

    const expandRangeToExpr = (c1, r1, c2, r2) => {
        const list = expandRangeAddrs(c1, r1, c2, r2).map(a => String(getVal(a)));
        return `(${list.join('+')})`;
    };

    const safeEval = (expr) => {
        if (/[^0-9+\-*/().,% <>=!]/.test(expr)) return NaN;
        try {
            // eslint-disable-next-line no-new-func
            const result = new Function(`return (${expr});`)();
            return typeof result === 'number' || typeof result === 'boolean' ? result : NaN;
        } catch {
            return NaN;
        }
    };

    const evalArithmetic = (fIn) => {
        let f = fIn;
        // Thay tham chiếu ô thành số
        f = f.replace(/\b([A-Z]+)(\d+)\b/g, (m, c, r) => String(getVal(`${c.toUpperCase()}${r}`)));
        // Toán tử so sánh Excel
        f = f.replace(/<>/g, '!=');
        f = f.replace(/(?<![<>!])=(?!=)/g, '==');
        // Excel literal phần trăm: 80% -> (80/100)
        f = f.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
        // Chuẩn hoá dấu: ++ -> +, -- -> +, +- -> -, -+ -> -
        const normalizeSigns = (s) => {
            let prev;
            do {
                prev = s;
                s = s
                    .replace(/\+\s*\+/g, '+')
                    .replace(/-\s*-/g, '+')
                    .replace(/\+\s*-/g, '-')
                    .replace(/-\s*\+/g, '-');
            } while (s !== prev);
            return s;
        };
        f = normalizeSigns(f);
        return safeEval(f);
    };

    const evalFormula = (formula) => {
        if (!formula) return NaN;
        try {
            let f = formula.trim();
            if (f.startsWith('=')) f = f.slice(1);
            // SUM ranges
            f = f.replace(/SUM\(\s*([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)\s*\)/gi, (_, c1, r1, c2, r2) => expandRangeToExpr(c1, r1, c2, r2));
            // SUM lists
            f = f.replace(/SUM\(([^()]+)\)/gi, (m, inner) => {
                const parts = inner.split(/\s*,\s*/).map(token => {
                    const rangeMatch = token.match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)$/i);
                    if (rangeMatch) {
                        const [, c1, r1, c2, r2] = rangeMatch;
                        return expandRangeToExpr(c1, r1, c2, r2);
                    }
                    const refMatch = token.match(/^([A-Z]+)(\d+)$/i);
                    if (refMatch) return String(getVal(token.toUpperCase()));
                    return token;
                });
                return `(${parts.join('+')})`;
            });

            // ----- IF (đệ quy) -----
            const resolveIF = (s) => {
                const idx = s.toUpperCase().indexOf('IF(');
                if (idx === -1) return s;
                let i = idx + 2; // points at '('
                let depth = 0;
                let startArgs = -1;
                for (; i < s.length; i++) {
                    const ch = s[i];
                    if (ch === '(') {
                        depth++;
                        if (startArgs === -1) startArgs = i + 1;
                    } else if (ch === ')') {
                        depth--;
                        if (depth === 0) break;
                    }
                }
                if (startArgs === -1 || i >= s.length) return s; // malformed
                const inner = s.slice(startArgs, i);
                const args = [];
                let buf = '';
                let d = 0;
                for (let k = 0; k < inner.length; k++) {
                    const ch = inner[k];
                    if (ch === '(') {
                        d++;
                        buf += ch;
                    } else if (ch === ')') {
                        d--;
                        buf += ch;
                    } else if (ch === ',' && d === 0) {
                        args.push(buf.trim());
                        buf = '';
                    } else {
                        buf += ch;
                    }
                }
                if (buf.trim().length > 0) args.push(buf.trim());
                const [condStr = '0', trueStr = '0', falseStr = '0'] = args;
                let condExpr = condStr;
                condExpr = condExpr.replace(/([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)/gi, (_, c1, r1, c2, r2) => expandRangeToExpr(c1, r1, c2, r2));
                const condVal = evalArithmetic(resolveAll(condExpr));
                const branchStr = condVal ? trueStr : falseStr;
                const branchEvalStr = resolveIF(branchStr);
                const replaced = s.slice(0, idx) + String(branchEvalStr) + s.slice(i + 1);
                return resolveIF(replaced);
            };

            // Helper: split top-level comma-separated args
            const splitTopArgs = (inner) => {
                const args = [];
                let buf = '';
                let d = 0;
                for (let k = 0; k < inner.length; k++) {
                    const ch = inner[k];
                    if (ch === '(') {
                        d++;
                        buf += ch;
                    } else if (ch === ')') {
                        d--;
                        buf += ch;
                    } else if (ch === ',' && d === 0) {
                        args.push(buf.trim());
                        buf = '';
                    } else {
                        buf += ch;
                    }
                }
                if (buf.trim().length > 0) args.push(buf.trim());
                return args;
            };

            // Generic resolver for a function name
            const resolveFunc = (s, name, evaluator) => {
                const nameU = name.toUpperCase() + '(';
                let out = s;
                let guard = 0;
                while (out.toUpperCase().includes(nameU) && guard < 50) {
                    guard++;
                    const idx = out.toUpperCase().indexOf(nameU);
                    let i = idx + nameU.length - 1; // points at '('
                    let depth = 0;
                    let startArgs = i + 1;
                    for (; i < out.length; i++) {
                        const ch = out[i];
                        if (ch === '(') depth++;
                        else if (ch === ')') {
                            depth--;
                            if (depth === 0) break;
                        }
                    }
                    if (i >= out.length) break; // malformed
                    const inner = out.slice(startArgs, i);
                    const args = splitTopArgs(inner);
                    const evaluated = evaluator(args.map(arg => resolveAll(arg)));
                    out = out.slice(0, idx) + String(evaluated) + out.slice(i + 1);
                }
                return out;
            };

            // Excel-like ROUND: half away from zero
            const roundHalfAwayFromZero = (value, digits) => {
                const n = Number(digits) || 0;
                const factor = Math.pow(10, n);
                const v = Number(value) || 0;
                const abs = Math.abs(v * factor);
                const rounded = Math.floor(abs + 0.5);
                const res = rounded / factor;
                return v < 0 ? -res : res;
            };

            // Resolve pipeline for known functions
            const resolveAll = (sIn) => {
                let s = sIn;
                let prev = '';
                let guard = 0;
                while (s !== prev && guard < 50) {
                    guard++;
                    prev = s;
                    s = resolveIF(s);
                    // AND(...)
                    s = resolveFunc(s, 'AND', (args) => {
                        if (args.length === 0) return 1;
                        let allTrue = true;
                        for (const a of args) {
                            const v = evalArithmetic(a);
                            const b = (typeof v === 'boolean') ? v : (Number.isFinite(v) ? v !== 0 : false);
                            if (!b) {
                                allTrue = false;
                                break;
                            }
                        }
                        return allTrue ? 1 : 0;
                    });
                    // ROUND(x, n)
                    s = resolveFunc(s, 'ROUND', (args) => {
                        const [valExpr = '0', digitsExpr = '0'] = args;
                        const val = evalArithmetic(valExpr);
                        const dRaw = evalArithmetic(digitsExpr);
                        const digits = Number.isFinite(dRaw) ? Math.trunc(dRaw) : 0;
                        if (!Number.isFinite(val)) return 0;
                        const r = roundHalfAwayFromZero(val, digits);
                        return Number(digits > 0 ? r.toFixed(digits) : r.toFixed(0));
                    });
                    // MIN(a, b, ...)
                    s = resolveFunc(s, 'MIN', (args) => {
                        if (args.length === 0) return NaN;
                        let best = Infinity;
                        args.forEach(a => {
                            const v = evalArithmetic(a);
                            const n = Number.isFinite(v) ? v : 0;
                            if (n < best) best = n;
                        });
                        return best === Infinity ? NaN : best;
                    });

                    // MAX(a, b, ...)
                    s = resolveFunc(s, 'MAX', (args) => {
                        if (args.length === 0) return NaN;
                        let best = -Infinity;
                        args.forEach(a => {
                            const v = evalArithmetic(a);
                            const n = Number.isFinite(v) ? v : 0;
                            if (n > best) best = n;
                        });
                        return best === -Infinity ? NaN : best;
                    });
                }
                return s;
            };

            // First resolve known functions to plain arithmetic
            f = resolveAll(f);

            // Nếu biểu thức cuối là literal chuỗi Excel -> trả về text
            if (isExcelStringLiteral(f)) {
                return unquoteExcel(f);
            }

            const result = evalArithmetic(f);
            return typeof result === 'boolean' ? (result ? 1 : 0) : (isNaN(result) ? NaN : result);
        } catch (e) {
            return NaN;
        }
    };

    // Build dependency graph among formulas
    const entries = Object.entries(cellMap || {}).filter(([, info]) => !!info.formula).map(([addr, info]) => ({
        addr,
        formula: info.formula
    }));
    const formulaSet = new Set(entries.map(n => n.addr));
    const indegree = new Map();
    const adj = new Map();
    entries.forEach(({addr}) => {
        indegree.set(addr, 0);
        adj.set(addr, new Set());
    });
    entries.forEach(({addr, formula}) => {
        const deps = extractDeps(formula);
        deps.forEach(dep => {
            if (formulaSet.has(dep)) {
                adj.get(dep).add(addr);
                indegree.set(addr, (indegree.get(addr) || 0) + 1);
            }
        });
    });

    // Kahn topo
    const queue = [];
    indegree.forEach((deg, a) => {
        if (deg === 0) queue.push(a);
    });
    const order = [];
    while (queue.length) {
        const a = queue.shift();
        order.push(a);
        (adj.get(a) || new Set()).forEach((to) => {
            indegree.set(to, (indegree.get(to) - 1));
            if (indegree.get(to) === 0) queue.push(to);
        });
    }

    // Evaluate in topo order
    order.forEach((addr) => {
        const node = cellMap[addr];
        const v = evalFormula(node.formula);
        if (!isNaN(v)) values[addr] = v;
    });

    // Handle cycles with a few passes
    if (order.length !== entries.length) {
        const remaining = entries.filter(n => !order.includes(n.addr));
        let lastHash = '';
        for (let iter = 0; iter < 5; iter++) {
            remaining.forEach(({addr, formula}) => {
                const v = evalFormula(formula);
                if (!isNaN(v)) values[addr] = v;
            });
            const hash = JSON.stringify(remaining.map(f => values[f.addr] ?? null));
            if (hash === lastHash) break;
            lastHash = hash;
        }
    }

    // Return only computed formula cell values
    const out = {};
    Object.keys(cellMap || {}).forEach((a) => {
        if (cellMap[a].formula) out[a] = values[a];
    });
    return out;
};

export default {
    buildInitialInputs,
    buildCellMap,
    extractDeps,
    computeComputedByAddr,
};
