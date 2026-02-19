// Main application logic extracted from index.html

// --- Part 1: Configuration & UI Logic (from #configContainer) ---

function updateTableRowColor(productType) {
  let newColor;

  switch (productType) {
    case "absen":
      newColor = "#ffecec"; // light red
      break;
    case "BP2B1":
      newColor = "#ecf7ff"; // light blue
      break;
    case "BP2B2":
      newColor = "#eaffec"; // light green
      break;
    case "BP2V2":
      newColor = "#fdf7e7"; // light yellow
      break;
    case "theatrixx":
      newColor = "#f3eaff"; // light purple
      break;
    case "ROEGP26Full":
      newColor = "#ffe5f0"; // light pink
      break;
    case "ROEGP26Half":
      newColor = "#fff0e5"; // light peach
      break;
    default:
      newColor = "#ffecec"; // fallback
  }

  const styleEl = document.getElementById("dynamicTableStyle");
  if (styleEl) {
    styleEl.textContent = `
      #equipmentTable tbody tr:nth-child(even) {
        background-color: ${newColor};
      }
    `;
  }
}

// Function to update wall type alert for GP2 Full
function updateWallTypeAlert(productType) {
  const curvedMessageDiv = document.getElementById('curvedMessage');
  const wallTypeElement = document.querySelector('input[name="wallType"]:checked');
  const wallType = wallTypeElement ? wallTypeElement.value : 'Flat';

  if (productType === 'ROEGP26Full' && wallType === 'Concave') {
    curvedMessageDiv.textContent = 'Concave 5°';
    curvedMessageDiv.style.display = 'block';
  } else if (productType === 'ROEGP26Full' && wallType === 'Convex') {
    curvedMessageDiv.textContent = 'Convex 5°';
    curvedMessageDiv.style.display = 'block';
  } else {
    curvedMessageDiv.style.display = 'none';
  }
}

// Function to enforce vertical tile limits for specific products
function updateVerticalBlocksLimit(productType) {
  const blocksVerInput = document.getElementById('blocksVer');
  if (!blocksVerInput) return;

  // Remove any existing listener to prevent duplicates
  if (blocksVerInput._limitListener) {
    blocksVerInput.removeEventListener('input', blocksVerInput._limitListener);
    blocksVerInput._limitListener = null;
  }

  let maxTiles = null;
  let productName = '';

  if (productType === 'ROEGP26Full') {
    // Check if flown support is selected
    const flownSupport = document.getElementById('flownSupport')?.checked;
    if (flownSupport) {
      maxTiles = 12; // GP2 Full flown support: max 12 tiles high
    } else {
      maxTiles = 6; // GP2 Full ground support: max 6 tiles high
    }
    productName = 'GP2 Full';
  } else if (productType === 'absen') {
    const flownSupport = document.getElementById('flownSupport')?.checked;
    if (flownSupport) {
      maxTiles = 20; // Absen flown support: max 20 tiles high
    } else {
      maxTiles = 10; // Absen ground support: max 10 tiles high
    }
    productName = 'Absen';
  } else if (productType === 'BP2B1' || productType === 'BP2B2' || productType === 'BP2V2') {
    const flownSupport = document.getElementById('flownSupport')?.checked;
    if (flownSupport) {
      maxTiles = 20; // Black Pearl flown support: max 20 tiles high
    } else {
      maxTiles = 12; // Black Pearl ground support: max 12 tiles high
    }
    productName = 'Black Pearl';
  } else if (productType === 'theatrixx') {
    const flownSupport = document.getElementById('flownSupport')?.checked;
    if (flownSupport) {
      maxTiles = 20; // Theatrixx flown support: max 20 tiles high
    } else {
      maxTiles = 12; // Theatrixx ground support: max 12 tiles high
    }
    productName = 'Theatrixx';
  }

  if (maxTiles !== null) {
    blocksVerInput.setAttribute('max', maxTiles.toString());

    // Add input listener to enforce range
    const listener = function() {
      const value = parseInt(this.value, 10);
      if (isNaN(value) || value < 1) {
        this.value = '1';
      } else if (value > maxTiles) {
        // Show warning popup only for Absen (GP2 Full uses text warning in UI)
        if (productType === 'absen') {
          alert('Warning: ' + productName + ' walls are limited to ' + maxTiles + ' tiles high maximum.');
        }
        this.value = maxTiles.toString();
      }
    };

    blocksVerInput._limitListener = listener;
    blocksVerInput.addEventListener('input', listener);

    // If current value exceeds limit, cap it and show warning
    if (parseInt(blocksVerInput.value, 10) > maxTiles) {
      if (productType === 'absen') {
        alert('Warning: ' + productName + ' walls are limited to ' + maxTiles + ' tiles high maximum. Height has been capped.');
      }
      blocksVerInput.value = maxTiles.toString();
      blocksVerInput.dispatchEvent(new Event('input'));
    }
  } else {
    // Remove max limit for other products
    blocksVerInput.removeAttribute('max');
  }
}

// Function to enforce height dimension limits for specific products
function updateHeightDimensionLimit(productType) {
  const heightFeetInput = document.getElementById('heightFeet');
  if (!heightFeetInput) {
    console.log('updateHeightDimensionLimit: heightFeet input not found');
    return;
  }

  // Remove any existing listener to prevent duplicates
  if (heightFeetInput._limitListener) {
    heightFeetInput.removeEventListener('input', heightFeetInput._limitListener);
    heightFeetInput._limitListener = null;
  }

  let maxHeightFeet = null;
  let productName = '';

  if (productType === 'ROEGP26Full') {
    maxHeightFeet = 19.68; // GP2 Full: 6 tiles × 3.28' = 19.68 feet
    productName = 'GP2 Full';
  } else if (productType === 'absen') {
    maxHeightFeet = 16.4; // Absen: 10 tiles × 1.64' = 16.4 feet
    productName = 'Absen';
  } else if (productType === 'BP2B1' || productType === 'BP2B2' || productType === 'BP2V2') {
    maxHeightFeet = 19.68; // Black Pearl: 12 tiles × 1.64' = 19.68 feet
    productName = 'Black Pearl';
  } else if (productType === 'theatrixx') {
    maxHeightFeet = 19.68; // Theatrixx: 12 tiles × 1.64' = 19.68 feet
    productName = 'Theatrixx';
  }

  if (maxHeightFeet !== null) {
    heightFeetInput.setAttribute('max', maxHeightFeet.toString());

    // Add input listener to enforce range
    const listener = function() {
      const value = parseFloat(this.value);
      if (isNaN(value) || value < 0) {
        this.value = '0';
      } else if (value > maxHeightFeet) {
        // Show warning popup only for Absen (GP2 Full uses text warning in UI)
        if (productType === 'absen') {
          alert('Warning: ' + productName + ' walls are limited to ' + maxHeightFeet + ' feet high maximum.');
        }
        this.value = maxHeightFeet.toString();
      }
    };

    heightFeetInput._limitListener = listener;
    heightFeetInput.addEventListener('input', listener);

    // If current value exceeds limit, cap it and show warning
    const currentValue = parseFloat(heightFeetInput.value);
    if (currentValue > maxHeightFeet) {
      if (productType === 'absen') {
        alert('Warning: ' + productName + ' walls are limited to ' + maxHeightFeet + ' feet high maximum. Height has been capped.');
      }
      heightFeetInput.value = maxHeightFeet.toString();
      heightFeetInput.dispatchEvent(new Event('input'));
    }
  } else {
    // Remove max limit for other products
    heightFeetInput.removeAttribute('max');
  }
}

// --- Part 2: Main Logic (from end of body) ---

// Define initial zoom level and global variables
window.currentZoomLevel = 1;

window.showNumbers = false;
window.showWiring = false;
window.wiringDirection = 'horizontal';
window.wiringStartPosition = 'bottom-left';
window.showPower = false;
window.powerDirection = 'horizontal';
window.powerStartPosition = 'bottom-left';
var totalWeight = 0;
let hasChecked = false;

// Flags for preventing recursive updates
let isUpdatingDimensions = false;
let isUpdatingBlocks = false;

// Spinner control variables
let spinnerTimeout = null;
let isSpinnerVisible = false;

// Preload the block image
let blockImage = new Image();
blockImage.src = 'static/images/block.png';
blockImage.onload = () => { console.log('Block image loaded successfully.'); };
blockImage.onerror = () => {
  console.error('Failed to load the block image.');
  // alert('Error: Unable to load the block image. Please check the image path and try again.'); // annoying on load
};

// Wall background image - this will be stretched across the entire wall
window.wallBackgroundImage = new Image();
window.wallBackgroundImage.src = 'static/images/wall_background.png';
window.wallBackgroundImage.onload = () => { console.log('Wall background image loaded successfully.'); };
window.wallBackgroundImage.onerror = () => {
  console.error('Failed to load the wall background image.');
  console.log('Will use block image as fallback.');
};

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Wrapper function - calls Calculator module
function handleDimensionInput(input) {
  const widthFeet = parseFloat(document.getElementById('widthFeet')?.value || 0);
  const heightFeet = parseFloat(document.getElementById('heightFeet')?.value || 0);

  if (typeof Calculator !== 'undefined' && Calculator.calculateBlocksFromDimensions) {
    const blocks = Calculator.calculateBlocksFromDimensions(widthFeet, heightFeet);
    const blocksHorInput = document.getElementById('blocksHor');
    const blocksVerInput = document.getElementById('blocksVer');
    if (blocksHorInput) blocksHorInput.value = blocks.horizontalBlocks;
    if (blocksVerInput) blocksVerInput.value = blocks.verticalBlocks;
  }

  if (typeof UI !== 'undefined' && UI.updateWarning) {
    UI.updateWarning();
  }
  if (typeof generateWall === 'function') {
    generateWall();
  }
}

function handleArrowKeys(e, input) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const increment = e.key === 'ArrowUp' ? BLOCK_SIZE_FEET : -BLOCK_SIZE_FEET;
    incrementDimension(input, increment);
  }
}

// Wrapper function - uses Calculator module
function incrementDimension(input, increment) {
  const currentValue = parseFloat(input.value);
  if (!isNaN(currentValue) && typeof Calculator !== 'undefined') {
    const newValue = Calculator.roundToDimension(currentValue + increment, BLOCK_SIZE_FEET, BLOCK_SIZE_FEET);
    input.value = newValue.toFixed(2);
    handleDimensionInput(input);
  }
}

function updateDimensionsFromBlocks() {
  updateWarning();
  generateWall();
  isUpdatingDimensions = false;
}

function updateWall() {
  handleWallTypeChange();
  updateDimensionsFromBlocks();
  updateWarning();
}

