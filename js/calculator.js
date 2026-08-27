/**
 * Rentex LED Wall Calculator - Calculator Module
 * Handles all tile calculations, dimension conversions, and aspect ratio logic
 */

console.log('🔧 Calculator.js LOADED - Version: gp2half-debug-v3');

/**
 * Block size constant in feet (500mm converted to feet)
 * @const {number}
 */
const BLOCK_SIZE_FEET = (500 / 25.4) / 12; // 1.64042 feet

/**
 * Block size constant in millimeters
 * @const {number}
 */
const BLOCK_SIZE_MM = 500;

/**
 * Calculator namespace for all calculation functions
 */
const Calculator = {

  /**
   * Round a value to the nearest increment, with a minimum value
   * @param {number} value - Value to round
   * @param {number} increment - Increment to round to
   * @param {number} min - Minimum allowed value
   * @returns {number} Rounded value
   */
  roundToDimension(value, increment, min) {
    return Math.max(min, Math.round(value / increment) * increment);
  },

  /**
   * Calculate spare tiles needed based on total tiles
   * @param {number} totalTiles - Total number of tiles in the wall
   * @param {number} sparePercentage - Percentage of spares (8 for Absen/ROE, 10 for Theatrixx)
   * @param {number} factor - Multiplication factor (1.5 for Absen/ROE, 2 for Theatrixx)
   * @returns {number} Number of spare tiles needed
   */
  calculateSpares(totalTiles, sparePercentage, factor) {
    // Calculate spare tiles as percentage
    const sparesPercent = Math.ceil(totalTiles * (sparePercentage / 100));

    // Total with spares
    const total = totalTiles + sparesPercent;

    // Round to multiple of sparePercentage
    const totalMultiple = sparePercentage * Math.round(total / sparePercentage);

    // Calculate actual spares needed
    const totalSpares = totalMultiple - totalTiles;

    // Apply factor if spares are less than 1
    const adjustedSpares = (totalSpares < 1) ?
      Math.ceil(totalTiles * ((sparePercentage / 100) * factor)) :
      totalSpares;

    // Return final spare count
    return (Math.ceil(totalSpares) < 1) ? adjustedSpares : totalSpares;
  },

  /**
   * Calculate tile counts from dimensions (feet)
   * @param {number} widthFeet - Width in feet
   * @param {number} heightFeet - Height in feet
   * @returns {Object} Tile counts {horizontalBlocks, verticalBlocks}
   */
  calculateBlocksFromDimensions(widthFeet, heightFeet) {
    if (isNaN(widthFeet) || isNaN(heightFeet)) {
      return { horizontalBlocks: 0, verticalBlocks: 0 };
    }

    const blockSizeFeet = BLOCK_SIZE_FEET;
    const horizontalBlocks = Math.ceil(widthFeet / blockSizeFeet);
    const verticalBlocks = Math.ceil(heightFeet / blockSizeFeet);

    return { horizontalBlocks, verticalBlocks };
  },

  /**
   * Calculate dimensions (feet) from tile counts
   * @param {number} horizontalBlocks - Number of horizontal tiles
   * @param {number} verticalBlocks - Number of vertical tiles
   * @returns {Object} Dimensions {widthFeet, heightFeet}
   */
  calculateDimensionsFromBlocks(horizontalBlocks, verticalBlocks) {
    const blockSizeFeet = BLOCK_SIZE_FEET;
    const widthFeet = horizontalBlocks * blockSizeFeet;
    const heightFeet = verticalBlocks * blockSizeFeet;

    return { widthFeet, heightFeet };
  },

  /**
   * Calculate tile counts based on aspect ratio selection
   * @param {string} aspectRatio - Aspect ratio (e.g., "16:9", "4:3", "1:1")
   * @param {string} screenSize - Screen size for 1:1 ratios (e.g., "7x7", "10x10")
   * @returns {Object} Tile counts {horizontalBlocks, verticalBlocks}
   */
  calculateBlocksFromAspectRatio(aspectRatio, screenSize = null) {
    let horizontalBlocks, verticalBlocks;

    // Determine tile height based on product type (GP2 Full tiles are 1000mm tall, others are 500mm)
    const productType = document.getElementById('productType')?.value || 'absen';
    const tileWidthFeet = 1.64;
    const tileHeightFeet = (productType === 'ROEGP26Full') ? 3.28 : 1.64;

    // Handle specific screen sizes for certain aspect ratios
    const ratiosWithSizes = ["1:1", "16:9", "32:9", "48:9", "4:3", "2:1", "3:1"];

    if (ratiosWithSizes.includes(aspectRatio) && screenSize) {
      const [width, height] = screenSize.split('x').map(Number);

      // Special case for 7x7
      if (screenSize === "7x7") {
        horizontalBlocks = 5;
        verticalBlocks = (productType === 'ROEGP26Full') ? this.bestGP2FullMix(7) : 5;
      } else {
        horizontalBlocks = Math.round(width / tileWidthFeet);
        verticalBlocks = (productType === 'ROEGP26Full')
          ? this.bestGP2FullMix(height)
          : Math.round(height / tileHeightFeet);
      }

      return { horizontalBlocks, verticalBlocks, height };
    }

    // Calculate from aspect ratio only (no specific size)
    const [width, height] = aspectRatio.split(':').map(Number);
    const baseWidth = 16;
    horizontalBlocks = baseWidth;
    const wallWidthFeet = baseWidth * tileWidthFeet;
    const wallHeightFeet = wallWidthFeet * (height / width);
    verticalBlocks = (productType === 'ROEGP26Full')
      ? this.bestGP2FullMix(wallHeightFeet)
      : Math.round(wallHeightFeet / tileHeightFeet);

    return { horizontalBlocks, verticalBlocks, height: 0 };
  },

  /**
   * Find the best mix of GP2 Full + Half rows to match a target height in feet.
   * Returns a fractional blocksVer value (e.g., 3.5 = 3 Full + 1 Half row).
   * @param {number} targetFeet - Target wall height in feet
   * @returns {number} Optimal blocksVer value (may include .5 for a Half row)
   */
  bestGP2FullMix(targetFeet) {
    const fullHeight = 3.28;  // GP2 Full tile height in feet
    const halfHeight = 1.64;  // GP2 Half tile height in feet

    // Option 1: Full rows only
    const fullOnly = Math.round(targetFeet / fullHeight);
    const fullOnlyActual = fullOnly * fullHeight;

    // Option 2: Best mix of Full + Half (find closest using half-tile granularity)
    const halfUnits = Math.round(targetFeet / halfHeight);
    const mixFullRows = Math.floor(halfUnits / 2);
    const mixHalfRows = halfUnits % 2;  // 0 or 1
    const mixActual = mixFullRows * fullHeight + mixHalfRows * halfHeight;

    // Pick whichever is closer to target
    if (Math.abs(mixActual - targetFeet) < Math.abs(fullOnlyActual - targetFeet)) {
      return mixFullRows + (mixHalfRows * 0.5);
    }
    return fullOnly;
  },

  /**
   * Check if height exceeds limits for ground support
   * @param {string} productType - Product type
   * @param {number} verticalBlocks - Number of vertical tiles
   * @returns {Object} Warning info {exceedsLimit, maxTiles, message}
   */
  checkHeightLimit(productType, verticalBlocks) {
    const maxTiles = {
      'absen': 11,
      'BP2B1': 13,
      'BP2B2': 13,
      'BP2V2': 13,
      'theatrixx': 13,
      'ROEGP26Full': 7,
      'ROEGP26Half': 13
    };

    const limit = maxTiles[productType] || 13;
    const exceedsLimit = verticalBlocks > limit;

    return {
      exceedsLimit,
      maxTiles: limit,
      message: exceedsLimit ? '***EXCEEDS LIMIT, MUST FLY***' : ''
    };
  },

  /**
   * Calculate total tiles and spares for a wall configuration
   * @param {Object} config - Wall configuration
   * @param {number} config.horizontalBlocks - Horizontal tile count
   * @param {number} config.verticalBlocks - Vertical tile count
   * @param {string} config.productType - Product type
   * @returns {Object} Totals {totalTiles, totalSpares, totalTilesWithSpares}
   */
  calculateWallTotals(config) {
    const { horizontalBlocks, verticalBlocks, productType } = config;

    const totalTiles = horizontalBlocks * verticalBlocks;

    // Determine spare percentage and factor based on product
    const sparePercentage = productType === "theatrixx" ? 10 : 8;
    const factor = productType === "theatrixx" ? 2 : 1.5;

    const totalSpares = this.calculateSpares(totalTiles, sparePercentage, factor);
    const totalTilesWithSpares = totalSpares + totalTiles;

    return {
      totalTiles,
      totalSpares,
      totalTilesWithSpares
    };
  },

  /**
   * Calculate tile / spare totals for a wall using the product-specific spare rules.
   *
   * This is the single source of truth for tile counts. Both the main equipment
   * list (generateWall) and the per-screen multi-screen lists
   * (ExportManager.getEquipmentForScreen) must use it so the two always agree.
   *
   * Spare rules by product:
   *  - ROEGP26Full : ships in packages of 6, always add one full spare case
   *  - ROEGP26Half : percentage formula rounded to a multiple of 12
   *  - theatrixx   : percentage formula, 10% / factor 2
   *  - everything else (absen, BP2*) : percentage formula, 8% / factor 1.5
   *
   * @param {Object} config
   * @param {string} config.productType - Product type
   * @param {number} config.totalBlocks - Active (non-spare) tile count
   * @param {number|null} [config.spareOverride] - Manual spare count from the
   *        spare-tiles slider. When provided (not null/undefined) it replaces
   *        the calculated preset.
   * @returns {Object} {totalBlocks, totalSpares, totalBlocksWithSpares, presetSpares}
   */
  calculateTileTotals(config) {
    const { productType, totalBlocks } = config;
    const spareOverride = config.spareOverride;

    let presetSpares;

    if (productType === 'ROEGP26Full') {
      // GP2 Full: packages of 6, always add at least 1 spare case
      const packageSize = 6;
      const activeCases = Math.ceil(totalBlocks / packageSize);
      const totalCases = activeCases + 1; // Guarantee at least 1 spare case
      presetSpares = (totalCases * packageSize) - totalBlocks;
    } else if (productType === 'ROEGP26Half') {
      // GP2 Half: same percentage formula as Black Pearl, rounded to a multiple of 12
      presetSpares = this.calculateSpares(totalBlocks, 12, 1.5);
    } else {
      // Black Pearl, Absen, Theatrixx, etc.
      presetSpares = this.calculateSpares(
        totalBlocks,
        productType === 'theatrixx' ? 10 : 8,
        productType === 'theatrixx' ? 2 : 1.5
      );
    }

    const totalSpares = (spareOverride !== null && spareOverride !== undefined)
      ? spareOverride
      : presetSpares;

    return {
      totalBlocks,
      totalSpares,
      totalBlocksWithSpares: totalBlocks + totalSpares,
      presetSpares
    };
  },

  /**
   * Calculate ROE Graphite Mix tile / spare totals (separate Half and Full pools).
   * Shared by generateWall() and the multi-screen per-screen equipment builder.
   *
   * @param {Object} config
   * @param {number} config.halfHorizontal - Half-tile columns
   * @param {number} config.halfVertical - Half-tile rows
   * @param {number} config.fullHorizontal - Full-tile columns
   * @param {number} config.fullVertical - Full-tile rows
   * @param {number|null} [config.halfSpareOverride] - Manual Half spare count
   * @param {number|null} [config.fullSpareOverride] - Manual Full spare count
   * @returns {Object} graphiteMixData shaped exactly as equipment.js expects
   */
  calculateGraphiteMixTotals(config) {
    const halfHorizontal = config.halfHorizontal || 0;
    const halfVertical = config.halfVertical || 0;
    const fullHorizontal = config.fullHorizontal || 0;
    const fullVertical = config.fullVertical || 0;

    const halfTiles = halfHorizontal * halfVertical;
    const fullTiles = fullHorizontal * fullVertical;

    // GP2 Half: percentage formula rounded to a multiple of 12
    let presetHalfSpares = 0;
    if (halfTiles > 0) {
      presetHalfSpares = this.calculateSpares(halfTiles, 12, 1.5);
    }

    // GP2 Full: packages of 6, always add at least 1 spare case
    let presetFullSpares = 0;
    if (fullTiles > 0) {
      const fullPackageSize = 6;
      const fullActiveCases = Math.ceil(fullTiles / fullPackageSize);
      presetFullSpares = ((fullActiveCases + 1) * fullPackageSize) - fullTiles;
    }

    const halfOverride = config.halfSpareOverride;
    const fullOverride = config.fullSpareOverride;

    const halfSpares = (halfTiles > 0 && halfOverride !== null && halfOverride !== undefined)
      ? halfOverride
      : presetHalfSpares;
    const fullSpares = (fullTiles > 0 && fullOverride !== null && fullOverride !== undefined)
      ? fullOverride
      : presetFullSpares;

    return {
      halfHorizontal,
      halfVertical,
      fullHorizontal,
      fullVertical,
      halfTiles,
      fullTiles,
      halfSpares,
      fullSpares,
      halfTilesWithSpares: halfTiles + halfSpares,
      fullTilesWithSpares: fullTiles + fullSpares,
      presetHalfSpares,
      presetFullSpares
    };
  },

  /**
   * Calculate 208v circuits needed for power distribution
   * @param {string} productType - Product type
   * @param {number} totalTiles - Total number of tiles
   * @returns {number} Number of 208v circuits needed
   */
  calculate208Circuits(productType, totalTiles) {
    let ampsRequired;
    let maxAmpsPerCircuit = 20; // Default for most products

    switch (productType) {
      case 'absen':
        ampsRequired = totalTiles * 0.923;
        break;
      case 'BP2B1':
      case 'BP2B2':
      case 'BP2V2':
        ampsRequired = (totalTiles * 190) / 208;
        break;
      case 'theatrixx':
        ampsRequired = totalTiles * 1.27403;
        break;
      case 'ROEGP26Full':
        // GP2 Full: 250W per panel at 208V
        // Max 10 panels per circuit (12.02A, matches equipment.js logic)
        ampsRequired = (totalTiles * 250) / 208;
        maxAmpsPerCircuit = 12.02; // 10 panels worth
        break;
      case 'ROEGP26Half':
        // GP2 Half: 160W per panel at 208V
        ampsRequired = (totalTiles * 160) / 208;
        break;
      default:
        ampsRequired = 0;
    }

    // Each circuit can handle approximately 15-20 amps (varies by product)
    const circuitsNeeded = Math.ceil(ampsRequired / maxAmpsPerCircuit);

    return circuitsNeeded;
  }
};

