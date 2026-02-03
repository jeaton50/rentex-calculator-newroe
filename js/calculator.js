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

    // Handle specific screen sizes for certain aspect ratios
    const ratiosWithSizes = ["1:1", "16:9", "32:9", "48:9", "4:3", "2:1", "3:1"];

    if (ratiosWithSizes.includes(aspectRatio) && screenSize) {
      const [width, height] = screenSize.split('x').map(Number);

      // Special case for 7x7
      if (screenSize === "7x7") {
        horizontalBlocks = verticalBlocks = 5;
      } else {
        horizontalBlocks = Math.round(width / 1.64);
        verticalBlocks = Math.round(height / 1.64);
      }

      return { horizontalBlocks, verticalBlocks, height };
    }

    // Calculate from aspect ratio
    const [width, height] = aspectRatio.split(':').map(Number);
    const baseWidth = 16;
    horizontalBlocks = baseWidth;
    verticalBlocks = Math.round((height / width) * baseWidth);

    return { horizontalBlocks, verticalBlocks, height: 0 };
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

  // Update height warning if applicable
  if (blocks.height > 18.4) {
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