function generateWall() {
  const productType = document.getElementById('productType').value;
  let blocksHor, blocksVer;
  var widthAsFeet = document.getElementById('widthFeet').value;
  var heightAsFeet = document.getElementById('heightFeet').value;
  let radioButton = document.getElementById("dimensionInput");

  if (radioButton.checked) {
    // Convert dimensions to tiles based on product type
    let tileWidthFeet, tileHeightFeet;

    if (productType === 'ROEGP26Full') {
      tileWidthFeet = 1.64;  // 500mm
      tileHeightFeet = 3.28; // 1000mm (GP2 Full is rectangular!)
    } else if (productType === 'ROEGP26Half') {
      tileWidthFeet = 1.64;  // 500mm
      tileHeightFeet = 1.64; // 500mm (GP2 Half is square)
    } else {
      // Black Pearl, Theatrixx, Absen (all square tiles)
      tileWidthFeet = 1.64;
      tileHeightFeet = 1.64;
    }

    const calculatedHor = widthAsFeet / tileWidthFeet;
    const calculatedVer = heightAsFeet / tileHeightFeet;

    // For GP2 Full, round to nearest 0.5 to support fractional input (e.g., 4.5)
    // For other products, round to nearest whole number
    if (productType === 'ROEGP26Full') {
      document.getElementById('blocksHor').value = Math.round(calculatedHor);
      document.getElementById('blocksVer').value = Math.round(calculatedVer * 2) / 2; // Round to nearest 0.5
    } else {
      document.getElementById('blocksHor').value = Math.round(calculatedHor);
      document.getElementById('blocksVer').value = Math.round(calculatedVer);
    }
  }

  blocksHor = parseInt(document.getElementById('blocksHor').value, 10);

  // Parse blocksVer as float to detect fractional values (e.g., 4.5)
  const blocksVerRaw = parseFloat(document.getElementById('blocksVer').value);
  blocksVer = Math.floor(blocksVerRaw); // Get whole number part

  // Detect if fractional input is being used for GP2 Full (e.g., 4.5 means 4 Full + 1 Half row)
  const hasFractionalInput = (blocksVerRaw % 1) !== 0;
  let autoGp2HalfRows = 0;

  if (hasFractionalInput && productType === 'ROEGP26Full') {
    // Extract fractional part (e.g., 0.5 from 4.5)
    const fractionalPart = blocksVerRaw % 1;

    // Convert fractional part to GP2 Half rows
    // 0.5 = 1 Half row (since 2 Half rows = 1 Full row height)
    // 1.0 = 2 Half rows, 1.5 = 3 Half rows, etc.
    autoGp2HalfRows = Math.round(fractionalPart * 2);
  }

  const groundSupport = document.getElementById('groundSupport').checked;
  const groundSupportTypeElement = document.getElementById('groundSupportType');
  const groundSupportType = groundSupportTypeElement ? groundSupportTypeElement.value : null;
  const flownSupport = document.getElementById('flownSupport').checked;
  const flownSupportTypeElement = document.getElementById('flownSupportType');
  const flownSupportType = flownSupportTypeElement ? flownSupportTypeElement.value : null;
  const powerDistro = document.getElementById('powerDistroType').value;
  var voltage = (powerDistro == 110) ? 110 : 208;
  const powerDistroType = document.getElementById('powerDistroType').value; // Duplicate but consistent
  const wallTypeElement = document.querySelector('input[name="wallType"]:checked');
  const wallType = wallTypeElement ? wallTypeElement.value : 'Flat';
  const aspectRatioDropdown = document.getElementById('popularFormatsDropdown');
  let screenSize = null;
  if (aspectRatioDropdown.style.display !== 'none') {
    const aspectRatioValue = document.getElementById('aspectRatio').value;
    if (aspectRatioValue === "1:1") {
      screenSize = document.getElementById('screenSize').value;
    }
  }

  // Get dummy tiles configuration
  let blankRows = 0;
  if (document.getElementById('dummyTilesCheckbox')?.checked) {
    blankRows = parseInt(document.getElementById('dummyTileCount')?.value || 0, 10) || 1;
  }

  // Get GP2 Half configuration for GP2 Full
  // Two sources: 1) Auto-detected from fractional input (always top), 2) Manual checkbox (user-specified position)
  let gp2HalfAutoRows = 0; // Auto-detected from fractional input (always at top)
  let gp2HalfManualRows = 0; // Manual checkbox (position specified by user)
  let gp2HalfManualPosition = 'bottom';
  let gp2FullVerticalBlocks = blocksVer; // Store original input vertical blocks

  // For dimension display: use original fractional value if fractional input detected
  let displayBlocksVer = hasFractionalInput ? blocksVerRaw : blocksVer;

  // Check if GP2 Half is enabled via fractional input (auto-detection - always at top)
  if (hasFractionalInput && autoGp2HalfRows > 0 && productType === 'ROEGP26Full') {
    gp2HalfAutoRows = autoGp2HalfRows;

    // Fractional input: 4.5 means 4 Full + 1 Half (not replacement, additive)
    // blocksVer is already floored to the number of Full rows we want
    gp2FullVerticalBlocks = blocksVer;
    console.log('✅ Fractional input detected - auto GP2 Half rows at TOP:', gp2HalfAutoRows);
  }

  // Check if GP2 Half is enabled via manual checkbox (additive to fractional input)
  const gp2HalfCheckboxElement = document.getElementById('gp2HalfCheckbox');
  const gp2HalfCountElement = document.getElementById('gp2HalfCount');
  const gp2HalfPositionElement = document.getElementById('gp2HalfPosition');

  if (gp2HalfCheckboxElement?.checked && productType === 'ROEGP26Full') {
    gp2HalfManualRows = parseInt(gp2HalfCountElement?.value || 1, 10);
    gp2HalfManualPosition = gp2HalfPositionElement?.value || 'bottom';

    console.log('✅ Manual GP2 Half checkbox CHECKED in generateWall() - rows:', gp2HalfManualRows, 'position:', gp2HalfManualPosition);

    // Update display blocks to show combined height (both auto and manual)
    displayBlocksVer = blocksVer + (gp2HalfAutoRows / 2) + (gp2HalfManualRows / 2);
  }

  // Legacy compatibility: if either auto or manual Half rows exist
  const gp2HalfBottomRow = (gp2HalfAutoRows > 0) || (gp2HalfManualRows > 0);
  const gp2HalfRows = gp2HalfAutoRows + gp2HalfManualRows; // Total for equipment calculations

  // Check if ROE Graphite Mix mode is enabled
  const roeGraphiteMixEnabled = document.getElementById('roeGraphicMix')?.checked || false;
  let graphiteMixData = null;

  // Calculate total blocks, spares, etc.
  var totalBlocks, totalSpares, totalBlocksWithSpares;

  if (roeGraphiteMixEnabled) {
    // ROE Graphite Mix mode: calculate spares separately for Half and Full tiles
    const halfHorizontal = parseInt(document.getElementById('halfHorizontal')?.value || 0, 10);
    const halfVertical = parseInt(document.getElementById('halfVertical')?.value || 0, 10);
    const fullHorizontal = parseInt(document.getElementById('fullHorizontal')?.value || 0, 10);
    const fullVertical = parseInt(document.getElementById('fullVertical')?.value || 0, 10);

    const halfTiles = halfHorizontal * halfVertical;
    const fullTiles = fullHorizontal * fullVertical;

    // Calculate spares for each type (round up to next full case)
    // GP2 Half: packages of 12
    const halfPackageSize = 12;
    let halfTilesWithSpares = 0;
    let halfSpares = 0;
    if (halfTiles > 0) {
      const halfTotalCases = Math.ceil(halfTiles / halfPackageSize);
      halfTilesWithSpares = halfTotalCases * halfPackageSize;
      halfSpares = halfTilesWithSpares - halfTiles;
    }

    // GP2 Full: packages of 6
    const fullPackageSize = 6;
    let fullTilesWithSpares = 0;
    let fullSpares = 0;
    if (fullTiles > 0) {
      const fullTotalCases = Math.ceil(fullTiles / fullPackageSize);
      fullTilesWithSpares = fullTotalCases * fullPackageSize;
      fullSpares = fullTilesWithSpares - fullTiles;
    }

    // Store Graphite Mix data
    graphiteMixData = {
      halfHorizontal,
      halfVertical,
      fullHorizontal,
      fullVertical,
      halfTiles,
      fullTiles,
      halfSpares,
      fullSpares,
      halfTilesWithSpares,
      fullTilesWithSpares
    };

    // For backward compatibility, set total values
    totalBlocks = halfTiles + fullTiles;
    totalSpares = halfSpares + fullSpares;
    totalBlocksWithSpares = totalBlocks + totalSpares;
  } else {
    // Normal mode: standard spare calculation
    // For GP2 Full with GP2 Half enabled, use the reduced Full tile count
    const actualVerticalBlocks = (productType === 'ROEGP26Full' && gp2HalfBottomRow) ? gp2FullVerticalBlocks : blocksVer;
    totalBlocks = blocksHor * actualVerticalBlocks;

    // GP2 products use package-based spare calculation (round up to next full case)
    if (productType === 'ROEGP26Full') {
      // GP2 Full: packages of 6
      const packageSize = 6;
      const totalCases = Math.ceil(totalBlocks / packageSize);
      const roundedTotal = totalCases * packageSize;
      totalSpares = roundedTotal - totalBlocks;
      totalBlocksWithSpares = roundedTotal;
    } else if (productType === 'ROEGP26Half') {
      // GP2 Half: packages of 12
      const packageSize = 12;
      const totalCases = Math.ceil(totalBlocks / packageSize);
      const roundedTotal = totalCases * packageSize;
      totalSpares = roundedTotal - totalBlocks;
      totalBlocksWithSpares = roundedTotal;
    } else {
      // Black Pearl, Theatrixx, etc: use original calcSpares function
      totalSpares = calcSpares(totalBlocks, productType === "theatrixx" ? 10 : 8, productType === "theatrixx" ? 2 : 1.5);
      totalBlocksWithSpares = totalSpares + totalBlocks;
    }
  }

  const requestData = {
    productType,
    blocksHor,
    blocksVer: displayBlocksVer, // Use display blocks for dimensions
    totalBlocks,
    totalSpares,
    totalBlocksWithSpares,
    groundSupport,
    groundSupportType,
    flownSupport,
    flownSupportType,
    voltage,
    wallType,
    screenSize,
    powerDistro,
    powerDistroType,
    blankRows,
    gp2HalfBottomRow,
    gp2HalfRows,
    gp2HalfAutoRows,
    gp2HalfManualRows,
    gp2HalfManualPosition,
    gp2FullVerticalBlocks, // Reduced GP2 Full blocks (after replacing top rows with Half)
    roeGraphiteMixEnabled,
    graphiteMixData
  };

  // Call module functions (showLoadingSpinner/hideLoadingSpinner removed)
  if (typeof displayEquipment === 'function') {
    displayEquipment(requestData);
  }
  if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.displayWallDimensions) {
    CanvasRenderer.displayWallDimensions(productType);
  }
  if (typeof CanvasRenderer !== 'undefined' && CanvasRenderer.drawWall) {
    const zoom = window.currentZoomLevel || 1;
    const showNumbers = window.showNumbers || false;
    CanvasRenderer.drawWall(requestData, zoom, showNumbers);
  }
  if (typeof display208CircuitsNeeded === 'function') {
    display208CircuitsNeeded();
  }
}

// Preload images
const singleHeaderImage = new Image();
singleHeaderImage.src = 'static/images/single_header.png';
const doubleHeaderImage = new Image();
doubleHeaderImage.src = 'static/images/double_header.png';
const singleBaseImage = new Image();
singleBaseImage.src = 'static/images/single_base.png';
const doubleBaseImage = new Image();
doubleBaseImage.src = 'static/images/double_base.png';

