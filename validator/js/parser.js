// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Extract text from an Excel file (.xlsx / .xls) using SheetJS
async function extractExcelText(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    let text = '';

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws || !ws['!ref']) continue;

        text += `--- Sheet: ${sheetName} ---\n`;

        // Convert to array-of-arrays (header:1 keeps raw row arrays)
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        for (const row of rows) {
            const cells = row.map(c => String(c).trim());
            // Skip rows that are entirely empty
            if (cells.every(c => c === '')) continue;
            text += cells.join('\t') + '\n';
        }
        text += '\n';
    }

    return text;
}

// Extract all text from a PDF File object
async function extractPDFText(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Preserve rough line structure by grouping items at similar Y positions
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

// Auto-detect product type from extracted text
function detectProduct(text) {
    const t = text.toLowerCase();
    if (t.includes('theatrixx') || t.includes('txnomad') || t.includes('nomad 2.6') || t.includes('nomad2.6') || t.includes('tx nomad')) return 'Theatrixx';
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

// Auto-detect H×V dimensions from text
function detectDimensions(text) {
    let H = 0, V = 0;

    // "10 wide" / "10 horizontal" / "columns: 10"
    let m = text.match(/(\d+)\s*(?:wide|horizontal|cols?|columns?)\b/i);
    if (m) H = parseInt(m[1]);

    // "8 tall" / "8 vertical" / "rows: 8"
    m = text.match(/(\d+)\s*(?:tall|vertical|rows?)\b/i);
    if (m) V = parseInt(m[1]);

    // "H: 10" / "H=10"
    if (!H) { m = text.match(/\bh\s*[:=]\s*(\d+)/i); if (m) H = parseInt(m[1]); }
    if (!V) { m = text.match(/\bv\s*[:=]\s*(\d+)/i); if (m) V = parseInt(m[1]); }

    // "10 x 8" or "10×8"
    if (!H || !V) {
        m = text.match(/\b(\d{1,3})\s*[x×]\s*(\d{1,3})\b/);
        if (m) { H = parseInt(m[1]); V = parseInt(m[2]); }
    }

    // Fall back: look for two numbers near "tiles" or "panels"
    if (!H || !V) {
        m = text.match(/(\d+)\s+(?:tiles?|panels?)\s+(?:wide|across|horizontal)/i);
        if (m) H = parseInt(m[1]);
        m = text.match(/(\d+)\s+(?:tiles?|panels?)\s+(?:tall|high|vertical)/i);
        if (m) V = parseInt(m[1]);
    }

    return { H, V };
}

// Detect support type and voltage from text
function detectConfig(text) {
    const t = text.toLowerCase();
    const supportType = (t.includes('fly') || t.includes('flown') || t.includes('hang') || t.includes('rigg')) ? 'Fly' : 'Ground';
    const voltage = (t.includes('120') || t.includes('110v') || t.includes('single phase')) ? 120 : 208;
    return { supportType, voltage };
}

// Parse line items from extracted text
// Returns: Array of { qty, sku, raw }
function parseLineItems(text) {
    const lines = text.split('\n');
    const items = [];

    for (const line of lines) {
        const l = line.trim();
        if (l.length < 4) continue;

        // Pattern 1: number + SKU-like token + description  e.g. "10 PL25 Absen tile..."
        let m = l.match(/^(\d+)\s+([A-Z][A-Z0-9]{2,15})\s+.{4,}/);
        if (m) {
            items.push({ qty: parseInt(m[1]), sku: m[2].toUpperCase(), raw: l });
            continue;
        }

        // Pattern 2: SKU-like token + number  e.g. "PL25 80"
        m = l.match(/^([A-Z][A-Z0-9]{2,15})\s+(\d+)(?:\s|$)/);
        if (m) {
            items.push({ qty: parseInt(m[2]), sku: m[1].toUpperCase(), raw: l });
            continue;
        }

        // Pattern 3: "Qty: 10" or "QTY 10" followed by description, or "10 ×" / "10x"
        m = l.match(/^(\d+)\s*[x×]\s+.{4,}/i);
        if (m) {
            items.push({ qty: parseInt(m[1]), sku: '', raw: l });
            continue;
        }

        // Pattern 4: table cell that starts with a number
        m = l.match(/^(\d{1,4})\s{2,}(.{5,})/);
        if (m && parseInt(m[1]) > 0 && parseInt(m[1]) < 10000) {
            items.push({ qty: parseInt(m[1]), sku: '', raw: l });
        }
    }

    return items;
}

// Attempt to find an expected item in the PDF
// Returns: { found, qty, confidence }
// confidence: 'exact-sku' | 'sku-text' | 'keyword' | null (not found)
function findItemInPDF(expected, parsedItems, rawText) {
    const sku = expected.sku.toUpperCase();
    const kw = expected.keywords || [];
    const rawLower = rawText.toLowerCase();

    // 1. Exact SKU match in parsed items
    const skuMatches = parsedItems.filter(item => item.sku === sku);
    if (skuMatches.length > 0) {
        const totalQty = skuMatches.reduce((s, i) => s + i.qty, 0);
        return { found: true, qty: totalQty, confidence: 'exact-sku' };
    }

    // 2. SKU appears anywhere in raw text as a word
    const skuRx = new RegExp(`\\b${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (skuRx.test(rawText)) {
        // Try to extract a nearby quantity
        const near = new RegExp(`(\\d+)\\s{0,15}${sku}|${sku}\\s{0,15}(\\d+)`, 'i');
        const qm = rawText.match(near);
        if (qm) {
            const qty = parseInt(qm[1] || qm[2]);
            if (qty > 0 && qty < 100000) return { found: true, qty, confidence: 'sku-text' };
        }
        return { found: true, qty: null, confidence: 'sku-text' };
    }

    // 3. Keyword matching — require ≥60% of significant keywords to appear
    const significant = kw.filter(w => w.length > 3 && !['with', 'from', 'each', 'true', 'that', 'this'].includes(w));
    if (significant.length >= 2) {
        const hits = significant.filter(w => rawLower.includes(w));
        if (hits.length >= Math.ceil(significant.length * 0.6)) {
            // Try to find a quantity near a keyword hit
            const firstKw = hits[0];
            const idx = rawLower.indexOf(firstKw);
            const nearby = rawText.substring(Math.max(0, idx - 60), idx + 60);
            const qm = nearby.match(/\b(\d{1,5})\b/g);
            const qty = qm ? parseInt(qm[0]) : null;
            return { found: true, qty: (qty && qty < 100000) ? qty : null, confidence: 'keyword' };
        }
    }

    return { found: false, qty: null, confidence: null };
}
