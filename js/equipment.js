/**
 * Rentex LED Wall Calculator - Equipment Module (MERGED & UPDATED)
 * - Includes PDF-based circuit logic for ROE GP2.6
 * - Includes NEW CORRECTED GP2.6 Sandbag Calculation (ROE Stacking Universal GT System)
 */

/* ============================================================================
   CONSTANTS & HELPERS FOR SANDBAGS (From Snippet 2)
   ============================================================================ */

const GP26_BALLAST_CONFIG = {
  // PDF Table: Universal Base 100cm, 0.50m bay distance (dense support for >4m height)
  // Format: height in meters -> { BB: back ballast kg, BF: front ballast kg }
  bayDistance050: {
    2.0: { BB: 18, BF: 20 },
    2.5: { BB: 28, BF: 32 },
    3.0: { BB: 42, BF: 47 },
    3.5: { BB: 57, BF: 66 },
    4.0: { BB: 76, BF: 87 },
    4.5: { BB: 86, BF: 99 },
    5.0: { BB: 97, BF: 112 },
    5.5: { BB: 110, BF: 127 },
    6.0: { BB: 124, BF: 144 }
  },
   
  // PDF Table: Universal Base 100cm, 1.00m bay distance (every-other support for ≤4m height)
  bayDistance100: {
    2.0: { BB: 38, BF: 44 },
    2.5: { BB: 60, BF: 70 },
    3.0: { BB: 87, BF: 102 },
    3.5: { BB: 120, BF: 140 },
    4.0: { BB: 157, BF: 184 }
  },
   
  // LED panel weight densities (kg/m²)
  // GP2.6 Full: 9.0 kg per 0.5m² panel = 18.0 kg/m²
  // GP2.6 Half: 5.19 kg per 0.25m² panel = 20.76 kg/m²
  ledWeightPerM2: {
    ROEGP26Full: 18.0,
    ROEGP26Half: 20.76
  },
   
  // Lever arm ratio for front ballast reduction
  // Adjusted to match official ROE calculator output (137 lbs front for 16×5)
  leverRatio: 1.108,  
   
  // Height thresholds
  maxHeightForSparseSupport: 4.0,  // Above this, need support every column
  maxGroundSupportHeight: 6.0      // Maximum height for ground support
};

function interpolateBallast(table, heightM) {
  const heights = Object.keys(table).map(Number).sort((a, b) => a - b);
   
  // Clamp to table range
  if (heightM <= heights[0]) return table[heights[0]];
  if (heightM >= heights[heights.length - 1]) return table[heights[heights.length - 1]];
   
  // Find surrounding heights for interpolation
  let lowerH = heights[0];
  let upperH = heights[heights.length - 1];
   
  for (let i = 0; i < heights.length - 1; i++) {
    if (heightM >= heights[i] && heightM <= heights[i + 1]) {
      lowerH = heights[i];
      upperH = heights[i + 1];
      break;
    }
  }
   
  // Linear interpolation
  const ratio = (heightM - lowerH) / (upperH - lowerH);
  const lowerVal = table[lowerH];
  const upperVal = table[upperH];
   
  return {
    BB: lowerVal.BB + ratio * (upperVal.BB - lowerVal.BB),
    BF: lowerVal.BF + ratio * (upperVal.BF - lowerVal.BF)
  };
}

/**
 * Calculate sandbags for ROE GP2.6 Full or Half panels
 * Based on PDF formula: BF = BF_table - (gLED × bay × height × leverRatio)
 */
function calculateGP26Sandbags(productType, horizontalBlocks, verticalBlocks, gp2HalfRows = 0) {
  const config = GP26_BALLAST_CONFIG;
   
  // Calculate wall height in meters
  let heightInMeters;
  if (productType === 'ROEGP26Full') {
    // Full panels are 1.0m tall each
    const fullHeight = verticalBlocks * 1.0;
    const halfHeight = gp2HalfRows * 0.5;
    heightInMeters = fullHeight + halfHeight;
  } else {
    // Half panels are 0.5m tall each
    heightInMeters = verticalBlocks * 0.5;
  }
   
  // Check maximum ground support height
  if (heightInMeters > config.maxGroundSupportHeight) {
    console.warn(`GP2.6 wall height ${heightInMeters}m exceeds ground support limit of ${config.maxGroundSupportHeight}m`);
    // Still calculate, but wall should be flown
  }
   
  // Determine bay distance and support configuration
  // NOTE: Official ROE calculator ALWAYS uses dense support (0.50m bay, every column)
  // for GP2.6 Full, regardless of height. GP2.6 Half may use sparse support.
  let bayDistance, ballastTable, numSystems;
   
  if (productType === 'ROEGP26Full') {
    // GP2.6 Full: ALWAYS dense support (every column, 0.50m bay)
    bayDistance = 0.50;
    ballastTable = config.bayDistance050;
    numSystems = horizontalBlocks;
  } else {
    // GP2.6 Half: Use sparse support if height ≤4m
    const needsDenseSupport = heightInMeters > config.maxHeightForSparseSupport;
    bayDistance = needsDenseSupport ? 0.50 : 1.00;
    ballastTable = needsDenseSupport ? config.bayDistance050 : config.bayDistance100;
    numSystems = needsDenseSupport ? horizontalBlocks : Math.ceil((horizontalBlocks + 1) / 2);
  }
   
  // Get base ballast from PDF table (with interpolation)
  const baseBallast = interpolateBallast(ballastTable, heightInMeters);
   
  // Calculate LED weight reduction for front ballast
  // Formula: reduction = gLED × bay × height × leverRatio
  const gLED = config.ledWeightPerM2[productType] || 18.0;
  const reduction = gLED * bayDistance * heightInMeters * config.leverRatio;
   
  // Adjusted front ballast (cannot go below 0)
  const adjustedBF = Math.max(0, baseBallast.BF - reduction);
   
  // Total ballast per system
  const ballastPerSystem = baseBallast.BB + adjustedBF;
   
  // Total ballast for entire wall
  const totalBallastKg = numSystems * ballastPerSystem;
   
  // Convert to 25lb sandbags (25 lbs = 11.34 kg)
  const sandbags = Math.ceil(totalBallastKg / 11.34);
   
  // Debug logging
  console.log('GP2.6 Sandbag Calculation:', {
    productType,
    horizontalBlocks,
    verticalBlocks,
    gp2HalfRows,
    heightInMeters,
    bayDistance,
    numSystems,
    baseBallast,
    gLED,
    reduction: reduction.toFixed(2),
    adjustedBF: adjustedBF.toFixed(2),
    ballastPerSystem: ballastPerSystem.toFixed(2),
    totalBallastKg: totalBallastKg.toFixed(2),
    totalBallastLbs: (totalBallastKg * 2.205).toFixed(0),
    sandbags
  });
   
  return sandbags;
}

/* ============================================================================
   ORIGINAL HELPERS & CALCULATOR NAMESPACE
   ============================================================================ */

function addEquipmentRow(ecode, name, weight, quantity, tbody) {
  if (!tbody || !Number.isFinite(quantity) || quantity <= 0) return;

  const row = tbody.insertRow();
  const cell1 = row.insertCell(0);
  const cell2 = row.insertCell(1);
  const cell3 = row.insertCell(2);
  const cell4 = row.insertCell(3);

  cell1.textContent = ecode;
  cell2.textContent = name;
  cell3.textContent = quantity;
  cell4.textContent = weight ? Number(weight).toFixed(2) : "0.00";
}

function normalizeVoltage(voltage) {
  // Treat 110/115 as 120 for planning (continuous load)
  if (voltage === 110 || voltage === 115 || voltage === 120) return 120;
  if (voltage === 208) return 208;
  return voltage;
}

/**
 * PDF-style recommended circuits for ROE GP2.6 Full
 * (This is the part that typically causes "one circuit short" on 208V if you use 12/pk.)
 *
 * 120V suggested:
 * - 6 panels per circuit
 * - if remainder would be 1 panel, use 5 instead
 *
 * 208V suggested:
 * - 10 panels per circuit
 * - if remainder would be 1 panel, use 9 instead
 */
function roeGp26FullSuggestedPanelsPerCircuit(totalPanels, voltage) {
  if (!Number.isFinite(totalPanels) || totalPanels <= 0) return 0;

  const v = normalizeVoltage(voltage);

  if (v === 120) {
    let ppc = 6;
    if (totalPanels % 6 === 1) ppc = 5;
    return Math.min(ppc, totalPanels);
  }

  if (v === 208) {
    let ppc = 10;
    if (totalPanels % 10 === 1) ppc = 9;
    return Math.min(ppc, totalPanels);
  }

  // fallback (shouldn't happen in your UI)
  return Math.min(6, totalPanels);
}

function roeGp26FullCircuitCount(totalPanels, voltage) {
  const ppc = roeGp26FullSuggestedPanelsPerCircuit(totalPanels, voltage);
  return ppc ? Math.ceil(totalPanels / ppc) : 0;
}

/* --------------------------- Calculator Namespace --------------------------- */

