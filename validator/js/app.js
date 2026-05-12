// ============================================================
// State
// ============================================================
const state = {
    rawText: '',
    parsedItems: [],
    product: '',
    H: 0,
    V: 0,
    supportType: 'Ground',
    voltage: 208,
    groundSupportType: 'Single Base',
    bpVariant: 'BP2V2',
    gp2HalfRows: 0,
    blankRows: 0,
    fileName: '',
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
function initUpload() {
    const zone = $('drop-zone');
    const input = $('file-input');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    input.addEventListener('change', () => {
        if (input.files[0]) handleFile(input.files[0]);
    });
}

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        setStatus('Please upload a PDF file.', 'error');
        return;
    }
    state.fileName = file.name;
    $('file-name').textContent = file.name;
    setStatus('Extracting text from PDF…', 'info');

    try {
        const text = await extractPDFText(file);
        if (!text || text.trim().length < 20) {
            setStatus('Could not extract text. The PDF may be a scanned image — try an OCR tool first.', 'error');
            return;
        }
        state.rawText = text;
        state.parsedItems = parseLineItems(text);

        // Auto-detect
        const product = detectProduct(text);
        const { H, V } = detectDimensions(text);
        const { supportType, voltage } = detectConfig(text);

        state.product = product;
        state.H = H;
        state.V = V;
        state.supportType = supportType;
        state.voltage = voltage;

        populateConfigForm();
        $('raw-text').textContent = text;
        showSection('config-section');
        showSection('raw-section');
        hideSection('results-section');
        setStatus(`PDF loaded. ${state.parsedItems.length} line items detected. Confirm settings below, then validate.`, 'success');
    } catch (err) {
        setStatus('Error reading PDF: ' + err.message, 'error');
        console.error(err);
    }
}

// ============================================================
// Config form
// ============================================================
function populateConfigForm() {
    $('sel-product').value = state.product || '';
    $('inp-h').value = state.H || '';
    $('inp-v').value = state.V || '';
    $('sel-support').value = state.supportType;
    $('sel-voltage').value = state.voltage;
    $('sel-ground-mode').value = state.groundSupportType;
    $('sel-bp-variant').value = state.bpVariant;
    $('inp-gp2-half').value = state.gp2HalfRows;
    $('inp-blank').value = state.blankRows;
    updateAdvancedVisibility();
}

function updateAdvancedVisibility() {
    const prod = $('sel-product').value;
    const supType = $('sel-support').value;

    $('row-bp-variant').style.display = prod === 'ROEBP' ? '' : 'none';
    $('row-gp2-half').style.display = prod === 'ROEGP26Full' ? '' : 'none';
    $('row-blank').style.display = (prod === 'ROEGP26Full' || prod === 'ROEBP' || prod === 'ROEGP26Half') ? '' : 'none';
    $('row-ground-mode').style.display = supType === 'Ground' ? '' : 'none';
}

// ============================================================
// Validation
// ============================================================
function runValidation() {
    const product = $('sel-product').value;
    const H = parseInt($('inp-h').value) || 0;
    const V = parseInt($('inp-v').value) || 0;

    if (!product) { setStatus('Please select a product type.', 'error'); return; }
    if (!H || !V) { setStatus('Please enter the tile dimensions (H and V).', 'error'); return; }

    const opts = {
        supportType: $('sel-support').value,
        voltage: parseInt($('sel-voltage').value),
        groundSupportType: $('sel-ground-mode').value,
        bpVariant: $('sel-bp-variant').value,
        gp2HalfRows: parseInt($('inp-gp2-half').value) || 0,
        blankRows: parseInt($('inp-blank').value) || 0,
    };

    const expected = getExpectedEquipment(product, H, V, opts);
    if (expected.length === 0) {
        setStatus('No equipment calculated — check product and dimensions.', 'error');
        return;
    }

    // Run comparison
    const results = expected.map(item => {
        const match = findItemInPDF(item, state.parsedItems, state.rawText);
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

    renderResults(results, H, V, product, opts);
    showSection('results-section');
    setStatus('Validation complete.', 'success');
    $('results-section').scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// Results rendering
// ============================================================
function renderResults(results, H, V, product, opts) {
    const found   = results.filter(r => r.status === 'found').length;
    const wrongQty = results.filter(r => r.status === 'wrong-qty').length;
    const missing = results.filter(r => r.status === 'missing').length;
    const total   = results.length;

    // Summary bar
    $('summary-found').textContent = found;
    $('summary-wrong').textContent = wrongQty;
    $('summary-missing').textContent = missing;
    $('summary-total').textContent = total;
    $('validation-title').textContent = `Validation — ${productLabel(product)} ${H}×${V} (${opts.supportType})`;

    // Group by category
    const categories = [...new Set(results.map(r => r.category))];
    const tbody = $('results-tbody');
    tbody.innerHTML = '';

    for (const cat of categories) {
        // Category header row
        const hdr = document.createElement('tr');
        hdr.className = 'cat-header';
        hdr.innerHTML = `<td colspan="5">${cat}</td>`;
        tbody.appendChild(hdr);

        for (const r of results.filter(x => x.category === cat)) {
            const tr = document.createElement('tr');
            tr.className = `row-${r.status}`;

            const statusIcon = r.status === 'found'     ? '✅'
                             : r.status === 'wrong-qty' ? '⚠️'
                             : '❌';

            const foundQtyCell = r.match.qty !== null
                ? `<span class="qty-found">${r.match.qty}</span>`
                : r.match.found
                    ? '<span class="qty-unknown">found (qty n/a)</span>'
                    : '<span class="qty-missing">—</span>';

            const confidenceBadge = r.match.confidence
                ? `<span class="badge badge-${r.match.confidence}">${r.match.confidence}</span>`
                : '';

            tr.innerHTML = `
                <td class="col-status">${statusIcon}</td>
                <td class="col-sku">${r.sku}</td>
                <td class="col-desc">${r.desc}${confidenceBadge}</td>
                <td class="col-qty">${r.qty}</td>
                <td class="col-found">${foundQtyCell}</td>
            `;
            tbody.appendChild(tr);
        }
    }
}

function productLabel(p) {
    return { Absen: 'Absen PL2.5', ROEGP26Full: 'ROE GP2.6 Full', ROEBP: 'ROE Black Pearl', ROEGP26Half: 'ROE GP2.6 Half' }[p] || p;
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
    a.href = URL.createObjectURL(blob);
    a.download = `equipment-validation-${Date.now()}.csv`;
    a.click();
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUpload();

    $('sel-product').addEventListener('change', updateAdvancedVisibility);
    $('sel-support').addEventListener('change', updateAdvancedVisibility);
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
