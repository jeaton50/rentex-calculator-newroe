// ============================================================
// State
// ============================================================
const state = {
    rawText: '',
    parsedItems: [],
    product: '',
    H: 0,
    V: 0,
    wallCount: 1,
    supportType: 'Ground',
    voltage: 208,
    groundSupportType: 'Single Base',
    bpVariant: 'BP2V2',
    curveType: 'Flat',
    gp2HalfRows: 0,
    blankRows: 0,
    fileName: '',
    detectedDataCable: null,
    detectedEdisonCable: null,
};

// ============================================================
// DOM helpers
// ============================================================
const $ = id => document.getElementById(id);

function showSection(id) { $(id).removeAttribute('hidden'); }
function hideSection(id) { $(id).setAttribute('hidden', ''); }

function setStatus(msg, type = 'info') {
    const el = $('status-bar');
    el.textContent = msg;
    el.className = `status-bar status-${type}`;
    el.removeAttribute('hidden');
}

// ============================================================
// Upload handling
// ============================================================
function getSelectedUploadType() {
    return $('radio-excel').checked ? 'excel' : 'pdf';
}

function syncUploadTypeUI() {
    const isExcel = getSelectedUploadType() === 'excel';
    $('drop-icon').textContent  = isExcel ? '📊' : '📄';
    $('drop-label').textContent = isExcel ? 'Drag & drop an Excel file here' : 'Drag & drop a PDF here';
    $('file-input').accept = isExcel ? '.xlsx,.xls' : '.pdf';

    // Highlight active radio label
    $('lbl-pdf').style.borderColor   = !isExcel ? 'var(--accent)' : 'var(--border)';
    $('lbl-excel').style.borderColor = isExcel  ? 'var(--accent)' : 'var(--border)';
}

function initUpload() {
    const zone  = $('drop-zone');
    const input = $('file-input');

    // Radio toggle
    $('radio-pdf').addEventListener('change', syncUploadTypeUI);
    $('radio-excel').addEventListener('change', syncUploadTypeUI);
    syncUploadTypeUI(); // set initial state

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) autoDetectTypeAndHandle(file);
    });
    input.addEventListener('change', () => {
        if (input.files[0]) handleFile(input.files[0], getSelectedUploadType());
    });
}

// When dragging a file in, auto-detect type from extension
function autoDetectTypeAndHandle(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        $('radio-excel').checked = true;
        syncUploadTypeUI();
        handleFile(file, 'excel');
    } else if (name.endsWith('.pdf')) {
        $('radio-pdf').checked = true;
        syncUploadTypeUI();
        handleFile(file, 'pdf');
    } else {
        setStatus('Unsupported file type. Please upload a PDF or Excel file (.xlsx/.xls).', 'error');
    }
}

