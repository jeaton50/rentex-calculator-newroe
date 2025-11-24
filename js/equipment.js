/**
 * Rentex LED Wall Calculator - Equipment Module
 * Handles equipment calculations, table generation, and power/weight displays
 *
 * This module replaces the massive 804-line displayEquipment() function with
 * organized, documented, and maintainable code.
 */

/**
 * Add equipment row to table
 * @param {string} ecode - Equipment code
 * @param {string} name - Equipment name
 * @param {number} weight - Equipment weight
 * @param {number} quantity - Quantity needed
 * @param {HTMLElement} tbody - Table body element to append to
 */
function addEquipmentRow(ecode, name, weight, quantity, tbody) {
  if (!tbody || quantity <= 0) return;

  const row = tbody.insertRow();
  const cell1 = row.insertCell(0);
  const cell2 = row.insertCell(1);
  const cell3 = row.insertCell(2);
  const cell4 = row.insertCell(3);

  cell1.textContent = ecode;
  cell2.textContent = name;
  cell3.textContent = quantity;
  cell4.textContent = weight ? weight.toFixed(2) : '0.00';
}

const EquipmentCalculator = {

  /**
   * Calculate processor requirements (Brompton or Novastar)
   * @param {Object} config - Configuration object
   * @param {string} config.productType - Product type
   * @param {number} config.totalTiles - Total number of tiles
   * @param {number} config.horizontalBlocks - Horizontal tile count
   * @param {number} config.verticalBlocks - Vertical tile count
   * @param {string} config.redundancyType - Redundancy level
   * @param {number} config.sourceSignalCount - Number of source signals
   * @param {string} config.supportType - 'Ground' or 'Flyware'
   * @returns {Object} Processor quantities {SX40, XD10, S8, MX40PRO}
   */
  calculateProcessors(config) {
    const {
      productType,
      totalTiles,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      sourceSignalCount,
      supportType
    } = config;

    // Determine pixels per tile
    const pixelsPerTile = productType === "absen" ? 200 :
                         productType === "theatrixx" ? 192 : 176;

    // Max data cascade per refresh/bit
    const maxDataCascade = productType === "absen" ? 10 : 13;

    // Max panels per processor type
    const maxPanelsPerS8 = Math.floor(2000 / pixelsPerTile) * Math.floor(2000 / pixelsPerTile);
    const maxPanelsPerSX40 = Math.floor(4096 / pixelsPerTile) * Math.floor(2160 / pixelsPerTile);

    // Pixel dimensions
    const pixelsHeight = verticalBlocks * pixelsPerTile;
    const pixelsWidth = horizontalBlocks * pixelsPerTile;

    // Processing calculations
    const minProcessorsForPixels = Math.ceil(pixelsWidth / 4096) * Math.ceil(pixelsHeight / 2160);
    const tilesPerCascade = isFinite(totalTiles / maxDataCascade) ?
                           Math.ceil(totalTiles / maxDataCascade) : 0;

    const baseProcessorCount = Math.max(
      Math.ceil(totalTiles / maxPanelsPerSX40),
      Math.ceil(tilesPerCascade / 40),
      minProcessorsForPixels
    );

    const processorCountWithCascade = maxDataCascade !== 0 ?
      Math.max(baseProcessorCount, Math.ceil(totalTiles / (10 * maxDataCascade))) : 0;

    const distributionProcessorCount = Math.max(baseProcessorCount, Math.ceil(tilesPerCascade / 20));
    const redundantDistributionCount = Math.max(2 * processorCountWithCascade, 2 * distributionProcessorCount);
    const fullyRedundantCount = baseProcessorCount * 2;
    const maxRedundantCount = Math.max(2 * processorCountWithCascade);

    const s8ProcessorCount = Math.max(
      Math.ceil(totalTiles / maxPanelsPerS8),
      Math.ceil(tilesPerCascade / 8),
      minProcessorsForPixels
    );

    // Determine processor counts based on redundancy
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

    // Sanitize values
    primaryProcessorCount = isNaN(primaryProcessorCount) ? 0 : primaryProcessorCount;
    distributionUnitCount = isNaN(distributionUnitCount) ? 0 : distributionUnitCount;

    const s8FinalCount = (supportType === "Flyware") ? 0 :
      (redundancyType === "Fully Redundant") ? 0 : // S8 not used in fully redundant
      ((supportType === "Ground" || totalTiles <= 100) ? s8ProcessorCount : 0);

    // Determine which processors to use
    const maxPanels = productType === "absen" ? 80 : 100;
    let S8, SX40, XD10;

    if (totalTiles <= maxPanels) {
      S8 = s8FinalCount;
      SX40 = 0;
      XD10 = 0;
    } else {
      S8 = 0;
      SX40 = primaryProcessorCount;
      XD10 = S8 !== 0 ? 0 : (distributionUnitCount - SX40);
    }

    return {
      SX40: SX40 || 0,
      XD10: XD10 || 0,
      S8: S8 || 0,
      MX40PRO: 0 // Calculated separately for Theatrixx
    };
  },

  /**
   * Calculate power requirements
   * @param {string} productType - Product type
   * @param {number} totalTiles - Total number of tiles
   * @param {number} voltage - Voltage (110 or 208)
   * @returns {Object} Power data {amps, watts}
   */
  calculatePower(productType, totalTiles, voltage) {
    let amps, watts;

    switch (productType) {
      case "absen":
        amps = (voltage === 110) ? totalTiles * 0.59 : totalTiles * 0.312;
        watts = totalTiles * 192;
        break;

      case "BP2B1":
      case "BP2B2":
      case "BP2V2":
        amps = (voltage === 110) ? (totalTiles * 95) / 110 : (totalTiles * 95) / 208;
        watts = totalTiles * 190;
        break;

      case "theatrixx":
        amps = (voltage === 110) ? totalTiles * 1.63636 : (totalTiles * 865.38461) / 1000;
        watts = totalTiles * 190;
        break;

      default:
        amps = 0;
        watts = 0;
    }

    return { amps, watts };
  },

  /**
   * Calculate sandbag requirements
   * @param {string} productType - Product type
   * @param {number} verticalBlocks - Vertical tile count
   * @param {number} baseCount - Number of bases (singles + doubles)
   * @returns {number} Number of sandbags needed
   */
  calculateSandbags(productType, verticalBlocks, baseCount) {
    const sandbagTables = {
      absen: [0, 0, 0, 4, 6, 8, 11, 15, 17, 19, 21, 23],
      ROE: [0, 0, 0, 3.35102, 5.29109, 7.6720, 10.5821, 14.5505, 16.5787, 20.9821, 23.9703, 26.9585],
      theatrixx: [1, 1, 2, 4, 6, 8, 11, 15, 17, 19, 21, 23]
    };

    let table;
    if (productType === "absen") {
      table = sandbagTables.absen;
    } else if (productType === "theatrixx") {
      table = sandbagTables.theatrixx;
    } else {
      table = sandbagTables.ROE;
    }

    const tableIndex = Math.min(verticalBlocks - 1, table.length - 1);
    const sandbagsPerBase = table[Math.max(0, tableIndex)];

    if (productType === "absen") {
      return Math.ceil((sandbagsPerBase * baseCount) / 1.0525);
    } else {
      return Math.ceil(sandbagsPerBase * baseCount);
    }
  },

  /**
   * Calculate cable requirements
   * @param {Object} config - Configuration
   * @returns {Object} Cable quantities
   */
  calculateCables(config) {
    const {
      totalTilesWithSpares,
      distributionUnitCount,
      horizontalBlocks,
      verticalBlocks,
      redundancyType
    } = config;

    // Data cables
    const cableDistance = Math.round(
      Math.sqrt(
        Math.pow((horizontalBlocks * 1.64) / (distributionUnitCount * 2 || 1), 2) +
        Math.pow(verticalBlocks * 1.64, 2)
      ) * 10
    ) / 10;

    let CAT5ES005 = 0, ECON010C6 = 0, ECON025C6 = 0, ECON050C6 = 0, ECON100C6 = 0;
    const numberOfCables = (redundancyType === "Distribution and Cables" || distributionUnitCount >= 1) ?
                          distributionUnitCount * 10 : 0;

    if (cableDistance < 7) {
      CAT5ES005 = numberOfCables;
    } else if (cableDistance < 11) {
      ECON010C6 = numberOfCables;
    } else if (cableDistance < 26) {
      ECON025C6 = numberOfCables;
    } else if (cableDistance < 51) {
      ECON050C6 = numberOfCables;
    } else {
      ECON100C6 = numberOfCables;
    }

    // Power cables
    const powerCableCount = Math.ceil(totalTilesWithSpares / 8);
    const circuitCount = Math.ceil(totalTilesWithSpares / 16);
    const adjustedPowerCables = Math.ceil(powerCableCount * 1.05);
    const adjustedCircuits = Math.ceil(circuitCount * 1.05);

    return {
      // Data cables
      CAT5ES005,
      ECON010C6,
      ECON025C6,
      ECON050C6,
      ECON100C6,
      ECON1M: totalTilesWithSpares,
      ECONRJ45: distributionUnitCount + (distributionUnitCount > 0 && distributionUnitCount < 5 ? 1 :
                distributionUnitCount > 9 ? 3 : 0),
      // Power cables
      EDT110M: adjustedPowerCables,
      TRUE125FT: adjustedCircuits,
      T11M: totalTilesWithSpares
    };
  },

  /**
   * Calculate support structure requirements
   * @param {Object} config - Configuration
   * @returns {Object} Support structure quantities
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
      blankRows
    } = config;

    let singleBases = 0, doubleBases = 0;
    let singleHeaders = 0, doubleHeaders = 0;
    let outriggers = 0, ladders = 0, clamps = 0;
    let supportBeams50mm = 0, supportBeams1000mm = 0, beamConnectors = 0;
    let platforms = 0, universalBaseTruss = 0, rearTruss = 0, rearBridge = 0;

    // Ground support calculations
    if (supportType === "Ground") {
      if (groundSupportType === "Double Base" && wallType === "Flat") {
        doubleBases = Math.floor(horizontalBlocks / 2);
        singleBases = horizontalBlocks % 2;
      } else {
        singleBases = horizontalBlocks;
      }

      // Outriggers, clamps, and ladders
      outriggers = Math.ceil(horizontalBlocks / 1.9);
      const clampCalc = Math.floor(verticalBlocks / 2) * outriggers;
      clamps = heightWarning === "***EXCEEDS LIMIT, MUST FLY***" ? 0 : clampCalc;
      ladders = clamps;

      // ROE-specific: universal base truss
      universalBaseTruss = Math.ceil(horizontalBlocks / 1.9);
      rearTruss = Math.floor((verticalBlocks + (blankRows || 0)) / 2) * universalBaseTruss;
      rearBridge = rearTruss;
    }

    // Flown support calculations
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
      rearBridge
    };
  },

  /**
   * Calculate power distribution equipment
   * @param {Object} config - Configuration
   * @returns {Object} Power distribution equipment
   */
  calculatePowerDistribution(config) {
    const {
      productType,
      totalTiles,
      voltage,
      selectedDistroType,
      companyLabel
    } = config;

    let CUBEDIST = 0, TP1 = 0, L2130T1FB = 0, SOCA6XTRU1 = 0, TXT32SOCA = 0;

    // Calculate amps based on product type
    let amps110, amps208;
    if (productType === "absen") {
      amps110 = totalTiles * 1.745;
      amps208 = totalTiles * 0.923;
    } else if (productType === "BP2V2" || productType === "BP2B1" || productType === "BP2B2") {
      amps110 = (totalTiles * 160) / 110;
      amps208 = (totalTiles * 190) / 208;
    } else if (productType === "theatrixx") {
      amps110 = totalTiles * 2.40909;
      amps208 = totalTiles * 1.27403;
    }

    // Calculate distro unit requirements
    const cubeUnits110 = Math.ceil(amps110 / 200);
    const cubeUnits208 = Math.ceil(amps208 / 200);
    const tp1Units = Math.ceil(amps208 / 400);

    // Determine which distro to use
    let distroUnits = 0;
    if (companyLabel === "Rentex") {
      if (selectedDistroType === "CUBEDIST") {
        distroUnits = voltage === 110 ? cubeUnits110 : cubeUnits208;
        CUBEDIST = distroUnits;
      } else if (selectedDistroType === "TP1") {
        distroUnits = tp1Units;
        TP1 = distroUnits;
      } else if (selectedDistroType === "Auto") {
        // Auto-select based on requirements
        if (tp1Units > 0 && amps208 > 200) {
          TP1 = tp1Units;
          distroUnits = tp1Units;
        } else {
          CUBEDIST = voltage === 110 ? cubeUnits110 : cubeUnits208;
          distroUnits = CUBEDIST;
        }
      }
    }

    // Floor boxes and adapters
    if (productType === "theatrixx" && TP1 > 0) {
      const z47 = Math.ceil(totalTiles / 1.27403 / 11.5 / 6);
      TXT32SOCA = z47;
    } else if (CUBEDIST > 0) {
      L2130T1FB = Math.ceil((totalTiles / 16) / 3);
    } else if (TP1 > 0) {
      SOCA6XTRU1 = Math.ceil((totalTiles / 16) / 6);
    }

    return {
      CUBEDIST,
      TP1,
      L2130T1FB,
      SOCA6XTRU1,
      TXT32SOCA
    };
  }
};