// Generate combined equipment list for all screens
window.generateAllEquipment = function() {
  if (typeof MultiScreenManager !== "undefined" && MultiScreenManager.saveCurrentScreenConfig) {
    MultiScreenManager.saveCurrentScreenConfig();
  }

  const controlsSection = document.getElementById('controls');
  const wallDimensionsSection = document.getElementById('wallDimensions');
  const canvasContainer = document.getElementById('canvasContainer');

  if (controlsSection) controlsSection.style.display = 'none';
  if (wallDimensionsSection) wallDimensionsSection.style.display = 'none';
  if (canvasContainer) canvasContainer.style.display = 'none';

  const tbody = document.querySelector('#equipmentTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const combinedEquipment = {};
  const combinedEquipmentOrder = []; // Track insertion order for natural equipment ordering

  let screenEquipmentContainer = document.getElementById('screenEquipmentContainer');
  if (screenEquipmentContainer) {
    screenEquipmentContainer.remove();
  }

  screenEquipmentContainer = document.createElement('div');
  screenEquipmentContainer.id = 'screenEquipmentContainer';
  screenEquipmentContainer.className = 'screen-equipment-container';
  screenEquipmentContainer.style.width = '100%';

  const containerTitle = document.createElement('h2');
  containerTitle.textContent = 'Combined Equipment List';
  containerTitle.style.textAlign = 'left';
  containerTitle.style.marginBottom = '20px';
  screenEquipmentContainer.appendChild(containerTitle);

  const backButton = document.createElement('button');
  backButton.textContent = 'Back to Equipment Requirements';
  backButton.style.cssText = `
    display: block;
    margin-bottom: 20px;
    padding: 8px 15px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  backButton.onclick = function() {
    const controlsSection = document.getElementById('controls');
    const wallDimensionsSection = document.getElementById('wallDimensions');
    const canvasContainer = document.getElementById('canvasContainer');
    const topSection = document.getElementById('topSection');

    if (controlsSection) controlsSection.style.display = 'block';
    if (wallDimensionsSection) wallDimensionsSection.style.display = 'flex';
    if (canvasContainer) canvasContainer.style.display = 'flex';

    // Reset topSection to original layout
    topSection.style.display = 'flex';
    topSection.style.alignItems = 'flex-start';
    topSection.style.gap = '10px';
    topSection.style.margin = '0px 0';
    topSection.style.flexWrap = '';  // Clear the nowrap setting
    topSection.style.justifyContent = 'flex-start';  // Reset to CSS default

    const screenEquipmentContainer = document.getElementById('screenEquipmentContainer');
    if (screenEquipmentContainer) {
      screenEquipmentContainer.style.display = 'none';
    }

    generateWall();
  };

  // Create summary section
  const summarySectionContainer = document.createElement('div');
  summarySectionContainer.style.cssText = `
    padding: 15px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 5px;
    margin-bottom: 20px;
  `;

  const summaryHeader = document.createElement('h3');
  summaryHeader.textContent = 'Check with LED team to consolidate power and processing';
  summaryHeader.style.cssText = `
    margin-top: 0;
    margin-bottom: 10px;
    color: red;
  `;
  summarySectionContainer.appendChild(summaryHeader);

  const message1 = document.createElement('p');
  message1.textContent = "WDC, Boston, Ft. Lauderdale, Nashville & Phoenix cannot process LED tiles.";
  message1.style.cssText = 'color: red; margin: 5px 0;';
  summarySectionContainer.appendChild(message1);

  const message2 = document.createElement('p');
  message2.textContent = "Reach out to the LED Team for questions about power and processing requirements.";
  message2.style.cssText = 'color: blue; margin: 5px 0 10px 0;';
  summarySectionContainer.appendChild(message2);

  const summaryContent = document.createElement('div');
  summaryContent.id = 'powerWeightSummary';
  summarySectionContainer.appendChild(summaryContent);

  screenEquipmentContainer.appendChild(backButton);
  screenEquipmentContainer.appendChild(summarySectionContainer);

  // Create flex container for screen sections
  const flexContainer = document.createElement('div');
  flexContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: flex-start;
  `;
  screenEquipmentContainer.appendChild(flexContainer);

  let totalCombinedWeight = 0;
  let combinedVoltage = [];
  let combinedAmps = 0;
  let combinedWatts = 0;

  // Loop through each screen and generate its equipment
  window.screenConfigurations.forEach((config, index) => {
    const screenSection = document.createElement('div');
    screenSection.className = 'screen-equipment-section';
    screenSection.style.cssText = `
      flex: 1;
      min-width: 30%;
      max-width: calc(33.33% - 20px);
    `;

    const totalBlocks = config.blocksHor * config.blocksVer;
    const productType = config.productType;
    let voltage = (config.powerDistroType == "110") ? 110 : 208;
    let amps, watts;

    if (productType === "absen") {
      amps = (voltage == 110) ? totalBlocks * 0.59 : totalBlocks * 0.312;
      watts = totalBlocks * 192;
    } else if (productType === "BP2B1" || productType === "BP2B2" || productType === "BP2V2") {
      amps = (voltage == 110) ? (totalBlocks * 95) / 110 : (totalBlocks * 95) / 208;
      watts = totalBlocks * 190;
    } else if (productType === "theatrixx") {
      amps = (voltage == 110) ? totalBlocks * 1.63636 : (totalBlocks * 865.38461) / 1000;
      watts = totalBlocks * 190;
    } else {
      amps = 0;
      watts = 0;
    }

    if (!combinedVoltage.includes(voltage)) {
      combinedVoltage.push(voltage);
    }
    combinedAmps += amps;
    combinedWatts += watts;

    screenSection.innerHTML = `
      <h3>Screen ${config.id} Equipment</h3>
      <div class="screen-power-summary" style="margin-bottom: 15px; padding: 8px; background-color: #f0f0f0; border-radius: 5px;">
        <div><strong>Product Type:</strong> ${productType}</div>
        <div><strong>Dimensions:</strong> ${config.blocksHor} x ${config.blocksVer} tiles</div>
        <div><strong>Size:</strong> ${(config.blocksHor * 1.64).toFixed(2)}' x ${(config.blocksVer * 1.64).toFixed(2)}'</div>
        <div><strong>Voltage:</strong> ${voltage}V</div>
        <div><strong>Amperage:</strong> ${amps.toFixed(2)}A</div>
        <div><strong>Power:</strong> ${watts.toFixed(2)}W</div>
      </div>
    `;

    const screenTable = document.createElement('table');
    screenTable.className = 'equipment-table';
    screenTable.style.width = '100%';
    screenTable.style.fontSize = '12px';
    screenTable.innerHTML = `
      <thead>
        <tr>
          <th>Ecode</th>
          <th>Equipment Name</th>
          <th>Quantity</th>
          <th>Weight (lbs)</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const screenEquipment = getEquipmentForScreen(config);

    const screenTbody = screenTable.querySelector('tbody');
    let screenWeight = 0;

    // Track this screen's keys in order for positional merge
    const screenKeys = [];

    for (const item of screenEquipment) {
      if (item.quantity > 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.ecode || ''}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${(item.weight * item.quantity).toFixed(2)}</td>
        `;
        screenTbody.appendChild(row);
        screenWeight += item.weight * item.quantity;

        // Strip parenthetical info (e.g., "(5 active + 1 spare)") from names for the
        // merge key so package items with different per-screen counts get combined properly
        const baseName = item.name.replace(/\s*\([^)]*\)/g, '').trim();
        const key = `${item.ecode}|${baseName}`;
        screenKeys.push(key);

        if (!combinedEquipment[key]) {
          combinedEquipment[key] = {
            ecode: item.ecode,
            name: baseName,
            quantity: 0,
            weight: item.weight
          };
          // Insert new items at the correct position based on their neighbors
          // in this screen's equipment list (not just appended at end)
          let insertIdx = combinedEquipmentOrder.length; // default: append
          for (let i = screenKeys.length - 2; i >= 0; i--) {
            const prevPos = combinedEquipmentOrder.indexOf(screenKeys[i]);
            if (prevPos !== -1) {
              insertIdx = prevPos + 1;
              break;
            }
          }
          combinedEquipmentOrder.splice(insertIdx, 0, key);
        }
        combinedEquipment[key].quantity = +combinedEquipment[key].quantity + +item.quantity;
      }
    }

    totalCombinedWeight += screenWeight;

    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
      <td colspan="3"><strong>Total Weight:</strong></td>
      <td><strong>${screenWeight.toFixed(2)} lbs</strong></td>
    `;
    screenTbody.appendChild(totalRow);

    screenSection.appendChild(screenTable);
    flexContainer.appendChild(screenSection);
  });

  // Fill in the combined power and weight summary
  const summaryContentDiv = document.getElementById('powerWeightSummary');
  if (summaryContentDiv) {
    summaryContentDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="power-summary">
          <h4 style="margin-top: 0;">Power Requirements</h4>
          <div><strong>Voltage:</strong> ${combinedVoltage.join(', ')}V</div>
          <div><strong>Total Amperage:</strong> ${combinedAmps.toFixed(2)}A</div>
          <div><strong>Total Power:</strong> ${combinedWatts.toFixed(2)}W</div>
        </div>
        <div class="weight-summary">
          <h4 style="margin-top: 0;">Weight Summary</h4>
          <div><strong>Total Equipment Weight:</strong> ${totalCombinedWeight.toFixed(2)} lbs</div>
          <div><strong>Est. Shipping Weight:</strong> ${(totalCombinedWeight * 1.15).toFixed(2)} lbs</div>
        </div>
      </div>
    `;
  }

  // Add combined equipment header
  const combinedHeader = document.createElement('h3');
  combinedHeader.textContent = 'Total Combined Equipment';
  combinedHeader.style.cssText = `
    margin-top: 30px;
    padding: 10px 0;
    border-top: 2px solid #007bff;
    border-bottom: 2px solid #007bff;
    clear: both;
    width: 100%;
    text-align: left;
  `;
  screenEquipmentContainer.appendChild(combinedHeader);

  // Add combine buttons (Combine Distro and Combine Processing)
  const combineButtonsContainer = document.createElement('div');
  combineButtonsContainer.style.cssText = `
    margin-top: 15px;
    margin-bottom: 15px;
    display: flex;
    gap: 15px;
    align-items: center;
  `;

  const combineDistroBtn = document.createElement('button');
  combineDistroBtn.type = 'button';
  combineDistroBtn.textContent = 'Combine Distro';
  combineDistroBtn.style.cssText = `
    padding: 8px 16px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  combineDistroBtn.onclick = () => {
    if (typeof window.showCombineDistroDialog === 'function') {
      window.showCombineDistroDialog();
    }
  };

  const combineProcessingBtn = document.createElement('button');
  combineProcessingBtn.type = 'button';
  combineProcessingBtn.textContent = 'Combine Processing';
  combineProcessingBtn.style.cssText = `
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  combineProcessingBtn.onclick = () => {
    if (typeof window.showCombineProcessingDialog === 'function') {
      window.showCombineProcessingDialog();
    } else {
      console.error('showCombineProcessingDialog is not a function!');
    }
  };

  combineButtonsContainer.appendChild(combineDistroBtn);
  combineButtonsContainer.appendChild(combineProcessingBtn);
  screenEquipmentContainer.appendChild(combineButtonsContainer);

  // Create combined table
  const combinedTable = document.createElement('table');
  combinedTable.className = 'equipment-table';
  combinedTable.style.cssText = 'width: 100%; margin-top: 20px;';
  combinedTable.innerHTML = `
    <thead>
      <tr>
        <th>Ecode</th>
        <th>Equipment Name</th>
        <th>Quantity</th>
        <th>Weight (lbs)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const combinedTbody = combinedTable.querySelector('tbody');

  // Use natural equipment order (tiles → processors → structural → cables → power distro)
  // instead of alphabetical sort, matching the single-screen equipment table order
  const consolidatedEquipment = combinedEquipmentOrder.map(key => combinedEquipment[key]);

  // Add combined equipment to table
  for (const item of consolidatedEquipment) {
    if (item.quantity > 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.ecode || ''}</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${(item.weight * item.quantity).toFixed(2)}</td>
      `;
      combinedTbody.appendChild(row);

      // Also add to original table
      const origRow = document.createElement('tr');
      origRow.innerHTML = row.innerHTML;
      tbody.appendChild(origRow);
    }
  }

  // Add total weight for combined equipment
  const totalCombinedRow = document.createElement('tr');
  totalCombinedRow.className = 'total-row';
  totalCombinedRow.innerHTML = `
    <td colspan="3"><strong>Total Combined Weight:</strong></td>
    <td><strong>${totalCombinedWeight.toFixed(2)} lbs</strong></td>
  `;
  combinedTbody.appendChild(totalCombinedRow);

  screenEquipmentContainer.appendChild(combinedTable);

  // Position the container
  const configContainer = document.getElementById('configContainer');
  const topSection = document.getElementById('topSection');

  if (configContainer && topSection) {
    topSection.style.display = 'flex';
    topSection.style.flexWrap = 'nowrap';
    topSection.style.gap = '20px';
    topSection.style.alignItems = 'flex-start';

    screenEquipmentContainer.style.flex = '1';
    screenEquipmentContainer.style.marginTop = '0';
    screenEquipmentContainer.style.maxWidth = 'calc(100% - 370px)';

    topSection.insertBefore(screenEquipmentContainer, configContainer.nextSibling);
  } else {
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv && controlsDiv.parentNode) {
      controlsDiv.parentNode.insertBefore(screenEquipmentContainer, controlsDiv.nextSibling);
    }
  }

  return totalCombinedWeight;
};