/**
 * Generate wall configuration from current UI state
 * This is the main orchestration function that coordinates all calculations
 * @returns {Object} Complete wall configuration
 */
function generateWallConfiguration() {
  // Get product type
  const productType = document.getElementById('productType')?.value || 'absen';
  console.log('🎯 generateWallConfiguration - productType:', productType);

  // Get input mode
  const isDimensionInput = document.getElementById('dimensionInput')?.checked || false;

  let horizontalBlocks, verticalBlocks;

  if (isDimensionInput) {
    // Calculate from dimensions
    const widthFeet = parseFloat(document.getElementById('widthFeet')?.value || 0);
    const heightFeet = parseFloat(document.getElementById('heightFeet')?.value || 0);

    const blocks = Calculator.calculateBlocksFromDimensions(widthFeet, heightFeet);
    horizontalBlocks = blocks.horizontalBlocks;
    verticalBlocks = blocks.verticalBlocks;

    // Update block inputs
    const blocksHorInput = document.getElementById('blocksHor');
    const blocksVerInput = document.getElementById('blocksVer');
    if (blocksHorInput) blocksHorInput.value = horizontalBlocks;
    if (blocksVerInput) blocksVerInput.value = verticalBlocks;
  } else {
    // Get from block inputs
    horizontalBlocks = parseInt(document.getElementById('blocksHor')?.value || 0, 10);
    verticalBlocks = parseInt(document.getElementById('blocksVer')?.value || 0, 10);
  }

  // Get support configuration
  const groundSupport = document.getElementById('groundSupport')?.checked || false;
  const groundSupportType = document.getElementById('groundSupportType')?.value || 'Single Base';
  const flownSupport = document.getElementById('flownSupport')?.checked || false;
  const flownSupportType = document.getElementById('flownSupportType')?.value || 'Single Header';

  // Get power configuration
  const powerDistroTypeElement = document.getElementById('powerDistroType');
  const voltage = (powerDistroTypeElement?.value == 110) ? 110 : 208;
  const powerDistro = powerDistroTypeElement?.value || 'Auto';

  // Get wall type
  const wallTypeElement = document.querySelector('input[name="wallType"]:checked');
  const wallType = wallTypeElement ? wallTypeElement.value : 'Flat';

  // Get aspect ratio info
  const aspectRatioDropdown = document.getElementById('popularFormatsDropdown');
  let screenSize = null;
  if (aspectRatioDropdown && aspectRatioDropdown.style.display !== 'none') {
    const aspectRatioValue = document.getElementById('aspectRatio')?.value;
    if (aspectRatioValue === "1:1") {
      screenSize = document.getElementById('screenSize')?.value;
    }
  }

  // Get dummy tiles configuration
  let blankRows = 0;
  if (document.getElementById('dummyTilesCheckbox')?.checked) {
    blankRows = parseInt(document.getElementById('dummyTileCount')?.value || 0, 10) || 1;
  }

  // Get GP2 Half row configuration for GP2 Full
  console.log('📍 About to check GP2 Half checkbox...');
  const gp2HalfCheckboxElement = document.getElementById('gp2HalfCheckbox');
  const gp2HalfCountElement = document.getElementById('gp2HalfCount');
  const gp2HalfPositionElement = document.getElementById('gp2HalfPosition');
  console.log('📍 gp2HalfCheckbox element:', gp2HalfCheckboxElement);
  console.log('📍 gp2HalfCheckbox checked?:', gp2HalfCheckboxElement?.checked);
  console.log('📍 gp2HalfCount element:', gp2HalfCountElement);
  console.log('📍 gp2HalfCount value:', gp2HalfCountElement?.value);
  console.log('📍 gp2HalfPosition value:', gp2HalfPositionElement?.value);

  let gp2HalfBottomRow = false;
  let gp2HalfRows = 0;
  let gp2HalfPosition = 'bottom';
  if (gp2HalfCheckboxElement?.checked) {
    gp2HalfBottomRow = true;
    gp2HalfRows = parseInt(gp2HalfCountElement?.value || 1, 10);
    gp2HalfPosition = gp2HalfPositionElement?.value || 'bottom';
    console.log('✅ GP2 Half checkbox CHECKED - rows:', gp2HalfRows, 'position:', gp2HalfPosition);
  } else {
    console.log('❌ GP2 Half checkbox NOT checked');
  }

  // For GP2 Full with GP2 Half bottom rows, add those rows to vertical count for wall dimensions
  let totalVerticalBlocks = verticalBlocks;
  if (productType === 'ROEGP26Full' && gp2HalfBottomRow) {
    // Each GP2 Half row is 0.5m, each GP2 Full row is 1.0m
    // So 2 GP2 Half rows = 1 GP2 Full row equivalent
    totalVerticalBlocks = verticalBlocks + Math.ceil(gp2HalfRows / 2);
    console.log('GP2 Full with GP2 Half - original vertical:', verticalBlocks, 'total vertical:', totalVerticalBlocks);
  }

  // Calculate totals
  const totals = Calculator.calculateWallTotals({
    horizontalBlocks,
    verticalBlocks,
    productType
  });

  // Return complete configuration
  return {
    productType,
    blocksHor: horizontalBlocks,
    blocksVer: totalVerticalBlocks, // Use total including GP2 Half rows for display
    totalBlocks: totals.totalTiles,
    totalSpares: totals.totalSpares,
    totalBlocksWithSpares: totals.totalTilesWithSpares,
    groundSupport,
    groundSupportType,
    flownSupport,
    flownSupportType,
    voltage,
    wallType,
    screenSize,
    powerDistro,
    powerDistroType: powerDistro,
    blankRows,
    gp2HalfBottomRow,
    gp2HalfRows,
    gp2HalfPosition,
    gp2FullVerticalBlocks: verticalBlocks // Original GP2 Full vertical blocks (not including GP2 Half)
  };
}

