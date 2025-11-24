/**
 * Rentex LED Wall Calculator - Export Module
 * Handles Excel export, screenshot capture, and email functionality
 */

/**
 * ExportManager namespace for all export functions
 */
const ExportManager = {

  /**
   * Get equipment list for a specific screen configuration
   * Used in multi-screen mode to gather equipment for each screen
   * @param {Object} config - Screen configuration object
   * @returns {Array} Array of equipment items with ecode, name, and quantity
   */
  getEquipmentForScreen(config) {
    if (!config) return [];

    // Calculate totals for this screen
    const totalBlocks = config.blocksHor * config.blocksVer;
    const sparePercentage = config.productType === 'theatrixx' ? 10 : 8;
    const spareFactor = config.productType === 'theatrixx' ? 2 : 1.5;

    let totalSpares;
    if (typeof Calculator !== 'undefined' && Calculator.calculateSpares) {
      totalSpares = Calculator.calculateSpares(totalBlocks, sparePercentage, spareFactor);
    } else if (typeof calcSpares === 'function') {
      totalSpares = calcSpares(totalBlocks, sparePercentage, spareFactor);
    } else {
      // Fallback calculation
      const sparesPercent = Math.ceil(totalBlocks * (sparePercentage / 100));
      totalSpares = sparesPercent;
    }

    const totalBlocksWithSpares = totalSpares + totalBlocks;

    // Build request data for equipment calculation
    const requestData = {
      productType: config.productType,
      blocksHor: config.blocksHor,
      blocksVer: config.blocksVer,
      totalBlocks,
      totalSpares,
      totalBlocksWithSpares,
      groundSupport: (config.supportType === 'groundSupport'),
      groundSupportType: (config.supportType === 'groundSupport') ? config.supportOption : null,
      flownSupport: (config.supportType === 'flownSupport'),
      flownSupportType: (config.supportType === 'flownSupport') ? config.supportOption : null,
      voltage: (config.powerDistroType == '110') ? 110 : 208,
      wallType: config.wallType,
      powerDistro: config.powerDistroType
    };

    // Use equipment collector to gather items
    window.equipmentCollector = [];
    window.isCollectingEquipment = true;

    try {
      // Call displayEquipment to populate collector
      if (typeof displayEquipment === 'function') {
        displayEquipment(requestData);
      }
    } catch (error) {
      console.error('Error collecting equipment:', error);
      window.isCollectingEquipment = false;
      return [];
    }

    // Stop collecting
    window.isCollectingEquipment = false;

    // Process equipment to ensure numeric quantities
    const processedEquipment = window.equipmentCollector.map(item => {
      return {
        ...item,
        quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity)
      };
    }).filter(item => item.quantity > 0 && !isNaN(item.quantity));

    return processedEquipment;
  },

  /**
   * Export equipment table to Excel file
   * Handles both single-screen and multi-screen modes
   * Creates XLSX file with equipment list and combined totals
   */
  exportToExcel() {
    const table = document.getElementById('equipmentTable');
    if (!table) return;

    const wb = XLSX.utils.book_new();

    // Define headers
    const headers = ['Main', 'Product', 'Equipment', 'QtyOrdered', 'Description', 'SortOrder'];
    const data = [];
    data.push(headers);

    // Initialize sort order counter
    let sortOrder = 1;

    // Create order map for consistent equipment ordering
    const equipmentOrderMap = {};
    let orderIndex = 0;

    // Check if in multiple screen mode
    const multipleScreens = window.multiScreenInitialized &&
                            document.getElementById('multipleScreenManagementCheckbox')?.checked &&
                            window.screenConfigurations &&
                            window.screenConfigurations.length > 1;

    // Build order map from first screen
    if (multipleScreens && window.screenConfigurations.length > 0) {
      const firstScreenEquipment = this.getEquipmentForScreen(window.screenConfigurations[0]);
      firstScreenEquipment.forEach(item => {
        const key = `${item.ecode}|${item.name}`;
        if (!(key in equipmentOrderMap)) {
          equipmentOrderMap[key] = orderIndex++;
        }
      });
    }

    if (multipleScreens) {
      try {
        // Export equipment for each screen separately
        window.screenConfigurations.forEach((config, index) => {
          // Add header row for this screen
          data.push(['', '', '', '', `===== EQUIPMENT FOR SCREEN ${index + 1} =====`, sortOrder++]);

          // Get equipment for this screen
          const screenEquipment = this.getEquipmentForScreen(config);

          // Add each equipment item
          screenEquipment.forEach(item => {
            if (item.quantity > 0) {
              const ecodes = item.ecode || '';
              const equipmentName = item.name || '';
              const qtyOrdered = typeof item.quantity === 'number' ?
                                 item.quantity.toString() :
                                 Number(item.quantity).toString();

              data.push([ecodes, ecodes, ecodes, qtyOrdered, equipmentName, sortOrder++]);
            }
          });

          // Add spacing between screens
          if (index < window.screenConfigurations.length - 1) {
            data.push(['', '', '', '', '', sortOrder++]);
          }
        });

        // Add combined equipment totals section
        data.push(['', '', '', '', '', sortOrder++]); // Empty row
        data.push(['', '', '', '', '===== COMBINED EQUIPMENT TOTALS =====', sortOrder++]);

        // Create map to combine quantities
        const combinedEquipment = {};

        // Loop through all screens and combine equipment
        window.screenConfigurations.forEach(config => {
          const screenEquipment = this.getEquipmentForScreen(config);
          screenEquipment.forEach(item => {
            const qty = Number(item.quantity);
            if (qty > 0) {
              const key = `${item.ecode.trim()}|${item.name.trim()}`;
              if (!combinedEquipment[key]) {
                combinedEquipment[key] = {
                  ecode: item.ecode,
                  name: item.name,
                  quantity: 0,
                  order: key in equipmentOrderMap ? equipmentOrderMap[key] : 999999
                };
              }
              combinedEquipment[key].quantity = Number(combinedEquipment[key].quantity) + qty;
            }
          });
        });

        // Validate quantities are numbers
        Object.values(combinedEquipment).forEach(item => {
          if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
            console.warn(`Found non-numeric quantity for ${item.name}: ${item.quantity}`);
            item.quantity = 0;
          }
        });

        // Sort combined equipment by original order
        const consolidatedEquipment = Object.values(combinedEquipment);
        consolidatedEquipment.sort((a, b) => a.order - b.order);

        // Add combined equipment to data
        consolidatedEquipment.forEach(item => {
          const ecodes = item.ecode || '';
          const equipmentName = item.name || '';
          const qtyOrdered = typeof item.quantity === 'number' ?
                             item.quantity.toString() :
                             Number(item.quantity).toString();

          // Skip invalid quantities
          if (item.quantity <= 0 || isNaN(item.quantity)) {
            console.warn(`Skipping item with invalid quantity: ${equipmentName}, quantity: ${item.quantity}`);
            return;
          }

          data.push([ecodes, ecodes, ecodes, qtyOrdered, equipmentName, sortOrder++]);
        });

      } catch (error) {
        console.error('Error in multiple screen export:', error);
        alert('There was an error exporting multiple screen equipment. Falling back to single screen export.');

        // Fallback to single screen export
        this.exportSingleScreen(table, data, sortOrder);
      }
    } else {
      // Single screen mode - export current table
      this.exportSingleScreen(table, data, sortOrder);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Equipment');

    // Adjust column widths
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLength = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = { c: C, r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = ws[cellRef];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        }
      }
      colWidths.push({ wch: maxLength + 2 });
    }
    ws['!cols'] = colWidths;

    // Save file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    XLSX.writeFile(wb, `Equipment_Requirements_${timestamp}.xlsx`);

    // Open order system
    window.open('https://rentextest.east.rtprosl.com/order-header?toolMode=add&detailMode=full-screen', '_blank');
  },

  /**
   * Export single screen table to data array
   * Helper function for exportToExcel
   * @param {HTMLTableElement} table - Equipment table element
   * @param {Array} data - Data array to populate
   * @param {number} sortOrder - Starting sort order number
   */
  exportSingleScreen(table, data, sortOrder) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      const ecodes = cells[0] ? cells[0].textContent.trim() : '';
      const equipmentName = cells[1] ? cells[1].textContent.trim() : '';
      const qtyOrdered = cells[2] ? cells[2].textContent.trim() : '';

      // Skip total weight rows
      if (equipmentName.toLowerCase().includes('total weight')) {
        return;
      }

      data.push([ecodes, ecodes, ecodes, qtyOrdered, equipmentName, sortOrder++]);
    });
  },

  /**
   * Capture screenshot of entire page and prepare for email
   * Uses html2canvas to capture page, copies to clipboard (or downloads on iOS),
   * and opens email client with pre-filled LED quote information
   */
  async captureEntireScreen() {
    function isIOS() {
      return /iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function fallbackDownload(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screenshot.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Save current zoom level and set to 100% for capture
    const htmlElement = document.documentElement;
    const originalZoom = htmlElement.style.zoom;
    htmlElement.style.zoom = '100%';

    // Wait for layout to adjust to new zoom
    await new Promise(resolve => setTimeout(resolve, 300));

    // Scroll to top for consistent capture
    window.scrollTo(0, 0);

    // Get the actual content height
    const contentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    // Capture page using html2canvas with explicit dimensions
    html2canvas(document.body, {
      scale: 3,
      allowTaint: true,
      useCORS: true,
      logging: true,
      letterRendering: true,
      windowHeight: contentHeight,
      height: contentHeight,
      onclone: (clonedDoc) => {
        // Hide header to save space for equipment table
        const header = clonedDoc.querySelector('header');
        if (header) {
          header.style.display = 'none';
        }

        // Ensure cloned document has full height and no overflow
        clonedDoc.body.style.height = 'auto';
        clonedDoc.body.style.minHeight = contentHeight + 'px';
        clonedDoc.body.style.overflow = 'visible';
        clonedDoc.documentElement.style.height = 'auto';
        clonedDoc.documentElement.style.minHeight = contentHeight + 'px';
        clonedDoc.documentElement.style.overflow = 'visible';

        // Force all containers to be fully visible without scrolling
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach(el => {
          // Remove any overflow hidden/scroll constraints
          if (el.style.overflow === 'hidden' || el.style.overflow === 'scroll' || el.style.overflow === 'auto') {
            el.style.overflow = 'visible';
          }
          // Remove max-height constraints
          if (el.style.maxHeight && el.style.maxHeight !== 'none') {
            el.style.maxHeight = 'none';
          }
          // Ensure auto height
          if (el.id === 'controls' || el.id === 'topSection' || el.id === 'fullPage') {
            el.style.height = 'auto';
            el.style.minHeight = 'fit-content';
          }
          // Font styling
          el.style.fontFamily = 'Arial, Helvetica, sans-serif';
          el.style.letterSpacing = '0.02em';
          el.style.wordSpacing = '0.1em';
        });

        // Replace form elements with text for better rendering
        const configContainer = clonedDoc.getElementById('configContainer');
        if (configContainer) {
          // Replace all inputs and selects with plain text
          const formElements = configContainer.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], select');
          formElements.forEach(element => {
            const textValue = element.tagName === 'SELECT'
              ? element.options[element.selectedIndex]?.text || element.value
              : element.value;

            const textSpan = clonedDoc.createElement('span');
            textSpan.textContent = textValue || '';
            textSpan.style.cssText = `
              display: inline-block;
              padding: 0px 0px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
              min-width: 150px;
              font-size: 14px;
              font-family: Arial, Helvetica, sans-serif;
            `;

            element.parentNode.replaceChild(textSpan, element);
          });
        }

        // Copy canvas elements to cloned document
        const originalCanvasList = document.querySelectorAll('canvas');
        const clonedCanvasList = clonedDoc.querySelectorAll('canvas');
        clonedCanvasList.forEach((clonedCanvas, index) => {
          const originalCanvas = originalCanvasList[index];
          if (originalCanvas) {
            clonedCanvas.width = originalCanvas.width;
            clonedCanvas.height = originalCanvas.height;
            const context = clonedCanvas.getContext('2d');
            context.drawImage(originalCanvas, 0, 0);
          }
        });
      }
    })
    .then((canvas) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to create image blob.');
          return;
        }

        // For iOS: download, for others: copy to clipboard
        if (isIOS()) {
          fallbackDownload(blob);
        } else {
          try {
            const clipboardItem = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([clipboardItem]);
            alert('Screenshot Captured, please paste in email');
          } catch (clipboardError) {
            console.error('Clipboard copy error:', clipboardError);
            fallbackDownload(blob);
          }
        }

        // Prepare email with quote information
        const blocksHor = parseInt(document.getElementById('blocksHor')?.value || 0, 10);
        const blocksVer = parseInt(document.getElementById('blocksVer')?.value || 0, 10);
        const totalTiles = blocksHor * blocksVer;
        const orderNumber = document.getElementById('orderNumber')?.value || 'Unknown';
        const location = document.getElementById('location')?.value || 'Not provided';
        const orderDate = document.getElementById('orderDate')?.value || 'Not provided';
        const productTypeSelect = document.getElementById('productType');
        const productTypeName = productTypeSelect ?
                                productTypeSelect.options[productTypeSelect.selectedIndex].text :
                                'Unknown';

        const emailSubject = `LED Quote Approval - Order# ${orderNumber}`;
        const emailBody = encodeURIComponent(
          'Dates: ' + orderDate + '\n\n' +
          'Location: ' + location + '\n\n' +
          'LED Walls\n\n' +
          'Make/Model: ' + productTypeName + '\n\n' +
          'Can they use any other make/model: \n\n' +
          '# tiles: ' + totalTiles + '\n\n' +
          'x tiles wide: ' + blocksHor + '\n\n' +
          'y tiles tall: ' + blocksVer
        );

        // Open email client
        window.location.href = `mailto:LEDPanel@rentex.com?subject=${emailSubject}&body=${emailBody}`;

        // Restore original zoom level
        htmlElement.style.zoom = originalZoom || '90%';
      });
    })
    .catch((error) => {
      console.error('Canvas capture error:', error);
      alert('Screenshot capture failed. Check console for details.');

      // Restore original zoom level even on error
      htmlElement.style.zoom = originalZoom || '90%';
    });
  }
};

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
  window.exportToExcel = () => ExportManager.exportToExcel();
  window.captureEntireScreen = () => ExportManager.captureEntireScreen();
  window.getEquipmentForScreen = (config) => ExportManager.getEquipmentForScreen(config);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExportManager };
}
