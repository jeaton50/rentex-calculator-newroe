// ============================================================
// Shared: processor selection
// ============================================================
function selectProcessors(totalTiles, H, V, pixW, pixH) {
    const maxSX40 = Math.floor(4096 / pixW) * Math.floor(2160 / pixH);
    const minForPixels = Math.ceil(H * pixW / 4096) * Math.ceil(V * pixH / 2160);
    const tilesPerCascade = Math.ceil(totalTiles / 10);
    const base = Math.max(Math.ceil(totalTiles / maxSX40), Math.ceil(tilesPerCascade / 40), minForPixels);
    // S8 only for small walls that also fit within a single processor's pixel budget
    if (totalTiles <= 80 && H * pixW <= 4096 && V * pixH <= 2160) {
        return { S8: 1, SX40: 0, XD10: 0, count: 1 };
    }
    const distrib = Math.max(base, Math.ceil(totalTiles / 100));
    return { S8: 0, SX40: base, XD10: Math.max(0, distrib - base), count: distrib };
}

// Shared: ROE truss hardware
function roeHardware(H, V, tileHeightM, gp2HalfRows, blankRows, isGP2Full) {
    const halfHeightM = (gp2HalfRows || 0) * 0.5;
    const dummyHeightM = (blankRows || 0) * tileHeightM;
    const tileHeightTotal = V * tileHeightM;
    const effectiveHeightM = tileHeightTotal + halfHeightM + dummyHeightM;
    const dense = effectiveHeightM > 4.0;

    let universalBaseTruss, rearTruss;
    if (dense) {
        universalBaseTruss = H;
        rearTruss = Math.floor(effectiveHeightM) * H;
    } else {
        universalBaseTruss = Math.ceil(H / 1.9);
        const effectiveV = V + (blankRows || 0);
        // GP2 Full tiles are 1m tall — each row needs one 1m rear truss section.
        // BP/Half tiles are 0.5m — pairs of rows share one 1m rear truss section.
        rearTruss = isGP2Full
            ? effectiveV * universalBaseTruss
            : Math.floor(effectiveV / 2) * universalBaseTruss;
    }

    // Half-meter row flag
    const effectiveTotalBlocks = V + (blankRows || 0);
    const hasHalf = isGP2Full
        ? (gp2HalfRows || 0) > 0
        : (effectiveTotalBlocks % 2 === 1 && effectiveTotalBlocks >= 3);

    const rearBridge = rearTruss + (hasHalf ? universalBaseTruss : 0);
    const rearHalf = hasHalf ? universalBaseTruss : 0;

    return { universalBaseTruss, rearTruss, rearBridge, rearHalf, dense, effectiveHeightM };
}

// Shared: power distro (208V logic)
function powerDistro(totalTiles, wattsPerTile) {
    const watts = totalTiles * wattsPerTile;
    const amps208 = watts / 208;
    const circuits = Math.ceil(totalTiles / 16);

    if (amps208 > 200) {
        const tp1 = Math.ceil(amps208 / 400);
        const soca = Math.ceil(circuits / 6);
        return {
            TP1: Math.max(tp1, Math.ceil(soca / 4)),
            SOCA6XTRU1: soca,
            CUBEDIST: 0, L2130T1FB: 0
        };
    }
    const cube = Math.ceil(amps208 / 200) || 1;
    const l2130 = Math.ceil(circuits / 3);
    return {
        CUBEDIST: Math.max(cube, Math.ceil(l2130 / 6)),
        L2130T1FB: l2130,
        TP1: 0, SOCA6XTRU1: 0
    };
}

// Shared: data cable type based on geometric distance
function dataCableType(H, V, processorCount, tileWidthFt, tileHeightFt) {
    const B41 = processorCount || 1;
    const B42 = (H * tileWidthFt) / (B41 * 2);
    const B39 = V * tileHeightFt;
    const dist = Math.sqrt(B42 * B42 + B39 * B39);
    if (dist < 7) return 'CAT5ES005';
    if (dist < 11) return 'ECON010C6';
    if (dist < 51) return 'ECON050C6';
    return 'ECON100C6';
}

const CABLE_DESCS = {
    CAT5ES005: "CAT5e ethernet cable 5'",
    ECON010C6: "Ethercon (CAT6) 10'",
    ECON050C6: "Ethercon (CAT6) 50'",
    ECON100C6: "Ethercon (CAT6) 100'",
};

const EDISON_CABLE_DESCS = {
    EDT110M: "Edison to True1 power cable 10m",
    EDT1003: "Edison to True1 power cable 3'",
    EDT1006: "Edison to True1 power cable 6'",
    EDT1010: "Edison to True1 power cable 10'",
};

function edisonCableKeywords(sku) {
    const skuLower = sku.toLowerCase();
    const aliases = Object.keys(EDISON_CABLE_DESCS).map(s => s.toLowerCase()).filter(s => s !== skuLower);
    return [skuLower, ...aliases, 'edison', 'true1'];
}

// Keywords cover both 50' and 100' SKUs as aliases — used when no override
// is detected, so either length satisfies the expected entry.
function dataCableKeywords(sku) {
    const skuLower = sku.toLowerCase();
    const aliases = ['econ050c6', 'econ100c6'].filter(s => s !== skuLower);
    return [skuLower, ...aliases, 'ethercon', 'data', 'cable'];
}