/**
 * Update block inputs when dimensions change
 * @param {HTMLInputElement} input - The dimension input that changed
 */
function handleDimensionInput(input) {
  const widthFeet = parseFloat(document.getElementById('widthFeet')?.value || 0);
  const heightFeet = parseFloat(document.getElementById('heightFeet')?.value || 0);

  const blocks = Calculator.calculateBlocksFromDimensions(widthFeet, heightFeet);

  const blocksHorInput = document.getElementById('blocksHor');
  const blocksVerInput = document.getElementById('blocksVer');

  if (blocksHorInput) blocksHorInput.value = blocks.horizontalBlocks;
  if (blocksVerInput) blocksVerInput.value = blocks.verticalBlocks;

  // Trigger wall update
  if (typeof updateWarning === 'function') updateWarning();
  if (typeof generateWall === 'function') generateWall();
}

/**
 * Update dimension inputs when blocks change
 */
function handleBlockInput() {
  const horizontalBlocks = parseInt(document.getElementById('blocksHor')?.value || 0, 10);
  const verticalBlocks = parseInt(document.getElementById('blocksVer')?.value || 0, 10);

  const dimensions = Calculator.calculateDimensionsFromBlocks(horizontalBlocks, verticalBlocks);

  const widthFeetInput = document.getElementById('widthFeet');
  const heightFeetInput = document.getElementById('heightFeet');

  if (widthFeetInput) widthFeetInput.value = dimensions.widthFeet.toFixed(2);
  if (heightFeetInput) heightFeetInput.value = dimensions.heightFeet.toFixed(2);

  // Trigger wall update
  if (typeof updateWarning === 'function') updateWarning();
  if (typeof generateWall === 'function') generateWall();
}