// Display functions for power and weight information
window.displayWallWeight = function(weight) {
  const totalWeightDiv = document.getElementById('totalWallWeight');
  if (!totalWeightDiv) return;
  totalWeightDiv.innerHTML = `<strong>Wall Weight:</strong><br>${weight.toFixed(2)} lbs`;
};

window.displayEstShippingWeight = function(weight) {
  const totalWeightDiv = document.getElementById('totalWeight');
  if (!totalWeightDiv) return;
  totalWeightDiv.innerHTML = `<strong>EST Shipping Weight:</strong><br><div style="text-align: center;">${weight.toFixed(2)} lbs</div>`;
};

window.displayTotalPixels = function(pixels) {
  const totalPixelsDiv = document.getElementById('totalPixels');
  if (!totalPixelsDiv) return;
  totalPixelsDiv.innerHTML = `<strong>Total Pixels:</strong><br>${pixels.toLocaleString()} px`;
};

window.displayTotalPower = function(voltage, amps, watts) {
  const totalPowerDiv = document.getElementById('totalPower');
  if (!totalPowerDiv) return;

  // Check if ROE Graphite Mix (mixed tile) mode is enabled
  const roeGraphiteEnabled = document.getElementById('roeGraphicMix')?.checked || false;

  let powerHTML = '<strong>Average Power Consumption:</strong><br>';

  if (roeGraphiteEnabled) {
    // Get tile counts
    const halfHorizontal = parseInt(document.getElementById('halfHorizontal')?.value || 0, 10);
    const halfVertical = parseInt(document.getElementById('halfVertical')?.value || 0, 10);
    const fullHorizontal = parseInt(document.getElementById('fullHorizontal')?.value || 0, 10);
    const fullVertical = parseInt(document.getElementById('fullVertical')?.value || 0, 10);

    const halfTileCount = halfHorizontal * halfVertical;
    const fullTileCount = fullHorizontal * fullVertical;

    // Calculate individual power specs
    const halfAmps = (voltage === 110) ? halfTileCount * 1.14 : halfTileCount * 0.60;
    const halfWatts = halfTileCount * 125;
    const fullAmps = (voltage === 110) ? fullTileCount * 2.27 : fullTileCount * 1.20;
    const fullWatts = fullTileCount * 250;

    // Display breakdown
    powerHTML += `
      <strong>ROE Graphite Mix Configuration:</strong><br>
      <div style="margin-left: 15px; margin-top: 5px;">
        <strong>Half Tiles (500x500mm):</strong> ${halfTileCount} tiles<br>
        - ${voltage}V: ${halfAmps.toFixed(2)} A, ${halfWatts.toFixed(2)} W<br>
        <strong>Full Tiles (500x1000mm):</strong> ${fullTileCount} tiles<br>
        - ${voltage}V: ${fullAmps.toFixed(2)} A, ${fullWatts.toFixed(2)} W<br>
      </div>
      <strong style="margin-top: 5px; display: block;">Combined Total:</strong><br>
      Voltage: ${voltage}V<br>
      Total Amperage: ${amps.toFixed(2)} A<br>
      Total Max Watts: ${watts.toFixed(2)} W
    `;
  } else {
    // Normal mode - single product
    powerHTML += `
      Voltage: ${voltage}V<br>
      Total Amperage: ${amps.toFixed(2)} A<br>
      Total Max Watts: ${watts.toFixed(2)} W
    `;
  }

  totalPowerDiv.innerHTML = powerHTML;

  // Show 110V circuits if applicable
  if (typeof display110Circuits === 'function') {
    display110Circuits();
  }

  // Show 208V circuits when "Auto" is chosen
  if (typeof display208Circuits === 'function') {
    display208Circuits();
  }
};

window.displayDataPortsNeeded = function(productType, totalTiles, config = {}) {
  const dataPortsDiv = document.getElementById('dataPortsNeeded');
  if (!dataPortsDiv) return;

  const {
    gp2HalfBottomRow = false,
    gp2HalfRows = 0,
    horizontalBlocks = 0
  } = config;

  // Define daisy chain limits for each product type
  const daisyChainLimits = {
    'absen': 10,
    'BP2B1': 13,  // ROE Black Pearl 2 B1
    'BP2B2': 13,  // ROE Black Pearl 2 B2
    'BP2V2': 13,  // ROE Black Pearl 2V2
    'ROEGP26Full': 5,  // ROE GP2.6 Full
    'ROEGP26Half': 11,  // ROE GP2.6 Half
    'theatrixx': 10,
    // Legacy support for old calls
    'Absen': 10,
    'ROE': 13,
    'Theatrixx': 10
  };

  const limit = daisyChainLimits[productType];

  if (!limit) {
    dataPortsDiv.innerHTML = '';
    return;
  }

  // Check for mixed GP2 Full + GP2 Half configuration
  if (productType === 'ROEGP26Full' && gp2HalfBottomRow && gp2HalfRows > 0 && horizontalBlocks > 0) {
    const gp2HalfTileCount = horizontalBlocks * gp2HalfRows;
    const gp2FullLimit = 5;
    const gp2HalfLimit = 11;

    const fullPorts = Math.ceil(totalTiles / gp2FullLimit);
    const halfPorts = Math.ceil(gp2HalfTileCount / gp2HalfLimit);
    const totalPorts = fullPorts + halfPorts;

    dataPortsDiv.innerHTML = `
      <strong>Data Ports Needed:</strong><br>
      ${totalPorts} port${totalPorts !== 1 ? 's' : ''} total<br>
      <span style="font-size: 0.9em; color: #666;">
        (${fullPorts} for GP2 Full: ${totalTiles} tiles ÷ ${gp2FullLimit} per chain)<br>
        (${halfPorts} for GP2 Half: ${gp2HalfTileCount} tiles ÷ ${gp2HalfLimit} per chain)
      </span>
    `;
    return;
  }

  // Standard calculation for single product type
  const portsNeeded = Math.ceil(totalTiles / limit);

  dataPortsDiv.innerHTML = `
    <strong>Data Ports Needed:</strong><br>
    ${portsNeeded} port${portsNeeded !== 1 ? 's' : ''} (${totalTiles} tiles ÷ ${limit} per chain)
  `;
};

window.display110Circuits = function() {
  const totalPowerDiv = document.getElementById('totalPower');
  if (!totalPowerDiv) return;

  // Remove ALL existing circuits displays first (in case there are multiple)
  const existingCircuitsDivs = document.querySelectorAll('#circuits110Display');
  existingCircuitsDivs.forEach(div => div.remove());

  // Also remove any divs that might have been created without the ID
  const allDivs = totalPowerDiv.querySelectorAll('div');
  allDivs.forEach(div => {
    if (div.textContent.includes('Number of 110 circuits needed')) {
      div.remove();
    }
  });

  // Check if 110V is selected
  const powerDistroType = document.getElementById('powerDistroType').value;
  const voltage = (powerDistroType == "110") ? 110 : 208;

  if (voltage === 110) {
    // Look for EDT110M quantity in the equipment table
    const equipmentRows = document.querySelectorAll('#equipmentTable tbody tr');
    let edt110mQuantity = 0;

    equipmentRows.forEach(row => {
      const cells = row.cells;
      if (cells.length >= 3) {
        const ecode = cells[0].textContent.trim();
        const name = cells[1].textContent.trim();
        // Check both ecode and name to catch different variations
        if (ecode === 'EDT110M' || name.includes('Edison to True1 power cable')) {
          edt110mQuantity = parseInt(cells[2].textContent.trim(), 10) || 0;
        }
      }
    });

    // If EDT110M not found in table, calculate it directly based on product type
    if (edt110mQuantity === 0) {
      const productType = document.getElementById('productType').value;
      const roeGraphiteEnabled = document.getElementById('roeGraphicMix')?.checked || false;

      let totalBlocks;

      if (roeGraphiteEnabled) {
        // ROE Graphite Mix mode: calculate based on combined Half and Full tiles
        const halfHorizontal = parseInt(document.getElementById('halfHorizontal')?.value || 0, 10);
        const halfVertical = parseInt(document.getElementById('halfVertical')?.value || 0, 10);
        const fullHorizontal = parseInt(document.getElementById('fullHorizontal')?.value || 0, 10);
        const fullVertical = parseInt(document.getElementById('fullVertical')?.value || 0, 10);
        totalBlocks = (halfHorizontal * halfVertical) + (fullHorizontal * fullVertical);
      } else {
        // Normal mode
        const blocksHor = parseInt(document.getElementById('blocksHor').value, 10);
        const blocksVer = parseInt(document.getElementById('blocksVer').value, 10);
        totalBlocks = blocksHor * blocksVer;
      }

      let O32, P32;

      if (productType === "ROEGP26Full") {
        // GP2 Full: 250W per panel at 120V = 2.083A per panel
        // Max 5 panels per circuit (10.42A, conservative 65% of 16A max)
        O32 = Math.ceil(totalBlocks / 5);
        edt110mQuantity = O32;
      } else if (productType === "ROEGP26Half") {
        // GP2 Half: 160W per panel at 120V = 1.33A per panel
        // Max 9 panels per circuit (~12A at 120V)
        O32 = Math.ceil(totalBlocks / 9);
        edt110mQuantity = O32;
      } else if (roeGraphiteEnabled) {
        // ROE Graphite Mix: same calculation as other ROE products
        O32 = Math.ceil(totalBlocks / 11);
        P32 = Math.ceil(O32 + (O32 * 0.05));
        edt110mQuantity = P32;
      } else if (productType === "absen") {
        // For Absen: Math.ceil(totalBlocksWithSpares / 8)
        const totalSpares = window.calcSpares(totalBlocks, 8, 1.5);
        const totalBlocksWithSpares = totalBlocks + totalSpares;
        O32 = Math.ceil(totalBlocksWithSpares / 8);
        P32 = Math.ceil(O32 + (O32 * 0.05));
        edt110mQuantity = P32;
      } else if (productType === "BP2B1" || productType === "BP2B2" || productType === "BP2V2") {
        // For ROE: Math.ceil(totalBlocks / 11)
        O32 = Math.ceil(totalBlocks / 11);
        P32 = Math.ceil(O32 + (O32 * 0.05));
        edt110mQuantity = P32;
      } else if (productType === "theatrixx") {
        // For Theatrixx: Math.ceil(totalBlocksWithSpares / 2.409)
        const totalSpares = window.calcSpares(totalBlocks, 10, 2);
        const totalBlocksWithSpares = totalBlocks + totalSpares;
        const O25 = Math.ceil(totalBlocksWithSpares / 2.409);
        const P25 = Math.ceil((O25 / 8.302) * 2);
        edt110mQuantity = P25;
      }
    }

    // Create and append the circuits display ONLY ONCE
    if (edt110mQuantity > 0) {
      const circuitsDiv = document.createElement('div');
      circuitsDiv.id = 'circuits110Display';
      circuitsDiv.innerHTML = `<strong>Number of 110v circuits needed: ${edt110mQuantity}</strong>`;
      circuitsDiv.style.marginTop = '5px';
      circuitsDiv.style.color = '#333';
      totalPowerDiv.appendChild(circuitsDiv);
    }
  }
};