const EquipmentCalculator = {
  /**
   * Calculate processor requirements (Brompton or Novastar)
   */
  calculateProcessors(config) {
    const {
      productType,
      totalTiles,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      sourceSignalCount,
      supportType,
    } = config;

    let pixelsPerTileWidth, pixelsPerTileHeight;

    if (productType === "absen") {
      pixelsPerTileWidth = 200;
      pixelsPerTileHeight = 200;
    } else if (productType === "theatrixx") {
      pixelsPerTileWidth = 192;
      pixelsPerTileHeight = 192;
    } else if (productType === "ROEGP26Full") {
      pixelsPerTileWidth = 192;
      pixelsPerTileHeight = 384; // 500x1000 panel = 2x height
    } else if (productType === "ROEGP26Half") {
      pixelsPerTileWidth = 192;
      pixelsPerTileHeight = 192;
    } else {
      // BP2B1, BP2B2, BP2V2
      pixelsPerTileWidth = 176;
      pixelsPerTileHeight = 176;
    }

    let maxDataCascade;
    switch (productType) {
      case "absen":
      case "theatrixx":
        maxDataCascade = 10;
        break;
      case "ROEGP26Full":
        maxDataCascade = 5;
        break;
      case "ROEGP26Half":
        maxDataCascade = 11;
        break;
      case "BP2B1":
      case "BP2B2":
      case "BP2V2":
        maxDataCascade = 13;
        break;
      default:
        maxDataCascade = 10;
    }

    const maxPanelsPerS8 =
      Math.floor(2000 / pixelsPerTileWidth) *
      Math.floor(2000 / pixelsPerTileHeight);

    const maxPanelsPerSX40 =
      Math.floor(4096 / pixelsPerTileWidth) *
      Math.floor(2160 / pixelsPerTileHeight);

    const pixelsHeight = verticalBlocks * pixelsPerTileHeight;
    const pixelsWidth = horizontalBlocks * pixelsPerTileWidth;

    const minProcessorsForPixels =
      Math.ceil(pixelsWidth / 4096) * Math.ceil(pixelsHeight / 2160);

    const tilesPerCascade = isFinite(totalTiles / maxDataCascade)
      ? Math.ceil(totalTiles / maxDataCascade)
      : 0;

    const baseProcessorCount = Math.max(
      Math.ceil(totalTiles / maxPanelsPerSX40),
      Math.ceil(tilesPerCascade / 40),
      minProcessorsForPixels
    );

    const processorCountWithCascade =
      maxDataCascade !== 0
        ? Math.max(baseProcessorCount, Math.ceil(totalTiles / (10 * maxDataCascade)))
        : 0;

    const distributionProcessorCount = Math.max(
      baseProcessorCount,
      Math.ceil(tilesPerCascade / 20)
    );

    const redundantDistributionCount = Math.max(
      2 * processorCountWithCascade,
      2 * distributionProcessorCount
    );

    const fullyRedundantCount = baseProcessorCount * 2;
    const maxRedundantCount = Math.max(2 * processorCountWithCascade);

    const s8ProcessorCount = Math.max(
      Math.ceil(totalTiles / maxPanelsPerS8),
      Math.ceil(tilesPerCascade / 8),
      minProcessorsForPixels
    );

    let primaryProcessorCount, distributionUnitCount;

    switch (redundancyType) {
      case "None":
        primaryProcessorCount = Math.max(sourceSignalCount, baseProcessorCount);
        distributionUnitCount = Math.max(sourceSignalCount, processorCountWithCascade);
        break;
      case "Distribution and Cables":
        primaryProcessorCount = Math.max(sourceSignalCount, distributionProcessorCount);
        distributionUnitCount = Math.max(sourceSignalCount, redundantDistributionCount);
        break;
      case "Fully Redundant":
        primaryProcessorCount = Math.max(sourceSignalCount, fullyRedundantCount);
        distributionUnitCount = Math.max(sourceSignalCount, maxRedundantCount);
        break;
      default:
        primaryProcessorCount = Math.max(sourceSignalCount, baseProcessorCount);
        distributionUnitCount = Math.max(sourceSignalCount, processorCountWithCascade);
    }

    primaryProcessorCount = isNaN(primaryProcessorCount) ? 0 : primaryProcessorCount;
    distributionUnitCount = isNaN(distributionUnitCount) ? 0 : distributionUnitCount;

    const s8FinalCount =
      supportType === "Flyware"
        ? 0
        : redundancyType === "Fully Redundant"
        ? 0
        : supportType === "Ground" || totalTiles <= 100
        ? s8ProcessorCount
        : 0;

    const maxPanels = productType === "absen" ? 80 : 100;
    let S8, SX40, XD10;

    if (totalTiles <= maxPanels) {
      if (
        s8FinalCount >= 2 ||
        redundancyType === "Fully Redundant" ||
        redundancyType === "Distribution and Cables"
      ) {
        S8 = 0;
        SX40 = primaryProcessorCount;
        XD10 = distributionUnitCount - SX40;
      } else {
        S8 = s8FinalCount;
        SX40 = 0;
        XD10 = 0;
      }
    } else {
      S8 = 0;
      SX40 = primaryProcessorCount;
      XD10 = distributionUnitCount - SX40;
    }

    return {
      SX40: SX40 || 0,
      XD10: XD10 || 0,
      S8: S8 || 0,
      MX40PRO: 0,
    };
  },

  /**
   * Calculate total wall power (amps/watts)
   * NOTE: Normalizes 110/115 to 120V.
   */
  calculatePower(productType, totalTiles, voltage) {
    const v = normalizeVoltage(voltage);
    let amps = 0,
      watts = 0;

    const roeGraphiteEnabled =
      document.getElementById("roeGraphicMix")?.checked || false;

    if (roeGraphiteEnabled) {
      const halfHorizontal = parseInt(
        document.getElementById("halfHorizontal")?.value || 0,
        10
      );
      const halfVertical = parseInt(
        document.getElementById("halfVertical")?.value || 0,
        10
      );
      const fullHorizontal = parseInt(
        document.getElementById("fullHorizontal")?.value || 0,
        10
      );
      const fullVertical = parseInt(
        document.getElementById("fullVertical")?.value || 0,
        10
      );

      const halfTileCount = halfHorizontal * halfVertical;
      const fullTileCount = fullHorizontal * fullVertical;

      const halfWatts = halfTileCount * 160;
      const fullWatts = fullTileCount * 320;

      watts = halfWatts + fullWatts;
      amps = v ? watts / v : 0;

      return { amps, watts };
    }

    // Check for GP2 Full with GP2 Half bottom rows
    const gp2HalfEnabled =
      productType === 'ROEGP26Full' &&
      document.getElementById('gp2HalfCheckbox')?.checked;

    if (gp2HalfEnabled) {
      const gp2HalfRows = parseInt(
        document.getElementById('gp2HalfCount')?.value || 0,
        10
      );
      const horizontalBlocks = parseInt(
        document.getElementById('blocksHor')?.value || 0,
        10
      );

      const gp2HalfTileCount = horizontalBlocks * gp2HalfRows;

      // GP2 Full tiles: 320W per tile
      // GP2 Half tiles: 160W per tile
      const fullWatts = totalTiles * 320;
      const halfWatts = gp2HalfTileCount * 160;

      watts = fullWatts + halfWatts;
      amps = v ? watts / v : 0;

      console.log('GP2 Half power calculation:', {
        fullTiles: totalTiles,
        fullWatts,
        halfTiles: gp2HalfTileCount,
        halfWatts,
        totalWatts: watts,
        amps
      });

      return { amps, watts };
    }

    switch (productType) {
      case "absen":
        // keep your existing watt basis
        watts = totalTiles * 192;
        amps = v ? watts / v : 0;
        break;

      case "BP2B1":
      case "BP2B2":
      case "BP2V2":
        watts = totalTiles * 190;
        amps = v ? watts / v : 0;
        break;

      case "theatrixx":
        watts = totalTiles * 190;
        amps = v ? watts / v : 0;
        break;

      case "ROEGP26Full":
        // Use 320W "max" per full (500x1000) panel
        watts = totalTiles * 320;
        amps = v ? watts / v : 0;
        break;

      case "ROEGP26Half":
        watts = totalTiles * 160;
        amps = v ? watts / v : 0;
        break;

      default:
        amps = 0;
        watts = 0;
    }

    return { amps, watts };
  },

  /**
   * Calculate sandbags requirements (existing)
   */
  calculateSandbags(productType, verticalBlocks, baseCount) {
    const sandbagTables = {
      // Absen: values adjusted for /1.0525 division formula (5x5 wall = 18 sandbags)
      absen: [0, 0, 0, 2.42, 3.78, 4.95, 6.74, 9.26, 10.42, 11.68, 12.95, 14.1],
      ROE: [0, 0, 0, 3.35102, 5.29109, 7.672, 10.5821, 14.5505, 16.5787, 20.9821, 23.9703, 26.9585],
      theatrixx: [1, 1, 2, 4, 6, 8, 11, 15, 17, 19, 21, 23],
      ROEGP26Half: [0.09, 1.10, 6.47, 13.17, 21.20, 30.54, 41.22, 53.23, 66.55, 81.21, 97.19],
      ROEGP26Full: [0.08, 0.95, 5.61, 11.42, 18.38, 26.49, 35.75, 46.16, 57.72, 70.43, 84.29],
    };

    let table;
    if (productType === "absen") table = sandbagTables.absen;
    else if (productType === "theatrixx") table = sandbagTables.theatrixx;
    else if (productType === "ROEGP26Half") table = sandbagTables.ROEGP26Half;
    else if (productType === "ROEGP26Full") table = sandbagTables.ROEGP26Full;
    else table = sandbagTables.ROE;

    const tableIndex = Math.min(verticalBlocks - 1, table.length - 1);
    const sandbagsPerBase = table[Math.max(0, tableIndex)];

    if (productType === "absen") return Math.ceil((sandbagsPerBase * baseCount) / 1.0525);
    return Math.ceil(sandbagsPerBase * baseCount);
  },

  /**
   * Calculate cable requirements (UPDATED circuits for GP2.6 Full)
   */
  calculateCables(config) {
    const {
      productType,
      totalTiles, // <-- actual wall tiles
      totalTilesWithSpares,
      distributionUnitCount,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      voltage,
    } = config;

    // Data cables distance estimate (existing)
    const cableDistance =
      Math.round(
        Math.sqrt(
          Math.pow((horizontalBlocks * 1.64) / (distributionUnitCount * 2 || 1), 2) +
            Math.pow(verticalBlocks * 1.64, 2)
        ) * 10
      ) / 10;

    let CAT5ES005 = 0,
      ECON010C6 = 0,
      ECON025C6 = 0,
      ECON050C6 = 0,
      ECON100C6 = 0;

    const numberOfCables =
      redundancyType === "Distribution and Cables" || distributionUnitCount >= 1
        ? distributionUnitCount * 10
        : 0;

    if (cableDistance < 7) CAT5ES005 = numberOfCables;
    else if (cableDistance < 11) ECON010C6 = numberOfCables;
    else if (cableDistance < 26) ECON025C6 = numberOfCables;
    else if (cableDistance < 51) ECON050C6 = numberOfCables;
    else ECON100C6 = numberOfCables;

    // Power cables (kept as your existing “drops” logic)
    const powerCableCount = Math.ceil(totalTilesWithSpares / 8);
    const adjustedPowerCables = Math.ceil(powerCableCount * 1.05);

    // CIRCUITS (THIS IS THE KEY FIX)
    let circuits = 0;
    if (productType === "ROEGP26Full") {
      circuits = roeGp26FullCircuitCount(totalTiles, voltage);
    } else {
      circuits = Math.ceil(totalTiles / 16);
    }
    const adjustedCircuits = Math.ceil(circuits * 1.05);

    return {
      // Data cables
      CAT5ES005,
      ECON010C6,
      ECON025C6,
      ECON050C6,
      ECON100C6,
      ECON1M: totalTilesWithSpares,
      ECONRJ45:
        distributionUnitCount +
        (distributionUnitCount > 0 && distributionUnitCount < 5
          ? 1
          : distributionUnitCount > 9
          ? 3
          : 0),

      // Power cables / circuits
      EDT110M: adjustedPowerCables, // shown only on 120V in display logic
      TRUE125FT: adjustedCircuits,  // this is your "number of circuits" output
      T11M: totalTilesWithSpares,
    };
  },

  /**
   * Support structures (unchanged from your last)
   */
  calculateSupportStructures(config) {
    const {
      horizontalBlocks,
      verticalBlocks,
      wallType,
      supportType,
      groundSupportType,
      flownSupportType,
      heightWarning,
      blankRows,
      productType,
    } = config;

    let singleBases = 0,
      doubleBases = 0;
    let singleHeaders = 0,
      doubleHeaders = 0;
    let outriggers = 0,
      ladders = 0,
      clamps = 0;
    let supportBeams50mm = 0,
      supportBeams1000mm = 0,
      beamConnectors = 0;
    let platforms = 0,
      universalBaseTruss = 0,
      rearTruss = 0,
      rearBridge = 0;

    if (supportType === "Ground") {
      const heightInMeters =
        productType === "ROEGP26Full"
          ? verticalBlocks * 1.0
          : productType === "ROEGP26Half"
          ? verticalBlocks * 0.5
          : verticalBlocks * 0.5;

      const needsDenseSupport = heightInMeters > 4.0;

      if (groundSupportType === "Double Base" && wallType === "Flat") {
        doubleBases = Math.floor(horizontalBlocks / 2);
        singleBases = horizontalBlocks % 2;
      } else {
        singleBases = horizontalBlocks;
        doubleBases = 0;
      }

      outriggers = Math.ceil(horizontalBlocks / 1.9);
      const clampCalc = Math.floor(verticalBlocks / 2) * outriggers;
      clamps = heightWarning === "***EXCEEDS LIMIT, MUST FLY***" ? 0 : clampCalc;
      ladders = clamps;

      // Support beams and connectors - for Absen ground support
      if (productType === "absen") {
        // Support beams follow base pattern, multiplied by vertical blocks
        supportBeams1000mm = doubleBases * verticalBlocks;
        supportBeams50mm = singleBases * verticalBlocks;
        beamConnectors = supportBeams1000mm + supportBeams50mm;

        // Platforms - only needed for walls 5 tiles high or taller
        if (verticalBlocks >= 5) {
          platforms = Math.floor(clamps / 4);
        }
      }

      const effectiveVerticalBlocks =
        productType === "ROEGP26Full" ? verticalBlocks * 2 : verticalBlocks;

      if (needsDenseSupport) {
        universalBaseTruss = horizontalBlocks;
        const rearTrussRows = Math.floor(heightInMeters);
        rearTruss = (rearTrussRows + (blankRows || 0)) * universalBaseTruss;
      } else {
        universalBaseTruss = Math.ceil(horizontalBlocks / 1.9);
        rearTruss = Math.floor((effectiveVerticalBlocks + (blankRows || 0)) / 2) * universalBaseTruss;
      }

      rearBridge = rearTruss;
    }

    if (supportType === "Flyware") {
      if (flownSupportType === "Double Header" && wallType === "Flat") {
        doubleHeaders = Math.floor(horizontalBlocks / 2);
        singleHeaders = horizontalBlocks % 2;
      } else {
        singleHeaders = horizontalBlocks;
      }
    }

    return {
      singleBases,
      doubleBases,
      singleHeaders,
      doubleHeaders,
      outriggers,
      ladders,
      clamps,
      supportBeams50mm,
      supportBeams1000mm,
      beamConnectors,
      platforms,
      universalBaseTruss,
      rearTruss,
      rearBridge,
    };
  },

  /**
   * Power distribution equipment (UPDATED to align with circuits for GP2.6 Full)
   */
  calculatePowerDistribution(config) {
    const {
      productType,
      totalTiles,
      voltage,
      selectedDistroType,
      companyLabel,
    } = config;

    let CUBEDIST = 0,
      TP1 = 0,
      L2130T1FB = 0,
      SOCA6XTRU1 = 0,
      TXT32SOCA = 0;

    // Compute amps for both planning voltages
    const amps120 = this.calculatePower(productType, totalTiles, 120).amps;
    const amps208 = this.calculatePower(productType, totalTiles, 208).amps;

    const cubeUnits120 = Math.ceil(amps120 / 200);
    const cubeUnits208 = Math.ceil(amps208 / 200);
    const tp1Units = Math.ceil(amps208 / 400);

    const v = normalizeVoltage(voltage);

    let distroUnits = 0;
    if (companyLabel === "Rentex") {
      if (selectedDistroType === "CUBEDIST") {
        distroUnits = v === 120 ? cubeUnits120 : cubeUnits208;
        CUBEDIST = distroUnits;
      } else if (selectedDistroType === "TP1") {
        distroUnits = tp1Units;
        TP1 = distroUnits;
      } else if (selectedDistroType === "Auto") {
        if (tp1Units > 0 && amps208 > 200) {
          TP1 = tp1Units;
          distroUnits = tp1Units;
        } else {
          CUBEDIST = v === 120 ? cubeUnits120 : cubeUnits208;
          distroUnits = CUBEDIST;
        }
      }
    }

    // Circuits for sizing floorboxes/adapters
    let circuits = 0;
    if (productType === "ROEGP26Full") {
      circuits = roeGp26FullCircuitCount(totalTiles, v);
    } else {
      circuits = Math.ceil(totalTiles / 16);
    }

    // Floor boxes / adapters (use circuits instead of totalTiles/16 math for GP2.6 Full)
    if (productType === "theatrixx" && TP1 > 0) {
      // keep your existing Theatrixx logic
      const z47 = Math.ceil(totalTiles / 1.27403 / 11.5 / 6);
      TXT32SOCA = z47;
    } else if (CUBEDIST > 0) {
      // 3 circuits per floor box (existing intent)
      L2130T1FB = Math.ceil(circuits / 3);
    } else if (TP1 > 0) {
      // 6 circuits per soca->true1 breakout (existing intent)
      SOCA6XTRU1 = Math.ceil(circuits / 6);
    }

    return {
      CUBEDIST,
      TP1,
      L2130T1FB,
      SOCA6XTRU1,
      TXT32SOCA,
    };
  },
};

