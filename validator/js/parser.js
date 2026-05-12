// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// ============================================================
// FILE EXTRACTORS
// ============================================================

// Extract text from an Excel file (.xlsx / .xls) using SheetJS
async function extractExcelText(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    let text = '';

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws || !ws['!ref']) continue;

        text += `--- Sheet: ${sheetName} ---\n`;

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        for (const row of rows) {
            const cells = row.map(c => String(c).trim());
            if (cells.every(c => c === '')) continue;
            text += cells.join('\t') + '\n';
        }
        text += '\n';
    }

    return text;
}

// Extract all text from a PDF, grouping each row of text by Y position
async function extractPDFText(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items at the same Y coordinate into one line
        const byY = {};
        for (const item of content.items) {
            const y = Math.round(item.transform[5]);
            if (!byY[y]) byY[y] = [];
            byY[y].push(item.str);
        }
        const sorted = Object.keys(byY).sort((a, b) => b - a);
        pages.push(sorted.map(y => byY[y].join(' ')).join('\n'));
    }

    return pages.join('\n--- PAGE BREAK ---\n');
}

// ============================================================
// AUTO-DETECTION
// ============================================================

function detectProduct(text) {
    const t = text.toLowerCase();
    if (t.includes('theatrixx') || t.includes('txnomad') || t.includes('nomad 2.6') || t.includes('nomad2.6')) return 'Theatrixx';
    if (t.includes('pl2.5') || t.includes('pl25') || (t.includes('absen') && !t.includes('gp2'))) return 'Absen';
    if ((t.includes('gp2.6') || t.includes('gp26') || t.includes('graphite')) && t.includes('full')) return 'ROEGP26Full';
    if ((t.includes('gp2.6') || t.includes('gp26') || t.includes('graphite')) && t.includes('half')) return 'ROEGP26Half';
    if (t.includes('gp2.6') || t.includes('gp26') || t.includes('graphite')) return 'ROEGP26Full';
    if (t.includes('black pearl') || t.includes('bp2v2') || t.includes('bp2b1') || t.includes('bp2b2') || t.includes('bpgp')) return 'ROEBP';
    if (t.includes('gp2half') || t.includes('gp2 half')) return 'ROEGP26Half';
    if (t.includes('absen')) return 'Absen';
    if (t.includes('roe')) return 'ROEBP';
    return '';
}

function detectDimensions(text) {
    let H = 0, V = 0;

    // "12 panels wide by 7 panels high" — Rentex quote style
    let m = text.match(/(\d+)\s+panels?\s+wide/i);
    if (m) H = parseInt(m[1]);
    m = text.match(/(\d+)\s+panels?\s+high/i);
    if (m) V = parseInt(m[1]);

    // "10 wide" / "10 horizontal" / "columns: 10"
    if (!H) { m = text.match(/(\d+)\s*(?:wide|horizontal|cols?|columns?)\b/i); if (m) H = parseInt(m[1]); }
    if (!V) { m = text.match(/(\d+)\s*(?:tall|vertical|rows?)\b/i);            if (m) V = parseInt(m[1]); }

    // "H: 10" / "H=10"
    if (!H) { m = text.match(/\bh\s*[:=]\s*(\d+)/i); if (m) H = parseInt(m[1]); }
    if (!V) { m = text.match(/\bv\s*[:=]\s*(\d+)/i); if (m) V = parseInt(m[1]); }

    // "10 x 8" or "10×8" — only as fallback (avoid matching "500x500" tile specs)
    if (!H || !V) {
        m = text.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,2})\b/);
        if (m) { H = parseInt(m[1]); V = parseInt(m[2]); }
    }

    return { H, V };
}

// Detect number of identical walls in the quote — "2 walls @ ..."
function detectWallCount(text) {
    const m = text.match(/(\d+)\s+walls?\s*(?:@|at|each|wide|by|\d)/i);
    if (m) {
        const n = parseInt(m[1]);
        if (n > 1 && n <= 20) return n;
    }
    return 1;
}

function detectConfig(text) {
    const t = text.toLowerCase();
    const supportType = (t.includes('fly') || t.includes('flown') || t.includes('hang') || t.includes('rigg')) ? 'Fly' : 'Ground';
    const voltage = (t.includes('120v') || t.includes('110v') || t.includes('single phase')) ? 120 : 208;
    return { supportType, voltage };
}