window.display208Circuits = function() {
  const totalPowerDiv = document.getElementById('totalPower');
  if (!totalPowerDiv) return;

  // Remove any previous 208V circuits display
  const existing208Div = document.querySelector('#circuits208Display');
  if (existing208Div) existing208Div.remove();

  // Show for Auto, CUBEDIST, and TP1
  const distro = document.getElementById('powerDistroType').value;
  if (distro !== "Auto" && distro !== "CUBEDIST" && distro !== "TP1") return;

  // Read blocksHor, blocksVer, numScreens
  const blocksHor = parseInt(document.getElementById('blocksHor').value, 10) || 0;
  const blocksVer = parseInt(document.getElementById('blocksVer').value, 10) || 0;
  const numScreens = parseInt(document.getElementById('numScreens')?.value || "1", 10);

  const totalTiles = blocksHor * blocksVer * numScreens;
  if (totalTiles <= 0) return;

  // Get product type and calculate circuits based on power requirements
  const productType = document.getElementById('productType')?.value;
  let neededCircuits;

  // Use Calculator.calculate208Circuits if available, otherwise use product-specific logic
  if (typeof Calculator !== 'undefined' && Calculator.calculate208Circuits) {
    neededCircuits = Calculator.calculate208Circuits(productType, totalTiles);
  } else {
    // Fallback: product-specific divisors
    switch (productType) {
      case 'ROEGP26Full':
        // GP2 Full: max 10 panels per circuit (12.02A at 208V)
        neededCircuits = Math.ceil(totalTiles / 10);
        break;
      case 'ROEGP26Half':
        // GP2 Half: max 20 panels per circuit at 208V
        neededCircuits = Math.ceil(totalTiles / 20);
        break;
      default:
        // Default: 16 panels per circuit
        neededCircuits = Math.ceil(totalTiles / 16);
    }
  }

  const circuitsDiv = document.createElement('div');
  circuitsDiv.id = 'circuits208Display';
  circuitsDiv.innerHTML = `<strong>Number of 208v circuits needed: ${neededCircuits}</strong>`;
  circuitsDiv.style.marginTop = '5px';
  circuitsDiv.style.color = '#333';

  totalPowerDiv.appendChild(circuitsDiv);
};

window.zoomIn = function() {
  window.currentZoomLevel = Math.min(window.currentZoomLevel + 1, 8);
  if (typeof generateWall === 'function') {
    generateWall();
  }
};

window.zoomOut = function() {
  window.currentZoomLevel = Math.max(window.currentZoomLevel - 1, 1);
  if (typeof generateWall === 'function') {
    generateWall();
  }
};

window.resetScreen = function() {
  // Reset zoom level
  window.currentZoomLevel = 1;

  // Reset product type to first option (Absen)
  const productTypeSelect = document.getElementById('productType');
  if (productTypeSelect && productTypeSelect.options.length > 0) {
    productTypeSelect.selectedIndex = 0;
    productTypeSelect.dispatchEvent(new Event('change'));
  }

  // Reset block inputs to default (5x5)
  const blocksHorInput = document.getElementById('blocksHor');
  const blocksVerInput = document.getElementById('blocksVer');
  if (blocksHorInput) blocksHorInput.value = '5';
  if (blocksVerInput) blocksVerInput.value = '5';

  // Reset to block input mode (not dimension input)
  const blockInputRadio = document.getElementById('blockInput');
  if (blockInputRadio) {
    blockInputRadio.checked = true;
    const blockInputsDiv = document.getElementById('blockInputs');
    const dimensionInputsDiv = document.getElementById('dimensionInputs');
    if (blockInputsDiv) blockInputsDiv.style.display = 'block';
    if (dimensionInputsDiv) dimensionInputsDiv.style.display = 'none';
  }

  // Reset dimension inputs
  const widthFeetInput = document.getElementById('widthFeet');
  const heightFeetInput = document.getElementById('heightFeet');
  if (widthFeetInput) widthFeetInput.value = '1';
  if (heightFeetInput) heightFeetInput.value = '1';

  // Uncheck multiple screen management
  const multiScreenCheckbox = document.getElementById('multipleScreenManagementCheckbox');
  if (multiScreenCheckbox) {
    multiScreenCheckbox.checked = false;
    multiScreenCheckbox.dispatchEvent(new Event('change'));
  }

  // Uncheck and hide advanced options
  const advancedCheckbox = document.getElementById('advancedOptionsCheckbox');
  if (advancedCheckbox) {
    advancedCheckbox.checked = false;
    advancedCheckbox.dispatchEvent(new Event('change'));
  }

  // Reset power distro type to Auto
  const powerDistroSelect = document.getElementById('powerDistroType');
  if (powerDistroSelect) {
    powerDistroSelect.value = 'Auto';
    powerDistroSelect.dispatchEvent(new Event('change'));
  }

  // Reset redundancy to None
  const redundancySelect = document.getElementById('redundancy');
  if (redundancySelect) redundancySelect.value = 'None';

  // Reset source signals to 1
  const sourceSignalsInput = document.getElementById('sourceSignals');
  if (sourceSignalsInput) sourceSignalsInput.value = '1';

  // Uncheck and hide dummy tiles option
  const dummyTilesCheckbox = document.getElementById('dummyTilesCheckbox');
  if (dummyTilesCheckbox) {
    dummyTilesCheckbox.checked = false;
    const dummyTileOption = document.getElementById('dummyTileOption');
    const dummyTileCountContainer = document.getElementById('dummyTileCountContainer');
    if (dummyTileOption) dummyTileOption.style.display = 'none';
    if (dummyTileCountContainer) dummyTileCountContainer.style.display = 'none';
  }

  // Uncheck and hide GP2 Half bottom row option
  const gp2HalfCheckbox = document.getElementById('gp2HalfCheckbox');
  if (gp2HalfCheckbox) {
    gp2HalfCheckbox.checked = false;
    const gp2HalfOption = document.getElementById('gp2HalfOption');
    const gp2HalfCountContainer = document.getElementById('gp2HalfCountContainer');
    const gp2HalfCountInput = document.getElementById('gp2HalfCount');
    if (gp2HalfOption) gp2HalfOption.style.display = 'none';
    if (gp2HalfCountContainer) gp2HalfCountContainer.style.display = 'none';
    if (gp2HalfCountInput) gp2HalfCountInput.value = '1';
  }

  // Reset wall type to Flat
  const flatRadio = document.getElementById('flat');
  if (flatRadio) flatRadio.checked = true;

  // Reset to Ground Support
  const groundSupportRadio = document.getElementById('groundSupport');
  if (groundSupportRadio) {
    groundSupportRadio.checked = true;
    groundSupportRadio.dispatchEvent(new Event('change'));
  }

  // Reset ground support type to Single Base
  const groundSupportTypeSelect = document.getElementById('groundSupportType');
  if (groundSupportTypeSelect) {
    groundSupportTypeSelect.value = 'Single Base';
    groundSupportTypeSelect.dispatchEvent(new Event('change'));
  }

  // Reset flown support type to Double Header
  const flownSupportTypeSelect = document.getElementById('flownSupportType');
  if (flownSupportTypeSelect) flownSupportTypeSelect.value = 'Double Header';

  // Uncheck "Show Tile Numbers"
  const toggleNumbersCheckbox = document.getElementById('toggleNumbers');
  if (toggleNumbersCheckbox) toggleNumbersCheckbox.checked = false;

  // Uncheck "Show Data Wiring Diagram"
  const toggleWiringCheckbox = document.getElementById('toggleWiring');
  if (toggleWiringCheckbox) {
    toggleWiringCheckbox.checked = false;
    toggleWiringCheckbox.dispatchEvent(new Event('change'));
  }

  // Clear order information
  const orderNumberInput = document.getElementById('orderNumber');
  const orderDateInput = document.getElementById('orderDate');
  const locationInput = document.getElementById('location');
  if (orderNumberInput) orderNumberInput.value = '';
  if (orderDateInput) orderDateInput.value = '';
  if (locationInput) locationInput.value = '';

  // Regenerate the wall with reset values
  if (typeof generateWall === 'function') {
    generateWall();
  }
};

// Save all form state to localStorage before navigating away
function saveFormState() {
  // Basic configuration
  const productType = document.getElementById('productType')?.value || 'absen';
  const blocksHor = document.getElementById('blocksHor')?.value || '10';
  const blocksVer = document.getElementById('blocksVer')?.value || '6';
  const powerDistroType = document.getElementById('powerDistroType')?.value || '208';

  // Wall type (radio buttons)
  const wallTypeElement = document.querySelector('input[name="wallType"]:checked');
  const wallType = wallTypeElement ? wallTypeElement.value : 'Flat';

  // Support type (radio buttons - ground vs flown)
  const flownSupport = document.getElementById('flownSupport')?.checked || false;
  const groundSupportType = document.getElementById('groundSupportType')?.value || 'Universal Base';

  // GP2 Half settings
  const gp2HalfCheckbox = document.getElementById('gp2HalfCheckbox')?.checked || false;
  const gp2HalfCount = document.getElementById('gp2HalfCount')?.value || '1';
  const gp2HalfPosition = document.getElementById('gp2HalfPosition')?.value || 'bottom';

  // Screen options (single vs multiple)
  const multipleScreens = document.getElementById('multipleScreens')?.checked || false;
  const numScreens = document.getElementById('numScreens')?.value || '1';

  // Save to localStorage
  localStorage.setItem('calc_productType', productType);
  localStorage.setItem('calc_blocksHor', blocksHor);
  localStorage.setItem('calc_blocksVer', blocksVer);
  localStorage.setItem('calc_powerDistroType', powerDistroType);
  localStorage.setItem('calc_wallType', wallType);
  localStorage.setItem('calc_flownSupport', flownSupport);
  localStorage.setItem('calc_groundSupportType', groundSupportType);
  localStorage.setItem('calc_gp2HalfCheckbox', gp2HalfCheckbox);
  localStorage.setItem('calc_gp2HalfCount', gp2HalfCount);
  localStorage.setItem('calc_gp2HalfPosition', gp2HalfPosition);
  localStorage.setItem('calc_multipleScreens', multipleScreens);
  localStorage.setItem('calc_numScreens', numScreens);

  // Also save to legacy keys for technical/screen views
  localStorage.setItem('screenProduct', productType);
  localStorage.setItem('screenBlocksHor', parseInt(blocksHor));
  localStorage.setItem('screenBlocksVer', parseInt(blocksVer));
  localStorage.setItem('screenPowerDistroType', powerDistroType);
}