// GP2.6 sandbag calculation — replicates the main calculator ballast formula
// (ROE Stacking Universal GT System, from equipment.js calculateGP26Sandbags)
function calcGP26Sandbags(productType, H, V, gp2HalfRows) {
    const t050 = {
        2.0:{BB:18,BF:20}, 2.5:{BB:28,BF:32}, 3.0:{BB:42,BF:47},
        3.5:{BB:57,BF:66}, 4.0:{BB:76,BF:87}, 4.5:{BB:86,BF:99},
        5.0:{BB:97,BF:112}, 5.5:{BB:110,BF:127}, 6.0:{BB:124,BF:144}
    };
    const t100 = {
        2.0:{BB:38,BF:44}, 2.5:{BB:60,BF:70}, 3.0:{BB:87,BF:102},
        3.5:{BB:120,BF:140}, 4.0:{BB:157,BF:184}
    };
    function lerp(tbl, h) {
        const ks = Object.keys(tbl).map(Number).sort((a,b) => a-b);
        if (h <= ks[0]) return tbl[ks[0]];
        if (h >= ks[ks.length-1]) return tbl[ks[ks.length-1]];
        let lo = ks[0], hi = ks[ks.length-1];
        for (let i = 0; i < ks.length-1; i++) {
            if (ks[i] <= h && h < ks[i+1]) { lo = ks[i]; hi = ks[i+1]; break; }
        }
        const t = (h - lo) / (hi - lo);
        return { BB: tbl[lo].BB + t*(tbl[hi].BB - tbl[lo].BB),
                 BF: tbl[lo].BF + t*(tbl[hi].BF - tbl[lo].BF) };
    }
    const ledKg  = productType === 'ROEGP26Full' ? 18.0 : 20.76;
    const heightM = productType === 'ROEGP26Full'
        ? V * 1.0 + (gp2HalfRows || 0) * 0.5
        : V * 0.5;
    let bay, tbl, n;
    if (productType === 'ROEGP26Full') {
        bay = 0.50; tbl = t050; n = H;
    } else {
        const dense = heightM > 4.0;
        bay = dense ? 0.50 : 1.00;
        tbl = dense ? t050 : t100;
        n   = dense ? H : Math.ceil((H + 1) / 2);
    }
    const base = lerp(tbl, heightM);
    const adjBF = Math.max(0, base.BF - ledKg * bay * heightM * 1.108);
    return Math.ceil(n * (base.BB + adjBF) / 11.34);
}

// ============================================================
// ABSEN PL2.5
// ============================================================
function calcAbsen(H, V, opts = {}) {
    const { supportType = 'Ground', voltage = 208, groundSupportType = 'Single Base', edisonCableOverride = null } = opts;
    const items = [];
    const add = (sku, desc, qty, cat, kw) => {
        if (qty > 0) items.push({ sku, desc, qty, category: cat, keywords: kw || [] });
    };

    // Tiles & cases
    const totalTiles = H * V;
    const totalSpares = calcSpares(totalTiles, 8, 1.5);
    const totalWithSpares = totalTiles + totalSpares;
    const casesNeeded = Math.ceil(totalWithSpares / 8);

    add('8PPL25', 'Absen PL2.5 8× tile package', casesNeeded, 'Tiles', ['8ppl25', 'absen', 'package', '8x']);
    add('PL25', 'Absen PL2.5 tile (active)', totalTiles, 'Tiles', ['pl25', 'absen', 'pl2.5', 'tile']);
    add('PL25', 'Absen PL2.5 tile (spares)', totalSpares, 'Tiles', ['pl25', 'absen', 'spare', 'pl2.5']);
    add('PL25CASE8X', 'Case, Absen PL2.5, 8×', casesNeeded, 'Tiles', ['pl25case8x', 'pl25case', 'case', 'absen']);

    // Processor
    const proc = selectProcessors(totalTiles, H, V, 200, 200);
    if (proc.S8 > 0) add('S8', 'Brompton Tessera S8', proc.S8, 'Processor', ['s8', 'brompton', 'tessera']);
    if (proc.SX40 > 0) add('SX40', 'Brompton Tessera SX40', proc.SX40, 'Processor', ['sx40', 'brompton', 'tessera']);
    if (proc.XD10 > 0) add('XD10', 'Brompton Tessera XD10G', proc.XD10, 'Processor', ['xd10', 'brompton', 'distribution']);

    // Ground support
    if (supportType === 'Ground') {
        const singleBases = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleBases = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        const outriggers = Math.ceil(H / 1.9);
        const clamps = Math.floor(V / 2) * outriggers;

        const O13 = Math.ceil((H / 2) - 1);
        const O14 = Math.ceil((H / 2) - O13);
        const P13 = Math.ceil(O13 - O13 * 0.25);
        const P15 = Math.ceil(P13 * 0.25);
        const N12 = V > 5.1 ? 2 : 0;
        const supportBeams1000mm = Math.max(0, (O13 * N12) - (P15 * N12));
        const supportBeams50mm = O14 * N12;
        const beamConnectors = P15 * N12;
        const platforms = N12 > 0 ? Math.ceil(O13 / 2) : 0;

        add('PL25BB1', 'Absen PL2.5 base bar, 1W, 0.5m', singleBases, 'Hardware', ['pl25bb1', 'base bar', '0.5m', '1w']);
        add('PL25BB2', 'Absen PL2.5 base bar, 2W, 1m', doubleBases, 'Hardware', ['pl25bb2', 'base bar', '1m', '2w']);
        add('PL25OUT', 'Absen PL2.5 outrigger', outriggers, 'Hardware', ['pl25out', 'outrigger', 'absen']);
        add('PL25LAD1M', 'Absen PL2.5 ladder 1m', clamps, 'Hardware', ['pl25lad', 'ladder', '1m']);
        add('PL25CLAMP', 'Absen PL2.5 clamp', clamps, 'Hardware', ['pl25clamp', 'clamp', 'absen']);
        add('PL25BEAM50', 'Absen PL2.5 support beam 500mm', supportBeams50mm, 'Hardware', ['pl25beam50', 'beam', '500']);
        add('PL25BEAM1K', 'Absen PL2.5 support beam 1000mm', supportBeams1000mm, 'Hardware', ['pl25beam1k', 'beam', '1000']);
        add('PL25BEAMAD', 'Absen PL2.5 support beam connector', beamConnectors, 'Hardware', ['pl25beamad', 'connector', 'beam', 'adjustable']);
        add('PL25PLAT', 'Absen PL2.5 platform', platforms, 'Hardware', ['pl25plat', 'platform', 'absen']);

        // Sandbags
        const sbTable = [0, 0, 0, 4, 6, 8, 11, 15, 17, 19, 21, 23];
        const idx = Math.min(V - 1, sbTable.length - 1);
        const baseCount = singleBases + doubleBases;
        const sandbags = Math.ceil(sbTable[Math.max(0, idx)] * baseCount / 1.0525);
        add('SANDBAG25', 'Sand Bag 25 lbs.', sandbags, 'Hardware', ['sandbag', 'sand bag', '25']);
    } else {
        add('PL25HEAD1', 'Absen PL2.5 header, 1W, 0.5m', H % 2 ? H : 0, 'Hardware', ['pl25head1', 'header', '1w']);
        add('PL25HEAD2', 'Absen PL2.5 header, 2W, 1m', Math.floor(H / 2), 'Hardware', ['pl25head2', 'header', '2w']);
    }

    // Cables
    const circuits = Math.ceil(totalTiles / 16);

    // B35 = distributionUnitCount + adjustment (from main calculator)
    // distributionUnitCount ≈ proc.count for standard "None" redundancy
    // B35 drives the ECON100C6 count; xd10Count * 10 covers additional XD10 outputs
    const B35 = proc.count + (proc.count > 0 && proc.count < 5 ? 1 : proc.count > 9 ? 3 : 0);
    const xd10DataCables = proc.XD10 > 0 ? proc.XD10 * 10 : 0;
    const xd10CableType = xd10DataCables > 0
        ? (opts.dataCableOverride || dataCableType(H, V, proc.count, 0.5 * 3.28084, 0.5 * 3.28084))
        : null;

    if (xd10DataCables > 0 && xd10CableType) {
        add(xd10CableType, CABLE_DESCS[xd10CableType], xd10DataCables, 'Cables', dataCableKeywords(xd10CableType));
    }
    add('ECON100C6', CABLE_DESCS['ECON100C6'], B35, 'Cables', dataCableKeywords('ECON100C6'));

    add('ECON1M', 'Ethercon to Ethercon 1m', totalWithSpares, 'Cables', ['econ1m', 'ethercon', '1m']);
    add('T1025', "True1 power cable 25'", Math.ceil(circuits * 1.05), 'Cables', ['t1025', 'true1', "25'"]);
    add('T1003', "True1 power cable 1m (3')", totalWithSpares, 'Cables', ['t1003', 'true1', '1m', "3'"]);
    if (voltage === 120) {
        const eSKU = edisonCableOverride || 'EDT110M';
        add(eSKU, EDISON_CABLE_DESCS[eSKU] || EDISON_CABLE_DESCS['EDT110M'], Math.ceil(casesNeeded * 1.05), 'Cables', edisonCableKeywords(eSKU));
    } else {
        const pd = powerDistro(totalTiles, 192);
        add('CUBEDIST', 'Indu Electric 200A Cube Distro', pd.CUBEDIST, 'Power', ['cubedist', '200a', 'cube', 'distro']);
        add('L2130T1FB', 'L2130 floor box to 3× True1', pd.L2130T1FB, 'Power', ['l2130', 'floor box', 'true1']);
        add('TP1', 'Indu Electric 400A Power Distro', pd.TP1, 'Power', ['tp1', '400a', 'power distro']);
        add('SOCA6XTRU1', '19-pin Soccapex to 6× True1', pd.SOCA6XTRU1, 'Power', ['soca6xtru1', 'socapex', 'soccapex']);
    }

    return items;
}

