/**
 * Rentex LED Wall Calculator - State Management
 * Centralized state management for the application
 */

const AppState = {
  // Configuration state
  config: {
    zoomLevel: 1,
    showNumbers: true,
    totalWeight: 0,
    hasChecked: false,
    blockSizeMM: CONSTANTS.BLOCK_SIZE_MM,
    blockSizeFeet: CONSTANTS.BLOCK_SIZE_FEET
  },

  // Flags for preventing recursive updates
  flags: {
    isUpdatingDimensions: false,
    isUpdatingBlocks: false,
    isSpinnerVisible: false
  },

  // Spinner control
  spinner: {
    timeout: null
  },

  // Block image
  blockImage: null,

  // Screen configurations (for multi-screen management)
  screenConfigurations: [],

  /**
   * Initialize state
   */
  init() {
    this.blockImage = new Image();
    this.blockImage.src = 'static/images/block.png';
    this.blockImage.onload = () => {
      console.log('Block image loaded successfully.');
    };
    this.blockImage.onerror = () => {
      console.error('Failed to load the block image.');
      showError('Unable to load block image. Please check the image path.');
    };
  },

  /**
   * Get current form data
   * @returns {Object} Current configuration data
   */
  getFormData() {
    try {
      const productType = getElementValue('productType', 'absen');
      const blocksHor = validateNumber(getElementValue('blocksHor', 5), 1, 100, 'Horizontal tiles');
      const blocksVer = validateNumber(getElementValue('blocksVer', 5), 1, 100, 'Vertical tiles');
      const widthFeet = parseFloat(getElementValue('widthFeet', 1));
      const heightFeet = parseFloat(getElementValue('heightFeet', 1));
      const wallType = document.querySelector('input[name="wallType"]:checked')?.value || 'Flat';
      const supportType = document.querySelector('input[name="supportType"]:checked')?.value || 'groundSupport';
      const groundSupportType = getElementValue('groundSupportType', 'Single Base');
      const flownSupportType = getElementValue('flownSupportType', 'Double Header');
      const powerDistroType = getElementValue('powerDistroType', 'Auto');
      const redundancy = getElementValue('redundancy', 'None');
      const sourceSignals = validateNumber(getElementValue('sourceSignals', 1), 1, 15, 'Source signals');
      const voltage = powerDistroType === '110' ? 110 : 208;

      return {
        productType,
        blocksHor,
        blocksVer,
        widthFeet,
        heightFeet,
        wallType,
        supportType,
        groundSupportType,
        flownSupportType,
        powerDistroType,
        redundancy,
        sourceSignals,
        voltage,
        totalBlocks: blocksHor * blocksVer,
        isGroundSupport: supportType === 'groundSupport',
        isFlownSupport: supportType === 'flownSupport'
      };
    } catch (error) {
      showError(`Invalid form data: ${error.message}`);
      throw error;
    }
  },

  /**
   * Reset state to defaults
   */
  reset() {
    this.config.zoomLevel = 1;
    this.config.totalWeight = 0;
    this.config.hasChecked = false;
    this.flags.isUpdatingDimensions = false;
    this.flags.isUpdatingBlocks = false;
    this.screenConfigurations = [];
  }
};

// Initialize state when script loads
if (typeof CONSTANTS !== 'undefined') {
  // State depends on constants being loaded
  AppState.config.blockSizeMM = CONSTANTS.BLOCK_SIZE_MM;
  AppState.config.blockSizeFeet = CONSTANTS.BLOCK_SIZE_FEET;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppState;
}