// Restore form state from localStorage
function restoreFormState() {
  // Check if we have saved state
  if (!localStorage.getItem('calc_productType')) {
    return false; // No saved state
  }

  // Restore basic configuration
  const productType = localStorage.getItem('calc_productType');
  const blocksHor = localStorage.getItem('calc_blocksHor');
  const blocksVer = localStorage.getItem('calc_blocksVer');
  const powerDistroType = localStorage.getItem('calc_powerDistroType');

  if (productType) {
    const productSelect = document.getElementById('productType');
    if (productSelect) {
      // Special handling for GP2 Half - DON'T auto-restore it
      // User must press Alt+S to re-activate the hidden option
      if (productType === 'ROEGP26Half') {
        console.log('GP2 Half was selected, but not auto-restoring. User must press Alt+S to activate.');
        // Default to ROEGP26Full instead
        productSelect.value = 'ROEGP26Full';
        productSelect.dispatchEvent(new Event('change'));
      } else {
        productSelect.value = productType;
        productSelect.dispatchEvent(new Event('change'));
      }
    }
  }

  if (blocksHor) {
    const blocksHorInput = document.getElementById('blocksHor');
    if (blocksHorInput) blocksHorInput.value = blocksHor;
  }

  if (blocksVer) {
    const blocksVerInput = document.getElementById('blocksVer');
    if (blocksVerInput) blocksVerInput.value = blocksVer;
  }

  if (powerDistroType) {
    const powerDistroSelect = document.getElementById('powerDistroType');
    if (powerDistroSelect) powerDistroSelect.value = powerDistroType;
  }

  // Restore wall type
  const wallType = localStorage.getItem('calc_wallType');
  if (wallType) {
    const wallTypeRadio = document.querySelector(`input[name="wallType"][value="${wallType}"]`);
    if (wallTypeRadio) {
      wallTypeRadio.checked = true;
      wallTypeRadio.dispatchEvent(new Event('change'));
    }
  }

  // Restore support type
  const flownSupport = localStorage.getItem('calc_flownSupport') === 'true';
  const flownSupportRadio = document.getElementById('flownSupport');
  const groundSupportRadio = document.querySelector('input[name="supportType"][value="groundSupport"]');

  if (flownSupport && flownSupportRadio) {
    flownSupportRadio.checked = true;
    flownSupportRadio.dispatchEvent(new Event('change'));
  } else if (groundSupportRadio) {
    groundSupportRadio.checked = true;
    groundSupportRadio.dispatchEvent(new Event('change'));
  }

  const groundSupportType = localStorage.getItem('calc_groundSupportType');
  if (groundSupportType) {
    const groundSupportTypeSelect = document.getElementById('groundSupportType');
    if (groundSupportTypeSelect) groundSupportTypeSelect.value = groundSupportType;
  }

  // Restore GP2 Half settings
  const gp2HalfCheckbox = localStorage.getItem('calc_gp2HalfCheckbox') === 'true';
  const gp2HalfCheckboxEl = document.getElementById('gp2HalfCheckbox');
  if (gp2HalfCheckboxEl) {
    gp2HalfCheckboxEl.checked = gp2HalfCheckbox;
    gp2HalfCheckboxEl.dispatchEvent(new Event('change'));
  }

  const gp2HalfCount = localStorage.getItem('calc_gp2HalfCount');
  if (gp2HalfCount) {
    const gp2HalfCountInput = document.getElementById('gp2HalfCount');
    if (gp2HalfCountInput) gp2HalfCountInput.value = gp2HalfCount;
  }

  const gp2HalfPosition = localStorage.getItem('calc_gp2HalfPosition');
  if (gp2HalfPosition) {
    const gp2HalfPositionSelect = document.getElementById('gp2HalfPosition');
    if (gp2HalfPositionSelect) gp2HalfPositionSelect.value = gp2HalfPosition;
  }

  // Restore screen options
  const multipleScreens = localStorage.getItem('calc_multipleScreens') === 'true';
  const singleScreenRadio = document.getElementById('singleScreen');
  const multipleScreensRadio = document.getElementById('multipleScreens');

  if (multipleScreens && multipleScreensRadio) {
    multipleScreensRadio.checked = true;
    multipleScreensRadio.dispatchEvent(new Event('change'));
  } else if (singleScreenRadio) {
    singleScreenRadio.checked = true;
    singleScreenRadio.dispatchEvent(new Event('change'));
  }

  const numScreens = localStorage.getItem('calc_numScreens');
  if (numScreens) {
    const numScreensSelect = document.getElementById('numScreens');
    if (numScreensSelect) numScreensSelect.value = numScreens;
  }

  return true; // State was restored
}

window.openScreenViews = function() {
  // Save current state before navigating
  saveFormState();

  const productType = document.getElementById('productType')?.value || 'absen';
  const blocksHor = parseInt(document.getElementById('blocksHor')?.value) || 10;
  const blocksVer = parseInt(document.getElementById('blocksVer')?.value) || 6;
  const powerDistroType = document.getElementById('powerDistroType')?.value || '208';

  // Get GP2 Half configuration for mixed tiles
  let gp2HalfAutoRows = 0;
  let gp2HalfManualRows = 0;
  let gp2HalfManualPosition = 'bottom';
  let gp2FullVerticalBlocks = blocksVer;

  if (productType === 'ROEGP26Full') {
    // Check for fractional input (auto Half rows)
    const blocksVerInput = document.getElementById('blocksVer');
    const blocksVerRaw = parseFloat(blocksVerInput?.value || 0);
    if ((blocksVerRaw % 1) !== 0) {
      const fractionalPart = blocksVerRaw % 1;
      gp2HalfAutoRows = Math.round(fractionalPart * 2);
      gp2FullVerticalBlocks = Math.floor(blocksVerRaw);
    }

    // Check for manual checkbox
    const gp2HalfCheckbox = document.getElementById('gp2HalfCheckbox');
    if (gp2HalfCheckbox?.checked) {
      gp2HalfManualRows = parseInt(document.getElementById('gp2HalfCount')?.value || 1, 10);
      gp2HalfManualPosition = document.getElementById('gp2HalfPosition')?.value || 'bottom';
    }
  }

  localStorage.setItem('screenProduct', productType);
  localStorage.setItem('screenBlocksHor', blocksHor);
  localStorage.setItem('screenBlocksVer', blocksVer);
  localStorage.setItem('screenPowerDistroType', powerDistroType);
  localStorage.setItem('gp2HalfAutoRows', gp2HalfAutoRows);
  localStorage.setItem('gp2HalfManualRows', gp2HalfManualRows);
  localStorage.setItem('gp2HalfManualPosition', gp2HalfManualPosition);
  localStorage.setItem('gp2FullVerticalBlocks', gp2FullVerticalBlocks);

  window.location.href = `screen-views.html?product=${encodeURIComponent(productType)}&blocksHor=${blocksHor}&blocksVer=${blocksVer}&powerDistroType=${powerDistroType}&gp2HalfAutoRows=${gp2HalfAutoRows}&gp2HalfManualRows=${gp2HalfManualRows}&gp2HalfManualPosition=${encodeURIComponent(gp2HalfManualPosition)}&gp2FullVerticalBlocks=${gp2FullVerticalBlocks}`;
};

window.openTechnicalView = function() {
  // Save current state before navigating
  saveFormState();

  const productType = document.getElementById('productType')?.value || 'absen';
  const blocksHor = parseInt(document.getElementById('blocksHor')?.value) || 10;
  const blocksVer = parseInt(document.getElementById('blocksVer')?.value) || 6;
  const powerDistroType = document.getElementById('powerDistroType')?.value || '208';

  // Get GP2 Half configuration for mixed tiles
  let gp2HalfAutoRows = 0;
  let gp2HalfManualRows = 0;
  let gp2HalfManualPosition = 'bottom';
  let gp2FullVerticalBlocks = blocksVer;

  if (productType === 'ROEGP26Full') {
    // Check for fractional input (auto Half rows)
    const blocksVerInput = document.getElementById('blocksVer');
    const blocksVerRaw = parseFloat(blocksVerInput?.value || 0);
    if ((blocksVerRaw % 1) !== 0) {
      const fractionalPart = blocksVerRaw % 1;
      gp2HalfAutoRows = Math.round(fractionalPart * 2);
      gp2FullVerticalBlocks = Math.floor(blocksVerRaw);
    }

    // Check for manual checkbox
    const gp2HalfCheckbox = document.getElementById('gp2HalfCheckbox');
    if (gp2HalfCheckbox?.checked) {
      gp2HalfManualRows = parseInt(document.getElementById('gp2HalfCount')?.value || 1, 10);
      gp2HalfManualPosition = document.getElementById('gp2HalfPosition')?.value || 'bottom';
    }
  }

  localStorage.setItem('screenProduct', productType);
  localStorage.setItem('screenBlocksHor', blocksHor);
  localStorage.setItem('screenBlocksVer', blocksVer);
  localStorage.setItem('screenPowerDistroType', powerDistroType);
  localStorage.setItem('gp2HalfAutoRows', gp2HalfAutoRows);
  localStorage.setItem('gp2HalfManualRows', gp2HalfManualRows);
  localStorage.setItem('gp2HalfManualPosition', gp2HalfManualPosition);
  localStorage.setItem('gp2FullVerticalBlocks', gp2FullVerticalBlocks);

  window.location.href = `technical-view.html?product=${encodeURIComponent(productType)}&blocksHor=${blocksHor}&blocksVer=${blocksVer}&powerDistroType=${powerDistroType}&gp2HalfAutoRows=${gp2HalfAutoRows}&gp2HalfManualRows=${gp2HalfManualRows}&gp2HalfManualPosition=${encodeURIComponent(gp2HalfManualPosition)}&gp2FullVerticalBlocks=${gp2FullVerticalBlocks}`;
};

// --- Missing Functions from Refactoring ---