/**
 * Update blocks based on aspect ratio selection
 */
function updateBlocksFromAspectRatio() {
  const aspectRatio = document.getElementById('aspectRatio')?.value;
  const screenSize = document.getElementById('screenSize')?.value;

  if (!aspectRatio) return;

  const blocks = Calculator.calculateBlocksFromAspectRatio(aspectRatio, screenSize);

  const blocksHorInput = document.getElementById('blocksHor');
  const blocksVerInput = document.getElementById('blocksVer');

  if (blocksHorInput) blocksHorInput.value = blocks.horizontalBlocks;
  if (blocksVerInput) blocksVerInput.value = blocks.verticalBlocks;

  // Update height warning if applicable (only for ground support)
  const flownSupportCheckbox = document.getElementById('flownSupport');
  if (blocks.height > 18.4 && !flownSupportCheckbox?.checked) {
    const warningElement = document.getElementById('blockVerticalWarning');
    if (warningElement) {
      warningElement.textContent = '***EXCEEDS LIMIT, MUST FLY***';
    }
  }

  // Update dimensions from new block counts
  handleBlockInput();
}

/**
 * Display 208v circuits needed
 * Shows information about power circuit requirements
 */
function display208CircuitsNeeded() {
  const powerDistro = document.getElementById('powerDistroType')?.value;
  const productType = document.getElementById('productType')?.value;
  const circuitsInfoDiv = document.getElementById('circuitsInfo');

  if (!circuitsInfoDiv) return;

  const validProducts = ['absen', 'BP2B1', 'BP2B2', 'BP2V2', 'theatrixx'];

  if (validProducts.includes(productType) && powerDistro === 'Auto') {
    const horizontalBlocks = parseInt(document.getElementById('blocksHor')?.value || 0, 10);
    const verticalBlocks = parseInt(document.getElementById('blocksVer')?.value || 0, 10);
    const totalTiles = horizontalBlocks * verticalBlocks;

    const circuitsNeeded = Calculator.calculate208Circuits(productType, totalTiles);

    circuitsInfoDiv.innerHTML = `
      <div style="margin-top: 10px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
        <strong>208V Circuits Required:</strong> ${circuitsNeeded}
      </div>
    `;
    circuitsInfoDiv.style.display = 'block';
  } else {
    circuitsInfoDiv.style.display = 'none';
  }
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.Calculator = Calculator;
  window.generateWallConfiguration = generateWallConfiguration;
  window.generateWall = generateWallConfiguration; // Alias for backward compatibility
  window.handleDimensionInput = handleDimensionInput;
  window.handleBlockInput = handleBlockInput;
  window.updateBlocksFromAspectRatio = updateBlocksFromAspectRatio;
  window.display208CircuitsNeeded = display208CircuitsNeeded;

  // Backward compatibility aliases
  window.calcSpares = Calculator.calculateSpares;
  window.calculateBlocks = handleDimensionInput;
  window.updateDimensionsFromBlocks = handleBlockInput;
  window.updateBlocksBasedOnSelection = updateBlocksFromAspectRatio;
  window.roundToDimension = Calculator.roundToDimension;

  // Export constants for backward compatibility
  window.BLOCK_SIZE_FEET = BLOCK_SIZE_FEET;
  window.BLOCK_SIZE_MM = BLOCK_SIZE_MM;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Calculator,
    generateWallConfiguration,
    handleDimensionInput,
    handleBlockInput,
    updateBlocksFromAspectRatio,
    display208CircuitsNeeded
  };
}
