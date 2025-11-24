/**
 * Rentex LED Wall Calculator - Main Application Entry Point
 * Initializes the application and sets up error boundaries
 */

(function() {
  'use strict';

  /**
   * Initialize the application
   */
  function initApp() {
    try {
      console.log('Initializing Rentex LED Wall Calculator...');

      // Initialize state
      if (typeof AppState !== 'undefined') {
        AppState.init();
      }

      // Set up global error handler
      window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showError('An unexpected error occurred. Please refresh the page.');
      });

      // Set up unhandled promise rejection handler
      window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showError('An unexpected error occurred. Please refresh the page.');
      });

      // Add dynamic table style element
      const styleElement = document.createElement('style');
      styleElement.id = 'dynamicTableStyle';
      document.head.appendChild(styleElement);

      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      alert('Failed to initialize the calculator. Please refresh the page.');
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  /**
   * Expose global initialization function
   */
  window.RentexCalculator = {
    init: initApp,
    version: '2.0.0-refactored'
  };

})();