// ============================================================
// ROE GP2.6 FULL
// ============================================================
function calcROEGP26Full(H, V, opts = {}) {
    const { supportType = 'Ground', voltage = 208, gp2HalfRows = 0, blankRows = 0, groundSupportType = 'Single Base', edisonCableOverride = null } = opts;
    const items = [];
    const add = (sku, desc, qty, cat, kw) => {
        if (qty > 0) items.push({ sku, desc, qty, category: cat, keywords: kw || [] });
    };

    // Tiles — each GP2 Full tile = 500×1000mm
    const totalTiles = H * V;
    const totalSpares = calcSpares(totalTiles, 6, 1.5);
    const totalWithSpares = totalTiles + totalSpares;
    const casesNeeded = Math.ceil(totalWithSpares / 6);

    add('6PGP2FULL', 'ROE GP2.6 Full 6× tile package', casesNeeded, 'Tiles', ['6pgp2full', 'gp2', 'full', 'package', '6x']);
    add('GP2FULL', 'ROE GP2.6 Full LED tile 500×1000mm (active)', totalTiles, 'Tiles', ['gp2full', 'gp2.6', 'full', 'tile', '500x1000', 'graphite']);
    add('GP2FULL', 'ROE GP2.6 Full LED tile 500×1000mm (spares)', totalSpares, 'Tiles', ['gp2full', 'spare', 'gp2.6', 'full']);
    add('GP2FULLPSU', 'ROE GP2 Full tile PSU', totalWithSpares, 'Tiles', ['gp2fullpsu', 'gp2', 'full', 'tile psu', 'psu']);
    add('GP2CASEFUL', 'GP2 Full flight case (6×)', casesNeeded, 'Tiles', ['gp2caseful', 'flightcase', 'gp2', 'case', 'full']);

    // GP2 Half row tiles (optional bottom row)
    let halfWithSpares = 0, halfCases = 0;
    if (gp2HalfRows > 0) {
        const halfTiles = H * gp2HalfRows;
        const halfSpares = calcSpares(halfTiles, 12, 1.5);
        halfWithSpares = halfTiles + halfSpares;
        halfCases = Math.ceil(halfWithSpares / 12);
        add('12PGP2HALF', 'ROE GP2.6 Half 12× tile package', halfCases, 'Tiles', ['12pgp2half', 'gp2', 'half', 'package']);
        const halfTilesActive = H * gp2HalfRows;
        add('GP2HALF', 'ROE GP2.6 Half LED tile 500×500mm (active)', halfTilesActive, 'Tiles', ['gp2half', 'gp2.6', 'half', 'tile', '500x500']);
        add('GP2HALF', 'ROE GP2.6 Half LED tile 500×500mm (spares)', halfWithSpares - halfTilesActive, 'Tiles', ['gp2half', 'spare', 'gp2.6', 'half']);
        add('GP2HALFPSU', 'ROE GP2 Half Tile PSU', halfWithSpares, 'Tiles', ['gp2halfpsu', 'gp2', 'half', 'psu', 'tile psu']);
        add('GP2CASEHAF', 'GP2 Half flight case (12×)', halfCases, 'Tiles', ['gp2casehaf', 'flightcase', 'gp2', 'case', 'half']);
    }

    // GP2 modules: 4 per tile (full and half), combined since PDF lists them together
    add('GP2MOD', 'ROE GP2 module (4× per tile)', (totalWithSpares + halfWithSpares) * 4, 'Tiles', ['gp2mod', 'gp2', 'module', 'graphite']);

    // Processor (192×384 px per tile)
    const proc = selectProcessors(totalTiles, H, V, 192, 384);
    if (proc.S8 > 0)   add('S8',       'Brompton Tessera S8',          proc.S8,   'Processor', ['s8', 'brompton', 'tessera']);
    if (proc.SX40 > 0) add('SX40',     'Brompton Tessera SX40',        proc.SX40, 'Processor', ['sx40', 'brompton', 'tessera']);
    if (proc.XD10 > 0) add('XD10',     'Brompton Tessera XD10G',       proc.XD10, 'Processor', ['xd10', 'brompton', 'distribution']);
    if (proc.SX40 > 0) add('ECONRJ45', "Ethercon to RJ45 (CAT6) 100'", proc.SX40, 'Processor', ['econrj45', 'rj45', 'ethercon', 'cat6']);

    // Truss hardware
    const hw = roeHardware(H, V, 1.0, gp2HalfRows, blankRows, true);
    add('BPGPUBT', 'ROE BP2/GP2 universal base truss', hw.universalBaseTruss, 'Hardware', ['bpgpubt', 'universal base truss', 'roe', 'base truss']);
    add('BPGPREAR1', 'ROE BP2/GP2 rear truss 1m', hw.rearTruss, 'Hardware', ['bpgprear1', 'rear truss', '1m', '1 meter', 'roe']);
    add('BPGPREAR05', 'ROE BP2/GP2 rear truss 0.5m', hw.rearHalf, 'Hardware', ['bpgprear05', 'rear truss', '0.5m', 'half meter', 'roe']);
    add('BPGPBRIDGE', 'ROE BP2/GP2 rear bridge clamp', hw.rearBridge, 'Hardware', ['bpgpbridge', 'rear bridge', 'bridge clamp', 'roe']);

    if (supportType === 'Ground') {
        const singleBases = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleBases = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        add('GP2BASE1', 'ROE Graphite GP base bar, 1W', singleBases, 'Hardware', ['gp2base1', 'base bar', '1w', 'graphite', 'gp']);
        add('GP2BASE2', 'ROE Graphite GP base bar, 2W', doubleBases, 'Hardware', ['gp2base2', 'base bar', '2w', 'graphite', 'gp']);
        add('SANDBAG25', 'Sand Bag 25 lbs.', calcGP26Sandbags('ROEGP26Full', H, V, gp2HalfRows), 'Hardware', ['sandbag', 'sand bag', '25']);
    } else {
        const singleHeaders = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleHeaders = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        add('GP2HEAD1', 'ROE Graphite GP hanging bar, 1W', singleHeaders, 'Hardware', ['gp2head1', 'hanging bar', '1w', 'header']);
        add('GP2HEAD2', 'ROE Graphite GP hanging bar, 2W', doubleHeaders, 'Hardware', ['gp2head2', 'hanging bar', '2w', 'header']);
    }

    // Pipes and couplers (when wall is ≥ 8 half-blocks / 4 full-tile equivalent)
    const gp2LateralHalfBlocks = (V * 2) + (gp2HalfRows || 0) + ((blankRows || 0) * 2);
    if (supportType === 'Ground' && gp2LateralHalfBlocks >= 8) {
        const screenWidthFt = H * 0.5 * 3.28084;
        const tenPipes = Math.floor(screenWidthFt / 10);
        const remFt = screenWidthFt - tenPipes * 10;
        const fourPipes = Math.floor(remFt / 4);
        add('LED10FTS40', "Schedule 40 1.5\" pipe 10'", tenPipes, 'Hardware', ['led10fts40', '10ft', 'pipe', 'schedule 40']);
        add('LED4FTS40', "Schedule 40 1.5\" pipe 4'", fourPipes, 'Hardware', ['led4fts40', '4ft', 'pipe', 'schedule 40']);
        add('SWVLCHEESB', 'Swivel Aluminum Cheeseboro', hw.universalBaseTruss, 'Hardware', ['swvlcheesb', 'cheeseboro', 'swivel', 'coupler']);
    }

    // Cables — one data cable per column (enters top of each tile column)
    // T1003 adds proc.count for the processor-to-tile connections in the ROEGPBK bundle
    const halfActiveTiles = gp2HalfRows > 0 ? H * gp2HalfRows : 0;
    const circuits = Math.ceil((totalTiles + halfActiveTiles) / 16);
    // GP2 Full always uses ECON050C6 per column (main calc hardcodes this, not distance-based)
    add('ECON050C6', CABLE_DESCS['ECON050C6'], H, 'Cables', dataCableKeywords('ECON050C6'));
    // ECON100C6: B35 distribution unit connections (no SX40 subtraction for GP2)
    const B35gp2 = proc.count + (proc.count > 0 && proc.count < 5 ? 1 : proc.count > 9 ? 3 : 0);
    add('ECON100C6', CABLE_DESCS['ECON100C6'], B35gp2, 'Cables', dataCableKeywords('ECON100C6'));
    add('T1016', "True1 power cable 16' (5m)", H, 'Cables', ['t1016', 'true1', "16'", '5m']);
    add('ECON1M', 'Ethercon to Ethercon 1m', totalWithSpares + halfWithSpares, 'Cables', ['econ1m', 'ethercon', '1m']);
    add('T1025', "True1 power cable 25'", Math.ceil(circuits * 1.05), 'Cables', ['t1025', 'true1', "25'"]);
    add('T1003', "True1 power cable 1m (3')", totalWithSpares + halfWithSpares + proc.count, 'Cables', ['t1003', 'true1', '1m']);
    if (voltage === 120) {
        const eSKU = edisonCableOverride || 'EDT110M';
        add(eSKU, EDISON_CABLE_DESCS[eSKU] || EDISON_CABLE_DESCS['EDT110M'], Math.ceil(casesNeeded * 1.05), 'Cables', edisonCableKeywords(eSKU));
    } else {
        const pd = powerDistro(totalTiles, 320);
        add('CUBEDIST', 'Indu Electric 200A Cube Distro', pd.CUBEDIST, 'Power', ['cubedist', '200a', 'cube', 'distro']);
        add('L2130T1FB', 'L2130 floor box to 3× True1', pd.L2130T1FB, 'Power', ['l2130', 'floor box', 'true1']);
        add('TP1', 'Indu Electric 400A Power Distro', pd.TP1, 'Power', ['tp1', '400a', 'power distro']);
        add('SOCA6XTRU1', '19-pin Soccapex to 6× True1', pd.SOCA6XTRU1, 'Power', ['soca6xtru1', 'socapex', 'soccapex']);
    }

    return items;
}