// ============================================================
// PDF text preprocessing
// ============================================================
// Cleans up common artifacts introduced by PDF.js text extraction
// before the text reaches parseLineItems (parser.js — read-only).
//
// Key fix: Rentex PDFs include a "DPW" (Days Per Week) column between
// qty and price:  "SKU  Desc  60  1  $0.00  $0.00"
// Pattern A in parseLineItems grabs the integer immediately before "$",
// which is DPW=1, not the real qty=60. Stripping DPW beforehand fixes this.
function preprocessPDFText(text) {
    const lines = text.split('\n');
    const cleaned = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 1. Collapse multiple spaces to single (PDF column gaps show as many spaces)
        line = line.replace(/[^\S\n]+/g, ' ').trim();

        // 2. Drop blank lines, standalone page numbers, and "Page N of M" footers
        if (!line) continue;
        if (/^\d{1,3}$/.test(line)) continue;
        if (/^page\s+\d+\s+of\s+\d+$/i.test(line)) continue;

        // 3. Strip Rentex DPW column — the small integer between qty and price pair.
        //    Pattern: "...QTY  DPW  $PRICE  $EXTENDED" at end of line.
        //    Only fires when there are exactly two numbers before two dollar amounts,
        //    so lines that already have no DPW column are left untouched.
        //    e.g.  "GP2FULL ROE tile 60 1 $0.00 $0.00"  →  "GP2FULL ROE tile 60 $0.00 $0.00"
        //    e.g.  "GP2FULL ROE tile 60 $0.00 $0.00"    →  unchanged (one number only)
        line = line.replace(
            /\b(\d{1,6})\s+(\d{1,2})\s+(\$[\d,]+\.\d{2}\s+\$[\d,]+\.\d{2})\s*$/,
            '$1 $3'
        );

        cleaned.push(line);
    }

    // 4. Merge lines where a SKU line's description wrapped to the next line.
    //    Happens when PDF column widths push the qty/price onto a continuation row.
    //    Heuristic: if a line starts with a SKU but has no "$" and no trailing number,
    //    and the next line starts with a number or "$", join them.
    const merged = [];
    for (let i = 0; i < cleaned.length; i++) {
        const curr = cleaned[i];
        const next = cleaned[i + 1] || '';
        const startsWithSKU = /^[A-Z][A-Z0-9]{2,15}\s/.test(curr);
        const lacksQtyAndPrice = !/\$/.test(curr) && !/\s\d{1,6}\s*$/.test(curr);
        const nextStartsWithQtyOrPrice = /^[\d$]/.test(next);
        const nextIsNewItem = /^[A-Z][A-Z0-9]{2,15}\s/.test(next);

        if (startsWithSKU && lacksQtyAndPrice && nextStartsWithQtyOrPrice && !nextIsNewItem) {
            merged.push(curr + ' ' + next);
            i++; // consume the continuation line
        } else {
            merged.push(curr);
        }
    }

    return merged.join('\n');
}

