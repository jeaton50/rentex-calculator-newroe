// PDF.js worker
const PDF_WORKER_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
}

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

    return normalizeExtractedText(text);
}

// Extract all text from a PDF while preserving row and column order.
async function extractPDFText(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js failed to load. Check your connection and refresh the page.');
    }

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
        data: buf,
        disableFontFace: true,
        useSystemFonts: true,
    }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
        });

        pages.push(`--- Page ${i} ---\n${textItemsToLines(content.items)}`);

        if (typeof page.cleanup === 'function') page.cleanup();
    }

    if (typeof pdf.cleanup === 'function') pdf.cleanup();

    return normalizeExtractedText(pages.join('\n\n'));
}

const PDF_ROW_TOLERANCE = 2.5;
const PDF_COLUMN_GAP = 18;

function normalizeExtractedText(text) {
    return String(text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function cleanLine(line) {
    return String(line || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r/g, '')
        .trim();
}

function compactText(value) {
    return cleanLine(value).replace(/\s+/g, ' ');
}

function textItemsToLines(items) {
    const rows = [];

    for (const item of items) {
        const token = textItemToToken(item);
        if (!token) continue;
        addTokenToRows(rows, token);
    }

    return rows
        .sort((a, b) => b.y - a.y)
        .map(rowToText)
        .filter(Boolean)
        .join('\n');
}

function textItemToToken(item) {
    const text = compactText(item.str);
    if (!text) return null;

    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const fontSize = Math.max(
        Math.abs(Number(transform[0]) || 0),
        Math.abs(Number(transform[3]) || 0),
        Number(item.height) || 0,
        6
    );
    const width = Math.max(Number(item.width) || text.length * fontSize * 0.48, 0);

    return {
        text,
        x: Number(transform[4]) || 0,
        y: Number(transform[5]) || 0,
        width,
        height: fontSize,
    };
}

function addTokenToRows(rows, token) {
    let bestRow = null;
    let bestDelta = Infinity;

    for (const row of rows) {
        const tolerance = Math.max(PDF_ROW_TOLERANCE, row.height * 0.35, token.height * 0.35);
        const delta = Math.abs(row.y - token.y);
        if (delta <= tolerance && delta < bestDelta) {
            bestRow = row;
            bestDelta = delta;
        }
    }

    if (!bestRow) {
        rows.push({ y: token.y, height: token.height, tokens: [token] });
        return;
    }

    const count = bestRow.tokens.length;
    bestRow.y = ((bestRow.y * count) + token.y) / (count + 1);
    bestRow.height = Math.max(bestRow.height, token.height);
    bestRow.tokens.push(token);
}

function rowToText(row) {
    const tokens = row.tokens.sort((a, b) => a.x - b.x);
    const totalChars = tokens.reduce((sum, token) => sum + token.text.length, 0);
    const totalWidth = tokens.reduce((sum, token) => sum + token.width, 0);
    const charWidth = totalChars > 0 ? Math.max(totalWidth / totalChars, 3) : 4;

    let line = '';
    let previousEnd = null;

    for (const token of tokens) {
        if (previousEnd === null) {
            line = token.text;
            previousEnd = token.x + token.width;
            continue;
        }

        const gap = token.x - previousEnd;
        const separator = gap > Math.max(PDF_COLUMN_GAP, charWidth * 4)
            ? '\t'
            : gap > Math.max(1.5, charWidth * 0.35)
                ? ' '
                : '';

        line += separator + token.text;
        previousEnd = Math.max(previousEnd, token.x + token.width);
    }

    return line
        .replace(/ {2,}/g, ' ')
        .replace(/\t{2,}/g, '\t')
        .trim();
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
    if (m) H = parseInt(m[1], 10);
    m = text.match(/(\d+)\s+panels?\s+high/i);
    if (m) V = parseInt(m[1], 10);

    // "10 wide" / "10 horizontal" / "columns: 10"
    if (!H) { m = text.match(/(\d+)\s*(?:wide|horizontal|cols?|columns?)\b/i); if (m) H = parseInt(m[1], 10); }
    if (!V) { m = text.match(/(\d+)\s*(?:tall|vertical|rows?)\b/i);            if (m) V = parseInt(m[1], 10); }

    // "H: 10" / "H=10"
    if (!H) { m = text.match(/\bh\s*[:=]\s*(\d+)/i); if (m) H = parseInt(m[1], 10); }
    if (!V) { m = text.match(/\bv\s*[:=]\s*(\d+)/i); if (m) V = parseInt(m[1], 10); }

    // "10W x 8H"
    if (!H || !V) {
        m = text.match(/\b(\d{1,2})\s*w\s*(?:x|\u00d7|by)\s*(\d{1,2})\s*h\b/i);
        if (m) { H = parseInt(m[1], 10); V = parseInt(m[2], 10); }
    }

    // "10 x 8" or "10×8" — only as fallback (avoid matching "500x500" tile specs)
    if (!H || !V) {
        m = text.match(/\b(\d{1,2})\s*(?:x|\u00d7)\s*(\d{1,2})\b/i);
        if (m) { H = parseInt(m[1], 10); V = parseInt(m[2], 10); }
    }

    // Some Rentex quotes omit "27 x 6" text but include ground base bars and active tile qty.
    if (!H || !V) {
        const inferred = inferDimensionsFromLineItems(text);
        H = H || inferred.H;
        V = V || inferred.V;
    }

    return { H, V };
}

function inferDimensionsFromLineItems(text) {
    const items = parseLineItems(text);
    const qtyFor = sku => items
        .filter(item => item.sku === sku)
        .reduce((sum, item) => sum + item.qty, 0);

    const basePairs = [
        ['BPBOBB1', 'BPBOBB2'],
        ['GP2BASE1', 'GP2BASE2'],
        ['PL25BB1', 'PL25BB2'],
        ['TXBASE1W', 'TXBASE2W'],
    ];
    let H = 0;

    for (const [singleSku, doubleSku] of basePairs) {
        const singles = qtyFor(singleSku);
        const doubles = qtyFor(doubleSku);
        if (singles || doubles) {
            H = singles + (doubles * 2);
            break;
        }
    }

    if (!H) return { H: 0, V: 0 };

    const activeTile = items.find(item =>
        /^(?:BP2B1|BP2B2|BP2V2|GP2FULL|GP2HALF|PL25|TXNOMAD26)$/.test(item.sku) &&
        !/\bspares?\b|\[spares?\]/i.test(item.raw)
    );
    if (!activeTile || activeTile.qty % H !== 0) return { H, V: 0 };

    return { H, V: activeTile.qty / H };
}

function detectBPVariant(text) {
    const t = text.toLowerCase();
    if (t.includes('8pbp2b1') || t.includes('bp2b1') || t.includes('version 1') || t.includes('batch 1')) return 'BP2B1';
    if (t.includes('8pbp2b2') || t.includes('bp2b2') || t.includes('batch 2')) return 'BP2B2';
    if (t.includes('8pbp2v2') || t.includes('bp2v2') || t.includes('version 2') || t.includes('v2.1')) return 'BP2V2';
    return '';
}

// Detect number of identical walls in the quote — "2 walls @ ..."
function detectWallCount(text) {
    const m = text.match(/(\d+)\s+walls?\s*(?:@|at|each|wide|by|\d)/i);
    if (m) {
        const n = parseInt(m[1], 10);
        if (n > 1 && n <= 20) return n;
    }
    return 1;
}

function detectConfig(text) {
    const t = text.toLowerCase();
    const groundSignals = [
        /\bground package\b/,
        /\bground support\b/,
        /\bstacking base\b/,
        /\bbase bar\b/,
        /\bski frame\b/,
        /\boutrigger\b/,
    ];
    const flySignals = [
        /\bfly(?:ing)?\b/,
        /\bflown\b/,
        /\bhanging bar\b/,
        /\b(?:pl25head|gp2head|bpbbohead|bpbohead|txsnglhead|txdblhead)\b/,
    ];

    const hasGroundSignal = groundSignals.some(rx => rx.test(t));
    const hasFlySignal = flySignals.some(rx => rx.test(t));
    const supportType = hasFlySignal && !hasGroundSignal ? 'Fly' : 'Ground';
    const hasLed120Signal =
        t.includes('txt32ed6') ||
        t.includes('edt110m') ||
        t.includes('theatrixx nomad xvt3 to edison') ||
        t.includes('edison (5-15p)');
    const voltage = (
        t.includes('120v') ||
        t.includes('110v') ||
        t.includes('single phase') ||
        hasLed120Signal
    ) ? 120 : 208;
    return { supportType, voltage };
}

// ============================================================
// LINE ITEM PARSER
// ============================================================
// Returns: Array of { qty, sku, raw }
function parseLineItems(text) {
    const items = [];

    for (const line of String(text || '').split('\n')) {
        const item = parseLineItemLine(line);
        if (item) items.push(item);
    }

    return items;
}

const NON_SKU_WORDS = new Set([
    'AMOUNT', 'APPROVED', 'BILL', 'CONTACT', 'DATE', 'DESCRIPTION', 'EMAIL',
    'EXTENDED', 'FROM', 'INVOICE', 'ITEM', 'LINE', 'PAGE', 'PHONE', 'PRICE',
    'QTY', 'QUOTE', 'RENTAL', 'SHIP', 'SKU', 'SPECTRUM', 'SUBTOTAL', 'TERMS',
    'TOTAL', 'UNIT', 'WALL', 'WALLS',
]);

function normalizeSkuToken(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isSKU(value) {
    const sku = normalizeSkuToken(value);
    return /^[A-Z0-9]{2,20}$/.test(sku)
        && /[A-Z]/.test(sku)
        && !NON_SKU_WORDS.has(sku)
        && !(sku.length <= 2 && !/\d/.test(sku));
}

function parseLineItemLine(line) {
    const l = cleanLine(line);
    if (l.length < 3 || isIgnorableLine(l)) return null;

    if (l.includes('\t')) return parseColumnLine(l);

    // Rentex/RW format: SKU Description Qty $Price $Extended.
    let m = l.match(/^([A-Z0-9]{2,20})\s+.+?\s+(\d{1,6})\s+\$[\d,.]/i);
    if (m && isSKU(m[1])) {
        return lineItem(parseInt(m[2], 10), m[1], l);
    }

    // Qty-first: "10 PL25 Absen tile...".
    m = l.match(/^(\d{1,5})\s+([A-Z0-9]{2,20})\b/i);
    if (m && isSKU(m[2])) {
        return lineItem(parseInt(m[1], 10), m[2], l);
    }

    // SKU then qty directly: "PL25 80".
    m = l.match(/^([A-Z0-9]{2,20})\s+(\d{1,5})(?:\s|$)/i);
    if (m && isSKU(m[1])) {
        return lineItem(parseInt(m[2], 10), m[1], l);
    }

    // SKU Description Qty, common after copy/paste or PDF extraction without prices.
    m = l.match(/^([A-Z0-9]{2,20})\s+.+\s+(\d{1,5})$/i);
    if (m && isSKU(m[1])) {
        return lineItem(parseInt(m[2], 10), m[1], l);
    }

    // "10 x description" or "10 * description", without an obvious SKU.
    m = l.match(/^(\d{1,5})\s*(?:x|\u00d7)\s+.{4,}/i);
    if (m) {
        return lineItem(parseInt(m[1], 10), '', l);
    }

    return null;
}

function parseColumnLine(line) {
    const cols = line.split(/\t+/).map(compactText).filter(Boolean);
    if (cols.length < 2) return null;

    const skuIndex = cols.findIndex(col => Boolean(findLeadingSku(col)));
    if (skuIndex >= 0) {
        const sku = findLeadingSku(cols[skuIndex]);
        const qty = pickQuantityColumn(cols, skuIndex);
        if (qty !== null) return lineItem(qty, sku, line);
    }

    const firstQty = parseQuantityValue(cols[0]);
    if (firstQty !== null) {
        const nextSku = cols.length > 1 ? findLeadingSku(cols[1]) : '';
        return lineItem(firstQty, nextSku, line);
    }

    return null;
}

function pickQuantityColumn(cols, skuIndex) {
    const candidates = cols
        .map((col, index) => ({ index, qty: parseQuantityValue(col) }))
        .filter(candidate => candidate.qty !== null && candidate.index !== skuIndex);

    if (candidates.length === 0) return null;

    const firstMoneyIndex = cols.findIndex(isMoneyValue);
    if (firstMoneyIndex > -1) {
        const beforePrice = candidates.filter(candidate => candidate.index < firstMoneyIndex);
        if (beforePrice.length > 0) return beforePrice[beforePrice.length - 1].qty;
    }

    const afterSku = candidates.find(candidate => candidate.index > skuIndex);
    return (afterSku || candidates[0]).qty;
}

function findLeadingSku(value) {
    const m = compactText(value).toUpperCase().match(/^([A-Z0-9]{2,20})\b/);
    return m && isSKU(m[1]) ? normalizeSkuToken(m[1]) : '';
}

function parseQuantityValue(value) {
    const cleaned = String(value || '').replace(/,/g, '').trim();
    const m = cleaned.match(/^(\d{1,6})(?:\s+\$[\d,.]+)?$/);
    if (!m) return null;
    const qty = parseInt(m[1], 10);
    return qty > 0 && qty < 100000 ? qty : null;
}

function isMoneyValue(value) {
    const cleaned = compactText(value);
    return /^\$\s*\d/.test(cleaned) || /^\d[\d,]*\.\d{2}$/.test(cleaned);
}

function isIgnorableLine(line) {
    return /^(?:-{3,}\s*)?(?:page|sheet)\b/i.test(line)
        || /^(?:sub)?total\b/i.test(line)
        || /^(?:quote|invoice|description|item\s+description)\b/i.test(line);
}

function lineItem(qty, sku, raw) {
    return { qty, sku: normalizeSkuToken(sku), raw };
}

// ============================================================
// COMPARISON ENGINE
// ============================================================
// Returns: { found, qty, confidence }
// confidence: 'exact-sku' | 'sku-text' | 'keyword' | null
function findItemInPDF(expected, parsedItems, rawText) {
    const sku = expected.sku.toUpperCase();
    const kw = (expected.keywords || []).map(w => String(w).toLowerCase());
    const rawLower = rawText.toLowerCase();

    // 1. Exact SKU match in parsed items (best — has extracted qty)
    const skuMatches = parsedItems.filter(item => item.sku === sku);
    if (skuMatches.length > 0) {
        const totalQty = skuMatches.reduce((s, i) => s + i.qty, 0);
        return { found: true, qty: totalQty, confidence: 'exact-sku' };
    }

    // 2. SKU found anywhere in raw text
    const escaped = escapeRegExp(sku);
    const skuRx = new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`, 'im');
    if (skuRx.test(rawText)) {
        // Try to pull qty from the line containing this SKU
        const lines = rawText.split('\n');
        for (const line of lines) {
            if (!new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`, 'i').test(line)) continue;

            const parsed = parseLineItemLine(line);
            if (parsed && parsed.sku === sku) {
                return { found: true, qty: parsed.qty, confidence: 'sku-text' };
            }

            return { found: true, qty: null, confidence: 'sku-text' };
        }
        return { found: true, qty: null, confidence: 'sku-text' };
    }

    // If we know the expected SKU, do not let a similar description masquerade as it.
    // This prevents TXT32T125 from matching TXT32ED6 just because both mention XVT3.
    if (sku) {
        return { found: false, qty: null, confidence: null };
    }

    // 3. Keyword matching — require ≥60% of significant keywords
    const significant = kw.filter(w => w.length > 3 && !['with', 'from', 'each', 'true', 'that', 'this'].includes(w));
    if (significant.length >= 2) {
        const hits = significant.filter(w => rawLower.includes(w));
        if (hits.length >= Math.ceil(significant.length * 0.6)) {
            const matchLine = rawText
                .split('\n')
                .find(line => hits.some(hit => line.toLowerCase().includes(hit)));
            const parsed = matchLine ? parseLineItemLine(matchLine) : null;
            const qty = parsed ? parsed.qty : null;
            return { found: true, qty: (qty && qty < 100000) ? qty : null, confidence: 'keyword' };
        }
    }

    return { found: false, qty: null, confidence: null };
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