// Generate screen size configurations from tile quantity
window.generateScreenSizesFromTileQuantity = function() {
  const tileQuantity = parseInt(document.getElementById('tileQuantity').value);
  const productType = document.getElementById('productType').value;
  const resultsDiv = document.getElementById('possibleScreenSizes');

  if (!tileQuantity || tileQuantity < 1) {
    resultsDiv.innerHTML = '<p style="color: red;">Please enter a valid tile quantity.</p>';
    return;
  }

  // Get tile dimensions and limits based on product type
  let tileWidthFeet, tileHeightFeet, maxVertical;

  // Use constants or defaults if CONSTANTS is not defined
  const limits = (typeof CONSTANTS !== 'undefined' && CONSTANTS.MAX_VERTICAL_TILES) ? CONSTANTS.MAX_VERTICAL_TILES : {};

  if (productType === 'ROEGP26Full') {
    tileWidthFeet = 1.64; // 500mm
    tileHeightFeet = 3.28; // 1000mm
    maxVertical = limits.ROEGP26Full || 7;
  } else if (productType === 'ROEGP26Half') {
    tileWidthFeet = 1.64; // 500mm
    tileHeightFeet = 1.64; // 500mm
    maxVertical = limits.ROEGP26Half || 13;
  } else {
    // Default for Absen, BP2, Theatrixx (all 500x500mm)
    tileWidthFeet = 1.64;
    tileHeightFeet = 1.64;
    maxVertical = limits[productType] || 13;
  }

  // Find all factor pairs (width × height = quantity)
  const configurations = [];
  for (let height = 1; height <= tileQuantity; height++) {
    if (tileQuantity % height === 0) {
      const width = tileQuantity / height;

      // Check if height exceeds vertical limit
      if (height <= maxVertical) {
        const widthFeet = (width * tileWidthFeet).toFixed(2);
        const heightFeet = (height * tileHeightFeet).toFixed(2);
        configurations.push({
          tiles: `${width} × ${height}`,
          dimensions: `${widthFeet}' × ${heightFeet}'`,
          width: width,
          height: height
        });
      }
    }
  }

  // Display results
  if (configurations.length === 0) {
    resultsDiv.innerHTML = `<p style="color: orange;">No valid configurations found for ${tileQuantity} tiles (max height: ${maxVertical} tiles).</p>`;
  } else {
    let html = `<h3>Possible Screen Configurations for ${tileQuantity} Tiles:</h3>`;
    html += '<table style="border-collapse: collapse; width: 100%;">';
    html += '<thead><tr style="background: #f0f0f0;"><th style="padding: 8px; border: 1px solid #ddd;">Tiles (W × H)</th><th style="padding: 8px; border: 1px solid #ddd;">Dimensions (W × H)</th></tr></thead>';
    html += '<tbody>';

    configurations.forEach((config, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      html += `<tr style="background: ${bgColor}; cursor: pointer;" onclick="selectScreenSize(${config.width}, ${config.height})">
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${config.tiles}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${config.dimensions}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    html += `<p style="font-size: 12px; color: #666; margin-top: 10px;">Note: Configurations limited to max ${maxVertical} tiles vertical for ${productType}. Click a row to select.</p>`;
    resultsDiv.innerHTML = html;
  }
};

window.selectScreenSize = function(width, height) {
  document.getElementById('blocksHor').value = width;
  document.getElementById('blocksVer').value = height;
  generateWall();
};

window.updateBlocksBasedOnSelection = function() {
  const aspectRatioValue = document.getElementById('aspectRatio').value;
  const screenSizeValue = document.getElementById('screenSize').value;

  // Determine tile dimensions based on product type (GP2 Full tiles are 1000mm tall)
  const productType = document.getElementById('productType')?.value || 'absen';
  const tileWidthFeet = 1.64;
  const isGP2Full = (productType === 'ROEGP26Full');

  // Helper: find best GP2 Full + Half mix for a target height in feet
  function bestGP2FullMix(targetFeet) {
    const fullH = 3.28, halfH = 1.64;
    const fullOnly = Math.round(targetFeet / fullH);
    const fullOnlyActual = fullOnly * fullH;
    const halfUnits = Math.round(targetFeet / halfH);
    const mixFull = Math.floor(halfUnits / 2);
    const mixHalf = halfUnits % 2;
    const mixActual = mixFull * fullH + mixHalf * halfH;
    if (Math.abs(mixActual - targetFeet) < Math.abs(fullOnlyActual - targetFeet)) {
      return mixFull + (mixHalf * 0.5);
    }
    return fullOnly;
  }

  if ((aspectRatioValue === "1:1" || aspectRatioValue === "16:9" || aspectRatioValue === "32:9" ||
    aspectRatioValue === "48:9" || aspectRatioValue === "4:3" || aspectRatioValue === "2:1" ||
    aspectRatioValue === "3:1") && screenSizeValue) {
    const [width, height] = screenSizeValue.split('x').map(Number);
    let blocksHor, blocksVer;
    if (screenSizeValue === "7x7") {
      blocksHor = 5;
      blocksVer = isGP2Full ? bestGP2FullMix(7) : 5;
    } else {
      blocksHor = Math.round(width / tileWidthFeet);
      blocksVer = isGP2Full ? bestGP2FullMix(height) : Math.round(height / 1.64);
    }

    document.getElementById('blocksHor').value = blocksHor;
    document.getElementById('blocksVer').value = blocksVer;
    if(typeof updateHeightWarning === 'function') updateHeightWarning(height);
  } else if (aspectRatioValue) {
    // Aspect ratio only (no specific size)
    const [width, height] = aspectRatioValue.split(':').map(Number);
    const baseWidth = 16;
    const blocksHor = baseWidth;
    const wallWidthFeet = baseWidth * tileWidthFeet;
    const wallHeightFeet = wallWidthFeet * (height / width);
    const blocksVer = isGP2Full ? bestGP2FullMix(wallHeightFeet) : Math.round(wallHeightFeet / 1.64);
    document.getElementById('blocksHor').value = blocksHor;
    document.getElementById('blocksVer').value = blocksVer;
    if(typeof updateHeightWarning === 'function') updateHeightWarning(0);
  }
  updateDimensionsFromBlocks();
}

window.calcSpares = function(numberofBlocks, sparePercentage, factor) {
  // Percentage as a number, ie 10 for 10%
  var sparesPercent = Math.ceil(numberofBlocks * (sparePercentage / 100));
  var total = numberofBlocks + sparesPercent;
  var totalMultiple = sparePercentage * Math.round(total / sparePercentage);
  var totalSpares = totalMultiple - numberofBlocks;

  let O76 = (totalSpares < 1) ? Math.ceil(numberofBlocks * ((sparePercentage / 100) * factor)) : totalSpares;
  let numberOfSpares = (Math.ceil(totalSpares) < 1) ? O76 : totalSpares

  return numberOfSpares;
}

// Wiring Diagram Capture Functions
window.updateCaptureButtonVisibility = function() {
  const captureButton = document.getElementById('captureWiringButton');
  const captureContainer = document.getElementById('captureButtonContainer');
  const toggleWiring = document.getElementById('toggleWiring');
  const togglePower = document.getElementById('togglePower');

  if (captureButton && captureContainer) {
    const showWiringDiagram = toggleWiring && toggleWiring.checked;
    const showPowerDiagram = togglePower && togglePower.checked;

    if (showWiringDiagram || showPowerDiagram) {
      captureContainer.style.display = 'block';
      captureButton.style.display = 'inline-block';

      // Update button text based on what's shown
      if (showWiringDiagram && showPowerDiagram) {
        captureButton.textContent = '📸 Capture Wiring Diagrams';
      } else if (showWiringDiagram) {
        captureButton.textContent = '📸 Capture Data Wiring';
      } else {
        captureButton.textContent = '📸 Capture Power Wiring';
      }
    } else {
      captureContainer.style.display = 'none';
      captureButton.style.display = 'none';
    }
  }
}

window.captureWiringDiagram = function() {
  const canvas = document.getElementById('wallCanvas2D');
  if (!canvas) return;

  // Create a temporary canvas with extra height for info text
  const tempCanvas = document.createElement('canvas');
  const infoHeight = 80;
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height + infoHeight;
  const ctx = tempCanvas.getContext('2d');

  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Copy original canvas content
  ctx.drawImage(canvas, 0, 0);

  // Add info text at the bottom
  const productType = document.getElementById('productType')?.value || 'LED';
  const blocksHor = document.getElementById('blocksHor')?.value || '10';
  const blocksVer = document.getElementById('blocksVer')?.value || '6';
  const toggleWiring = document.getElementById('toggleWiring');
  const togglePower = document.getElementById('togglePower');

  let diagramType = '';
  if (toggleWiring && toggleWiring.checked && togglePower && togglePower.checked) {
    diagramType = 'Data & Power Wiring';
  } else if (toggleWiring && toggleWiring.checked) {
    diagramType = 'Data Wiring';
  } else if (togglePower && togglePower.checked) {
    diagramType = 'Power Wiring';
  }

  // Draw info section background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, canvas.height, tempCanvas.width, infoHeight);

  // Draw text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(diagramType, tempCanvas.width / 2, canvas.height + 30);

  // Add product and dimensions info
  ctx.font = '16px Arial';
  ctx.fillText(`${productType.toUpperCase()} - ${blocksHor} × ${blocksVer} tiles`, tempCanvas.width / 2, canvas.height + 55);

  // Convert to data URL and download
  const dataURL = tempCanvas.toDataURL('image/png');
  const link = document.createElement('a');

  // Create filename
  const diagramTypeClean = diagramType.replace(/\s+/g, '_').replace(/&/g, 'and');
  link.download = `${productType.toUpperCase()}_${diagramTypeClean}_${blocksHor}x${blocksVer}.png`;
  link.href = dataURL;
  link.click();
}

// Event Listeners for Initial Setup
document.addEventListener('DOMContentLoaded', () => {

  // Restore calculator state from URL parameters (from Screen Views back button)
  // or from localStorage (returning from technical/screen views)
  const urlParams = new URLSearchParams(window.location.search);
  let stateRestored = false;

  // Priority 1: Restore from URL parameters (from back button)
  if (urlParams.has('product') || urlParams.has('blocksHor') || urlParams.has('blocksVer')) {
    const productType = urlParams.get('product');
    const blocksHor = urlParams.get('blocksHor');
    const blocksVer = urlParams.get('blocksVer');

    if (productType) {
      const productSelect = document.getElementById('productType');
      if (productSelect) {
        // Validate that productType is one of the valid values
        const validProductTypes = ['absen', 'BP2B1', 'BP2B2', 'BP2V2', 'theatrixx', 'ROEGP26Full', 'ROEGP26Half'];
        if (validProductTypes.includes(productType)) {

          // Special handling for GP2 Half - DON'T auto-restore it
          // User must press Alt+S to re-activate the hidden option
          if (productType === 'ROEGP26Half') {
            console.log('GP2 Half was selected, but not auto-restoring. User must press Alt+S to activate.');
            // Default to ROEGP26Full instead
            productSelect.value = 'ROEGP26Full';
            productSelect.dispatchEvent(new Event('change'));
          } else {
            productSelect.value = productType;
            // Trigger change event to update UI
            productSelect.dispatchEvent(new Event('change'));
          }
        }
      }
    }

    if (blocksHor) {
      const blocksHorInput = document.getElementById('blocksHor');
      if (blocksHorInput) {
        blocksHorInput.value = blocksHor;
      }
    }

    if (blocksVer) {
      const blocksVerInput = document.getElementById('blocksVer');
      if (blocksVerInput) {
        blocksVerInput.value = blocksVer;
      }
    }

    // Restore powerDistroType if present
    const powerDistroType = urlParams.get('powerDistroType');
    if (powerDistroType) {
      const powerDistroSelect = document.getElementById('powerDistroType');
      if (powerDistroSelect) {
        powerDistroSelect.value = powerDistroType;
      }
    }

    // Restore GP2 Half parameters if present
    const gp2HalfAutoRows = urlParams.get('gp2HalfAutoRows');
    const gp2HalfManualRows = urlParams.get('gp2HalfManualRows');
    const gp2HalfManualPosition = urlParams.get('gp2HalfManualPosition');
    const gp2FullVerticalBlocks = urlParams.get('gp2FullVerticalBlocks');

    if ((gp2HalfAutoRows && parseInt(gp2HalfAutoRows) > 0) || (gp2HalfManualRows && parseInt(gp2HalfManualRows) > 0)) {
      // If we have auto Half rows from fractional input, restore the fractional value
      if (gp2HalfAutoRows && parseInt(gp2HalfAutoRows) > 0 && gp2FullVerticalBlocks) {
        const fullBlocks = parseInt(gp2FullVerticalBlocks);
        const halfRows = parseInt(gp2HalfAutoRows);
        const fractionalValue = fullBlocks + (halfRows * 0.5);
        const blocksVerInput = document.getElementById('blocksVer');
        if (blocksVerInput) {
          blocksVerInput.value = fractionalValue;
        }
      }

      // Restore manual checkbox settings
      if (gp2HalfManualRows && parseInt(gp2HalfManualRows) > 0) {
        const gp2HalfCheckbox = document.getElementById('gp2HalfCheckbox');
        if (gp2HalfCheckbox) {
          gp2HalfCheckbox.checked = true;
          gp2HalfCheckbox.dispatchEvent(new Event('change'));
        }

        const gp2HalfCountInput = document.getElementById('gp2HalfCount');
        if (gp2HalfCountInput) {
          gp2HalfCountInput.value = gp2HalfManualRows;
        }

        if (gp2HalfManualPosition) {
          const gp2HalfPositionSelect = document.getElementById('gp2HalfPosition');
          if (gp2HalfPositionSelect) {
            gp2HalfPositionSelect.value = gp2HalfManualPosition;
          }
        }
      }
    }

    stateRestored = true;
  }
  // Priority 2: Restore from localStorage (returning from other pages)
  else {
    stateRestored = restoreFormState();
  }

  // Trigger wall generation if state was restored
  if (stateRestored && typeof generateWall === 'function') {
    setTimeout(() => generateWall(), 100);
  }

  // Attach ground support type listener with alert logic:
  // Attach ground support type listener with alert logic for Absen only:
  const groundSupportTypeSelect = document.getElementById('groundSupportType');
  if (groundSupportTypeSelect) {
    groundSupportTypeSelect.addEventListener('change', function () {
      const productType = document.getElementById('productType').value;
      const alertSpan = document.getElementById('doubleBaseAlert');
      if (productType === 'absen' && this.value === 'Double Base') {
        alertSpan.style.display = 'inline';
      } else {
        alertSpan.style.display = 'none';
      }
      updateWall(); // Optional: update the wall if needed
    });
  }

  // Toggle the display of multiple screens options based on the radio selection.
  document.getElementById('singleScreen')?.addEventListener('change', function() {
    document.getElementById('multipleScreensOptions').style.display = 'none';
    document.getElementById('numScreens').value = '1';
    generateWall();
  });

  document.getElementById('multipleScreens')?.addEventListener('change', function() {
    document.getElementById('multipleScreensOptions').style.display = 'block';
    document.getElementById('numScreens').value = '1';
    generateWall();
  });

  // Set initial state based on which radio button is checked
  if (document.getElementById('multipleScreens').checked) {
    document.getElementById('multipleScreensOptions').style.display = 'block';
  } else {
    document.getElementById('multipleScreensOptions').style.display = 'none';
  }

  // ROE Graphite Mix toggle
  const roeGraphicMixCheckbox = document.getElementById('roeGraphicMix');
  if (roeGraphicMixCheckbox) {
    roeGraphicMixCheckbox.addEventListener('change', function() {
      const mixedTileInputs = document.getElementById('mixedTileInputs');
      const blockInputs = document.getElementById('blockInputs');
      const productTypeSelect = document.getElementById('productType');

      if (this.checked) {
        if (mixedTileInputs) mixedTileInputs.style.display = 'block';
        if (blockInputs) blockInputs.style.display = 'none';
        if (productTypeSelect && !productTypeSelect.value.includes('ROEGP26')) {
          productTypeSelect.value = 'ROEGP26Full';
          productTypeSelect.dispatchEvent(new Event('change'));
        }
      } else {
        if (mixedTileInputs) mixedTileInputs.style.display = 'none';
        if (blockInputs) blockInputs.style.display = 'block';
      }

      if (typeof generateWall === 'function') {
        generateWall();
      }
    });
  }

  // Add event listeners to mixed tile inputs
  const halfHorizontalInput = document.getElementById('halfHorizontal');
  const halfVerticalInput = document.getElementById('halfVertical');
  const fullHorizontalInput = document.getElementById('fullHorizontal');
  const fullVerticalInput = document.getElementById('fullVertical');

  if (halfHorizontalInput) {
    halfHorizontalInput.addEventListener('input', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }
  if (halfVerticalInput) {
    halfVerticalInput.addEventListener('input', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }
  if (fullHorizontalInput) {
    fullHorizontalInput.addEventListener('input', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }
  if (fullVerticalInput) {
    fullVerticalInput.addEventListener('input', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }

  // Add event listeners for Full tile position radio buttons
  const fullTilesTopRadio = document.getElementById('fullTilesTop');
  const fullTilesBottomRadio = document.getElementById('fullTilesBottom');

  if (fullTilesTopRadio) {
    fullTilesTopRadio.addEventListener('change', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }
  if (fullTilesBottomRadio) {
    fullTilesBottomRadio.addEventListener('change', function() {
      if (typeof generateWall === 'function') generateWall();
    });
  }

  const flownSupportTypeSelect = document.getElementById('flownSupportType');
  if (flownSupportTypeSelect) {
    flownSupportTypeSelect.addEventListener('change', () => { updateWall(); });
  }
  const powerDistroTypeSelect = document.getElementById('powerDistroType');
  if (powerDistroTypeSelect) {
    powerDistroTypeSelect.addEventListener('change', () => {
      updateWall();
      display110Circuits();
      display208Circuits();
    });
  }
  const redundancySelect = document.getElementById('redundancy');
  if (redundancySelect) {
    redundancySelect.addEventListener('change', () => {
      updateWall();
    });
  }
  const sourceSignalsSelect = document.getElementById('sourceSignals');
  if (sourceSignalsSelect) {
    sourceSignalsSelect.addEventListener('change', () => {
      updateWall();
    });
  }

  // Product Type change listener
  document.getElementById('productType').addEventListener('change', function () {
    const productType = this.value;
    const groundSupportTypeSelect = document.getElementById('groundSupportType');
    if (groundSupportTypeSelect) {
      if (productType === 'absen') {
        groundSupportTypeSelect.value = 'Single Base';
      } else if (
        productType === 'BP2B1' ||
        productType === 'BP2B2' ||
        productType === 'BP2V2' ||
        productType === 'theatrixx' ||
        productType === 'ROEGP26Full' ||
        productType === 'ROEGP26Half'
      ) {
        groundSupportTypeSelect.value = 'Double Base';
      } else {
        groundSupportTypeSelect.value = 'Single Base';
      }
    }

    if (productType !== 'absen') {
      document.getElementById('doubleBaseAlert').style.display = 'none';
    }

    updateVerticalBlocksLimit(productType);
    updateHeightDimensionLimit(productType);
    updateWallTypeAlert(productType);
    updateTableRowColor(productType);

    if (document.getElementById('flownSupport').checked) {
      if (UI && UI.displayIBoltWarning) {
        UI.displayIBoltWarning(productType);
      }
    }

    const convexOption = document.getElementById('optionConvex');
    const dummyTileOption = document.getElementById('dummyTileOption');
    const gp2HalfOption = document.getElementById('gp2HalfOption');
    const currentWallType = document.querySelector('input[name="wallType"]:checked');

    if (productType === 'BP2B1' || productType === "BP2B2" || productType === 'BP2V2') {
      convexOption.style.display = 'none';
      dummyTileOption.style.display = 'block';
      if (gp2HalfOption) gp2HalfOption.style.display = 'none';
      if (currentWallType && currentWallType.value === 'Convex') {
        document.getElementById('flat').checked = true;
      }
    } else if (productType === 'ROEGP26Full') {
      convexOption.style.display = 'inline-block';
      dummyTileOption.style.display = 'none';
      if (gp2HalfOption) gp2HalfOption.style.display = 'block';
    } else {
      convexOption.style.display = 'inline-block';
      dummyTileOption.style.display = 'none';
      if (gp2HalfOption) gp2HalfOption.style.display = 'none';
    }

    const blocksVerInput = document.getElementById('blocksVer');
    const halfRowHint = document.getElementById('halfRowHint');

    if (productType === 'ROEGP26Full') {
      if (blocksVerInput) {
        blocksVerInput.setAttribute('step', '0.5');
        blocksVerInput.setAttribute('min', '0.5');
        blocksVerInput.setAttribute('placeholder', 'e.g. 4.5');
      }
      if (halfRowHint) halfRowHint.style.display = 'inline';
    } else {
      if (blocksVerInput) {
        blocksVerInput.setAttribute('step', '1');
        blocksVerInput.setAttribute('min', '1');
        blocksVerInput.removeAttribute('placeholder');
        const currentValue = parseFloat(blocksVerInput.value);
        if (currentValue % 1 !== 0) {
          blocksVerInput.value = Math.round(currentValue).toString();
        }
      }
      if (halfRowHint) halfRowHint.style.display = 'none';
    }

    restrictGroundSupportTypes(currentWallType && (currentWallType.value === 'Concave' || currentWallType.value === 'Convex'));
    restrictFlownSupportTypes(currentWallType && (currentWallType.value === 'Concave' || currentWallType.value === 'Convex'));
    updateWall();
  });

  // Initialize vertical input step/min by triggering product type change
  const productTypeSelect = document.getElementById('productType');
  if (productTypeSelect) {
    productTypeSelect.dispatchEvent(new Event('change'));
  }

  // Wall type radios listener
  const wallTypeRadios = document.getElementsByName('wallType');
  wallTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      handleWallTypeChange();
      const productType = document.getElementById('productType').value;
      updateWallTypeAlert(productType);
      generateWall();

      if (productType === 'absen') {
        const currentWallType = document.querySelector('input[name="wallType"]:checked').value;
        if (currentWallType !== 'Flat') {
          document.getElementById('doubleBaseAlert').style.display = 'none';
        }
      }
    });
  });

  document.getElementById('advancedOptionsCheckbox')?.addEventListener('change', function () {
    const tileQtyDiv = document.getElementById('tileQuantityInput');
    const possibleSizesDiv = document.getElementById('possibleScreenSizes');
    if (this.checked) {
      if (tileQtyDiv) tileQtyDiv.style.display = 'block';
      if (possibleSizesDiv) possibleSizesDiv.style.display = 'block';
    } else {
      if (tileQtyDiv) tileQtyDiv.style.display = 'none';
      if (possibleSizesDiv) possibleSizesDiv.style.display = 'none';
    }
  });

  document.getElementById('dummyTilesCheckbox')?.addEventListener('change', function () {
    const countContainer = document.getElementById('dummyTileCountContainer');
    if (this.checked) {
      countContainer.style.display = 'block';
    } else {
      countContainer.style.display = 'none';
    }
    generateWall();
  });

  document.getElementById('dummyTileCount')?.addEventListener('input', function () {
    generateWall();
  });

  document.getElementById('gp2HalfCheckbox')?.addEventListener('change', function () {
    const countContainer = document.getElementById('gp2HalfCountContainer');
    if (this.checked) {
      countContainer.style.display = 'block';
    } else {
      countContainer.style.display = 'none';
    }
    generateWall();
  });

  document.getElementById('gp2HalfCount')?.addEventListener('input', function () {
    generateWall();
  });

  document.getElementById('gp2HalfPosition')?.addEventListener('change', function () {
    generateWall();
  });

  const screenSize = document.getElementById('screenSize');
  if (screenSize) {
    screenSize.addEventListener('change', updateBlocksBasedOnSelection);
  }

  const customConfig = document.getElementById('customConfig');
  const popularFormats = document.getElementById('popularFormats');
  if (customConfig) {
    customConfig.addEventListener('change', handleWallConfigChange);
  }
  if (popularFormats) {
    popularFormats.addEventListener('change', handleWallConfigChange);
  }
  const aspectRatio = document.getElementById('aspectRatio');
  if (aspectRatio) {
    aspectRatio.addEventListener('change', handleAspectRatioChange);
  }
  const blockInputRadio = document.getElementById('blockInput');
  const dimensionInputRadio = document.getElementById('dimensionInput');
  const blockInputs = document.getElementById('blockInputs');
  const dimensionInputs = document.getElementById('dimensionInputs');
  if (dimensionInputs) dimensionInputs.style.display = 'none';

  if (blockInputRadio && dimensionInputRadio) {
    blockInputRadio.addEventListener('change', toggleInputType);
    dimensionInputRadio.addEventListener('change', toggleInputType);
    toggleInputType();
  }
  const widthFeetInput = document.getElementById('widthFeet');
  const heightFeetInput = document.getElementById('heightFeet');
  const blocksHorInput = document.getElementById('blocksHor');
  const blocksVerInput = document.getElementById('blocksVer');
  const toggleNumbersCheckbox = document.getElementById('toggleNumbers');
  const debouncedUpdateDimensionsFromBlocks = debounce(updateDimensionsFromBlocks, 300);

  if (widthFeetInput) {
    widthFeetInput.addEventListener('input', handleDimensionInput.bind(null, widthFeetInput));
    widthFeetInput.addEventListener('keydown', (e) => handleArrowKeys(e, widthFeetInput));
  }
  if (heightFeetInput) {
    heightFeetInput.addEventListener('input', handleDimensionInput.bind(null, heightFeetInput));
    heightFeetInput.addEventListener('keydown', (e) => handleArrowKeys(e, heightFeetInput));
  }
  if (blocksHorInput) {
    blocksHorInput.addEventListener('input', debouncedUpdateDimensionsFromBlocks);
    blocksHorInput.addEventListener('change', debouncedUpdateDimensionsFromBlocks);
  }
  if (blocksVerInput) {
    blocksVerInput.addEventListener('input', debouncedUpdateDimensionsFromBlocks);
    blocksVerInput.addEventListener('change', debouncedUpdateDimensionsFromBlocks);
  }
  if (toggleNumbersCheckbox) {
    window.showNumbers = toggleNumbersCheckbox.checked;
    toggleNumbersCheckbox.addEventListener('change', () => {
      window.showNumbers = toggleNumbersCheckbox.checked;
      generateWall();
    });
  }
  document.querySelectorAll('select[name="groundSupportType"], select[name="flownSupportType"]')
    .forEach(select => select.addEventListener('change', generateWall));

  setupVerticalWarning();
  handleWallTypeChange();
  toggleGroundSupportOptions();
  toggleFlownSupportOptions();
  generateWall();

  // Wiring and Power toggles
  const toggleWiringCheckbox = document.getElementById('toggleWiring');
  if (toggleWiringCheckbox) {
    window.showWiring = toggleWiringCheckbox.checked;
    toggleWiringCheckbox.addEventListener('change', () => {
      window.showWiring = toggleWiringCheckbox.checked;
      generateWall();
    });
  }

  const togglePowerCheckbox = document.getElementById('togglePower');
  if (togglePowerCheckbox) {
    window.showPower = togglePowerCheckbox.checked;
    togglePowerCheckbox.addEventListener('change', () => {
      window.showPower = togglePowerCheckbox.checked;
      generateWall();
    });
  }

  // Initialize multi-screen management listener
  const multiScreenCheckbox = document.getElementById('multipleScreenManagementCheckbox');
  if (multiScreenCheckbox) {
    multiScreenCheckbox.addEventListener('change', function() {
      if (typeof toggleMultiScreenManagement === 'function') {
        toggleMultiScreenManagement();
      } else {
        console.error('toggleMultiScreenManagement is not defined');
      }
    });
  }
});