async function handleFile(file, type) {
    state.fileName = file.name;
    $('file-name').textContent = file.name;

    const label = type === 'excel' ? 'Excel' : 'PDF';
    setStatus(`Extracting text from ${label}…`, 'info');

    try {
        let text;
        if (type === 'excel') {
            text = await extractExcelText(file);
        } else {
            text = await extractPDFText(file);
            text = preprocessPDFText(text);
        }

        if (!text || text.trim().length < 20) {
            const hint = type === 'pdf'
                ? 'The PDF may be a scanned image — try an OCR tool first.'
                : 'The spreadsheet appears to be empty.';
            setStatus(`Could not extract text. ${hint}`, 'error');
            return;
        }

        state.rawText = text;
        state.parsedItems = parseLineItems(text);

        // Auto-detect wall configuration
        const product = detectProduct(text);
        const { H, V } = detectDimensions(text);
        const { supportType, voltage } = detectConfig(text);
        const bpVariant = detectBPVariant(text);

        state.product = product;
        state.H = H;
        state.V = V;
        state.wallCount = detectWallCount(text);
        state.supportType = supportType;
        state.voltage = voltage;
        state.bpVariant = bpVariant || 'BP2V2';

        // Override voltage if power SKUs appear in the parsed line items —
        // more reliable than keyword text matching for most Rentex quotes
        const edisonSKUs = new Set(['EDT110M', 'TXT32ED6']);
        const distroSKUs = new Set(['CUBEDIST', 'L2130T1FB', 'TP1', 'SOCA6XTRU1']);
        for (const item of state.parsedItems) {
            if (edisonSKUs.has(item.sku)) { state.voltage = 120; break; }
            if (distroSKUs.has(item.sku)) { state.voltage = 208; break; }
        }

        // Override support type from hardware SKUs — fly headers / ground bases are
        // unambiguous; keyword text matching ("fly", "hang") can produce false positives.
        // Also scan raw text as fallback — $0.00 PDF items get captured with qty=1 (DPW)
        // by Pattern A which still puts them in parsedItems, but bundle SKUs like ROEGPFLYBK
        // never appear in parsedItems at all.
        const flySKUs  = new Set(['GP2HEAD1','GP2HEAD2','BPBOHEAD1','BPBOHEAD2','TXSNGLHEAD','TXDBLHEAD','PL25HEAD1','PL25HEAD2','ROEGPFLYBK']);
        const grndSKUs = new Set(['GP2BASE1','GP2BASE2','BPBOBB1','BPBOBB2','TXBASE1W','TXBASE2W','PL25BB1','PL25BB2']);
        let supportTypeFound = false;
        for (const item of state.parsedItems) {
            if (flySKUs.has(item.sku))  { state.supportType = 'Fly';    supportTypeFound = true; break; }
            if (grndSKUs.has(item.sku)) { state.supportType = 'Ground'; supportTypeFound = true; break; }
        }
        if (!supportTypeFound) {
            const rawUp = text.toUpperCase();
            for (const s of flySKUs)  { if (rawUp.includes(s)) { state.supportType = 'Fly';    break; } }
            for (const s of grndSKUs) { if (rawUp.includes(s)) { state.supportType = 'Ground'; break; } }
        }

        // Auto-detect GP2Full + GP2Half active tile counts from parsed line items
        // (used in runValidation to fill V and gp2HalfRows when H is entered manually)
        state._detectedFullTiles = 0;
        state._detectedHalfTiles = 0;
        for (const item of state.parsedItems) {
            if (item.sku === 'GP2FULL' && !/spare/i.test(item.raw)) state._detectedFullTiles += item.qty;
            if (item.sku === 'GP2HALF' && !/spare/i.test(item.raw)) state._detectedHalfTiles += item.qty;
        }

        // Excel fallback: Rentex Excel format is SKU\tDescription\tQty\tPrice\tExtended.
        // parseLineItems Pattern B may grab the Extended Price column as qty when prices are
        // whole numbers (e.g. "36000"), producing a wildly wrong tile count. Always read col2
        // directly for tab-separated text so the actual Qty column is used.
        if (text.includes('\t') && product === 'ROEGP26Full') {
            let excelFullTiles = 0, excelHalfTiles = 0;
            for (const line of text.split('\n')) {
                const cols = line.split('\t').map(c => c.trim());
                if (cols.length >= 3) {
                    const sku = cols[0].toUpperCase();
                    const qty = parseInt(cols[2]);
                    // qty < 10000 guards against accidentally picking up a large price value
                    if (!isNaN(qty) && qty > 0 && qty < 10000 && !/spare/i.test(line)) {
                        if (sku === 'GP2FULL') excelFullTiles += qty;
                        if (sku === 'GP2HALF') excelHalfTiles += qty;
                    }
                }
            }
            // Always override parsedItems result for these SKUs — col2 is authoritative
            if (excelFullTiles > 0) state._detectedFullTiles = excelFullTiles;
            if (excelHalfTiles > 0) state._detectedHalfTiles = excelHalfTiles;
        }

        // Active tile count for non-GP2Full products — used to infer a missing H or V
        state._detectedActiveTiles = 0;
        if (product !== 'ROEGP26Full') {
            const activeTileSKUs = new Set(['PL25', 'BP2V2', 'BP2B1', 'BP2B2', 'TXNOMAD26', 'GP2HALF']);
            for (const item of state.parsedItems) {
                if (activeTileSKUs.has(item.sku) && !/spare/i.test(item.raw)) state._detectedActiveTiles += item.qty;
            }
        }

        // Infer the missing dimension from tile count when the other is already known
        const _tiles = product === 'ROEGP26Full' ? state._detectedFullTiles : state._detectedActiveTiles;
        if (_tiles > 0) {
            if (!state.H && state.V > 0) state.H = Math.round(_tiles / state.V);
            if (!state.V && state.H > 0) state.V = Math.round(_tiles / state.H);
        }

        // GP2Full half rows (uses state.H which may have just been auto-filled above)
        if (product === 'ROEGP26Full' && state.H > 0 && state._detectedHalfTiles > 0) {
            state.gp2HalfRows = Math.round(state._detectedHalfTiles / state.H);
        }

        // Auto-detect blank/dummy rows — match by SKU pattern or description keywords
        state.blankRows = 0;
        if (state.H > 0) {
            for (const item of state.parsedItems) {
                if (/BLANK|DUMMY/i.test(item.sku) || /blank\s*tile|dummy\s*tile/i.test(item.raw)) {
                    state.blankRows = Math.max(1, Math.round(item.qty / state.H));
                    break;
                }
            }
        }

        // Auto-detect Double Base ground mode
        // GP2BASE2 (2-wide) only signals Double Base when GP2BASE1 (1-wide) is absent
        if (/bpbobb2|txbase2w/i.test(text)
            || (/gp2base2/i.test(text) && !/gp2base1/i.test(text))
            || (/pl25bb2/i.test(text) && !/pl25bb1/i.test(text))) {
            state.groundSupportType = 'Double Base';
        }

        // Detect which data cable length is actually on the order so the calculator
        // can use the exact SKU for matching rather than relying on keyword fallback
        const DATA_CABLE_SKUS = ['ECON100C6', 'ECON050C6', 'ECON010C6'];
        const detectedCable = state.parsedItems.find(i => DATA_CABLE_SKUS.includes(i.sku));
        state.detectedDataCable = detectedCable ? detectedCable.sku : null;

        // Detect which Edison cable SKU is on the order — orders often use 6' (EDT1006)
        // or 10' (EDT1010) instead of the default EDT110M, so match the actual SKU
        const EDISON_CABLE_SKUS = ['EDT110M', 'EDT1006', 'EDT1010', 'EDT1003'];
        const detectedEdison = state.parsedItems.find(i => EDISON_CABLE_SKUS.includes(i.sku));
        if (!detectedEdison) {
            // Also check raw text for Edison cable SKUs not captured by parsedItems
            const rawUp = text.toUpperCase();
            state.detectedEdisonCable = EDISON_CABLE_SKUS.find(s => rawUp.includes(s)) || null;
        } else {
            state.detectedEdisonCable = detectedEdison.sku;
        }

        // Auto-detect Black Pearl variant from package or tile SKUs in parsed items,
        // then fall back to raw text search (package SKUs are most definitive)
        if (product === 'ROEBP') {
            const bpVariantFromSKU = (sku) => {
                if (/^8PBP2B1$|^BP2B1$/i.test(sku)) return 'BP2B1';
                if (/^8PBP2B2$|^BP2B2$/i.test(sku)) return 'BP2B2';
                if (/^8PBP2V2$|^BP2V2$/i.test(sku)) return 'BP2V2';
                return null;
            };
            // Prefer package SKU (8PBP2xx) over tile SKU for detection
            const pkgItem = state.parsedItems.find(i => /^8PBP2/i.test(i.sku));
            const tileItem = state.parsedItems.find(i => /^BP2[BV]\d/i.test(i.sku));
            const detected = (pkgItem && bpVariantFromSKU(pkgItem.sku))
                          || (tileItem && bpVariantFromSKU(tileItem.sku))
                          || (/\b8PBP2B1\b/i.test(text) ? 'BP2B1' : null)
                          || (/\b8PBP2B2\b/i.test(text) ? 'BP2B2' : null)
                          || (/\b8PBP2V2\b|\bBP2V2\b/i.test(text) ? 'BP2V2' : null);
            if (detected) state.bpVariant = detected;
        }

        populateConfigForm();
        $('raw-text').textContent = text;
        showSection('config-section');
        showSection('raw-section');
        hideSection('results-section');
        setStatus(
            `${label} loaded — ${state.parsedItems.length} line items detected. Confirm settings below, then validate.`,
            'success'
        );
    } catch (err) {
        setStatus(`Error reading ${label}: ${err.message}`, 'error');
        console.error(err);
    }
}

