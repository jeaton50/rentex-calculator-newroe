/**
 * Rentex LED Wall Calculator - UI Module
 * Handles all UI interactions, validation, warnings, and event listeners
 */

/**
 * UI namespace for all user interface functions
 */
const UI = {

  /**
   * Toggle between block input and dimension input modes
   */
  toggleInputType() {
    const isBlockInput = document.getElementById('blockInput')?.checked || false;
    const blockInputs = document.getElementById('blockInputs');
    const dimensionInputs = document.getElementById('dimensionInputs');

    if (blockInputs && dimensionInputs) {
      blockInputs.style.display = isBlockInput ? 'block' : 'none';
      dimensionInputs.style.display = isBlockInput ? 'none' : 'block';
    }

    if (isBlockInput) {
      if (typeof handleBlockInput === 'function') {
        handleBlockInput();
      }
    } else {
      const widthFeet = parseFloat(document.getElementById('widthFeet')?.value || 0);
      const heightFeet = parseFloat(document.getElementById('heightFeet')?.value || 0);
      if (typeof handleDimensionInput === 'function') {
        handleDimensionInput({ target: document.getElementById('widthFeet') });
      }
    }

    this.updateWarning();
  },

  /**
   * Toggle ground support options visibility
   */
  toggleGroundSupportOptions() {
    const groundSupportOptions = document.getElementById('groundSupportOptions');
    const groundSupportCheckbox = document.getElementById('groundSupport');

    if (groundSupportCheckbox?.checked) {
      if (groundSupportOptions) {
        groundSupportOptions.style.display = 'block';
      }

      // Always hide IBolt warning when ground support is selected
      const warningDiv = document.getElementById('IBoltWarning');
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    } else {
      if (groundSupportOptions) {
        groundSupportOptions.style.display = 'none';
      }
    }

    this.updateWall();
  },

  /**
   * Toggle flown support options visibility
   */
  toggleFlownSupportOptions() {
    const flownSupportOptions = document.getElementById('flownSupportOptions');
    const flownSupportCheckbox = document.getElementById('flownSupport');

    if (flownSupportCheckbox?.checked) {
      if (flownSupportOptions) {
        flownSupportOptions.style.display = 'block';
      }

      // Show IBolt warning if product type is BP2B1, BP2B2, or BP2V2
      const productType = document.getElementById('productType')?.value;
      this.displayIBoltWarning(productType);
    } else {
      if (flownSupportOptions) {
        flownSupportOptions.style.display = 'none';
      }

      // Hide IBolt warning when flown support is disabled
      const warningDiv = document.getElementById('IBoltWarning');
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    }

    this.updateWall();
  },

  /**
   * Display IBolt warning for specific product types
   * @param {string} productType - Product type code
   */
  displayIBoltWarning(productType) {
    const warningDiv = document.getElementById('IBoltWarning');
    if (!warningDiv) return;

    if (['BP2B1', 'BP2B2', 'BP2V2'].includes(productType)) {
      warningDiv.innerHTML = '⚠️ Headers come with clamps, check with client if they need IBolts.';
      warningDiv.style.display = 'block';
    } else {
      warningDiv.innerHTML = '';
      warningDiv.style.display = 'none';
    }
  },

  /**
   * Update validation warnings based on wall dimensions and product type
   */
  updateWarning() {
    const blocksVerInput = document.getElementById('blocksVer');
    const heightFeetInput = document.getElementById('heightFeet');
    const flownSupportCheckbox = document.getElementById('flownSupport');

    // Spans to show warnings
    const blockWarningSpan = document.getElementById('blockVerticalWarning');
    const dimensionWarningSpan = document.getElementById('dimensionVerticalWarning');

    if (!blocksVerInput || !heightFeetInput || !blockWarningSpan || !dimensionWarningSpan) {
      return;
    }

    // Check if the user is entering dimensions or tile counts
    const isDimensionInput = document.getElementById('dimensionInput')?.checked || false;

    // Identify which product is selected
    const product = document.getElementById('productType')?.value || 'absen';
    let productVal;
    if (product === 'absen') {
      productVal = 11;  // vertical tile threshold for Absen
    } else if (product === 'BP2B1' || product === 'BP2B2' || product === 'BP2V2' || product === 'theatrixx') {
      productVal = 13;  // vertical tile threshold for ROE & Theatrixx
    } else {
      productVal = 12;  // fallback
    }

    if (isDimensionInput) {
      // User is entering dimensions
      const heightFeet = parseFloat(heightFeetInput.value);

      // If heightFeet is invalid, just clear warnings
      if (isNaN(heightFeet) || heightFeet <= 0) {
        dimensionWarningSpan.textContent = '';
        blockWarningSpan.textContent = '';
        return;
      }

      // If Absen & height > 16.40 ft & not flown => must fly
      if (product === 'absen' && heightFeet > 16.40 && !flownSupportCheckbox?.checked) {
        dimensionWarningSpan.textContent = '*** EXCEEDS LIMIT, MUST FLY***';
        blockWarningSpan.textContent = '';
        return;
      }

      // Convert height in feet to approximate tile count
      // 500 mm tile => ~1.64042 ft tall
      const tileHeightFeet = 1.64042;
      const blocksVerDim = Math.ceil(heightFeet / tileHeightFeet);

      // Apply the same logic as in tile mode
      if ((product === 'BP2B1' || product === 'BP2B2' || product === 'BP2V2' || product === 'theatrixx') &&
          blocksVerDim >= 9 && blocksVerDim <= 12 &&
          !flownSupportCheckbox?.checked) {
        dimensionWarningSpan.textContent = 'Will need to add schedule 40 pipe and double swivel cheeseboughs';
      } else if (blocksVerDim >= productVal && !flownSupportCheckbox?.checked) {
        dimensionWarningSpan.textContent = '*** EXCEEDS LIMIT, MUST FLY***';
      } else {
        dimensionWarningSpan.textContent = '';
      }

      // Clear block warning since we're in dimension mode
      blockWarningSpan.textContent = '';

    } else {
      // User is entering tile counts
      const blocksVer = parseInt(blocksVerInput.value, 10);
      if (isNaN(blocksVer) || blocksVer < 1) {
        // If invalid input, clear warnings
        blockWarningSpan.textContent = '';
        dimensionWarningSpan.textContent = '';
        return;
      }

      // For ROE (BP2/BP2V2) and Theatrixx: if vertical tiles are 9..12 & flown support is not checked
      if ((product === 'BP2B1' || product === 'BP2B2' || product === 'BP2V2' || product === 'theatrixx') &&
          blocksVer >= 9 && blocksVer <= 12 &&
          !flownSupportCheckbox?.checked) {
        blockWarningSpan.textContent = 'Will need to add schedule 40 pipe and hardware.Check with LED team';
      } else if (blocksVer >= productVal && !flownSupportCheckbox?.checked) {
        blockWarningSpan.textContent = '*** EXCEEDS LIMIT, MUST FLY***';
      } else {
        blockWarningSpan.textContent = '';
      }

      // Clear dimension warning since we're in tile mode
      dimensionWarningSpan.textContent = '';
    }
  },

  /**
   * Setup vertical warning element in the DOM
   */
  setupVerticalWarning() {
    const warningDiv = document.getElementById('warningDiv');
    if (!warningDiv) return;

    const warningSpan = document.createElement('div');
    warningSpan.id = 'blockVerticalWarning';
    warningSpan.className = 'warning';
    Object.assign(warningSpan.style, {
      color: 'red',
      fontWeight: 'bold',
      padding: '10px',
      display: 'block'
    });

    warningDiv.parentNode.insertBefore(warningSpan, warningDiv.nextSibling);
    this.updateWarning();
  },

  /**
   * Update height warning for aspect ratio selections
   * @param {number} height - Height value to check
   */
  updateHeightWarning(height) {
    const warningElement = document.getElementById('heightWarning');
    if (!warningElement) {
      const warningDiv = document.createElement('div');
      warningDiv.id = 'heightWarning';
      warningDiv.style.color = 'red';
      warningDiv.style.fontWeight = 'bold';
      warningDiv.style.padding = '10px';
      const screenSizeDropdown = document.getElementById('screenSizeDropdown');
      if (screenSizeDropdown) {
        screenSizeDropdown.parentNode.insertBefore(warningDiv, screenSizeDropdown.nextSibling);
      }
    }

    if (height > 18.4) {
      const blockWarning = document.getElementById('blockVerticalWarning');
      if (blockWarning) {
        blockWarning.textContent = '***EXCEEDS LIMIT, MUST FLY***';
      }
    } else {
      const heightWarningEl = document.getElementById('heightWarning');
      if (heightWarningEl) {
        heightWarningEl.textContent = '';
      }
    }
  },

  /**
   * Restrict ground support types (disable double base for curved walls)
   * @param {boolean} restrict - Whether to restrict options
   */
  restrictGroundSupportTypes(restrict) {
    const groundSupportType = document.getElementById('groundSupportType');
    if (groundSupportType) {
      if (restrict) {
        groundSupportType.value = 'Single Base';
        for (let option of groundSupportType.options) {
          option.disabled = (option.value === 'Double Base');
        }
      } else {
        for (let option of groundSupportType.options) {
          option.disabled = false;
        }
      }
    }
  },

  /**
   * Restrict flown support types (disable double header for curved walls)
   * @param {boolean} restrict - Whether to restrict options
   */
  restrictFlownSupportTypes(restrict) {
    const flownSupportType = document.getElementById('flownSupportType');
    if (flownSupportType) {
      if (restrict) {
        flownSupportType.value = 'Single Header';
        for (let option of flownSupportType.options) {
          option.disabled = (option.value === 'Double Header');
        }
      } else {
        for (let option of flownSupportType.options) {
          option.disabled = false;
        }
      }
    }
  },

  /**
   * Handle wall type changes (flat, concave, convex)
   */
  handleWallTypeChange() {
    const selectedWallType = document.querySelector('input[name="wallType"]:checked')?.value || 'Flat';
    const productType = document.getElementById('productType')?.value || 'absen';

    // Restrict ground/flown supports for concave/convex
    if (selectedWallType === 'Concave' || selectedWallType === 'Convex') {
      this.restrictGroundSupportTypes(true);
      this.restrictFlownSupportTypes(true);
    } else {
      this.restrictGroundSupportTypes(false);
      this.restrictFlownSupportTypes(false);
    }

    // Show product-specific curved wall messages
    const curvedMessageDiv = document.getElementById('curvedMessage');
    if (!curvedMessageDiv) return;

    // Absen message
    if (productType === 'absen' &&
        (selectedWallType === 'Concave' || selectedWallType === 'Convex')) {
      curvedMessageDiv.textContent = 'Curve in 2.5° increments -7.5° Convex to +10° Concave';
      curvedMessageDiv.style.display = 'block';
    }
    // ROE (BP2 / BP2V2) message
    else if ((productType === 'BP2B1' || productType === 'BP2B2' || productType === 'BP2V2') &&
             (selectedWallType === 'Concave' || selectedWallType === 'Convex')) {
      curvedMessageDiv.textContent = 'Reach LED team for questions with Corners or Curved walls';
      curvedMessageDiv.style.display = 'block';
    }
    // Theatrixx message
    else if (productType === 'theatrixx' &&
             (selectedWallType === 'Concave' || selectedWallType === 'Convex')) {
      curvedMessageDiv.textContent = 'Curve in 2.5° increments -5° Convex to +5° Concave';
      curvedMessageDiv.style.display = 'block';
    }
    // Otherwise, hide the message
    else {
      curvedMessageDiv.style.display = 'none';
      curvedMessageDiv.textContent = '';
    }

    // Regenerate the wall
    if (typeof generateWall === 'function') {
      generateWall();
    }
  },

  /**
   * Handle wall configuration changes (custom vs. popular formats)
   */
  handleWallConfigChange() {
    const customConfig = document.getElementById('customConfig');
    const popularFormatsDropdown = document.getElementById('popularFormatsDropdown');
    const blockInputs = document.getElementById('blockInputs');
    const dimensionInputs = document.getElementById('dimensionInputs');

    if (customConfig?.checked) {
      if (popularFormatsDropdown) popularFormatsDropdown.style.display = 'none';
      if (blockInputs) blockInputs.style.display = 'block';
      if (dimensionInputs) dimensionInputs.style.display = 'none';

      // Enable inputs
      const blocksHor = document.getElementById('blocksHor');
      const blocksVer = document.getElementById('blocksVer');
      const widthFeet = document.getElementById('widthFeet');
      const heightFeet = document.getElementById('heightFeet');

      if (blocksHor) blocksHor.disabled = false;
      if (blocksVer) blocksVer.disabled = false;
      if (widthFeet) widthFeet.disabled = false;
      if (heightFeet) heightFeet.disabled = false;
    } else {
      if (popularFormatsDropdown) popularFormatsDropdown.style.display = 'block';
      if (blockInputs) blockInputs.style.display = 'none';

      // Disable inputs
      const blocksHor = document.getElementById('blocksHor');
      const blocksVer = document.getElementById('blocksVer');
      const widthFeet = document.getElementById('widthFeet');
      const heightFeet = document.getElementById('heightFeet');

      if (blocksHor) blocksHor.disabled = true;
      if (blocksVer) blocksVer.disabled = true;
      if (widthFeet) widthFeet.disabled = true;
      if (heightFeet) heightFeet.disabled = true;

      this.handleAspectRatioChange();
    }
  },

  /**
   * Handle aspect ratio dropdown changes
   */
  handleAspectRatioChange() {
    const aspectRatioValue = document.getElementById('aspectRatio')?.value;
    const screenSizeDropdown = document.getElementById('screenSizeDropdown');
    const screenSizeSelect = document.getElementById('screenSize');

    if (!aspectRatioValue || !screenSizeDropdown || !screenSizeSelect) return;

    // Ratios that have specific screen sizes
    const ratiosWithSizes = ['1:1', '16:9', '32:9', '48:9', '4:3', '2:1', '3:1'];

    if (ratiosWithSizes.includes(aspectRatioValue)) {
      screenSizeDropdown.style.display = 'block';

      // Filter screen size options based on aspect ratio
      Array.from(screenSizeSelect.options).forEach(option => {
        if (option.dataset.aspect === aspectRatioValue || option.value === '') {
          option.style.display = '';
        } else {
          option.style.display = 'none';
        }
      });

      screenSizeSelect.value = '';
      this.updateHeightWarning(0);
    } else {
      screenSizeDropdown.style.display = 'none';
      screenSizeSelect.value = '';
      this.updateHeightWarning(0);
    }

    // Update blocks based on selection
    if (typeof updateBlocksFromAspectRatio === 'function') {
      updateBlocksFromAspectRatio();
    }
  },

  /**
   * Update wall (consolidated helper function)
   */
  updateWall() {
    this.handleWallTypeChange();

    if (typeof handleBlockInput === 'function') {
      handleBlockInput();
    }

    this.updateWarning();
  },

  /**
   * Setup all event listeners for the UI
   */
  setupEventListeners() {
    // Input mode toggle
    const blockInputRadio = document.getElementById('blockInput');
    const dimensionInputRadio = document.getElementById('dimensionInput');
    if (blockInputRadio) {
      blockInputRadio.addEventListener('change', () => this.toggleInputType());
    }
    if (dimensionInputRadio) {
      dimensionInputRadio.addEventListener('change', () => this.toggleInputType());
    }

    // Ground support
    const groundSupport = document.getElementById('groundSupport');
    if (groundSupport) {
      groundSupport.addEventListener('change', () => this.toggleGroundSupportOptions());
    }

    // Flown support
    const flownSupport = document.getElementById('flownSupport');
    if (flownSupport) {
      flownSupport.addEventListener('change', () => this.toggleFlownSupportOptions());
    }

    // Wall type radio buttons
    const wallTypeRadios = document.querySelectorAll('input[name="wallType"]');
    wallTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleWallTypeChange());
    });

    // Wall configuration (custom vs. popular formats)
    const customConfig = document.getElementById('customConfig');
    const popularFormats = document.getElementById('popularFormats');
    if (customConfig) {
      customConfig.addEventListener('change', () => this.handleWallConfigChange());
    }
    if (popularFormats) {
      popularFormats.addEventListener('change', () => this.handleWallConfigChange());
    }

    // Aspect ratio
    const aspectRatio = document.getElementById('aspectRatio');
    if (aspectRatio) {
      aspectRatio.addEventListener('change', () => this.handleAspectRatioChange());
    }

    // Screen size
    const screenSize = document.getElementById('screenSize');
    if (screenSize) {
      screenSize.addEventListener('change', () => {
        if (typeof updateBlocksFromAspectRatio === 'function') {
          updateBlocksFromAspectRatio();
        }
      });
    }

    // Product type change
    const productType = document.getElementById('productType');
    if (productType) {
      productType.addEventListener('change', () => {
        this.updateWarning();
        this.handleWallTypeChange();
      });
    }

    console.log('UI event listeners setup complete');
  }
};

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.UI = UI;
  window.toggleInputType = () => UI.toggleInputType();
  window.toggleGroundSupportOptions = () => UI.toggleGroundSupportOptions();
  window.toggleFlownSupportOptions = () => UI.toggleFlownSupportOptions();
  window.updateWarning = () => UI.updateWarning();
  window.setupVerticalWarning = () => UI.setupVerticalWarning();
  window.restrictGroundSupportTypes = (restrict) => UI.restrictGroundSupportTypes(restrict);
  window.restrictFlownSupportTypes = (restrict) => UI.restrictFlownSupportTypes(restrict);
  window.handleWallTypeChange = () => UI.handleWallTypeChange();
  window.handleWallConfigChange = () => UI.handleWallConfigChange();
  window.handleAspectRatioChange = () => UI.handleAspectRatioChange();
  window.displayIBoltWarning = (productType) => UI.displayIBoltWarning(productType);
  window.updateHeightWarning = (height) => UI.updateHeightWarning(height);
  window.updateWall = () => UI.updateWall();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UI };
}