// ============================================================
// ROE BLACK PEARL (BP2)
// ============================================================
function calcROEBlackPearl(H, V, opts = {}) {
    const { supportType = 'Ground', voltage = 208, blankRows = 0, groundSupportType = 'Single Base', bpVariant = 'BP2V2', edisonCableOverride = null } = opts;
    const items = [];
    const add = (sku, desc, qty, cat, kw) => {
        if (qty > 0) items.push({ sku, desc, qty, category: cat, keywords: kw || [] });
    };

    const tileSKU = bpVariant === 'BP2B1' ? 'BP2B1' : bpVariant === 'BP2B2' ? 'BP2B2' : 'BP2V2';
    const pkgSKU  = bpVariant === 'BP2B1' ? '8PBP2B1' : bpVariant === 'BP2B2' ? '8PBP2B2' : '8PBP2V2';
    // BP2B1 and BP2B2 use version-1 cases; BP2V2 uses version-2 case
    const caseSKU = bpVariant === 'BP2V2' ? 'BP2V2CASE' : 'BP2V1CASE';
    const tileDesc = bpVariant === 'BP2B1' ? 'ROE Black Pearl BP2B1 tile (batch 1)'
                   : bpVariant === 'BP2B2' ? 'ROE Black Pearl BP2B2 tile (batch 2)'
                   : 'ROE Black Pearl BP2V2 tile (v2.1)';
    const caseDesc = bpVariant === 'BP2B1'
        ? 'Case, ROE Black Pearl version 1, 8×'
        : 'Case, ROE Black Pearl, 8×';

    // Tiles & cases
    const totalTiles = H * V;
    const totalSpares = calcSpares(totalTiles, 8, 1.5);
    const totalWithSpares = totalTiles + totalSpares;
    const casesNeeded = Math.ceil(totalWithSpares / 8);

    add(pkgSKU, `ROE Black Pearl 8× tile package (${bpVariant})`, casesNeeded, 'Tiles', [pkgSKU.toLowerCase(), 'black pearl', 'package', '8x', 'roe', 'bp2']);
    add(tileSKU, `${tileDesc} (active)`, totalTiles, 'Tiles', [tileSKU.toLowerCase(), 'black pearl', 'bp2', 'tile', 'roe']);
    add(tileSKU, `${tileDesc} (spares)`, totalSpares, 'Tiles', [tileSKU.toLowerCase(), 'spare', 'black pearl', 'bp2']);
    add(caseSKU, 'Case, ROE Black Pearl, 8×', casesNeeded, 'Tiles', ['bp2v2case', 'bp2v1case', 'case', 'black pearl', 'roe']);

    // Processor (192×192 px per tile)
    const proc = selectProcessors(totalTiles, H, V, 192, 192);
    if (proc.S8 > 0) add('S8', 'Brompton Tessera S8', proc.S8, 'Processor', ['s8', 'brompton', 'tessera']);
    if (proc.SX40 > 0) add('SX40', 'Brompton Tessera SX40', proc.SX40, 'Processor', ['sx40', 'brompton', 'tessera']);
    if (proc.XD10 > 0) add('XD10', 'Brompton Tessera XD10G', proc.XD10, 'Processor', ['xd10', 'brompton', 'distribution']);

    // Truss hardware (BP tile = 0.5m tall)
    const hw = roeHardware(H, V, 0.5, 0, blankRows, false);
    add('BPGPUBT', 'ROE BP2/GP2 universal base truss', hw.universalBaseTruss, 'Hardware', ['bpgpubt', 'universal base truss', 'roe', 'base truss']);
    add('BPGPREAR1', 'ROE BP2/GP2 rear truss 1m', hw.rearTruss, 'Hardware', ['bpgprear1', 'rear truss', '1m', 'roe']);
    add('BPGPREAR05', 'ROE BP2/GP2 rear truss 0.5m', hw.rearHalf, 'Hardware', ['bpgprear05', 'rear truss', '0.5m', 'half meter']);
    add('BPGPBRIDGE', 'ROE BP2/GP2 rear bridge clamp', hw.rearBridge, 'Hardware', ['bpgpbridge', 'rear bridge', 'bridge clamp']);

    if (supportType === 'Ground') {
        const singleBases = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleBases = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        add('BPBOBB1', 'ROE Black Pearl base bar, 1W, 0.5m', singleBases, 'Hardware', ['bpbobb1', 'base bar', '0.5m', '1w', 'black pearl']);
        add('BPBOBB2', 'ROE Black Pearl base bar, 2W, 1m', doubleBases, 'Hardware', ['bpbobb2', 'base bar', '1m', '2w', 'black pearl']);
        const bpSbTable = [0, 0, 0, 3.35102, 5.29109, 7.672, 10.5821, 14.5505, 16.5787, 20.9821, 23.9703, 26.9585];
        const bpSbIdx = Math.min(V - 1, bpSbTable.length - 1);
        const bpSandbags = Math.ceil(bpSbTable[Math.max(0, bpSbIdx)] * (singleBases + doubleBases));
        add('SANDBAG25', 'Sand Bag 25 lbs.', bpSandbags, 'Hardware', ['sandbag', 'sand bag', '25']);
    } else {
        add('BPBOHEAD1', 'ROE Black Pearl header, 1W, 0.5m', H % 2, 'Hardware', ['bpbohead1', 'header', '1w', '0.5m', 'black pearl']);
        add('BPBOHEAD2', 'ROE Black Pearl header, 2W, 1m', Math.floor(H / 2), 'Hardware', ['bpbohead2', 'header', '2w', '1m', 'black pearl']);
    }

    // Pipes and couplers (9–12 BP tiles tall)
    const bpEffectiveHeight = V + (blankRows || 0);
    if (supportType === 'Ground' && bpEffectiveHeight >= 9 && bpEffectiveHeight <= 12) {
        const lateralRows = bpEffectiveHeight - 8;
        const screenWidthFt = H * 0.5 * 3.28084;
        const tenPipes = Math.floor(screenWidthFt / 10) * lateralRows;
        const remFt = screenWidthFt - Math.floor(screenWidthFt / 10) * 10;
        const fourPipes = Math.floor(remFt / 4) * lateralRows;
        const couplers = hw.universalBaseTruss * lateralRows;
        add('LED10FTS40', "Schedule 40 1.5\" pipe 10'", tenPipes, 'Hardware', ['led10fts40', '10ft', 'pipe', 'schedule 40']);
        add('LED4FTS40', "Schedule 40 1.5\" pipe 4'", fourPipes, 'Hardware', ['led4fts40', '4ft', 'pipe', 'schedule 40']);
        add('SWVLCHEESB', 'Swivel Aluminum Cheeseboro', couplers, 'Hardware', ['swvlcheesb', 'halfslimch', 'cheeseboro', 'swivel', 'coupler']);
    }

    // Cables
    const circuits = Math.ceil(totalTiles / 16);
    // BP: ECON100C6 = max(B35 - SX40, 0); SX40 is subtracted for ROE BP products
    const B35bp = proc.count + (proc.count > 0 && proc.count < 5 ? 1 : proc.count > 9 ? 3 : 0);
    const bpEcon100 = Math.max(B35bp - proc.SX40, 0);
    if (bpEcon100 > 0) add('ECON100C6', CABLE_DESCS['ECON100C6'], bpEcon100, 'Cables', dataCableKeywords('ECON100C6'));
    // XD10 data cables when XD10 units are present (xd10Count × 10, distance-based type)
    if (proc.XD10 > 0) {
        const xd10Type = opts.dataCableOverride || dataCableType(H, V, proc.count, 0.5 * 3.28084, 0.5 * 3.28084);
        add(xd10Type, CABLE_DESCS[xd10Type], proc.XD10 * 10, 'Cables', dataCableKeywords(xd10Type));
    }
    add('ECON1M', 'Ethercon to Ethercon 1m', totalWithSpares, 'Cables', ['econ1m', 'ethercon', '1m']);
    add('T1025', "True1 power cable 25'", Math.ceil(circuits * 1.05), 'Cables', ['t1025', 'true1', "25'"]);
    add('T1003', "True1 power cable 1m (3')", totalWithSpares, 'Cables', ['t1003', 'true1', '1m']);
    if (voltage === 120) {
        const eSKU = edisonCableOverride || 'EDT110M';
        add(eSKU, EDISON_CABLE_DESCS[eSKU] || EDISON_CABLE_DESCS['EDT110M'], Math.ceil(casesNeeded * 1.05), 'Cables', edisonCableKeywords(eSKU));
    } else {
        const pd = powerDistro(totalTiles, 190);
        add('CUBEDIST', 'Indu Electric 200A Cube Distro', pd.CUBEDIST, 'Power', ['cubedist', '200a', 'cube', 'distro']);
        add('L2130T1FB', 'L2130 floor box to 3× True1', pd.L2130T1FB, 'Power', ['l2130', 'floor box', 'true1']);
        add('TP1', 'Indu Electric 400A Power Distro', pd.TP1, 'Power', ['tp1', '400a', 'power distro']);
        add('SOCA6XTRU1', '19-pin Soccapex to 6× True1', pd.SOCA6XTRU1, 'Power', ['soca6xtru1', 'socapex', 'soccapex']);
    }

    return items;
}