// ============================================================
// Multi-wall helpers
// ============================================================
function addExtraWall(h, v, count, supportType) {
    const container = $('extra-walls-container');
    const row = document.createElement('div');
    row.className = 'extra-wall-row';
    const selVal = supportType || 'Ground';
    row.innerHTML = `
        <input type="number" placeholder="H" min="1" max="200" value="${h || ''}" style="width:56px">
        <span class="wall-sep">×</span>
        <input type="number" placeholder="V" min="1" max="200" value="${v || ''}" style="width:56px">
        <span class="wall-sep" style="margin-left:4px">Count:</span>
        <input type="number" placeholder="1" min="1" max="20" value="${count || 1}" style="width:48px">
        <select style="font-size:12px;padding:2px 4px;background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:4px">
            <option value="Ground"${selVal === 'Ground' ? ' selected' : ''}>Ground</option>
            <option value="Fly"${selVal === 'Fly' ? ' selected' : ''}>Fly</option>
        </select>
        <button class="btn-remove" onclick="this.parentElement.remove()" title="Remove">✕</button>`;
    container.appendChild(row);
}

function getExtraWalls() {
    const rows = $('extra-walls-container').querySelectorAll('.extra-wall-row');
    const walls = [];
    for (const row of rows) {
        const inputs = row.querySelectorAll('input');
        const sel   = row.querySelector('select');
        const H = parseInt(inputs[0].value) || 0;
        const V = parseInt(inputs[1].value) || 0;
        const count = parseInt(inputs[2].value) || 1;
        const supportType = sel ? sel.value : 'Ground';
        if (H > 0 && V > 0) walls.push({ H, V, count, supportType });
    }
    return walls;
}

