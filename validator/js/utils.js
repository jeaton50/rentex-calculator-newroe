// calcSpares(totalBlocks, packageSize, factor)
// packageSize doubles as the rounding unit (e.g., 8 → round to nearest 8)
function calcSpares(n, pkg, factor) {
    const sp = Math.ceil(n * (pkg / 100));
    const total = n + sp;
    const rounded = pkg * Math.round(total / pkg);
    let spares = rounded - n;
    if (spares < 1) spares = Math.ceil(n * (pkg / 100) * factor);
    return Math.max(0, spares);
}