// ============================================================
// ROE GP2.6 HALF (standalone)
// ============================================================
function calcROEGP26Half(H, V, opts = {}) {
    const { supportType = 'Ground', voltage = 208, blankRows = 0, groundSupportType = 'Single Base', edisonCableOverride = null } = opts;
    const items = [];
    const add = (sku, desc, qty, cat, kw) => {
        if (qty > 0) items.push({ sku, desc, qty, category: cat, keywords: kw || [] });
    };

    const totalTiles = H * V;
    const totalSpares = calcSpares(totalTiles, 12, 1.5);
    const totalWithSpares = totalTiles + totalSpares;
    const casesNeeded = Math.ceil(totalWithSpares / 12);

    add('12PGP2HALF', 'ROE GP2.6 Half 12× tile package', casesNeeded, 'Tiles', ['12pgp2half', 'gp2', 'half', 'package', '12x']);
    add('GP2HALF', 'ROE GP2.6 Half LED tile 500×500mm (active)', totalTiles, 'Tiles', ['gp2half', 'gp2.6', 'half', 'tile']);
    add('GP2HALF', 'ROE GP2.6 Half LED tile 500×500mm (spares)', totalSpares, 'Tiles', ['gp2half', 'spare', 'gp2.6', 'half']);

    // Processor (192×192 px)
    const proc = selectProcessors(totalTiles, H, V, 192, 192);
    if (proc.S8 > 0) add('S8', 'Brompton Tessera S8', proc.S8, 'Processor', ['s8', 'brompton', 'tessera']);
    if (proc.SX40 > 0) add('SX40', 'Brompton Tessera SX40', proc.SX40, 'Processor', ['sx40', 'brompton', 'tessera']);
    if (proc.XD10 > 0) add('XD10', 'Brompton Tessera XD10G', proc.XD10, 'Processor', ['xd10', 'brompton', 'distribution']);

    // Truss hardware (same as BP, 0.5m tile height)
    const hw = roeHardware(H, V, 0.5, 0, blankRows, false);
    add('BPGPUBT', 'ROE BP2/GP2 universal base truss', hw.universalBaseTruss, 'Hardware', ['bpgpubt', 'universal base truss', 'roe']);
    add('BPGPREAR1', 'ROE BP2/GP2 rear truss 1m', hw.rearTruss, 'Hardware', ['bpgprear1', 'rear truss', '1m', 'roe']);
    add('BPGPREAR05', 'ROE BP2/GP2 rear truss 0.5m', hw.rearHalf, 'Hardware', ['bpgprear05', 'rear truss', '0.5m']);
    add('BPGPBRIDGE', 'ROE BP2/GP2 rear bridge clamp', hw.rearBridge, 'Hardware', ['bpgpbridge', 'rear bridge', 'bridge clamp']);

    if (supportType === 'Ground') {
        const singleBases = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleBases = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        add('GP2BASE1', 'ROE Graphite GP base bar, 1W', singleBases, 'Hardware', ['gp2base1', 'base bar', '1w', 'graphite', 'gp']);
        add('GP2BASE2', 'ROE Graphite GP base bar, 2W', doubleBases, 'Hardware', ['gp2base2', 'base bar', '2w', 'graphite', 'gp']);
        add('SANDBAG25', 'Sand Bag 25 lbs.', calcGP26Sandbags('ROEGP26Half', H, V, 0), 'Hardware', ['sandbag', 'sand bag', '25']);
    } else {
        const singleHeaders = groundSupportType === 'Double Base' ? H % 2 : H;
        const doubleHeaders = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
        add('GP2HEAD1', 'ROE Graphite GP hanging bar, 1W', singleHeaders, 'Hardware', ['gp2head1', 'hanging bar', '1w', 'header']);
        add('GP2HEAD2', 'ROE Graphite GP hanging bar, 2W', doubleHeaders, 'Hardware', ['gp2head2', 'hanging bar', '2w', 'header']);
    }

    const circuits = Math.ceil(totalTiles / 16);
    // GP2 Half follows same B35 formula as Absen/GP2 (no SX40 subtraction)
    const B35half = proc.count + (proc.count > 0 && proc.count < 5 ? 1 : proc.count > 9 ? 3 : 0);
    if (proc.XD10 > 0) {
        const xd10Type = opts.dataCableOverride || dataCableType(H, V, proc.count, 0.5 * 3.28084, 0.5 * 3.28084);
        add(xd10Type, CABLE_DESCS[xd10Type], proc.XD10 * 10, 'Cables', dataCableKeywords(xd10Type));
    }
    add('ECON100C6', CABLE_DESCS['ECON100C6'], B35half, 'Cables', dataCableKeywords('ECON100C6'));
    add('ECON1M', 'Ethercon to Ethercon 1m', totalWithSpares, 'Cables', ['econ1m', 'ethercon', '1m']);
    add('T1025', "True1 power cable 25'", Math.ceil(circuits * 1.05), 'Cables', ['t1025', 'true1', "25'"]);
    add('T1003', "True1 power cable 1m (3')", totalWithSpares, 'Cables', ['t1003', 'true1', '1m']);

    // Power (160W per GP2 Half tile)
    if (voltage === 120) {
        const eSKU = edisonCableOverride || 'EDT110M';
        add(eSKU, EDISON_CABLE_DESCS[eSKU] || EDISON_CABLE_DESCS['EDT110M'], Math.ceil(casesNeeded * 1.05), 'Cables', edisonCableKeywords(eSKU));
    } else {
        const pd = powerDistro(totalTiles, 160);
        add('CUBEDIST', 'Indu Electric 200A Cube Distro', pd.CUBEDIST, 'Power', ['cubedist', '200a', 'cube', 'distro']);
        add('L2130T1FB', 'L2130 floor box to 3× True1', pd.L2130T1FB, 'Power', ['l2130', 'floor box', 'true1']);
        add('TP1', 'Indu Electric 400A Power Distro', pd.TP1, 'Power', ['tp1', '400a', 'power distro']);
        add('SOCA6XTRU1', '19-pin Soccapex to 6× True1', pd.SOCA6XTRU1, 'Power', ['soca6xtru1', 'socapex', 'soccapex']);
    }

    return items;
}