// ============================================================
// Config form
// ============================================================
function populateConfigForm() {
    $('sel-product').value = state.product || '';
    $('inp-walls').value  = state.wallCount || 1;
    $('inp-h').value = state.H || '';
    $('inp-v').value = state.V || '';
    $('sel-support').value = state.supportType;
    $('sel-voltage').value = state.voltage;
    $('sel-ground-mode').value = state.groundSupportType;
    $('sel-bp-variant').value = state.bpVariant;
    $('inp-gp2-half').value = state.gp2HalfRows;
    $('inp-blank').value = state.blankRows;
    updateAdvancedVisibility();
    updateCurveOptions(state.curveType || 'Flat');
}

// Curve options differ by product — Black Pearl is concave-only per catalog
const CURVE_OPTIONS = {
    Absen:       ['Flat', 'Concave', 'Convex'],
    ROEGP26Full: ['Flat', 'Concave', 'Convex'],
    ROEGP26Half: ['Flat', 'Concave', 'Convex'],
    ROEBP:       ['Flat', 'Concave'],
    Theatrixx:   ['Flat', 'Concave', 'Convex'],
};

function updateCurveOptions(preserveValue) {
    const prod = $('sel-product').value;
    const sel  = $('sel-curve');
    const opts = CURVE_OPTIONS[prod] || ['Flat', 'Concave', 'Convex'];
    const current = preserveValue || sel.value;
    sel.innerHTML = opts.map(o => `<option value="${o}"${o === current ? ' selected' : ''}>${o}</option>`).join('');
    // Reset to Flat if current value isn't valid for this product
    if (!opts.includes(sel.value)) sel.value = 'Flat';
}

// Tile widths in feet per product (all tiles are 0.5m = 1.6404ft wide)
// Tile heights: GP2.6 Full = 1.0m = 3.2808ft; all others = 0.5m = 1.6404ft
function getTileSizeFt(product) {
    return { w: 1.6404, h: product === 'ROEGP26Full' ? 3.2808 : 1.6404 };
}

function convertScreenSize() {
    const product = $('sel-product').value;
    const wRaw = parseFloat($('inp-screen-w').value);
    const hRaw = parseFloat($('inp-screen-h').value);
    const unit = $('sel-screen-unit').value;
    if (!wRaw && !hRaw) { setStatus('Enter a screen width or height to convert.', 'error'); return; }

    const toFt = unit === 'm' ? 3.28084 : 1;
    const wFt = wRaw * toFt;
    const hFt = hRaw * toFt;
    const tile = getTileSizeFt(product || 'ROEBP');

    if (wFt > 0) $('inp-h').value = Math.round(wFt / tile.w);
    if (hFt > 0) $('inp-v').value = Math.round(hFt / tile.h);
    setStatus('Tile counts updated from screen dimensions.', 'success');
}