/**
 * Add Absen-specific equipment to table
 * @param {Object} config - Equipment configuration
 * @param {HTMLElement} tbody - Table body element
 */
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
    powerDistro
  } = config;

  // Calculate total wall weight (tiles only)
  totalWeight = 20.61 * totalTiles;

  // Calculate total pixels (Absen uses 200 pixels per tile)
  const totalPixels = (horizontalBlocks * 200) * (verticalBlocks * 200);

  // Tiles and cases
  addEquipmentRow('8PPL25', 'Absen PL2.5 8x tile package', 0, casesNeeded, tbody);
  addEquipmentRow('PL25', 'Absen PL2.5 tile', 20.61, totalTiles, tbody);
  addEquipmentRow('PL25', 'Absen PL2.5  ** Spare Tiles **', 20.61, totalSpareTiles, tbody);
  addEquipmentRow('PL25CASE', 'Case, Absen PL2.5, 8x', 161.12, casesNeeded, tbody);

  // Processors
  if (processors.SX40 > 0) {
    addEquipmentRow('SX40', 'Brompton Tessera SX40 **Kit includes an XD10**', 17, processors.SX40, tbody);
  }
  if (processors.XD10 > 0) {
    addEquipmentRow('XD10', 'Brompton Tessera XD 10G data distribution unit', 8.16, processors.XD10, tbody);
  }
  if (processors.S8 > 0) {
    addEquipmentRow('S8', 'Brompton Tessera S8', 17, processors.S8, tbody);
  }

  // Ground support - bases
  if (singleBases > 0) {
    addEquipmentRow('PL25BB1', 'Absen PL2.5 base bar, 1W, 0.5m', 16, singleBases, tbody);
  }
  if (doubleBases > 0) {
    addEquipmentRow('PL25BB2', 'Absen PL2.5 base bar, 2W, 1m', 37, doubleBases, tbody);
  }
  if (outriggers > 0) {
    addEquipmentRow('PL25OUT', 'Absen PL2.5 outrigger', 17, outriggers, tbody);
  }
  if (ladders > 0) {
    addEquipmentRow('PL25LAD1M', 'Absen PL2.5 ladder 1m', 9, ladders, tbody);
  }
  if (clamps > 0) {
    addEquipmentRow('PL25CLAMP', 'Absen PL2.5 clamp', 3.2, clamps, tbody);
  }
  if (supportBeams50mm > 0) {
    addEquipmentRow('PL25BEAM50', 'Absen PL2.5 support beam, 500 mm', 4, supportBeams50mm, tbody);
  }
  if (supportBeams1000mm > 0) {
    addEquipmentRow('PL25BEAM1K', 'Absen PL2.5 support beam, 1000 mm', 6, supportBeams1000mm, tbody);
  }
  if (beamConnectors > 0) {
    addEquipmentRow('PL25BEAMAD', 'Absen PL2.5 support beam conn, adjustable', 7, beamConnectors, tbody);
  }
  if (platforms > 0) {
    addEquipmentRow('PL25PLAT', 'Absen PL2.5 platform', 10, platforms, tbody);
  }

  // Sandbags
  if (sandbags > 0) {
    addEquipmentRow('SANDBAG25', 'Sand Bag 25 lbs.', 25, sandbags, tbody);
  }

  // Flown support - headers
  if (singleHeaders > 0) {
    addEquipmentRow('PL25HEAD1', 'Absen PL2.5 header, 1W, 0.5m', 12, singleHeaders, tbody);
  }
  if (doubleHeaders > 0) {
    addEquipmentRow('PL25HEAD2', 'Absen PL2.5 header, 2W, 1m', 19, doubleHeaders, tbody);
  }

  // Cables
  if (cables.ECONRJ45 > 0) {
    addEquipmentRow('ECONRJ45', "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  }
  if (cables.CAT5ES005 > 0) {
    addEquipmentRow('CAT5ES005', "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  }
  if (cables.ECON010C6 > 0) {
    addEquipmentRow('ECON010C6', "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  }
  if (cables.ECON025C6 > 0) {
    addEquipmentRow('ECON025C6', "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  }
  if (cables.ECON050C6 > 0) {
    addEquipmentRow('ECON050C6', "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  }
  if (cables.ECON100C6 > 0) {
    addEquipmentRow('ECON100C6', "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  }
  if (cables.ECON1M > 0) {
    addEquipmentRow('ECON1M', "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  }
  if (cables.TRUE125FT > 0) {
    addEquipmentRow('TRUE125FT', "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  }
  if (cables.EDT110M > 0) {
    addEquipmentRow('EDT110M', "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  }
  if (cables.T11M > 0) {
    addEquipmentRow('T11M', "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);
  }

  // Power distribution
  if (powerDistro.CUBEDIST > 0) {
    addEquipmentRow('CUBEDIST', 'Indu Electric 200A Cube Distro', 177, powerDistro.CUBEDIST, tbody);
  }
  if (powerDistro.TP1 > 0) {
    addEquipmentRow('TP1', 'Indu Electric 400A Power Distro w/ (4) 208v Soca', 197, powerDistro.TP1, tbody);
  }
  if (powerDistro.SOCA6XTRU1 > 0) {
    addEquipmentRow('SOCA6XTRU1', '19 Pin Soccapex to 6x True1 Power Cable 2 Meter', 197, powerDistro.SOCA6XTRU1, tbody);
  }
  if (powerDistro.L2130T1FB > 0) {
    addEquipmentRow('L2130T1FB', 'L2130 floor box to 3x True1 with pass through', 7.5, powerDistro.L2130T1FB, tbody);
  }

  // Display wall weight and calculate shipping weight
  if (typeof totalWeight !== 'undefined' && typeof displayEstShippingWeight === 'function') {
    // Display the pure wall/tile weight
    if (typeof displayWallWeight === 'function') {
      displayWallWeight(totalWeight);
    }

    // Calculate total shipping weight including equipment
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

  // Display total pixels
  if (typeof displayTotalPixels === 'function') {
    displayTotalPixels(totalPixels);
  }

  // Display data ports needed
  if (typeof displayDataPortsNeeded === 'function') {
    displayDataPortsNeeded('Absen', totalTiles);
  }
}

/**
 * Add ROE-specific equipment to table
 * @param {Object} config - Equipment configuration
 * @param {HTMLElement} tbody - Table body element
 */
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
    verticalBlocks
  } = config;

  // Calculate total wall weight (tiles only)
  totalWeight = 20.61 * totalTiles;

  // Calculate total pixels (ROE uses 176 pixels per tile)
  const totalPixels = (horizontalBlocks * 176) * (verticalBlocks * 176);

  // Calculate dummy tiles for case filling
  const dummyTilesNeeded = blankRows * horizontalBlocks;
  let dummyTilesToFillCase = 0;
  if (dummyTilesNeeded > 0) {
    const withSpareCalc = Math.ceil(dummyTilesNeeded * 1.08);
    const roundedTo8 = Math.round(withSpareCalc / 8) * 8;
    const difference = roundedTo8 - dummyTilesNeeded;
    if (difference > 0 && difference < 8) {
      dummyTilesToFillCase = difference;
    }
  }

  // Tiles and cases - product-specific
  if (productType === "BP2B1") {
    addEquipmentRow('8PBP2B1', 'ROE BP2B1 8x tile package', 0, casesNeeded, tbody);
    addEquipmentRow('BP2B1', 'ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)', 20.61, totalTiles, tbody);
    addEquipmentRow('BP2B1', 'ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)**SPARE**', 20.61, totalSpareTiles, tbody);
    addEquipmentRow('BP2V2CASE', 'Case, ROE Black Pearl version2, 8x (BP2V2)', 161.12, casesNeeded, tbody);
  } else if (productType === "BP2B2") {
    addEquipmentRow('8PBP2B2', 'ROE BP2B2 8x tile package', 0, casesNeeded, tbody);
    addEquipmentRow('BP2B2', 'ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)', 20.61, totalTiles, tbody);
    addEquipmentRow('BP2B2', 'ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)**SPARE**', 20.61, totalSpareTiles, tbody);
    addEquipmentRow('BP2V2CASE', 'Case, ROE Black Pearl version2, 8x (BP2V2)', 161.12, casesNeeded, tbody);
  } else if (productType === "BP2V2") {
    addEquipmentRow('8PBP2V2', 'ROE BP2V2 8x tile package', 0, casesNeeded, tbody);
    addEquipmentRow('BP2V2', 'BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)', 20.61, totalTiles, tbody);
    addEquipmentRow('BP2V2', 'BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)**SPARE**', 21.61, totalSpareTiles, tbody);
    addEquipmentRow('BP2V2CASE', 'Case, ROE Black Pearl version2, 8x (BP2V2)', 161.12, casesNeeded, tbody);
  }

  // Dummy tiles
  if (dummyTilesNeeded > 0) {
    addEquipmentRow('BP2DT', 'BP2 Dummy Tile', 0, dummyTilesNeeded, tbody);
  }
  if (dummyTilesToFillCase > 0) {
    addEquipmentRow('BP2DTCASE', 'BP2 Dummy Tile (to fill case, not included in wall size)', 0, dummyTilesToFillCase, tbody);
  }

  // Processors
  if (processors.SX40 > 0) {
    addEquipmentRow('SX40', 'Brompton Tessera SX40 **Kit includes an XD10**', 17, processors.SX40, tbody);
  }
  if (processors.XD10 > 0) {
    addEquipmentRow('XD10', 'Brompton Tessera XD 10G data distribution unit', 8.16, processors.XD10, tbody);
  }
  if (processors.S8 > 0) {
    addEquipmentRow('S8', 'Brompton Tessera S8', 17, processors.S8, tbody);
  }

  // Support structures - headers
  if (singleHeaders > 0) {
    addEquipmentRow('BPBOHEAD1', 'ROE Black Pearl header, 1W, 0.5m', 12, singleHeaders, tbody);
  }
  if (doubleHeaders > 0) {
    addEquipmentRow('BPBOHEAD2', 'ROE Black Pearl header, 2W, 1m', 19, doubleHeaders, tbody);
  }

  // Support structures - bases
  if (singleBases > 0) {
    addEquipmentRow('BPBOBB1', 'ROE Black Pearl base bar, 1W, 0.5m', 16, singleBases, tbody);
  }
  if (doubleBases > 0) {
    addEquipmentRow('BPBOBB2', 'ROE Black Pearl base bar, 2W, 1.0m', 28, doubleBases, tbody);
  }
  if (universalBaseTruss > 0) {
    addEquipmentRow('BPBOBT', 'ROE Black Pearl universal base truss', 17, universalBaseTruss, tbody);
  }
  if (rearTruss > 0) {
    addEquipmentRow('BPBOREAR', 'ROE Black Pearl rear truss,', 1, rearTruss, tbody);
  }
  if (rearBridge > 0) {
    addEquipmentRow('BPBOBRIDGE', 'ROE Black Pearl rear bridge clamp', 1, rearBridge, tbody);
  }

  // Curved wall brackets
  if (wallType === "Convex" || wallType === "Concave") {
    const fiveDegBrackets = totalTiles / 2;
    const m10Bolts = fiveDegBrackets * 4;
    addEquipmentRow('BP25DGREE', 'ROE Black Pearl 5 Degree Bracket', 0.25, fiveDegBrackets, tbody);
    addEquipmentRow('BP2BBOLT', 'M10x30 bolts for ROE brackets', 0.2, m10Bolts, tbody);
  }

  // Sandbags
  if (sandbags > 0) {
    addEquipmentRow('SANDBAG25', 'Sand Bag 25 lbs.', 25, sandbags, tbody);
  }

  // Cables
  if (cables.ECONRJ45 > 0) {
    addEquipmentRow('ECONRJ45', "Ethercon to RJ45 (CAT6) 100'", 2.4, cables.ECONRJ45, tbody);
  }
  if (cables.CAT5ES005 > 0) {
    addEquipmentRow('CAT5ES005', "CAT5e ethernet cable 5'", 1, cables.CAT5ES005, tbody);
  }
  if (cables.ECON010C6 > 0) {
    addEquipmentRow('ECON010C6', "Ethercon (CAT6) 10'", 1, cables.ECON010C6, tbody);
  }
  if (cables.ECON025C6 > 0) {
    addEquipmentRow('ECON025C6', "Ethercon (CAT6) 25'", 1.5, cables.ECON025C6, tbody);
  }
  if (cables.ECON050C6 > 0) {
    addEquipmentRow('ECON050C6', "Ethercon (CAT6) 50'", 3, cables.ECON050C6, tbody);
  }
  if (cables.ECON100C6 > 0) {
    addEquipmentRow('ECON100C6', "Ethercon (CAT6) 100'", 6, cables.ECON100C6, tbody);
  }
  if (cables.ECON1M > 0) {
    addEquipmentRow('ECON1M', "Ethercon to Ethercon 1m", 0.25, cables.ECON1M, tbody);
  }
  if (cables.TRUE125FT > 0) {
    addEquipmentRow('TRUE125FT', "True1 to True1 cable, 25'", 4, cables.TRUE125FT, tbody);
  }
  if (cables.EDT110M > 0) {
    addEquipmentRow('EDT110M', "Edison to True1 power cable, 10 meter", 3.2, cables.EDT110M, tbody);
  }
  if (cables.T11M > 0) {
    addEquipmentRow('T11M', "True1 power cable 1M (3')", 0.44, cables.T11M, tbody);
  }

  // Power distribution
  if (powerDistro.CUBEDIST > 0) {
    addEquipmentRow('CUBEDIST', 'Indu Electric 200A Cube Distro', 177, powerDistro.CUBEDIST, tbody);
  }
  if (powerDistro.TP1 > 0) {
    addEquipmentRow('TP1', 'Indu Electric 400A Power Distro w/ (4) 208v Soca', 197, powerDistro.TP1, tbody);
  }
  if (powerDistro.L2130T1FB > 0) {
    addEquipmentRow('L2130T1FB', 'L2130 floor box to 3x True1 with pass through', 7.5, powerDistro.L2130T1FB, tbody);
  }
  if (powerDistro.SOCA6XTRU1 > 0) {
    addEquipmentRow('SOCA6XTRU1', '19 Pin Socapex to 6x True1 Power Cable', 5, powerDistro.SOCA6XTRU1, tbody);
  }

  // Display wall weight and calculate shipping weight
  if (typeof totalWeight !== 'undefined' && typeof displayEstShippingWeight === 'function') {
    // Display the pure wall/tile weight
    if (typeof displayWallWeight === 'function') {
      displayWallWeight(totalWeight);
    }

    // Calculate total shipping weight including equipment
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

  // Display total pixels
  if (typeof displayTotalPixels === 'function') {
    displayTotalPixels(totalPixels);
  }

  // Display data ports needed
  if (typeof displayDataPortsNeeded === 'function') {
    displayDataPortsNeeded('ROE', totalTiles);
  }
}

/**
 * Add Theatrixx-specific equipment to table
 * @param {Object} config - Equipment configuration
 * @param {HTMLElement} tbody - Table body element
 */
function addTheatrixxEquipment(config, tbody) {
  const {
    totalTiles,
    totalSpareTiles,
    totalTilesWithSpares,
    horizontalBlocks,
    verticalBlocks,
    wallType,
    supportType,
    singleBases,
    doubleBases,
    singleHeaders,
    doubleHeaders,
    sandbags,
    heightWarning,
    redundancyType,
    voltage,
    powerDistro
  } = config;

  // Calculate total wall weight (tiles only)
  totalWeight = 17.6 * totalTiles;

  // Calculate package needs
  const packageCount = Math.round(totalTilesWithSpares / 10);

  // Tiles and cases
  addEquipmentRow('10PTXNOMAD', 'Theatrixx Nomad 2.6 10x package', 0, packageCount, tbody);
  addEquipmentRow('TXNOMAD26', 'Theatrixx Nomad LED panel 500x500 2.6mm', 17.6, totalTiles, tbody);
  addEquipmentRow('TXNOMAD26', 'Theatrixx Nomad LED panel 500x500 2.6mm ** Spare Tiles **', 17.6, totalSpareTiles, tbody);
  addEquipmentRow('CATXLED', 'Case, Theatrixx Nomad tile 10x', 187, packageCount, tbody);

  // Processors - Novastar MX40 PRO (not Brompton)
  // Calculate total pixels (Theatrixx uses 192 pixels per tile)
  const totalPixels = (horizontalBlocks * 192) * (verticalBlocks * 192);
  let mx40Count = Math.ceil((totalPixels / 9000000) * 1);
  if (redundancyType === "Fully Redundant") {
    mx40Count = mx40Count * 2;
  } else if (redundancyType !== "None") {
    mx40Count = 0; // Distribution and Cables mode doesn't use MX40
  }
  if (mx40Count > 0) {
    addEquipmentRow('MX40PRO', 'Novastar MX40 PRO', 17, mx40Count, tbody);
  }

  // Ground support structures
  let skiFrames = 0, stackingExtensions = 0, ladderFrames = 0, straightBrackets = 0;
  let verticalSupports = 0, singleFeet = 0, curvedBrackets = 0, m10Screws = 0;

  if (supportType === "Ground") {
    // Calculate ski frames based on wall type
    if (wallType === "Convex" || wallType === "Concave") {
      skiFrames = horizontalBlocks;
    } else if (wallType === "Flat") {
      skiFrames = Math.ceil(horizontalBlocks / 2);
    }

    if (heightWarning !== "***EXCEEDS LIMIT, MUST FLY***") {
      stackingExtensions = skiFrames;
      ladderFrames = Math.ceil(verticalBlocks / 2) * skiFrames;

      if (wallType === "Flat") {
        straightBrackets = Math.ceil(verticalBlocks / 2) * skiFrames;
      }

      verticalSupports = singleBases + doubleBases;
      singleFeet = 2; // 1x2 configuration

      if (wallType === "Convex" || wallType === "Concave") {
        curvedBrackets = ladderFrames;
      }

      m10Screws = ladderFrames * 2;
    }
  }

  // Add ground support equipment
  if (singleBases > 0) {
    addEquipmentRow('TXBASE1W', 'Theatrixx Nomad Exact stacking base, 1 wide', 27, singleBases, tbody);
  }
  if (doubleBases > 0) {
    addEquipmentRow('TXBASE2W', 'Theatrixx Nomad Exact stacking base, 2 wide', 12, doubleBases, tbody);
  }
  if (skiFrames > 0) {
    addEquipmentRow('TXSKIFRAME', 'Theatrixx Nomad Exact ski frame (T base)', 12, skiFrames, tbody);
  }
  if (stackingExtensions > 0) {
    addEquipmentRow('TXSTAKEXT', 'Theatrixx Nomad Exact ski stacking extension', 10, stackingExtensions, tbody);
  }
  if (ladderFrames > 0) {
    addEquipmentRow('TXLADDER', 'Theatrixx Nomad Exact ladder frame', 13, ladderFrames, tbody);
  }
  if (straightBrackets > 0) {
    addEquipmentRow('TXBRACKETS', 'Theatrixx Nomad Exact bracket-straight', 0.25, straightBrackets, tbody);
  }
  if (verticalSupports > 0) {
    addEquipmentRow('TXVERTSPRT', 'Theatrixx Nomad Exact vertical support', 12, verticalSupports, tbody);
  }
  if (singleFeet > 0) {
    addEquipmentRow('TXSKIFTSNG', 'Theatrixx Nomad Exact single foot', 1, singleFeet, tbody);
  }
  if (curvedBrackets > 0) {
    addEquipmentRow('TXBRACKETC', 'Theatrixx Nomad Exact bracket-curved', 0.75, curvedBrackets, tbody);
  }
  if (m10Screws > 0) {
    addEquipmentRow('TXM10B', 'Theatrixx Nomad Exact M10 Screw', 0, m10Screws, tbody);
  }

  // Sandbags
  if (sandbags > 0) {
    addEquipmentRow('SANDBAG25', 'Sand Bag 25 lbs.', 25, sandbags, tbody);
  }

  // Flown support - headers
  if (doubleHeaders > 0) {
    addEquipmentRow('TXDBLHEAD', 'Theatrixx Nomad double header', 12, doubleHeaders, tbody);
  }
  if (singleHeaders > 0) {
    addEquipmentRow('TXSNGLHEAD', 'Theatrixx Nomad single header', 8, singleHeaders, tbody);
  }

  // Data cables - Theatrixx specific
  let dataCableCount = Math.ceil(totalTiles / 13) + 1;
  if (redundancyType === "Fully Redundant") {
    dataCableCount = dataCableCount * 2;
  } else if (redundancyType !== "None") {
    dataCableCount = 0;
  }
  if (dataCableCount > 0) {
    addEquipmentRow('ECON100C6', "Ethercon (CAT6) 100'", 2.4, dataCableCount, tbody);
  }

  // XVT data cables
  addEquipmentRow('TXT92TXT9', "Theatrixx Nomad XVT9 to XVT9 data 3'", 0.5, totalTilesWithSpares, tbody);

  // Power cables - voltage specific
  if (voltage === 110) {
    const powerCalc1 = Math.ceil(totalTilesWithSpares / 2.409);
    const powerCalc2 = Math.ceil((powerCalc1 / 8.302) * 2);
    addEquipmentRow('TXT32ED6', "Theatrixx Nomad XVT3 to Edison (5-15P) 6'", 3.2, powerCalc2, tbody);
  } else {
    const powerCalc1 = Math.ceil(totalTiles / 1.27403);
    const powerCalc2 = Math.ceil(powerCalc1 / 11.5);
    const powerCalc3 = (powerCalc2 > 0) ? (powerCalc2 + 2) : 0;
    addEquipmentRow('TXT32T125', "Theatrixx Nomad XVT3 to True1 25'", 6, powerCalc3, tbody);
  }

  // XVT power cables
  addEquipmentRow('TXT3POWER', "Theatrixx Nomad XVT3 to XVT3 power 4'", 0.6, totalTilesWithSpares, tbody);

  // Adapters
  if (dataCableCount > 0) {
    addEquipmentRow('TXT92ETRCN', "Theatrixx Nomad XVT9 to EtherCon adapter", 0.25, dataCableCount, tbody);
  }

  // Power distribution
  if (powerDistro.CUBEDIST > 0) {
    addEquipmentRow('CUBEDIST', 'Indu Electric 200A Cube Distro', 177, powerDistro.CUBEDIST, tbody);
  }
  if (powerDistro.TP1 > 0) {
    addEquipmentRow('TP1', 'Indu Electric 400A Cube Distro', 197, powerDistro.TP1, tbody);
  }
  if (powerDistro.L2130T1FB > 0) {
    addEquipmentRow('L2130T1FB', 'L2130 floor box to 3x True1 with pass through', 7.5, powerDistro.L2130T1FB, tbody);
  }
  if (powerDistro.TXT32SOCA > 0) {
    addEquipmentRow('TXT32SOCA', 'Theatrixx Nomad XVT3 to Socapex', 22, powerDistro.TXT32SOCA, tbody);
  }

  // Display wall weight and calculate shipping weight
  if (typeof totalWeight !== 'undefined' && typeof displayEstShippingWeight === 'function') {
    // Display the pure wall/tile weight
    if (typeof displayWallWeight === 'function') {
      displayWallWeight(totalWeight);
    }

    // Calculate total shipping weight including equipment
    let shippingWeight = totalWeight;
    shippingWeight += 17.6 * totalSpareTiles;
    shippingWeight += 187 * packageCount;
    shippingWeight += 17 * mx40Count;
    shippingWeight += 27 * singleBases;
    shippingWeight += 12 * doubleBases;
    shippingWeight += 12 * skiFrames;
    shippingWeight += 10 * stackingExtensions;
    shippingWeight += 13 * ladderFrames;
    shippingWeight += 0.25 * straightBrackets;
    shippingWeight += 12 * verticalSupports;
    shippingWeight += 1 * singleFeet;
    shippingWeight += 0.75 * curvedBrackets;
    shippingWeight += 25 * sandbags;
    shippingWeight += 12 * doubleHeaders;
    shippingWeight += 8 * singleHeaders;
    shippingWeight += 2.4 * dataCableCount;
    shippingWeight += 0.5 * totalTilesWithSpares; // XVT9 data cables
    shippingWeight += 0.6 * totalTilesWithSpares; // XVT3 power cables
    shippingWeight += 0.25 * dataCableCount; // XVT9 to EtherCon adapters

    // Add power cables (voltage specific)
    if (voltage === 110) {
      const powerCalc1 = Math.ceil(totalTilesWithSpares / 2.409);
      const powerCalc2 = Math.ceil((powerCalc1 / 8.302) * 2);
      shippingWeight += 3.2 * powerCalc2; // XVT3 to Edison cables
    } else {
      const powerCalc1 = Math.ceil(totalTiles / 1.27403);
      const powerCalc2 = Math.ceil(powerCalc1 / 11.5);
      const powerCalc3 = (powerCalc2 > 0) ? (powerCalc2 + 2) : 0;
      shippingWeight += 6 * powerCalc3; // XVT3 to True1 cables
    }

    // Add power distribution equipment
    shippingWeight += 177 * powerDistro.CUBEDIST;
    shippingWeight += 197 * powerDistro.TP1;
    shippingWeight += 7.5 * powerDistro.L2130T1FB;
    shippingWeight += 22 * powerDistro.TXT32SOCA;

    displayEstShippingWeight(shippingWeight);
  }

  // Display total pixels
  if (typeof displayTotalPixels === 'function') {
    displayTotalPixels(totalPixels);
  }

  // Display data ports needed
  if (typeof displayDataPortsNeeded === 'function') {
    displayDataPortsNeeded('Theatrixx', totalTiles);
  }
}

/**
 * Display equipment in the table
 * Main orchestration function
 */
function displayEquipment(data) {
  try {
    // Get DOM elements
    const tbody = document.querySelector('#equipmentTable tbody');
    if (!tbody) {
      console.error('Equipment table body not found');
      return;
    }

    // Clear existing content
    tbody.innerHTML = '';
    if (typeof totalWeight !== 'undefined') {
      totalWeight = 0;
    }

    // Clear display sections
    const totalWallWeightDiv = document.getElementById('totalWallWeight');
    const totalWeightDiv = document.getElementById('totalWeight');
    const totalPixelsDiv = document.getElementById('totalPixels');
    const totalPowerDiv = document.getElementById('totalPower');
    if (totalWallWeightDiv) totalWallWeightDiv.innerHTML = '';
    if (totalWeightDiv) totalWeightDiv.innerHTML = '';
    if (totalPixelsDiv) totalPixelsDiv.innerHTML = '';
    if (totalPowerDiv) totalPowerDiv.innerHTML = '';

    // Extract configuration (rename Excel variables)
    const totalTiles = data.totalBlocks;
    const totalSpareTiles = data.totalSpares;
    const totalTilesWithSpares = data.totalBlocksWithSpares;
    const horizontalBlocks = data.blocksHor;
    const verticalBlocks = data.blocksVer;
    const voltage = data.voltage;
    const powerDistroType = data.powerDistro;
    const supportType = data.groundSupport ? "Ground" : "Flyware";
    const wallType = data.wallType;
    const productType = data.productType;
    const groundSupportType = data.groundSupportType || 'Single Base';
    const flownSupportType = data.flownSupportType || 'Single Header';
    const blankRows = data.blankRows || 0;

    // Get UI values
    const heightWarning = document.getElementById('blockVerticalWarning')?.textContent || '';
    const sourceSignalCount = parseInt(document.getElementById('sourceSignals')?.value || 1, 10);
    const redundancyType = document.getElementById('redundancy')?.value || 'None';
    const selectedDistroType = document.getElementById('powerDistroType')?.value || 'Auto';
    const companyLabel = document.getElementById('companyName')?.value || 'Rentex';

    // Check for limit exceeded
    if (heightWarning === "***EXCEEDS LIMIT, MUST FLY***") {
      if (typeof addEquipmentRow === 'function') {
        addEquipmentRow('', '***EXCEEDS LIMIT, MUST FLY***', 0, 1, tbody);
      }
      return;
    }

    // Calculate processors
    const processors = EquipmentCalculator.calculateProcessors({
      productType,
      totalTiles,
      horizontalBlocks,
      verticalBlocks,
      redundancyType,
      sourceSignalCount,
      supportType
    });

    // Calculate power
    const power = EquipmentCalculator.calculatePower(productType, totalTiles, voltage);

    // Display power (call existing function if available)
    if (typeof displayTotalPower === 'function') {
      displayTotalPower(voltage, power.amps, power.watts);
    }

    // Display data ports needed (call existing function if available)
    if (typeof displayDataPortsNeeded === 'function') {
      displayDataPortsNeeded(productType, totalTiles);
    }

    // Calculate cables
    const cables = EquipmentCalculator.calculateCables({
      totalTilesWithSpares,
      distributionUnitCount: processors.XD10,
      horizontalBlocks,
      verticalBlocks,
      redundancyType
    });

    // Calculate support structures
    const supportStructures = EquipmentCalculator.calculateSupportStructures({
      horizontalBlocks,
      verticalBlocks,
      wallType,
      supportType,
      groundSupportType,
      flownSupportType,
      heightWarning,
      blankRows
    });

    // Calculate sandbags
    const baseCount = supportStructures.singleBases + supportStructures.doubleBases;
    let sandbags = 0;
    if (supportType === "Ground") {
      sandbags = EquipmentCalculator.calculateSandbags(productType, verticalBlocks, baseCount);
    }

    // Calculate power distribution
    const powerDistro = EquipmentCalculator.calculatePowerDistribution({
      productType,
      totalTiles,
      voltage,
      selectedDistroType,
      companyLabel
    });

    // Calculate cases needed
    const casesNeeded = Math.ceil(totalTilesWithSpares / 8);

    // Build complete equipment configuration
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
      processors,
      cables,
      sandbags,
      powerDistro,
      ...supportStructures
    };

    // Call product-specific equipment function
    switch (productType) {
      case 'absen':
        addAbsenEquipment(equipmentConfig, tbody);
        break;

      case 'BP2B1':
      case 'BP2B2':
      case 'BP2V2':
        addROEEquipment(equipmentConfig, tbody);
        break;

      case 'theatrixx':
        addTheatrixxEquipment(equipmentConfig, tbody);
        break;

      default:
        console.warn('Unknown product type:', productType);
        if (typeof showError === 'function') {
          showError('Unknown product type: ' + productType);
        }
    }

    console.log('Equipment display complete for', productType);

  } catch (error) {
    console.error('Error in displayEquipment:', error);
    if (typeof showError === 'function') {
      showError('Failed to calculate equipment: ' + error.message);
    }
  }
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.EquipmentCalculator = EquipmentCalculator;
  window.displayEquipment = displayEquipment;
  window.addEquipmentRow = addEquipmentRow;
  window.addAbsenEquipment = addAbsenEquipment;
  window.addROEEquipment = addROEEquipment;
  window.addTheatrixxEquipment = addTheatrixxEquipment;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EquipmentCalculator,
    displayEquipment,
    addEquipmentRow,
    addAbsenEquipment,
    addROEEquipment,
    addTheatrixxEquipment
  };
}
