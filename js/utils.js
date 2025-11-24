/**
 * Rentex LED Wall Calculator - Utility Functions
 * Helper functions for common operations
 */

/**
 * Debounce function to limit how often a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Round value to nearest dimension increment
 * @param {number} value - Value to round
 * @param {number} increment - Increment to round to
 * @param {number} min - Minimum allowed value
 * @returns {number} Rounded value
 */
function roundToDimension(value, increment, min) {
  return Math.max(min, Math.round(value / increment) * increment);
}

/**
 * Display user-friendly error message
 * @param {string} message - Error message to display
 * @param {string} type - Type of error (error, warning, info)
 */
function showError(message, type = 'error') {
  const errorDiv = document.getElementById('errorDisplay') || createErrorDisplay();
  errorDiv.textContent = message;
  errorDiv.className = `error-message ${type}`;
  errorDiv.style.display = 'block';

  // Auto-hide after 5 seconds for non-critical messages
  if (type !== 'error') {
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Create error display element if it doesn't exist
 * @returns {HTMLElement} Error display element
 */
function createErrorDisplay() {
  const errorDiv = document.createElement('div');
  errorDiv.id = 'errorDisplay';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    display: none;
  `;
  document.body.appendChild(errorDiv);
  return errorDiv;
}

/**
 * Hide error message
 */
function hideError() {
  const errorDiv = document.getElementById('errorDisplay');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

/**
 * Validate numeric input
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of field for error messages
 * @returns {number} Validated number
 * @throws {Error} If validation fails
 */
function validateNumber(value, min = 0, max = Infinity, fieldName = 'Value') {
  const num = parseFloat(value);

  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return num;
}

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @throws {Error} If validation fails
 */
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Safe wrapper for functions with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} errorMessage - Custom error message
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, errorMessage = 'An error occurred') {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error(errorMessage, error);
      showError(`${errorMessage}: ${error.message}`);
      return null;
    }
  };
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toLocaleString('en-US');
}

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @param {boolean} required - Whether element is required
 * @returns {HTMLElement|null} Element or null
 */
function getElement(id, required = true) {
  const element = document.getElementById(id);
  if (required && !element) {
    console.error(`Required element not found: ${id}`);
  }
  return element;
}

/**
 * Get element value with validation
 * @param {string} id - Element ID
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Element value or default
 */
function getElementValue(id, defaultValue = '') {
  const element = getElement(id, false);
  return element ? element.value : defaultValue;
}

/**
 * Set element value safely
 * @param {string} id - Element ID
 * @param {*} value - Value to set
 */
function setElementValue(id, value) {
  const element = getElement(id, false);
  if (element) {
    element.value = value;
  }
}

/**
 * Check if image is loaded
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise} Resolves when image is loaded
 */
function waitForImageLoad(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    } else {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load image'));
    }
  });
}

/**
 * Calculate spares based on total tiles
 * @param {number} totalTiles - Total number of tiles
 * @param {number} percentage - Spare percentage (default 10%)
 * @returns {number} Number of spare tiles
 */
function calculateSpares(totalTiles, percentage = 10) {
  return Math.ceil(totalTiles * (percentage / 100));
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Inject dynamic style into document
 * @param {string} css - CSS string to inject
 * @param {string} id - ID for the style element
 */
function injectStyle(css, id = 'dynamicTableStyle') {
  let styleElement = document.getElementById(id);

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = id;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    roundToDimension,
    showError,
    hideError,
    validateNumber,
    validateRequired,
    withErrorHandling,
    formatNumber,
    getElement,
    getElementValue,
    setElementValue,
    waitForImageLoad,
    calculateSpares,
    deepClone,
    injectStyle
  };
}

// Export to window for browser use
if (typeof window !== 'undefined') {
  window.debounce = debounce;
  window.roundToDimension = roundToDimension;
  window.showError = showError;
  window.hideError = hideError;
  window.validateNumber = validateNumber;
  window.validateRequired = validateRequired;
  window.withErrorHandling = withErrorHandling;
  window.formatNumber = formatNumber;
  window.getElement = getElement;
  window.getElementValue = getElementValue;
  window.setElementValue = setElementValue;
  window.waitForImageLoad = waitForImageLoad;
  window.calculateSpares = calculateSpares;
  window.deepClone = deepClone;
  window.injectStyle = injectStyle;
}