function updateAdvancedVisibility() {
    const prod = $('sel-product').value;
    const supType = $('sel-support').value;
    const isROE = ['ROEGP26Full', 'ROEBP', 'ROEGP26Half'].includes(prod);

    $('row-bp-variant').style.display = prod === 'ROEBP' ? '' : 'none';
    $('row-gp2-half').style.display = prod === 'ROEGP26Full' ? '' : 'none';
    $('row-blank').style.display = isROE ? '' : 'none';
    $('row-ground-mode').style.display = supType === 'Ground' ? '' : 'none';
    $('row-curve').style.display = prod ? '' : 'none';
    updateCurveOptions();
}

function toggleAdvancedOptions() {
    const fields = $('advanced-fields');
    const btn = $('btn-advanced');
    const open = fields.style.display !== 'none';

    fields.style.display = open ? 'none' : '';
    btn.textContent = open ? '▶ Advanced options' : '▼ Advanced options';
    btn.setAttribute('aria-expanded', String(!open));
}

// ============================================================
// Validation
// ============================================================
function runValidation() {
    const product   = $('sel-product').value;
    const H         = parseInt($('inp-h').value)     || 0;
    let   V         = parseInt($('inp-v').value)     || 0;
    const wallCount = parseInt($('inp-walls').value) || 1;

    if (!product) { setStatus('Please select a product type.', 'error'); return; }
    if (!H) { setStatus('Please enter the tile width (H).', 'error'); return; }

    // For GP2Full walls: auto-compute V and gp2HalfRows from detected tile counts if not set
    if (product === 'ROEGP26Full' && H > 0) {
        if (!V && state._detectedFullTiles > 0) {
            V = Math.round(state._detectedFullTiles / H);
            $('inp-v').value = V;
        }
    }

    if (!V) { setStatus('Please enter the tile height (V).', 'error'); return; }

    const opts = {
        supportType:     $('sel-support').value,
        voltage:         parseInt($('sel-voltage').value, 10),
        groundSupportType: $('sel-ground-mode').value,
        bpVariant:       $('sel-bp-variant').value,
        curveType:       $('sel-curve').value || 'Flat',
        gp2HalfRows:     parseInt($('inp-gp2-half').value) || 0,
        blankRows:       parseInt($('inp-blank').value)    || 0,
        dataCableOverride:   state.detectedDataCable  || null,
        edisonCableOverride: state.detectedEdisonCable || null,
    };

    // Auto-compute gp2HalfRows from detected half tile count if not manually set
    if (product === 'ROEGP26Full' && H > 0 && opts.gp2HalfRows === 0 && state._detectedHalfTiles > 0) {
        opts.gp2HalfRows = Math.round(state._detectedHalfTiles / H);
        $('inp-gp2-half').value = opts.gp2HalfRows;
    }

    // Build wall list: primary wall (uses global support type) + extra walls (each has own support type)
    const allWalls = [{ H, V, count: wallCount, supportType: opts.supportType }, ...getExtraWalls()];

    // Generate expected equipment for every wall and merge by SKU+description
    const skuMap = new Map();
    for (const wall of allWalls) {
        const wallOpts = wall.supportType !== opts.supportType
            ? { ...opts, supportType: wall.supportType }
            : opts;
        const items = getExpectedEquipment(product, wall.H, wall.V, wallOpts);
        if (items.length === 0) continue;
        for (const item of items) {
            const key = `${item.sku}||${item.desc}`;
            const scaledQty = item.qty * wall.count;
            if (skuMap.has(key)) {
                skuMap.get(key).qty += scaledQty;
            } else {
                skuMap.set(key, { ...item, qty: scaledQty });
            }
        }
    }
    const expected = [...skuMap.values()];
    if (expected.length === 0) {
        setStatus('No equipment calculated — check product and dimensions.', 'error');
        return;
    }

    // Compare against PDF
    const results = expected.map(item => {
        const match = findItemInPDF(item, state.parsedItems, state.rawText);

        // If qty is still null after findItemInPDF, attempt a more targeted extraction
        // using the preprocessed raw text. Looks for the SKU followed (or preceded)
        // by a standalone integer on the same line.
        if (match.found && match.qty === null) {
            const skuEsc = item.sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            for (const line of state.rawText.split('\n')) {
                if (!new RegExp(skuEsc, 'i').test(line)) continue;
                // Try: SKU then qty (Rentex format, after preprocessing DPW is gone)
                let m = line.match(new RegExp(`${skuEsc}\\s+.+?\\s+(\\d{1,6})\\s+\\$`, 'i'));
                if (m) { match.qty = parseInt(m[1]); break; }
                // Try: qty then SKU (qty-first format)
                m = line.match(new RegExp(`^\\s*(\\d{1,6})\\s+${skuEsc}\\b`, 'i'));
                if (m) { match.qty = parseInt(m[1]); break; }
                // Try: any standalone number near the SKU (last resort)
                const nums = line.match(/\b(\d{1,6})\b/g);
                if (nums && nums.length > 0) {
                    const candidate = parseInt(nums[nums.length > 1 ? nums.length - 2 : 0]);
                    if (candidate > 0 && candidate < 100000) { match.qty = candidate; break; }
                }
            }
        }

        let status;
        if (!match.found) {
            status = 'missing';
        } else if (match.qty !== null && match.qty !== item.qty) {
            status = 'wrong-qty';
        } else {
            status = 'found';
        }
        return { ...item, match, status };
    });

    // Bundle post-processing: Rentex orders often use bundle SKUs (ROEGPBK, ROEGPFLYBK,
    // LEDDATABK) that contain individual items without listing them separately.
    // Treat those items as found (with confidence='bundle') when the parent bundle appears.
    const BUNDLE_CONTENTS = {
        'ROEGPBK':    new Set(['BPGPUBT','BPGPREAR1','BPGPREAR05','BPGPBRIDGE']),
        'ROEGPFLYBK': new Set(['GP2HEAD1','GP2HEAD2']),
        'LEDDATABK':  new Set(['ECON050C6','ECON100C6','T1016']),
    };
    const rawUpBundle = state.rawText.toUpperCase();
    for (const [bundleSKU, contents] of Object.entries(BUNDLE_CONTENTS)) {
        if (rawUpBundle.includes(bundleSKU)) {
            for (const r of results) {
                if (r.status === 'missing' && contents.has(r.sku)) {
                    r.status = 'found';
                    r.match = { found: true, qty: null, confidence: 'bundle' };
                }
            }
        }
    }

    renderResults(results, allWalls, product, opts);
    showSection('results-section');
    setStatus('Validation complete.', 'success');
    $('results-section').scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// Results rendering
// ============================================================
function renderResults(results, allWalls, product, opts) {
    const found   = results.filter(r => r.status === 'found').length;
    const wrongQty = results.filter(r => r.status === 'wrong-qty').length;
    const missing = results.filter(r => r.status === 'missing').length;
    const total   = results.length;

    // Summary bar
    $('summary-found').textContent = found;
    $('summary-wrong').textContent = wrongQty;
    $('summary-missing').textContent = missing;
    $('summary-total').textContent = total;
    const wallParts = allWalls.map(w => {
        const dims = w.count > 1 ? `${w.count}× ${w.H}×${w.V}` : `${w.H}×${w.V}`;
        return w.supportType ? `${dims} (${w.supportType})` : dims;
    });
    $('validation-title').textContent = `Validation — ${productLabel(product)} ${wallParts.join(' + ')}`;

    // Group by category
    const categories = [...new Set(results.map(r => r.category))];
    const tbody = $('results-tbody');
    tbody.replaceChildren();

    for (const cat of categories) {
        // Category header row
        const hdr = document.createElement('tr');
        hdr.className = 'cat-header';
        const hdrCell = document.createElement('td');
        hdrCell.colSpan = 5;
        hdrCell.textContent = cat;
        hdr.appendChild(hdrCell);
        tbody.appendChild(hdr);

        for (const r of results.filter(x => x.category === cat)) {
            const tr = document.createElement('tr');
            tr.className = `row-${r.status}`;

            const statusIcon = r.status === 'found'     ? '✅'
                             : r.status === 'wrong-qty' ? '⚠️'
                             : '❌';

            appendCell(tr, 'col-status', statusIcon);
            appendCell(tr, 'col-sku', r.sku);

            const descCell = appendCell(tr, 'col-desc', r.desc);
            if (r.match.confidence) {
                const badge = document.createElement('span');
                badge.className = `badge badge-${r.match.confidence}`;
                badge.textContent = r.match.confidence;
                descCell.appendChild(badge);
            }

            appendCell(tr, 'col-qty', r.qty);
            appendFoundQtyCell(tr, r.match);
            tbody.appendChild(tr);
        }
    }
}

function combineExpectedItems(items) {
    const grouped = new Map();

    for (const item of items) {
        const key = `${item.category}|${item.sku}`;
        const existing = grouped.get(key);

        if (!existing) {
            grouped.set(key, { ...item, keywords: [...(item.keywords || [])] });
            continue;
        }

        existing.qty += item.qty;
        existing.desc = mergeDescriptions(existing.desc, item.desc);
        existing.keywords = [...new Set([...(existing.keywords || []), ...(item.keywords || [])])];
    }

    return [...grouped.values()];
}

function mergeDescriptions(left, right) {
    const leftBase = stripQuantityRole(left);
    const rightBase = stripQuantityRole(right);

    if (leftBase === rightBase) return `${leftBase} (active + spares)`;
    if (left.includes(right)) return left;
    if (right.includes(left)) return right;
    return `${left} + ${right}`;
}

function stripQuantityRole(desc) {
    return String(desc).replace(/\s*\((?:active|spares)\)\s*$/i, '').trim();
}

function appendCell(row, className, text) {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
}

function appendFoundQtyCell(row, match) {
    const cell = document.createElement('td');
    cell.className = 'col-found';

    const span = document.createElement('span');
    if (match.qty !== null) {
        span.className = 'qty-found';
        span.textContent = match.qty;
    } else if (match.found) {
        span.className = 'qty-unknown';
        span.textContent = 'found (qty n/a)';
    } else {
        span.className = 'qty-missing';
        span.textContent = '—';
    }

    cell.appendChild(span);
    row.appendChild(cell);
}

function productLabel(p) {
    return { Absen: 'Absen PL2.5', ROEGP26Full: 'ROE GP2.6 Full', ROEBP: 'ROE Black Pearl', ROEGP26Half: 'ROE GP2.6 Half', Theatrixx: 'Theatrixx Nomad 2.6' }[p] || p;
}

// ============================================================
// Export to CSV
// ============================================================
function exportCSV() {
    const rows = [['Status', 'SKU', 'Description', 'Expected Qty', 'Found Qty', 'Match Method']];
    for (const tr of $('results-tbody').querySelectorAll('tr:not(.cat-header)')) {
        const cells = tr.querySelectorAll('td');
        rows.push([
            cells[0].textContent.trim(),
            cells[1].textContent.trim(),
            cells[2].textContent.trim(),
            cells[3].textContent.trim(),
            cells[4].textContent.trim(),
            '',
        ]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `equipment-validation-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUpload();

    $('sel-product').addEventListener('change', updateAdvancedVisibility);
    $('sel-support').addEventListener('change', updateAdvancedVisibility);
    // Hide curve row until a product is chosen
    $('row-curve').style.display = 'none';
    $('btn-validate').addEventListener('click', runValidation);
    $('btn-export').addEventListener('click', exportCSV);
    $('btn-toggle-raw').addEventListener('click', () => {
        const pre = $('raw-text');
        const btn = $('btn-toggle-raw');
        if (pre.style.display === 'none') {
            pre.style.display = '';
            btn.textContent = 'Hide extracted text';
        } else {
            pre.style.display = 'none';
            btn.textContent = 'Show extracted text';
        }
    });
});