// ============================================================
// LINE ITEM PARSER
// ============================================================
// Returns: Array of { qty, sku, raw }
//
// Handles multiple formats:
//   A) Rentex: SKU  Description  Qty  $Price  $Extended  (columns joined by spaces)
//   B) Qty-first: "10 PL25 Absen tile ..."
//   C) SKU then qty directly: "PL25 80"
//   D) Excel tab-separated: "PL25\t80\tAbsen tile\t..."
//   E) "qty × description"
function parseLineItems(text) {
    const lines = text.split('\n');
    const items = [];

    // Helper: does this string look like a SKU?
    // Must be 3-16 alphanumeric chars containing at least one letter
    function isSKU(s) {
        return /^[A-Z0-9]{3,16}$/.test(s) && /[A-Z]/.test(s);
    }

    for (const line of lines) {
        const l = line.trim();
        if (l.length < 3) continue;

        let m;

        // -------------------------------------------------------
        // Pattern A: Rentex / RW quote format
        // SKU  Description (any text)  Qty  $Price  $Extended
        // e.g. "TXT32ED6 Theatrixx Nomad XVT3 to Edison 6' 6 $0.00 $0.00"
        // e.g. "10PTXNOMAD Theatrixx Nomad 2.6 10x package 18 $0.00 $0.00"
        // The qty is the integer immediately before the first "$"
        // -------------------------------------------------------
        m = l.match(/^([A-Z0-9]{3,16})\s+.+\s+(\d{1,6})\s+\$[\d,.]/);
        if (m && isSKU(m[1])) {
            items.push({ qty: parseInt(m[2]), sku: m[1].toUpperCase(), raw: l });
            continue;
        }

        // -------------------------------------------------------
        // Pattern B: Excel tab-separated  SKU \t Qty \t Description
        // or  Qty \t SKU \t Description
        // -------------------------------------------------------
        if (l.includes('\t')) {
            const cols = l.split('\t').map(c => c.trim()).filter(c => c);
            if (cols.length >= 2) {
                // Col 0 = SKU, col 1 = qty (or description)
                if (isSKU(cols[0]) && /^\d+$/.test(cols[1])) {
                    items.push({ qty: parseInt(cols[1]), sku: cols[0].toUpperCase(), raw: l });
                    continue;
                }
                // Col 0 = qty, col 1 = SKU
                if (/^\d+$/.test(cols[0]) && isSKU(cols[1])) {
                    items.push({ qty: parseInt(cols[0]), sku: cols[1].toUpperCase(), raw: l });
                    continue;
                }
                // Col 0 = SKU, last col = qty (reversed Excel tables)
                if (isSKU(cols[0]) && /^\d+$/.test(cols[cols.length - 1])) {
                    items.push({ qty: parseInt(cols[cols.length - 1]), sku: cols[0].toUpperCase(), raw: l });
                    continue;
                }
                // Col 0 = qty, rest = description
                if (/^\d{1,5}$/.test(cols[0]) && parseInt(cols[0]) < 10000) {
                    items.push({ qty: parseInt(cols[0]), sku: '', raw: l });
                    continue;
                }
            }
        }

        // -------------------------------------------------------
        // Pattern C: qty-first  "10 PL25 Absen tile..."
        // -------------------------------------------------------
        m = l.match(/^(\d{1,5})\s+([A-Z0-9]{3,16})\s+.{4,}/);
        if (m && isSKU(m[2])) {
            items.push({ qty: parseInt(m[1]), sku: m[2].toUpperCase(), raw: l });
            continue;
        }

        // -------------------------------------------------------
        // Pattern D: SKU directly followed by qty  "PL25 80"
        // -------------------------------------------------------
        m = l.match(/^([A-Z0-9]{3,16})\s+(\d{1,5})(?:\s|$)/);
        if (m && isSKU(m[1])) {
            items.push({ qty: parseInt(m[2]), sku: m[1].toUpperCase(), raw: l });
            continue;
        }

        // -------------------------------------------------------
        // Pattern E: "10 × description" or "10x description"
        // -------------------------------------------------------
        m = l.match(/^(\d{1,5})\s*[x×]\s+.{4,}/i);
        if (m) {
            items.push({ qty: parseInt(m[1]), sku: '', raw: l });
        }
    }

    return items;
}

// ============================================================
// COMPARISON ENGINE
// ============================================================
// Returns: { found, qty, confidence }
// confidence: 'exact-sku' | 'sku-text' | 'keyword' | null
function findItemInPDF(expected, parsedItems, rawText) {
    const sku = expected.sku.toUpperCase();
    const kw = expected.keywords || [];
    const rawLower = rawText.toLowerCase();

    // 1. Exact SKU match in parsed items (best — has extracted qty)
    const skuMatches = parsedItems.filter(item => item.sku === sku);
    if (skuMatches.length > 0) {
        const totalQty = skuMatches.reduce((s, i) => s + i.qty, 0);
        return { found: true, qty: totalQty, confidence: 'exact-sku' };
    }

    // 2. SKU found anywhere in raw text
    const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skuRx = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'im');
    if (skuRx.test(rawText)) {
        // Try to pull qty from the line containing this SKU
        const lines = rawText.split('\n');
        for (const line of lines) {
            if (new RegExp(escaped, 'i').test(line)) {
                // Rentex pattern: qty before first "$"
                const rentexM = line.match(new RegExp(`${escaped}\\s+.+?\\s+(\\d{1,6})\\s+\\$`, 'i'));
                if (rentexM) return { found: true, qty: parseInt(rentexM[1]), confidence: 'sku-text' };
                // Generic: any number near the SKU on that line
                const nums = line.match(/\b(\d{1,5})\b/g);
                if (nums) {
                    const qty = parseInt(nums[0]);
                    if (qty > 0 && qty < 100000) return { found: true, qty, confidence: 'sku-text' };
                }
                return { found: true, qty: null, confidence: 'sku-text' };
            }
        }
        return { found: true, qty: null, confidence: 'sku-text' };
    }

    // 3. Keyword matching — require ≥60% of significant keywords
    const significant = kw.filter(w => w.length > 3 && !['with', 'from', 'each', 'true', 'that', 'this'].includes(w));
    if (significant.length >= 2) {
        const hits = significant.filter(w => rawLower.includes(w));
        if (hits.length >= Math.ceil(significant.length * 0.6)) {
            const idx = rawLower.indexOf(hits[0]);
            const nearby = rawText.substring(Math.max(0, idx - 60), idx + 80);
            const qm = nearby.match(/\b(\d{1,5})\b/g);
            const qty = qm ? parseInt(qm[0]) : null;
            return { found: true, qty: (qty && qty < 100000) ? qty : null, confidence: 'keyword' };
        }
    }

    return { found: false, qty: null, confidence: null };
}