/* ----------------------- Product-Specific Adders ----------------------- */
/* NOTE: These are your existing functions with no circuit logic inside,
   so they remain mostly unchanged. Only cable/circuit outputs feeding them changed. */

function addAbsenEquipment(config, tbody) {
  const {
    totalTiles,
    totalSpareTiles,
    totalTilesWithSpares,
    casesNeeded,
    horizontalBlocks,
    verticalBlocks,
    processors,
    cables,
    sandbags,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    outriggers,
    ladders,
    clamps,
    supportBeams50mm,
    supportBeams1000mm,
    beamConnectors,
    platforms,
    powerDistro,
    voltage,
  } = config;

  totalWeight = 20.61 * totalTiles;
  const totalPixels = horizontalBlocks * 200 * (verticalBlocks * 200);

  addEquipmentRow("8PPL25", "Absen PL2.5 8x tile package", 0, casesNeeded, tbody);
  addEquipmentRow("PL25", "Absen PL2.5 tile", 20.61, totalTiles, tbody);
  addEquipmentRow("PL25", "Absen PL2.5  ** Spare Tiles **", 20.61, totalSpareTiles, tbody);
  addEquipmentRow("PL25CASE", "Case, Absen PL2.5, 8x", 161.12, casesNeeded, tbody);

  if (processors.SX40 > 0) addEquipmentRow("SX40", "Brompton Tessera SX40 **Kit includes an XD10**", 17, processors.SX40, tbody);
  if (processors.XD10 > 0) addEquipmentRow("XD10", "Brompton Tessera XD 10G data distribution unit", 8.16, processors.XD10, tbody);
  if (processors.S8 > 0) addEquipmentRow("S8", "Brompton Tessera S8", 17, processors.S8, tbody);

  if (singleBases > 0) addEquipmentRow("PL25BB1", "Absen PL2.5 base bar, 1W, 0.5m", 16, singleBases, tbody);
  if (doubleBases > 0) addEquipmentRow("PL25BB2", "Absen PL2.5 base bar, 2W, 1m", 37, doubleBases, tbody);
  if (outriggers > 0) addEquipmentRow("PL25OUT", "Absen PL2.5 outrigger", 17, outriggers, tbody);
  if (ladders > 0) addEquipmentRow("PL25LAD1M", "Absen PL2.5 ladder 1m", 9, ladders, tbody);
  if (clamps > 0) addEquipmentRow("PL25CLAMP", "Absen PL2.5 clamp", 3.2, clamps, tbody);
  if (supportBeams50mm > 0) addEquipmentRow("PL25BEAM50", "Absen PL2.5 support beam, 500 mm", 4, supportBeams50mm, tbody);
  if (supportBeams1000mm > 0) addEquipmentRow("PL25BEAM1K", "Absen PL2.5 support beam, 1000 mm", 6, supportBeams1000mm, tbody);
  if (beamConnectors > 0) addEquipmentRow("PL25BEAMAD", "Absen PL2.5 support beam conn, adjustable", 7, beamConnectors, tbody);
  if (platforms > 0) addEquipmentRow("PL25PLAT", "Absen PL2.5 platform", 10, platforms, tbody);

  if (sandbags > 0) addEquipmentRow("SANDBAG25", "Sand Bag 25 lbs.", 25, sandbags, tbody);

  if (singleHeaders > 0) addEquipmentRow("PL25HEAD1", "Absen PL2.5 header, 1W, 0.5m", 12, singleHeaders, tbody);
  if (doubleHeaders > 0) addEquipmentRow("PL25HEAD2", "Absen PL2.5 header, 2W, 1m", 19, doubleHeaders, tbody);

  if (cables.ECONRJ45 > 0) addEquipmentRow("ECONRJ45", "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  if (cables.CAT5ES005 > 0) addEquipmentRow("CAT5ES005", "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  if (cables.ECON010C6 > 0) addEquipmentRow("ECON010C6", "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  if (cables.ECON025C6 > 0) addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  if (cables.ECON050C6 > 0) addEquipmentRow("ECON050C6", "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  if (cables.ECON100C6 > 0) addEquipmentRow("ECON100C6", "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  if (cables.ECON1M > 0) addEquipmentRow("ECON1M", "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  if (cables.TRUE125FT > 0) addEquipmentRow("TRUE125FT", "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  if (cables.EDT110M > 0 && normalizeVoltage(voltage) === 120) addEquipmentRow("EDT110M", "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  if (cables.T11M > 0) addEquipmentRow("T11M", "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);

  if (powerDistro.CUBEDIST > 0) addEquipmentRow("CUBEDIST", "Indu Electric 200A Cube Distro", 177, powerDistro.CUBEDIST, tbody);
  if (powerDistro.TP1 > 0) addEquipmentRow("TP1", "Indu Electric 400A Power Distro w/ (4) 208v Soca", 197, powerDistro.TP1, tbody);
  if (powerDistro.SOCA6XTRU1 > 0) addEquipmentRow("SOCA6XTRU1", "19 Pin Soccapex to 6x True1 Power Cable 2 Meter", 197, powerDistro.SOCA6XTRU1, tbody);
  if (powerDistro.L2130T1FB > 0) addEquipmentRow("L2130T1FB", "L2130 floor box to 3x True1 with pass through", 7.5, powerDistro.L2130T1FB, tbody);

  if (typeof totalWeight !== "undefined" && typeof displayEstShippingWeight === "function") {
    if (typeof displayWallWeight === "function") displayWallWeight(totalWeight);

    let caseWeight = totalWeight;
    caseWeight += 18.92 * totalSpareTiles;
    caseWeight += 161.12 * casesNeeded;
    caseWeight += 210 * singleBases;
    caseWeight += 113 * doubleBases;
    caseWeight += 110 * outriggers;
    caseWeight += 91 * singleHeaders;
    caseWeight += 127 * doubleHeaders;
    caseWeight += 120 * cables.ECONRJ45;
    caseWeight += 63 * processors.SX40;
    caseWeight += 57 * processors.S8;
    displayEstShippingWeight(caseWeight);
  }

  if (typeof displayTotalPixels === "function") displayTotalPixels(totalPixels);
  if (typeof displayDataPortsNeeded === "function") displayDataPortsNeeded("Absen", totalTiles);
}

function addROEEquipment(config, tbody) {
  const {
    productType,
    totalTiles,
    totalSpareTiles,
    totalTilesWithSpares,
    casesNeeded,
    processors,
    cables,
    sandbags,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    universalBaseTruss,
    rearTruss,
    rearBridge,
    wallType,
    powerDistro,
    blankRows,
    horizontalBlocks,
    verticalBlocks,
    voltage,
    gp2HalfBottomRow,
  } = config;

  totalWeight = 20.61 * totalTiles;
  const totalPixels = horizontalBlocks * 176 * (verticalBlocks * 176);

  const dummyTilesNeeded = (blankRows || 0) * horizontalBlocks;
  let dummyTilesToFillCase = 0;
  if (dummyTilesNeeded > 0) {
    const withSpareCalc = Math.ceil(dummyTilesNeeded * 1.08);
    const roundedTo8 = Math.round(withSpareCalc / 8) * 8;
    const difference = roundedTo8 - dummyTilesNeeded;
    if (difference > 0 && difference < 8) dummyTilesToFillCase = difference;
  }

  if (productType === "BP2B1") {
    addEquipmentRow("8PBP2B1", "ROE BP2B1 8x tile package", 0, casesNeeded, tbody);
    addEquipmentRow("BP2B1", "ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)", 20.61, totalTiles, tbody);
    addEquipmentRow("BP2B1", "ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)**SPARE**", 20.61, totalSpareTiles, tbody);
    addEquipmentRow("BP2V2CASE", "Case, ROE Black Pearl version2, 8x (BP2V2)", 161.12, casesNeeded, tbody);
  } else if (productType === "BP2B2") {
    addEquipmentRow("8PBP2B2", "ROE BP2B2 8x tile package", 0, casesNeeded, tbody);
    addEquipmentRow("BP2B2", "ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)", 20.61, totalTiles, tbody);
    addEquipmentRow("BP2B2", "ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)**SPARE**", 20.61, totalSpareTiles, tbody);
    addEquipmentRow("BP2V2CASE", "Case, ROE Black Pearl version2, 8x (BP2V2)", 161.12, casesNeeded, tbody);
  } else if (productType === "BP2V2") {
    addEquipmentRow("8PBP2V2", "ROE BP2V2 8x tile package", 0, casesNeeded, tbody);
    addEquipmentRow("BP2V2", "BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)", 20.61, totalTiles, tbody);
    addEquipmentRow("BP2V2", "BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)**SPARE**", 21.61, totalSpareTiles, tbody);
    addEquipmentRow("BP2V2CASE", "Case, ROE Black Pearl version2, 8x (BP2V2)", 161.12, casesNeeded, tbody);
  }

  if (dummyTilesNeeded > 0) addEquipmentRow("BP2DT", "BP2 Dummy Tile", 0, dummyTilesNeeded, tbody);
  if (dummyTilesToFillCase > 0) addEquipmentRow("BP2DTCASE", "BP2 Dummy Tile (to fill case, not included in wall size)", 0, dummyTilesToFillCase, tbody);

  if (processors.SX40 > 0) addEquipmentRow("SX40", "Brompton Tessera SX40 **Kit includes an XD10**", 17, processors.SX40, tbody);
  if (processors.XD10 > 0) addEquipmentRow("XD10", "Brompton Tessera XD 10G data distribution unit", 8.16, processors.XD10, tbody);
  if (processors.S8 > 0) addEquipmentRow("S8", "Brompton Tessera S8", 17, processors.S8, tbody);

  if (singleHeaders > 0) addEquipmentRow("BPBOHEAD1", "ROE Black Pearl header, 1W, 0.5m", 12, singleHeaders, tbody);
  if (doubleHeaders > 0) addEquipmentRow("BPBOHEAD2", "ROE Black Pearl header, 2W, 1m", 19, doubleHeaders, tbody);

  if (singleBases > 0) addEquipmentRow("BPBOBB1", "ROE Black Pearl base bar, 1W, 0.5m", 16, singleBases, tbody);
  if (doubleBases > 0) addEquipmentRow("BPBOBB2", "ROE Black Pearl base bar, 2W, 1.0m", 28, doubleBases, tbody);
  if (universalBaseTruss > 0) addEquipmentRow("BPBOBT", "ROE Black Pearl universal base truss", 17, universalBaseTruss, tbody);
  if (universalBaseTruss > 0 && gp2HalfBottomRow) addEquipmentRow("BPGPREAR05", "ROE BP2 / GP2 rear truss .5 meter", 1, universalBaseTruss, tbody);
  if (rearTruss > 0) addEquipmentRow("BPBOREAR", "ROE Black Pearl rear truss,", 1, rearTruss, tbody);

  // Combine BPBOBRIDGE quantities: rearBridge + GP2 Half universalBaseTruss
  const totalBridgeClamps = (rearBridge || 0) + (gp2HalfBottomRow && universalBaseTruss > 0 ? universalBaseTruss : 0);
  console.log('🔴 COMBINING BPBOBRIDGE - rearBridge:', rearBridge, '+ GP2Half universalBaseTruss:', (gp2HalfBottomRow && universalBaseTruss > 0 ? universalBaseTruss : 0), '= totalBridgeClamps:', totalBridgeClamps);
  if (totalBridgeClamps > 0) {
    console.log('🔴 Adding SINGLE BPBOBRIDGE line with quantity:', totalBridgeClamps);
    addEquipmentRow("BPBOBRIDGE", "ROE Black Pearl rear bridge clamp", 1, totalBridgeClamps, tbody);
  }

  if (wallType === "Convex" || wallType === "Concave") {
    const fiveDegBrackets = totalTiles / 2;
    const m10Bolts = fiveDegBrackets * 4;
    addEquipmentRow("BP25DGREE", "ROE Black Pearl 5 Degree Bracket", 0.25, fiveDegBrackets, tbody);
    addEquipmentRow("BP2BBOLT", "M10x30 bolts for ROE brackets", 0.2, m10Bolts, tbody);
  }

  if (sandbags > 0) addEquipmentRow("SANDBAG25", "Sand Bag 25 lbs.", 25, sandbags, tbody);

  if (cables.ECONRJ45 > 0) addEquipmentRow("ECONRJ45", "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  if (cables.CAT5ES005 > 0) addEquipmentRow("CAT5ES005", "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  if (cables.ECON010C6 > 0) addEquipmentRow("ECON010C6", "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  if (cables.ECON025C6 > 0) addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  if (cables.ECON050C6 > 0) addEquipmentRow("ECON050C6", "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  if (cables.ECON100C6 > 0) addEquipmentRow("ECON100C6", "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  if (cables.ECON1M > 0) addEquipmentRow("ECON1M", "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  if (cables.TRUE125FT > 0) addEquipmentRow("TRUE125FT", "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  if (cables.EDT110M > 0 && normalizeVoltage(voltage) === 120) addEquipmentRow("EDT110M", "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  if (cables.T11M > 0) addEquipmentRow("T11M", "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);

  if (powerDistro.CUBEDIST > 0) addEquipmentRow("CUBEDIST", "Indu Electric 200A Cube Distro", 177, powerDistro.CUBEDIST, tbody);
  if (powerDistro.TP1 > 0) addEquipmentRow("TP1", "Indu Electric 400A Power Distro w/ (4) 208v Soca", 197, powerDistro.TP1, tbody);
  if (powerDistro.L2130T1FB > 0) addEquipmentRow("L2130T1FB", "L2130 floor box to 3x True1 with pass through", 7.5, powerDistro.L2130T1FB, tbody);
  if (powerDistro.SOCA6XTRU1 > 0) addEquipmentRow("SOCA6XTRU1", "19 Pin Socapex to 6x True1 Power Cable", 5, powerDistro.SOCA6XTRU1, tbody);

  if (typeof totalWeight !== "undefined" && typeof displayEstShippingWeight === "function") {
    if (typeof displayWallWeight === "function") displayWallWeight(totalWeight);

    let caseWeight = totalWeight;
    caseWeight += 18.92 * totalSpareTiles;
    caseWeight += 161.12 * casesNeeded;
    caseWeight += 210 * singleBases;
    caseWeight += 113 * doubleBases;
    caseWeight += 91 * singleHeaders;
    caseWeight += 127 * doubleHeaders;
    caseWeight += 120 * cables.ECONRJ45;
    caseWeight += 65 * processors.SX40;
    caseWeight += 57 * processors.S8;
    displayEstShippingWeight(caseWeight);
  }

  if (typeof displayTotalPixels === "function") displayTotalPixels(totalPixels);
  if (typeof displayDataPortsNeeded === "function") displayDataPortsNeeded(productType, totalTiles);
}

function addROEGP26Equipment(config, tbody) {
  const {
    productType,
    totalTiles,
    totalSpareTiles,
    totalTilesWithSpares,
    processors,
    cables,
    sandbags,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    universalBaseTruss,
    rearTruss,
    rearBridge,
    wallType,
    horizontalBlocks,
    verticalBlocks,
    powerDistro,
    voltage,
    supportType,
    gp2HalfBottomRow,
    gp2HalfRows,
  } = config;

  const tileWeight = productType === "ROEGP26Full" ? 19.84 : 11.44;
  const pixelWidth = 192;
  const pixelHeight = productType === "ROEGP26Full" ? 384 : 192;

  // Calculate total weight including GP2 Half tiles if present
  totalWeight = tileWeight * totalTiles;
  if (gp2HalfBottomRow && gp2HalfRows > 0) {
    const gp2HalfTilesNeeded = horizontalBlocks * gp2HalfRows;
    const gp2HalfWeight = 11.44; // GP2 Half tile weight
    totalWeight += gp2HalfWeight * gp2HalfTilesNeeded;
    console.log('Adding GP2 Half weight:', gp2HalfTilesNeeded, 'tiles x', gp2HalfWeight, 'lbs =', gp2HalfWeight * gp2HalfTilesNeeded, 'lbs');
  }

  const totalPixels = horizontalBlocks * pixelWidth * (verticalBlocks * pixelHeight);

  if (productType === "ROEGP26Full") {
    const packageCount = Math.ceil(totalTilesWithSpares / 6);
    const activeCases = Math.ceil(totalTiles / 6);
    const spareCases = packageCount - activeCases;

    addEquipmentRow("6GP2FULL", `ROE GP2.6 Full 6x tile package (${activeCases} active + ${spareCases} spare)`, 0, packageCount, tbody);
    addEquipmentRow("ROEGP26FULL", "ROE GP2.6 Full LED tile 500x1000mm", 19.84, totalTiles, tbody);
    if (totalSpareTiles > 0) {
      addEquipmentRow("ROEGP26FULL", "ROE GP2.6 Full LED tile 500x1000mm **SPARE**", 19.84, totalSpareTiles, tbody);
    }

    // Add GP2 Half tiles for fractional input (e.g., 4.5 = 4 Full + 1 Half)
    if (gp2HalfBottomRow && gp2HalfRows > 0) {
      console.log('Adding GP2 Half equipment - rows:', gp2HalfRows, 'horizontalBlocks:', horizontalBlocks);
      const gp2HalfTilesNeeded = horizontalBlocks * gp2HalfRows;

      // GP2 Half: Always add at least 1 spare case
      const packageSize = 12;
      const halfActiveCases = Math.ceil(gp2HalfTilesNeeded / packageSize);
      const halfTotalCases = halfActiveCases + 1; // Guarantee at least 1 spare case
      const gp2HalfWithSpare = halfTotalCases * packageSize;
      const gp2HalfSpareTiles = gp2HalfWithSpare - gp2HalfTilesNeeded;
      const halfSpareCases = halfTotalCases - halfActiveCases;

      console.log('GP2 Half spare calculation:', {
        tilesNeeded: gp2HalfTilesNeeded,
        activeCases: halfActiveCases,
        totalCases: halfTotalCases,
        spares: gp2HalfSpareTiles,
        totalWithSpares: gp2HalfWithSpare
      });

      const rowLabel = gp2HalfRows === 1 ? "row" : "rows";
      addEquipmentRow("6GP2HALF", `ROE GP2.6 Half 12x tile package (${halfActiveCases} active + ${halfSpareCases} spare) (for top ${gp2HalfRows} ${rowLabel})`, 0, halfTotalCases, tbody);
      addEquipmentRow("ROEGP26HALF", `ROE GP2.6 Half LED tile 500x500mm (top ${gp2HalfRows} ${rowLabel})`, 11.44, gp2HalfTilesNeeded, tbody);
      if (gp2HalfSpareTiles > 0) {
        addEquipmentRow("ROEGP26HALF", `ROE GP2.6 Half LED tile 500x500mm **SPARE** (top ${gp2HalfRows} ${rowLabel})`, 11.44, gp2HalfSpareTiles, tbody);
      }
    } else {
      console.log('NOT adding GP2 Half equipment - gp2HalfBottomRow:', gp2HalfBottomRow, 'gp2HalfRows:', gp2HalfRows);
    }
  } else {
    const packageCount = Math.ceil(totalTilesWithSpares / 12);
    const activeCases = Math.ceil(totalTiles / 12);
    const spareCases = packageCount - activeCases;

    addEquipmentRow("6GP2HALF", `ROE GP2.6 Half 12x tile package (${activeCases} active + ${spareCases} spare)`, 0, packageCount, tbody);
    addEquipmentRow("ROEGP26HALF", "ROE GP2.6 Half LED tile 500x500mm", 11.44, totalTiles, tbody);
    if (totalSpareTiles > 0) {
      addEquipmentRow("ROEGP26HALF", "ROE GP2.6 Half LED tile 500x500mm **SPARE**", 11.44, totalSpareTiles, tbody);
    }
  }

  if (processors.SX40 > 0) addEquipmentRow("SX40", "Brompton Tessera SX40 **Kit includes an XD10**", 17, processors.SX40, tbody);
  if (processors.XD10 > 0) addEquipmentRow("XD10", "Brompton Tessera XD 10G data distribution unit", 8.16, processors.XD10, tbody);
  if (processors.S8 > 0) addEquipmentRow("S8", "Brompton Tessera S8", 17, processors.S8, tbody);

  if (singleHeaders > 0) addEquipmentRow("BPBOHEAD1", "ROE Black Pearl header, 1W, 0.5m", 12, singleHeaders, tbody);
  if (doubleHeaders > 0) addEquipmentRow("BPBOHEAD2", "ROE Black Pearl header, 2W, 1m", 19, doubleHeaders, tbody);

  if (singleBases > 0) addEquipmentRow("BPBOBB1", "ROE Black Pearl base bar, 1W, 0.5m", 16, singleBases, tbody);
  if (doubleBases > 0) addEquipmentRow("BPBOBB2", "ROE Black Pearl base bar, 2W, 1.0m", 28, doubleBases, tbody);
  if (universalBaseTruss > 0) addEquipmentRow("BPBOBT", "ROE Black Pearl universal base truss", 17, universalBaseTruss, tbody);

  console.log('GP2 Half rear support check - universalBaseTruss:', universalBaseTruss, 'gp2HalfBottomRow:', gp2HalfBottomRow);
  if (universalBaseTruss > 0 && gp2HalfBottomRow) {
    console.log('Adding BPGPREAR05 for GP2 Half - quantity:', universalBaseTruss);
    addEquipmentRow("BPGPREAR05", "ROE BP2 / GP2 rear truss .5 meter", 1, universalBaseTruss, tbody);
  }

  if (rearTruss > 0) addEquipmentRow("BPBOREAR", "ROE Black Pearl rear truss,", 1, rearTruss, tbody);

  // Combine BPBOBRIDGE quantities: rearBridge + GP2 Half universalBaseTruss
  const totalBridgeClamps = (rearBridge || 0) + (gp2HalfBottomRow && universalBaseTruss > 0 ? universalBaseTruss : 0);
  console.log('🔴 COMBINING BPBOBRIDGE - rearBridge:', rearBridge, '+ GP2Half universalBaseTruss:', (gp2HalfBottomRow && universalBaseTruss > 0 ? universalBaseTruss : 0), '= totalBridgeClamps:', totalBridgeClamps);
  if (totalBridgeClamps > 0) {
    console.log('🔴 Adding SINGLE BPBOBRIDGE line with quantity:', totalBridgeClamps);
    addEquipmentRow("BPBOBRIDGE", "ROE Black Pearl rear bridge clamp", 1, totalBridgeClamps, tbody);
  }

  if ((wallType === "Convex" || wallType === "Concave") && productType !== "ROEGP26Full") {
    const fiveDegBrackets = totalTiles / 2;
    const m10Bolts = fiveDegBrackets * 4;
    addEquipmentRow("BP25DGREE", "ROE Black Pearl 5 Degree Bracket", 0.25, fiveDegBrackets, tbody);
    addEquipmentRow("BP2BBOLT", "M10x30 bolts for ROE brackets", 0.2, m10Bolts, tbody);
  }

  if (sandbags > 0) addEquipmentRow("SANDBAG25", "Sand Bag 25 lbs.", 25, sandbags, tbody);

  // GP2 Full lateral support (only for ground support, not flown)
  if (productType === "ROEGP26Full" && supportType === "Ground") {
    let singleTubes = 0;
    let swivelCouplers = 0;

    const widthInMeters = horizontalBlocks * 0.5;

    if (verticalBlocks <= 3) {
      singleTubes = 0;
      swivelCouplers = 0;
    } else if (verticalBlocks === 4) {
      singleTubes = Math.round(widthInMeters);
      swivelCouplers = Math.round(widthInMeters * 2);
    } else {
      singleTubes = horizontalBlocks - 1;
      swivelCouplers = (horizontalBlocks - 1) * 2;
    }

    if (singleTubes > 0) addEquipmentRow("LED4FTS40", 'Schedule 40 1.5" non-threaded pipe 4\'', 3.5, singleTubes, tbody);
    if (swivelCouplers > 0) addEquipmentRow("15PIPECPL", '1 1/2" ID pipe coupler with 1/2 Cheesborough clamp', 1.5, swivelCouplers, tbody);
  }

  // GP2 Full specific cables (one per column)
  if (productType === "ROEGP26Full") {
    addEquipmentRow("T1016", "True1 Power Cable 16' (5m)", 2, horizontalBlocks, tbody);
    addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, horizontalBlocks, tbody);
  }

  if (cables.ECONRJ45 > 0) addEquipmentRow("ECONRJ45", "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  if (cables.CAT5ES005 > 0) addEquipmentRow("CAT5ES005", "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  if (cables.ECON010C6 > 0) addEquipmentRow("ECON010C6", "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  // ECON025C6 is added separately for GP2 Full (one per column), so skip it here
  if (cables.ECON025C6 > 0 && productType !== "ROEGP26Full") addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  if (cables.ECON050C6 > 0) addEquipmentRow("ECON050C6", "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  if (cables.ECON100C6 > 0) addEquipmentRow("ECON100C6", "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  if (cables.ECON1M > 0) addEquipmentRow("ECON1M", "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  if (cables.TRUE125FT > 0) addEquipmentRow("TRUE125FT", "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  if (cables.EDT110M > 0 && normalizeVoltage(voltage) === 120) addEquipmentRow("EDT110M", "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  if (cables.T11M > 0) addEquipmentRow("T11M", "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);

  if (powerDistro.CUBEDIST > 0) addEquipmentRow("CUBEDIST", "Indu Electric 200A Cube Distro", 177, powerDistro.CUBEDIST, tbody);
  if (powerDistro.TP1 > 0) addEquipmentRow("TP1", "Indu Electric 400A Power Distro w/ (4) 208v Soca", 197, powerDistro.TP1, tbody);
  if (powerDistro.L2130T1FB > 0) addEquipmentRow("L2130T1FB", "L2130 floor box to 3x True1 with pass through", 7.5, powerDistro.L2130T1FB, tbody);
  if (powerDistro.SOCA6XTRU1 > 0) addEquipmentRow("SOCA6XTRU1", "19 Pin Socapex to 6x True1 Power Cable", 5, powerDistro.SOCA6XTRU1, tbody);

  if (typeof totalWeight !== "undefined" && typeof displayEstShippingWeight === "function") {
    if (typeof displayWallWeight === "function") displayWallWeight(totalWeight);

    let caseWeight = totalWeight;
    const packageCount =
      productType === "ROEGP26Full"
        ? Math.ceil(totalTilesWithSpares / 6)
        : Math.ceil(totalTilesWithSpares / 12);

    caseWeight += 161.12 * packageCount;

    // Add GP2 Half package weight if present
    if (gp2HalfBottomRow && gp2HalfRows > 0) {
      const gp2HalfTilesNeeded = horizontalBlocks * gp2HalfRows;
      const gp2HalfWithSpare = Math.ceil(gp2HalfTilesNeeded * 1.08);
      const gp2HalfPackageCount = Math.ceil(gp2HalfWithSpare / 12);
      const gp2HalfSpareTiles = gp2HalfWithSpare - gp2HalfTilesNeeded;
      caseWeight += 161.12 * gp2HalfPackageCount; // GP2 Half uses 12x packages
      caseWeight += 11.44 * gp2HalfSpareTiles; // Add spare tile weight
      console.log('Adding GP2 Half package weight:', gp2HalfPackageCount, 'packages');
    }

    caseWeight += 210 * singleBases;
    caseWeight += 113 * doubleBases;
    caseWeight += 91 * singleHeaders;
    caseWeight += 127 * doubleHeaders;
    caseWeight += 17 * universalBaseTruss;
    caseWeight += 120 * cables.ECONRJ45;
    caseWeight += 65 * processors.SX40;
    caseWeight += 57 * processors.S8;
    caseWeight += 25 * sandbags;

    displayEstShippingWeight(caseWeight);
  }

  if (typeof displayTotalPixels === "function") displayTotalPixels(totalPixels);
  if (typeof displayDataPortsNeeded === "function") displayDataPortsNeeded(productType, totalTiles);
}

function addTheatrixxEquipment(config, tbody) {
  const {
    totalTiles,
    totalSpareTiles,
    totalTilesWithSpares,
    casesNeeded,
    horizontalBlocks,
    verticalBlocks,
    processors,
    cables,
    sandbags,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    powerDistro,
    voltage,
    supportType,
    groundSupportType,
    redundancyType,
  } = config;

  totalWeight = 24 * totalTiles;
  const totalPixels = horizontalBlocks * 192 * (verticalBlocks * 192);

  // Tile packages (10 tiles per package)
  const tilePackages = Math.ceil(totalTiles / 10);
  addEquipmentRow('10PTXNOMAD', 'Theatrixx Nomad 2.6 10x package', 0, tilePackages, tbody);

  // Tiles and spares
  addEquipmentRow('TXNOMAD26', 'Theatrixx Nomad LED panel 500x500 2.6mm', 24, totalTiles, tbody);
  if (totalSpareTiles > 0) {
    addEquipmentRow('TXNOMAD26', 'Theatrixx Nomad LED panel 500x500 2.6mm **Spare Tiles**', 24, totalSpareTiles, tbody);
  }

  // Cases (10 tiles per case)
  const tileCases = Math.ceil(totalTilesWithSpares / 10);
  addEquipmentRow('CATXLED', 'Case, Theatrixx Nomad tile 10x', 187, tileCases, tbody);

  // Processors - Theatrixx uses Novastar MX40PRO (40 tiles per processor)
  const tilesPerProcessor = 40;
  let mx40Count = Math.ceil(totalTiles / tilesPerProcessor);

  // Handle redundancy for processors
  if (redundancyType === "Fully Redundant") {
    mx40Count = mx40Count * 2;
  }

  if (mx40Count > 0) {
    addEquipmentRow('MX40PRO', 'Novastar MX40 PRO', 17, mx40Count, tbody);
  }

  // Ground support structures - Theatrixx-specific
  if (supportType === "Ground") {
    // Bases
    if (singleBases > 0) addEquipmentRow("TXBASE1W", "Theatrixx Nomad Exact stacking base, 1 wide", 27, singleBases, tbody);
    if (doubleBases > 0) addEquipmentRow("TXBASE2W", "Theatrixx Nomad Exact stacking base, 2 wide", 12, doubleBases, tbody);

    // Ski frames - approximately (horizontalBlocks - 2) for double base, all for single base
    let skiFrames = 0;
    if (groundSupportType === "Double Base") {
      skiFrames = Math.max(0, horizontalBlocks - 2);
    } else {
      skiFrames = horizontalBlocks;
    }

    if (skiFrames > 0) {
      addEquipmentRow("TXSKIFRAME", "Theatrixx Nomad Exact Ski Frame (T base)", 36, skiFrames, tbody);

      // Ski frame extensions: (verticalBlocks - 1) per ski frame
      const skiExtensions = skiFrames * Math.max(0, verticalBlocks - 1);
      if (skiExtensions > 0) {
        addEquipmentRow("TXSTAXEXT", "Theatrixx Nomad Exact ski stacking extension", 30, skiExtensions, tbody);
      }

      // Vertical supports: same as ski frames
      addEquipmentRow("TXVERTSPRT", "Theatrixx Nomad Exact vertical support", 36, skiFrames, tbody);

      // Single fittings: approximately 2 per every 2-3 ski frames
      const singleFittings = Math.ceil(skiFrames * 0.67);
      if (singleFittings > 0) {
        addEquipmentRow("TXSKIFTSNG", "Theatrixx Nomad Exact single fitting", 2, singleFittings, tbody);
      }
    }

    // Ladders (optional, typically 0 for smaller walls)
    const ladders = Math.max(0, Math.floor((horizontalBlocks - 4) / 2));
    if (ladders > 0) {
      addEquipmentRow("TXLADDER", "Theatrixx Nomad Exact Ski Frame Ladder", 117, ladders, tbody);
    }

    // Brackets (optional, typically 0 for flat walls)
    // Only add for curved walls or special configurations

    // M10 screws: approximately 18 per 25 tiles (0.72 per tile)
    const m10Screws = Math.ceil(totalTiles * 0.72);
    if (m10Screws > 0) {
      addEquipmentRow("TXM10B", "Theatrixx Nomad Exact M10 Screw", 0, m10Screws, tbody);
    }
  }

  // Headers for flown support
  if (singleHeaders > 0) addEquipmentRow("TXSNGLHEAD", "Theatrixx Nomad single header", 8, singleHeaders, tbody);
  if (doubleHeaders > 0) addEquipmentRow("TXDBLHEAD", "Theatrixx Nomad double header", 12, doubleHeaders, tbody);

  // Sandbags
  if (sandbags > 0) addEquipmentRow("SANDBAG25", "Sand Bag 25 lbs.", 25, sandbags, tbody);

  // Theatrixx-specific data cables (XVT system)
  // XVT0 to XVT0 data cables: approximately 1.2 per tile
  const xvt0DataCables = Math.ceil(totalTiles * 1.2);
  addEquipmentRow("TXT2TXTXT0", "Theatrixx Nomad XVT0 to XVT0 data 2'", 15, xvt0DataCables, tbody);

  // XVT0 to True1 cables: approximately 1 per 6-7 tiles
  const xvt0ToTrue1 = Math.ceil(totalTiles / 6.25);
  addEquipmentRow("TXT3CT125", "Theatrixx Nomad XVT0 to True1 25'", 24, xvt0ToTrue1, tbody);

  // XVT3 power cables: approximately 1.2 per tile
  const xvt3PowerCables = Math.ceil(totalTiles * 1.2);
  addEquipmentRow("TXT3POWER", "Theatrixx Nomad XVT3 to XVT3 power", 18, xvt3PowerCables, tbody);

  // XVT0 to EtherCon: approximately 1 per processor
  const xvt0ToEtherCon = mx40Count;
  if (xvt0ToEtherCon > 0) {
    addEquipmentRow("TXT02ETRON", "Theatrixx Nomad XVT0 to EtherCon", 0.75, xvt0ToEtherCon, tbody);
  }

  // Standard ethercon cables (for processors)
  if (cables.ECON100C6 > 0) addEquipmentRow("ECON100C6", "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  if (cables.ECONRJ45 > 0) addEquipmentRow("ECONRJ45", "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  if (cables.CAT5ES005 > 0) addEquipmentRow("CAT5ES005", "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  if (cables.ECON010C6 > 0) addEquipmentRow("ECON010C6", "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  if (cables.ECON025C6 > 0) addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  if (cables.ECON050C6 > 0) addEquipmentRow("ECON050C6", "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  if (cables.ECON1M > 0) addEquipmentRow("ECON1M", "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  if (cables.TRUE125FT > 0) addEquipmentRow("TRUE125FT", "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  if (cables.EDT110M > 0 && normalizeVoltage(voltage) === 120) addEquipmentRow("EDT110M", "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  if (cables.T11M > 0) addEquipmentRow("T11M", "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);

  // Power distribution
  if (powerDistro.CUBEDIST > 0) addEquipmentRow("CUBEDIST", "Indu Electric 200A Cube Distro", 177, powerDistro.CUBEDIST, tbody);
  if (powerDistro.TP1 > 0) addEquipmentRow("TP1", "Indu Electric 400A Power Distro w/ (4) 208v Soca", 197, powerDistro.TP1, tbody);
  if (powerDistro.L2130T1FB > 0) addEquipmentRow("L2130T1FB", "L2130 floor box to 3x True1 with pass through", 7.5, powerDistro.L2130T1FB, tbody);
  if (powerDistro.SOCA6XTRU1 > 0) addEquipmentRow("SOCA6XTRU1", "19 Pin Socapex to 6x True1 Power Cable", 5, powerDistro.SOCA6XTRU1, tbody);

  // Display weight and pixel calculations
  if (typeof totalWeight !== "undefined" && typeof displayEstShippingWeight === "function") {
    if (typeof displayWallWeight === "function") displayWallWeight(totalWeight);

    let caseWeight = totalWeight;
    caseWeight += 24 * totalSpareTiles;
    caseWeight += 187 * tileCases;
    caseWeight += 27 * singleBases;
    caseWeight += 12 * doubleBases;
    caseWeight += 8 * singleHeaders;
    caseWeight += 12 * doubleHeaders;
    caseWeight += 120 * cables.ECON100C6;
    caseWeight += 17 * mx40Count;
    displayEstShippingWeight(caseWeight);
  }

  if (typeof displayTotalPixels === "function") displayTotalPixels(totalPixels);
  if (typeof displayDataPortsNeeded === "function") displayDataPortsNeeded("theatrixx", totalTiles);
}

/* ----------------------------- ROE Graphite Mix Equipment ----------------------------- */

function addROEGraphiteMixEquipment(config, tbody) {
  const {
    graphiteMixData,
    processors,
    cables,
    sandbags,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    universalBaseTruss,
    rearTruss,
    rearBridge,
    wallType,
    powerDistro,
    voltage,
    supportType,
  } = config;

  const {
    halfTiles,
    fullTiles,
    halfSpares,
    fullSpares,
    halfTilesWithSpares,
    fullTilesWithSpares,
  } = graphiteMixData;

  console.log('Adding ROE Graphite Mix equipment:', { halfTiles, fullTiles, halfSpares, fullSpares });

  // Calculate total weight
  const halfTileWeight = 11.44; // GP2 Half tile weight
  const fullTileWeight = 19.84; // GP2 Full tile weight
  totalWeight = (halfTiles * halfTileWeight) + (fullTiles * fullTileWeight);

  // Add GP2 Half tiles and packages
  if (halfTiles > 0) {
    const halfPackageCount = Math.ceil(halfTilesWithSpares / 12); // 12 tiles per package
    const halfActiveCases = Math.ceil(halfTiles / 12);
    const halfSpareCases = halfPackageCount - halfActiveCases;

    addEquipmentRow("6GP2HALF", `ROE GP2.6 Half 12x tile package (${halfActiveCases} active + ${halfSpareCases} spare) (Graphite Mix)`, 0, halfPackageCount, tbody);
    addEquipmentRow("ROEGP26HALF", "ROE GP2.6 Half LED tile 500x500mm", 11.44, halfTiles, tbody);
    if (halfSpares > 0) {
      addEquipmentRow("ROEGP26HALF", "ROE GP2.6 Half LED tile 500x500mm **SPARE**", 11.44, halfSpares, tbody);
    }
  }

  // Add GP2 Full tiles and packages
  if (fullTiles > 0) {
    const fullPackageCount = Math.ceil(fullTilesWithSpares / 6); // 6 tiles per package
    const fullActiveCases = Math.ceil(fullTiles / 6);
    const fullSpareCases = fullPackageCount - fullActiveCases;

    addEquipmentRow("6GP2FULL", `ROE GP2.6 Full 6x tile package (${fullActiveCases} active + ${fullSpareCases} spare) (Graphite Mix)`, 0, fullPackageCount, tbody);
    addEquipmentRow("ROEGP26FULL", "ROE GP2.6 Full LED tile 500x1000mm", 19.84, fullTiles, tbody);
    if (fullSpares > 0) {
      addEquipmentRow("ROEGP26FULL", "ROE GP2.6 Full LED tile 500x1000mm **SPARE**", 19.84, fullSpares, tbody);
    }
  }

  // Add processors
  if (processors.SX40 > 0) addEquipmentRow("SX40", "Brompton Tessera SX40 **Kit includes an XD10**", 17, processors.SX40, tbody);
  if (processors.XD10 > 0) addEquipmentRow("XD10", "Brompton Tessera XD 10G data distribution unit", 8.16, processors.XD10, tbody);
  if (processors.S8 > 0) addEquipmentRow("S8", "Brompton Tessera S8", 17, processors.S8, tbody);

  // Add support structures
  if (singleHeaders > 0) addEquipmentRow("BPBOHEAD1", "ROE Black Pearl header, 1W, 0.5m", 12, singleHeaders, tbody);
  if (doubleHeaders > 0) addEquipmentRow("BPBOHEAD2", "ROE Black Pearl header, 2W, 1m", 19, doubleHeaders, tbody);

  if (singleBases > 0) addEquipmentRow("BPBOBB1", "ROE Black Pearl base bar, 1W, 0.5m", 16, singleBases, tbody);
  if (doubleBases > 0) addEquipmentRow("BPBOBB2", "ROE Black Pearl base bar, 2W, 1.0m", 28, doubleBases, tbody);
  if (universalBaseTruss > 0) addEquipmentRow("BPBOBT", "ROE Black Pearl universal base truss", 17, universalBaseTruss, tbody);
  if (rearTruss > 0) addEquipmentRow("BPBOREAR", "ROE Black Pearl rear truss,", 1, rearTruss, tbody);
  if (rearBridge > 0) addEquipmentRow("BPBOBRIDGE", "ROE Black Pearl rear bridge clamp", 1, rearBridge, tbody);

  if (sandbags > 0) addEquipmentRow("SANDBAG25", "Sand Bag 25 lbs.", 25, sandbags, tbody);

  // Add cables
  if (cables.ECONRJ45 > 0) addEquipmentRow("ECONRJ45", "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  if (cables.CAT5ES005 > 0) addEquipmentRow("CAT5ES005", "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  if (cables.ECON010C6 > 0) addEquipmentRow("ECON010C6", "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  if (cables.ECON025C6 > 0) addEquipmentRow("ECON025C6", "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  if (cables.ECON1M > 0) addEquipmentRow("ECON1M", "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  if (cables.T1016 > 0) addEquipmentRow("T1016", "True1 Power Cable 16' (5m)", 2, cables.T1016, tbody);
  if (cables.TRUE125FT > 0) addEquipmentRow("TRUE125FT", "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);

  // Add power distribution
  if (powerDistro.CUBEDIST > 0) addEquipmentRow("CUBEDIST", "Indu Electric 200A Cube Distro", 177, powerDistro.CUBEDIST, tbody);
  if (powerDistro.TP1 > 0) addEquipmentRow("TP1", "Indu Electric 400A Power Distro w/ (4) 208v Soca", 197, powerDistro.TP1, tbody);
  if (powerDistro.SOCA6XTRU1 > 0) addEquipmentRow("SOCA6XTRU1", "19 Pin Soccapex to 6x True1 Power Cable 2 Meter", 197, powerDistro.SOCA6XTRU1, tbody);
  if (powerDistro.L2130T1FB > 0) addEquipmentRow("L2130T1FB", "L2130 floor box to 3x True1 with pass through", 7.5, powerDistro.L2130T1FB, tbody);

  // Display shipping weight
  if (typeof totalWeight !== "undefined" && typeof displayEstShippingWeight === "function") {
    if (typeof displayWallWeight === "function") displayWallWeight(totalWeight);

    let caseWeight = totalWeight;
    // Add spare tile weight
    caseWeight += halfTileWeight * halfSpares;
    caseWeight += fullTileWeight * fullSpares;
    // Add package weight
    const halfPackageCount = Math.ceil(halfTilesWithSpares / 12);
    const fullPackageCount = Math.ceil(fullTilesWithSpares / 6);
    caseWeight += 161.12 * (halfPackageCount * 0.5); // Estimate: half packages weigh less
    caseWeight += 161.12 * fullPackageCount;
    caseWeight += 210 * (singleBases || 0);
    caseWeight += 113 * (doubleBases || 0);
    caseWeight += 91 * (singleHeaders || 0);
    caseWeight += 127 * (doubleHeaders || 0);
    caseWeight += 120 * (cables.ECONRJ45 || 0);
    caseWeight += 63 * (processors.SX40 || 0);
    caseWeight += 57 * (processors.S8 || 0);
    displayEstShippingWeight(caseWeight);
  }

  // Display total pixels
  const halfPixels = halfTiles * 192 * 192; // 192x192 pixels per Half tile
  const fullPixels = fullTiles * 192 * 384; // 192x384 pixels per Full tile
  const totalPixels = halfPixels + fullPixels;
  if (typeof displayTotalPixels === "function") displayTotalPixels(totalPixels);
}

/* ----------------------------- Orchestrator ----------------------------- */

function displayEquipment(data) {
  try {
    const tbody = document.querySelector("#equipmentTable tbody");
    if (!tbody) {
      console.error("Equipment table body not found");
      return;
    }

    tbody.innerHTML = "";
    if (typeof totalWeight !== "undefined") totalWeight = 0;

    const totalWallWeightDiv = document.getElementById("totalWallWeight");
    const totalWeightDiv = document.getElementById("totalWeight");
    const totalPixelsDiv = document.getElementById("totalPixels");
    const totalPowerDiv = document.getElementById("totalPower");
    if (totalWallWeightDiv) totalWallWeightDiv.innerHTML = "";
    if (totalWeightDiv) totalWeightDiv.innerHTML = "";
    if (totalPixelsDiv) totalPixelsDiv.innerHTML = "";
    if (totalPowerDiv) totalPowerDiv.innerHTML = "";

    const totalTiles = data.totalBlocks;
    const totalSpareTiles = data.totalSpares;
    const totalTilesWithSpares = data.totalBlocksWithSpares;
    const horizontalBlocks = data.blocksHor;
    let verticalBlocks = data.blocksVer;
    const voltage = data.voltage;
    const supportType = data.groundSupport ? "Ground" : "Flyware";
    const wallType = data.wallType;
    const productType = data.productType;
    const groundSupportType = data.groundSupportType || "Single Base";
    const flownSupportType = data.flownSupportType || "Single Header";
    const blankRows = data.blankRows || 0;
    const gp2HalfBottomRow = data.gp2HalfBottomRow || false;
    const gp2HalfRows = data.gp2HalfRows || 0;
    const gp2FullVerticalBlocks = data.gp2FullVerticalBlocks || verticalBlocks;
    const roeGraphiteMixEnabled = data.roeGraphiteMixEnabled || false;
    const graphiteMixData = data.graphiteMixData || null;

    console.log('Equipment.js received GP2 Half data:', {
      gp2HalfBottomRow,
      gp2HalfRows,
      gp2FullVerticalBlocks,
      verticalBlocks,
      productType
    });

    if (roeGraphiteMixEnabled && graphiteMixData) {
      console.log('Equipment.js received ROE Graphite Mix data:', graphiteMixData);
    }

    // GP2 Full height limits based on support type
    // Note: verticalBlocks here includes GP2 Half rows for display purposes
    // Use gp2FullVerticalBlocks for actual GP2 Full tile calculations
    if (productType === "ROEGP26Full") {
      // Check original GP2 Full blocks, not including GP2 Half
      if (supportType === "Ground" && gp2FullVerticalBlocks > 6) {
        console.warn("GP2 Full ground support walls are limited to 6 tiles high maximum. Value capped at 6.");
      } else if (supportType !== "Ground" && gp2FullVerticalBlocks > 12) {
        console.warn("GP2 Full flown support walls are limited to 12 tiles high maximum. Value capped at 12.");
      }
    }

    const heightWarning = document.getElementById("blockVerticalWarning")?.textContent || "";
    const sourceSignalCount = parseInt(document.getElementById("sourceSignals")?.value || 1, 10);
    const redundancyType = document.getElementById("redundancy")?.value || "None";
    const selectedDistroType = document.getElementById("powerDistroType")?.value || "Auto";
    const companyLabel = document.getElementById("companyName")?.value || "Rentex";

    if (heightWarning === "***EXCEEDS LIMIT, MUST FLY***") {
      addEquipmentRow("", "***EXCEEDS LIMIT, MUST FLY***", 0, 1, tbody);
      return;
    }

    const processors = EquipmentCalculator.calculateProcessors({
      productType,
      totalTiles,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      sourceSignalCount,
      supportType,
    });

    const power = EquipmentCalculator.calculatePower(productType, totalTiles, voltage);
    if (typeof displayTotalPower === "function") {
      displayTotalPower(normalizeVoltage(voltage), power.amps, power.watts);
    }

    if (typeof displayDataPortsNeeded === "function") {
      displayDataPortsNeeded(productType, totalTiles);
    }

    const cables = EquipmentCalculator.calculateCables({
      productType,
      totalTiles,
      totalTilesWithSpares,
      distributionUnitCount: processors.XD10,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      voltage,
    });

    const supportStructures = EquipmentCalculator.calculateSupportStructures({
      horizontalBlocks,
      verticalBlocks,
      wallType,
      supportType,
      groundSupportType,
      flownSupportType,
      heightWarning,
      blankRows,
      productType,
    });

    const baseCount = supportStructures.singleBases + supportStructures.doubleBases;

    let sandbags = 0;
    if (supportType === "Ground") {
      /* =========================================================
         UPDATED GP2.6 SANDBAG LOGIC
         ========================================================= */
      if (productType === "ROEGP26Full" || productType === "ROEGP26Half") {
         sandbags = calculateGP26Sandbags(
           productType,
           horizontalBlocks,
           // IMPORTANT: GP2.6 Full calculation uses `gp2FullVerticalBlocks` if available
           // to separate the "Full" part from the "Half" rows.
           productType === "ROEGP26Full" ? gp2FullVerticalBlocks : verticalBlocks,
           gp2HalfRows
         );
      } else {
        // Fallback for other products (Absen, Theatrixx, old ROE, etc.)
        sandbags = EquipmentCalculator.calculateSandbags(productType, verticalBlocks, baseCount);
      }
    }

    const powerDistro = EquipmentCalculator.calculatePowerDistribution({
      productType,
      totalTiles,
      voltage,
      selectedDistroType,
      companyLabel,
    });

    const casesNeeded = Math.ceil(totalTilesWithSpares / 8);

    const equipmentConfig = {
      productType,
      totalTiles,
      totalSpareTiles,
      totalTilesWithSpares,
      horizontalBlocks,
      verticalBlocks,
      voltage,
      wallType,
      supportType,
      groundSupportType,
      flownSupportType,
      heightWarning,
      redundancyType,
      casesNeeded,
      blankRows,
      gp2HalfBottomRow,
      gp2HalfRows,
      processors,
      cables,
      sandbags,
      powerDistro,
      roeGraphiteMixEnabled,
      graphiteMixData,
      ...supportStructures,
    };

    // Handle ROE Graphite Mix mode (takes precedence over product type)
    if (roeGraphiteMixEnabled && graphiteMixData) {
      addROEGraphiteMixEquipment(equipmentConfig, tbody);
      console.log("Equipment display complete for ROE Graphite Mix");
      return;
    }

    switch (productType) {
      case "absen":
        addAbsenEquipment(equipmentConfig, tbody);
        break;

      case "BP2B1":
      case "BP2B2":
      case "BP2V2":
        addROEEquipment(equipmentConfig, tbody);
        break;

      case "ROEGP26Full":
      case "ROEGP26Half":
        addROEGP26Equipment(equipmentConfig, tbody);
        break;

      case "theatrixx":
        addTheatrixxEquipment(equipmentConfig, tbody);
        break;

      default:
        console.warn("Unknown product type:", productType);
        if (typeof showError === "function") {
          showError(
            "Unknown product type: " +
              productType +
              " (expected: absen, BP2B1, BP2B2, BP2V2, theatrixx, ROEGP26Full, or ROEGP26Half)"
          );
        }
    }

    console.log("Equipment display complete for", productType);
  } catch (error) {
    console.error("Error in displayEquipment:", error);
    if (typeof showError === "function") showError("Failed to calculate equipment: " + error.message);
  }
}

/* ------------------------ Global / Module Exports ------------------------ */

if (typeof window !== "undefined") {
  window.EquipmentCalculator = EquipmentCalculator;
  window.displayEquipment = displayEquipment;
  window.addEquipmentRow = addEquipmentRow;
  window.addAbsenEquipment = addAbsenEquipment;
  window.addROEEquipment = addROEEquipment;
  window.addROEGP26Equipment = addROEGP26Equipment;
  window.addTheatrixxEquipment = addTheatrixxEquipment;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EquipmentCalculator,
    displayEquipment,
    addEquipmentRow,
    addAbsenEquipment,
    addROEEquipment,
    addROEGP26Equipment,
    addTheatrixxEquipment,
    calculateGP26Sandbags, // Exported for testing/verification
    GP26_BALLAST_CONFIG
  };
}