// ============================================================
// THEATRIXX NOMAD 2.6
// ============================================================
function calcTheatrixx(H, V, opts = {}) {
    const { supportType = 'Ground', voltage = 208, groundSupportType = 'Single Base' } = opts;
    const items = [];
    const add = (sku, desc, qty, cat, kw) => {
        if (qty > 0) items.push({ sku, desc, qty, category: cat, keywords: kw || [] });
    };

    // Tiles & cases (10 per package, 10% spares with 2x factor)
    const totalTiles = H * V;
    const totalSpares = calcSpares(totalTiles, 10, 2);
    const totalWithSpares = totalTiles + totalSpares;
    const tilePackages = Math.ceil(totalWithSpares / 10);

    add('10PTXNOMAD', 'Theatrixx Nomad 2.6 10× tile package', tilePackages, 'Tiles', ['10ptxnomad', 'theatrixx', 'nomad', 'package', '10x']);
    add('TXNOMAD26',  'Theatrixx Nomad LED panel 500×500mm 2.6mm (active)', totalTiles, 'Tiles', ['txnomad26', 'theatrixx', 'nomad', '2.6', 'panel', 'tile', '500']);
    add('TXNOMAD26',  'Theatrixx Nomad LED panel 500×500mm 2.6mm (spares)', totalSpares, 'Tiles', ['txnomad26', 'theatrixx', 'nomad', 'spare']);
    add('CATXLED',    'Case, Theatrixx Nomad tile, 10×', tilePackages, 'Tiles', ['catxled', 'case', 'theatrixx', 'nomad', '10x']);

    // Processor: Novastar MX40PRO (9 megapixels per unit)
    const totalPixels = (H * 192) * (V * 192);
    const mx40proCount = Math.max(1, Math.ceil(totalPixels / 9000000));
    add('MX40PRO', 'Novastar MX40 PRO', mx40proCount, 'Processor', ['mx40pro', 'novastar', 'mx40', 'processor', 'mx40pro']);

    const singleBases = groundSupportType === 'Double Base' ? H % 2 : H;
    const doubleBases = groundSupportType === 'Double Base' ? Math.floor(H / 2) : 0;
    const H49 = singleBases + doubleBases; // total base count → vertical supports

    if (supportType === 'Ground') {
        add('TXBASE1W', 'Theatrixx Nomad Exact stacking base, 1W', singleBases, 'Hardware', ['txbase1w', 'stacking base', '1 wide', '1w', 'theatrixx']);
        add('TXBASE2W', 'Theatrixx Nomad Exact stacking base, 2W', doubleBases, 'Hardware', ['txbase2w', 'stacking base', '2 wide', '2w', 'theatrixx']);

        // Ski frames — ceil(H/2) for flat wall
        const O3 = Math.ceil(H / 2);
        add('TXSKIFRAME', 'Theatrixx Nomad Exact ski frame (T base)', O3, 'Hardware', ['txskiframe', 'ski frame', 'theatrixx', 't base']);
        add('TXSTAKEXT',  'Theatrixx Nomad Exact ski stacking extension', O3, 'Hardware', ['txstakext', 'stacking extension', 'theatrixx']);

        // Ladders and brackets (N48 = ceil(V/2) × O3)
        const N48 = Math.ceil(V / 2) * O3;
        add('TXLADDER',   'Theatrixx Nomad Exact ladder frame', N48, 'Hardware', ['txladder', 'ladder frame', 'theatrixx']);
        add('TXBRACKETS', 'Theatrixx Nomad Exact bracket-straight', N48, 'Hardware', ['txbrackets', 'bracket', 'straight', 'theatrixx']);
        add('TXVERTSPRT', 'Theatrixx Nomad Exact vertical support', H49, 'Hardware', ['txvertsprt', 'vertical support', 'theatrixx']);
        add('TXSKIFTSNG', 'Theatrixx Nomad Exact single foot', 2, 'Hardware', ['txskiftsng', 'single foot', 'theatrixx']);
        add('TXM10B',     'Theatrixx Nomad Exact M10 screw', N48 * 2, 'Hardware', ['txm10b', 'm10', 'screw', 'theatrixx']);

        // Lateral pipe support when wall is ≥ 9 tiles tall
        if (V >= 9) {
            const lateralRows = V - 8;
            const screenWidthFt = H * 0.5 * 3.28084;
            const tenPipes = Math.floor(screenWidthFt / 10) * lateralRows;
            const remFt = screenWidthFt - Math.floor(screenWidthFt / 10) * 10;
            const fourPipes = Math.floor(remFt / 4) * lateralRows;
            const halfSlimCB = H49 * 2 * lateralRows;
            add('LED10FTS40', "Schedule 40 1.5\" pipe 10'", tenPipes, 'Hardware', ['led10fts40', '10ft', 'pipe', 'schedule 40', '10\'']);
            add('LED4FTS40',  "Schedule 40 1.5\" pipe 4'",  fourPipes, 'Hardware', ['led4fts40', '4ft', 'pipe', 'schedule 40', '4\'']);
            add('HALFSLIMCB', 'Slim Half Cheeseboro clamp', halfSlimCB, 'Hardware', ['halfslimcb', 'cheeseboro', 'slim', 'half', 'clamp']);
        }

        // Sandbags — Theatrixx table [1,1,2,4,6,8,11,15,17,19,21,23]
        const sbTable = [1, 1, 2, 4, 6, 8, 11, 15, 17, 19, 21, 23];
        const idx = Math.min(V - 1, sbTable.length - 1);
        const sandbags = Math.ceil(sbTable[Math.max(0, idx)] * H49);
        add('SANDBAG25', 'Sand Bag 25 lbs.', sandbags, 'Hardware', ['sandbag', 'sand bag', '25']);

    } else {
        // Fly headers
        add('TXSNGLHEAD', 'Theatrixx Nomad single header', H % 2, 'Hardware', ['txsnglhead', 'single header', 'theatrixx']);
        add('TXDBLHEAD',  'Theatrixx Nomad double header', Math.floor(H / 2), 'Hardware', ['txdblhead', 'double header', 'theatrixx']);
    }

    // Data cables
    const K18 = Math.ceil(totalTiles / 13) + 1; // number of data runs
    add('ECON100C6',  "Ethercon (CAT6) 100'", K18, 'Cables', ['econ100c6', 'ethercon', 'cat6', "100'", '100ft']);
    add('TXT92TXT9',  "Theatrixx Nomad XVT9 to XVT9 data 3'", totalWithSpares, 'Cables', ['txt92txt9', 'xvt9', 'data', 'theatrixx', "3'"]);
    add('TXT92ETRCN', 'Theatrixx Nomad XVT9 to EtherCon adapter', K18, 'Cables', ['txt92etrcn', 'xvt9', 'ethercon', 'adapter', 'theatrixx']);

    // Power cables — tile-to-tile (always)
    add('TXT3POWER', "Theatrixx Nomad XVT3 to XVT3 power 4'", totalWithSpares, 'Cables', ['txt3power', 'xvt3', 'power', 'theatrixx', "4'"]);

    if (voltage === 120) {
        const O25 = Math.ceil(totalWithSpares / 2.409);
        const P25 = Math.ceil((O25 / 8.302) * 2);
        add('TXT32ED6', "Theatrixx Nomad XVT3 to Edison 6'", P25, 'Cables', ['txt32ed6', 'xvt3', 'edison', 'theatrixx', "6'"]);
    } else {
        const O26 = Math.ceil(totalTiles / 1.27403);
        const P26 = Math.ceil(O26 / 11.5);
        const P27 = P26 > 0 ? P26 + 2 : 0;
        add('TXT32T125', "Theatrixx Nomad XVT3 to True1 25'", P27, 'Cables', ['txt32t125', 'xvt3', 'true1', 'theatrixx', "25'"]);
    }

    // Power distribution (Theatrixx 208V system load = tiles × 1.27403)
    if (voltage !== 120) {
        const U45 = totalTiles * 1.27403;
        const circuitsNeeded = Math.ceil(totalTiles / 1.27403 / 11.5);

        if (U45 > 200) {
            const tp1Count = Math.max(1, Math.ceil(U45 / 400));
            const socaCount = Math.ceil(circuitsNeeded / 6);
            add('TP1',       'Indu Electric 400A Power Distro', tp1Count, 'Power', ['tp1', '400a', 'power distro']);
            add('TXT32SOCA', 'Theatrixx Nomad XVT3 to Socapex', socaCount, 'Power', ['txt32soca', 'xvt3', 'socapex', 'theatrixx']);
        } else {
            const l2130Count = Math.max(1, Math.ceil(circuitsNeeded / 3));
            add('CUBEDIST',  'Indu Electric 200A Cube Distro', 1, 'Power', ['cubedist', '200a', 'cube', 'distro']);
            add('L2130T1FB', 'L2130 floor box to 3× True1', l2130Count, 'Power', ['l2130', 'floor box', 'true1']);
        }
    }

    return items;
}

// ============================================================
// Entry point
// ============================================================
function getExpectedEquipment(product, H, V, opts = {}) {
    switch (product) {
        case 'Absen':       return calcAbsen(H, V, opts);
        case 'ROEGP26Full': return calcROEGP26Full(H, V, opts);
        case 'ROEBP':       return calcROEBlackPearl(H, V, opts);
        case 'ROEGP26Half': return calcROEGP26Half(H, V, opts);
        case 'Theatrixx':   return calcTheatrixx(H, V, opts);
        default:            return [];
    }
}
