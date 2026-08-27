/**
 * Rentex LED Wall Calculator - Export Module
 * Handles Excel export, screenshot capture, and email functionality
 */

/**
 * ExportManager namespace for all export functions
 */
const ExportManager = {

  /**
   * Resolve a screen configuration into the same request object generateWall()
   * hands to displayEquipment(). This is the single source of truth for a
   * screen's specs — tile counts, spares, GP2 row layout, power inputs — so the
   * per-screen headers, the per-screen equipment lists, the combined totals and
   * the Excel/PDF exports all describe the same wall.
   * @param {Object} config - Screen configuration object
   * @returns {Object|null} Request data for displayEquipment, or null
   */
  getScreenSpec(config) {
    if (!config) return null;

    const productType = config.productType;
    const blocksHor = parseInt(config.blocksHor, 10) || 0;

    // ---- Mirror generateWall()'s GP2 row detection -------------------------
    // Fractional blocksVer (e.g. 5.5) means auto Half rows; the manual
    // checkbox is additive on top of that.
    const blocksVerRaw = parseFloat(config.blocksVer) || 0;
    const blocksVerWhole = Math.floor(blocksVerRaw);
    const isGP2Full = productType === 'ROEGP26Full';
    const hasFractional = (blocksVerRaw % 1) !== 0;

    // Only GP2.6 Full turns a fractional height into Half rows; for every other
    // product generateWall() just carries the fraction through as the display height.
    const gp2HalfAutoRows = (isGP2Full && hasFractional) ? Math.round((blocksVerRaw % 1) * 2) : 0;
    const gp2HalfManualRows = (config.gp2HalfEnabled && isGP2Full)
      ? (parseInt(config.gp2HalfCount, 10) || 1) : 0;
    const gp2HalfRows = gp2HalfAutoRows + gp2HalfManualRows;
    const gp2HalfBottomRow = gp2HalfRows > 0;
    const gp2HalfPosition = config.gp2HalfPosition || 'bottom';

    // Additional whole GP2 Full rows (separate checkbox)
    const gp2FullRowManualRows = (config.gp2FullRowEnabled && isGP2Full)
      ? (parseInt(config.gp2FullRowCount, 10) || 1) : 0;
    const gp2FullRowManualPosition = config.gp2FullRowPosition || 'bottom';

    // generateWall() hands equipment.js the *display* height (whole Full rows
    // plus half-height rows plus any extra Full rows), not the raw whole count.
    let displayBlocksVer = hasFractional ? blocksVerRaw : blocksVerWhole;
    if (gp2HalfManualRows > 0) {
      displayBlocksVer = blocksVerWhole + (gp2HalfAutoRows / 2) + (gp2HalfManualRows / 2);
    }
    if (gp2FullRowManualRows > 0) {
      displayBlocksVer = displayBlocksVer + gp2FullRowManualRows;
    }

    // ---- Tile / spare totals ----------------------------------------------
    // These must come from the same Calculator helpers generateWall() uses, or
    // the per-screen tile counts will not match the main equipment list.
    const roeGraphiteMixEnabled = !!config.roeGraphiteMixEnabled;
    let graphiteMixData = null;
    let totalBlocks;
    let totalSpares;
    let totalBlocksWithSpares;

    if (roeGraphiteMixEnabled && typeof Calculator !== 'undefined' && Calculator.calculateGraphiteMixTotals) {
      graphiteMixData = Calculator.calculateGraphiteMixTotals({
        halfHorizontal: config.halfHorizontal,
        halfVertical: config.halfVertical,
        fullHorizontal: config.fullHorizontal,
        fullVertical: config.fullVertical,
        halfSpareOverride: config.mixHalfSpareOverride,
        fullSpareOverride: config.mixFullSpareOverride
      });
      totalBlocks = graphiteMixData.halfTiles + graphiteMixData.fullTiles;
      totalSpares = graphiteMixData.halfSpares + graphiteMixData.fullSpares;
      totalBlocksWithSpares = totalBlocks + totalSpares;
    } else {
      // Half rows replace Full rows, so the Full tile count uses whole rows only.
      totalBlocks = blocksHor * blocksVerWhole;

      // The spare-tiles slider only applies to the standard (non-mix) Graphite modes.
      const isGraphiteProduct = isGP2Full || productType === 'ROEGP26Half';
      const spareOverride = isGraphiteProduct ? (config.spareOverride ?? null) : null;

      if (typeof Calculator !== 'undefined' && Calculator.calculateTileTotals) {
        const totals = Calculator.calculateTileTotals({ productType, totalBlocks, spareOverride });
        totalSpares = totals.totalSpares;
        totalBlocksWithSpares = totals.totalBlocksWithSpares;
      } else {
        // Fallback: percentage formula (matches non-Graphite products)
        totalSpares = Math.ceil(totalBlocks * ((productType === 'theatrixx' ? 10 : 8) / 100));
        totalBlocksWithSpares = totalBlocks + totalSpares;
      }
    }

    // ---- Build the same request object generateWall() builds ---------------
    const requestData = {
      productType,
      blocksHor,
      blocksVer: displayBlocksVer,
      totalBlocks,
      totalSpares,
      totalBlocksWithSpares,
      groundSupport: (config.supportType === 'groundSupport'),
      groundSupportType: (config.supportType === 'groundSupport') ? config.supportOption : null,
      flownSupport: (config.supportType === 'flownSupport'),
      flownSupportType: (config.supportType === 'flownSupport') ? config.supportOption : null,
      voltage: (config.powerDistroType == '110') ? 110 : 208,
      wallType: config.wallType,
      powerDistro: config.powerDistroType,
      selectedDistroType: config.powerDistroType,
      gp2HalfBottomRow,
      gp2HalfRows,
      gp2HalfAutoRows,
      gp2HalfManualRows,
      gp2HalfPosition,
      gp2HalfManualPosition: gp2HalfPosition,
      gp2HalfRowSpareOverride: (isGP2Full && gp2HalfRows > 0)
        ? (config.gp2HalfRowSpareOverride ?? null)
        : null,
      gp2FullVerticalBlocks: blocksVerWhole,
      gp2FullRowManualRows,
      gp2FullRowManualPosition,
      roeGraphiteMixEnabled,
      graphiteMixData,
      // Redundancy and source signals for processor calculations
      redundancyType: config.redundancy || 'None',
      sourceSignalCount: config.sourceSignals || 1,
      // Dummy tile settings (blankRows is how equipment.js expects it)
      blankRows: (config.dummyTiles && config.dummyTileCount > 0) ? config.dummyTileCount : 0
    };

    return requestData;
  },

  /**
   * Get equipment list for a specific screen configuration
   * Used in multi-screen mode to gather equipment for each screen
   * @param {Object} config - Screen configuration object
   * @returns {Array} Array of equipment items with ecode, name, and quantity
   */
  getEquipmentForScreen(config) {
    const requestData = this.getScreenSpec(config);
    if (!requestData) return [];

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

    // Check if in multiple screen mode
    const multipleScreens = window.multiScreenInitialized &&
      document.getElementById('multipleScreenManagementCheckbox')?.checked &&
      window.screenConfigurations &&
      window.screenConfigurations.length > 1;

    if (multipleScreens) {
      try {
        // Fetch equipment for every screen once, reuse for both per-screen rows and combined totals
        const allScreenEquipment = window.screenConfigurations.map(config =>
          this.getEquipmentForScreen(config)
        );

        // Export equipment for each screen separately
        allScreenEquipment.forEach((screenEquipment, index) => {
          data.push(['', '', '', '', `===== EQUIPMENT FOR SCREEN ${index + 1} =====`, sortOrder++]);

          screenEquipment.forEach(item => {
            if (item.quantity > 0) {
              const ecodes = item.ecode || '';
              const qtyOrdered = typeof item.quantity === 'number' ?
                item.quantity.toString() :
                Number(item.quantity).toString();
              data.push([ecodes, ecodes, ecodes, qtyOrdered, item.name || '', sortOrder++]);
            }
          });

          if (index < allScreenEquipment.length - 1) {
            data.push(['', '', '', '', '', sortOrder++]);
          }
        });

        // Build combined totals using the same positional-merge order as the web page:
        // new items from later screens are inserted right after their preceding neighbor.
        const combinedEquipment = {};
        const combinedEquipmentOrder = []; // ordered list of keys, same as web page

        allScreenEquipment.forEach(screenEquipment => {
          const screenKeys = [];
          for (const item of screenEquipment) {
            if (item.quantity > 0) {
              // Merge on the normalized name so per-screen descriptive suffixes
              // (case splits, row placement) don't split one ecode across rows.
              const key = MultiScreenManager.combinedEquipmentKey(item);
              screenKeys.push(key);

              if (!combinedEquipment[key]) {
                combinedEquipment[key] = {
                  ecode: item.ecode,
                  name: MultiScreenManager.normalizeEquipmentName(item.name),
                  quantity: 0
                };
                // Insert at the position right after the last known preceding neighbor
                let insertIdx = combinedEquipmentOrder.length;
                for (let i = screenKeys.length - 2; i >= 0; i--) {
                  const prevPos = combinedEquipmentOrder.indexOf(screenKeys[i]);
                  if (prevPos !== -1) { insertIdx = prevPos + 1; break; }
                }
                combinedEquipmentOrder.splice(insertIdx, 0, key);
              }
              combinedEquipment[key].quantity = Number(combinedEquipment[key].quantity) + Number(item.quantity);
            }
          }
        });

        // Add combined equipment totals section
        data.push(['', '', '', '', '', sortOrder++]); // Empty row
        const modeLabel = window.screenCombineMode === 'single' ? 'SINGLE ROOM' : 'INDIVIDUAL ROOMS';
        data.push(['', '', '', '', `===== COMBINED EQUIPMENT TOTALS (${modeLabel}) =====`, sortOrder++]);

        // If Single Room mode, replace processing/distro/cables with recalculated values
        const isSingleRoom = window.screenCombineMode === 'single';
        if (isSingleRoom && typeof window.calculateSingleRoomEquipment === 'function') {
          const singleRoomData = window.calculateSingleRoomEquipment();

          const recalcEcodes = new Set([
            'SX40', 'XD10', 'S8', 'MX40PRO',
            'CUBEDIST', 'TP1', 'L2130T1FB', 'SOCA6XTRU1', 'TXT32SOCA',
            'CAT5ES005', 'ECON010C6', 'ECON050C6', 'ECON100C6', 'ECON1M',
            'T1025', 'T1003', 'EDT110M', 'TXT32ED6', 'TXT32T125'
          ]);

          // Remove recalculated items from the positional order list and map
          for (let i = combinedEquipmentOrder.length - 1; i >= 0; i--) {
            const key = combinedEquipmentOrder[i];
            if (recalcEcodes.has(combinedEquipment[key]?.ecode)) {
              combinedEquipmentOrder.splice(i, 1);
              delete combinedEquipment[key];
            }
          }

          // Append recalculated items at the end (processing/distro/cables go last)
          singleRoomData.recalcItems.forEach(item => {
            if (item.quantity > 0) {
              const key = `${(item.ecode || '').trim()}|${(item.name || '').trim()}`;
              combinedEquipment[key] = { ecode: item.ecode, name: item.name, quantity: item.quantity };
              if (!combinedEquipmentOrder.includes(key)) combinedEquipmentOrder.push(key);
            }
          });
        }

        // Emit combined rows in web-page order
        combinedEquipmentOrder.forEach(key => {
          const item = combinedEquipment[key];
          if (!item || item.quantity <= 0 || isNaN(item.quantity)) return;
          const ecodes = item.ecode || '';
          const qtyOrdered = Number(item.quantity).toString();
          data.push([ecodes, ecodes, ecodes, qtyOrdered, item.name || '', sortOrder++]);
        });

        // Add performance totals for the combined system
        data.push(['', '', '', '', '', sortOrder++]); // Spacer
        data.push(['', '', '', '', '===== SYSTEM PERFORMANCE TOTALS =====', sortOrder++]);

        let totalCombinedPixels = 0;
        let totalCombinedWatts = 0;
        let totalCombinedAmps = 0;
        let totalCombinedHorPixels = 0;
        let totalCombinedVerPixels = 0;

        if (window.screenCombineMode === 'single' && typeof window.calculateSingleRoomEquipment === 'function') {
          const singleRoomData = window.calculateSingleRoomEquipment();
          totalCombinedPixels = singleRoomData.totalPixels || 0;
          totalCombinedHorPixels = singleRoomData.totalHorPixels || 0;
          totalCombinedVerPixels = singleRoomData.totalVerPixels || 0;
          totalCombinedWatts = singleRoomData.power.watts || 0;
          totalCombinedAmps = singleRoomData.power.amps || 0;
        } else {
          if (typeof MultiScreenManager !== 'undefined' && MultiScreenManager.calculateCombinedProcessing) {
            const processingResults = MultiScreenManager.calculateCombinedProcessing();
            totalCombinedPixels = processingResults.totalPixels || 0;
            totalCombinedHorPixels = processingResults.totalHorPixels || 0;
            totalCombinedVerPixels = processingResults.totalVerPixels || 0;
            totalCombinedWatts = processingResults.totalWatts || 0;
            totalCombinedAmps = processingResults.totalAmps110 + processingResults.totalAmps208;
          }
        }

        data.push(['', '', '', '', `Total Screen Pixels: ${totalCombinedPixels.toLocaleString()} px`, sortOrder++]);
        data.push(['', '', '', '', `Total Horizontal Pixels: ${totalCombinedHorPixels.toLocaleString()} px`, sortOrder++]);
        data.push(['', '', '', '', `Total Vertical Pixels: ${totalCombinedVerPixels.toLocaleString()} px`, sortOrder++]);
        data.push(['', '', '', '', `Total Power: ${totalCombinedWatts.toFixed(2)}W`, sortOrder++]);
        data.push(['', '', '', '', `Total Amperage: ${totalCombinedAmps.toFixed(2)}A`, sortOrder++]);

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
   * Build a map from equipment code to image file path
   * Uses the EQUIPMENT constants which store image filenames
   * @returns {Object} Map of ecode -> image path
   */
  buildImageMap() {
    const imageMap = {};
    if (typeof EQUIPMENT !== 'undefined') {
      Object.values(EQUIPMENT).forEach(item => {
        if (item.image) {
          imageMap[item.code] = 'static/images/equipment/' + item.image;
        }
      });
    }
    return imageMap;
  },

  /**
   * Load an image and return it as a base64 data URL
   * @param {string} src - Image file path
   * @returns {Promise<string|null>} Base64 data URL or null if load fails
   */
  loadImageAsBase64(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = src;
    });
  },

  /**
   * Get current equipment data from table or multi-screen configs
   * Returns a flat array of { ecode, name, quantity, weight } items
   * @returns {Array} Equipment items
   */
  getCurrentEquipmentData() {
    const multipleScreens = window.multiScreenInitialized &&
      document.getElementById('multipleScreenManagementCheckbox')?.checked &&
      window.screenConfigurations &&
      window.screenConfigurations.length > 1;

    if (multipleScreens) {
      // Combine equipment from all screens
      const combinedEquipment = {};
      window.screenConfigurations.forEach(config => {
        const screenEquipment = this.getEquipmentForScreen(config);
        screenEquipment.forEach(item => {
          const qty = Number(item.quantity);
          if (qty > 0) {
            const key = MultiScreenManager.combinedEquipmentKey(item);
            if (!combinedEquipment[key]) {
              combinedEquipment[key] = {
                ecode: item.ecode,
                name: MultiScreenManager.normalizeEquipmentName(item.name),
                quantity: 0,
                weight: Number(item.weight) || 0
              };
            }
            combinedEquipment[key].quantity += qty;
          }
        });
      });

      // In Single Room mode, replace processing/distro/cable items with recalculated totals
      if (window.screenCombineMode === 'single' && typeof window.calculateSingleRoomEquipment === 'function') {
        const singleRoomData = window.calculateSingleRoomEquipment();

        // Remove items that get recalculated
        Object.keys(combinedEquipment).forEach(key => {
          if (MultiScreenManager.isSingleRoomRecalcItem(combinedEquipment[key].ecode)) {
            delete combinedEquipment[key];
          }
        });

        // Add recalculated items
        singleRoomData.recalcItems.forEach(item => {
          if (item.quantity > 0) {
            const key = `${(item.ecode || '').trim()}|${(item.name || '').trim()}`;
            combinedEquipment[key] = {
              ecode: item.ecode,
              name: item.name,
              quantity: item.quantity,
              weight: Number(item.weight) || 0
            };
          }
        });
      }

      return Object.values(combinedEquipment).filter(item => item.quantity > 0);
    } else {
      // Read from current equipment table
      const table = document.getElementById('equipmentTable');
      if (!table) return [];
      const items = [];
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const ecode = cells[0] ? cells[0].textContent.trim() : '';
        const name = cells[1] ? cells[1].textContent.trim() : '';
        const quantity = cells[2] ? Number(cells[2].textContent.trim()) : 0;
        const weight = cells[3] ? Number(cells[3].textContent.trim()) : 0;
        if (name && !name.toLowerCase().includes('total weight') && quantity > 0) {
          items.push({ ecode, name, quantity, weight });
        }
      });
      return items;
    }
  },

  /**
   * Dynamically load a script and return a promise that resolves when loaded
   * @param {string} src - Script URL
   * @returns {Promise<void>}
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  },

  /**
   * Ensure jsPDF and autoTable plugin are loaded (on-demand)
   * Loads jsPDF first, then the autoTable plugin which depends on it
   * @returns {Promise<void>}
   */
  async ensurePDFLibraries() {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    }
    // autoTable must load after jsPDF
    if (typeof jspdf !== 'undefined' && jspdf.jsPDF && !jspdf.jsPDF.prototype.autoTable) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js');
    }
  },

  /**
   * Export equipment list as PDF with embedded product images
   * Uses jsPDF with autoTable plugin
   * Images are loaded from static/images/equipment/ directory
   */
  async exportToPDF() {
    const equipmentItems = this.getCurrentEquipmentData();
    if (equipmentItems.length === 0) {
      alert('No equipment to export. Please configure a wall first.');
      return;
    }

    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdfLoadingIndicator';
    loadingDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    loadingDiv.innerHTML = '<div style="background:white;padding:30px 50px;border-radius:10px;font-size:18px;font-family:Arial,sans-serif;">Generating PDF with images...</div>';
    document.body.appendChild(loadingDiv);

    try {
      // Load PDF libraries on-demand (jsPDF first, then autoTable)
      await this.ensurePDFLibraries();

      const { jsPDF } = jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Build image map and preload all images
      const imageMap = this.buildImageMap();
      const imageCache = {};

      // Preload all equipment images
      const uniqueEcodes = [...new Set(equipmentItems.map(item => item.ecode))];
      await Promise.all(uniqueEcodes.map(async (ecode) => {
        const imagePath = imageMap[ecode];
        if (imagePath) {
          imageCache[ecode] = await this.loadImageAsBase64(imagePath);
        }
      }));

      // Load Rentex logo
      let logoData = null;
      try {
        const logoResult = await this.loadImageAsBase64('static/images/rentexLogo.png');
        if (logoResult) logoData = logoResult.data;
      } catch (e) {
        console.warn('Could not load Rentex logo for PDF');
      }

      // --- Draw PDF Header ---
      let yPos = margin;

      // Logo
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, yPos, 120, 38);
      }

      // Order info on the right
      const orderNumber = document.getElementById('orderNumber')?.value || '';
      const orderDate = document.getElementById('orderDate')?.value || '';
      const location = document.getElementById('location')?.value || '';
      const productTypeSelect = document.getElementById('productType');
      const productTypeName = productTypeSelect ?
        productTypeSelect.options[productTypeSelect.selectedIndex].text :
        '';

      doc.setFontSize(10);
      doc.setTextColor(100);
      const rightX = pageWidth - margin;
      if (orderNumber) {
        doc.text(`Order #: ${orderNumber}`, rightX, yPos + 12, { align: 'right' });
      }
      if (orderDate) {
        doc.text(`Date: ${orderDate}`, rightX, yPos + 24, { align: 'right' });
      }
      if (location) {
        doc.text(`Location: ${location}`, rightX, yPos + 36, { align: 'right' });
      }

      yPos += 50;

      // Title
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Equipment List', pageWidth / 2, yPos, { align: 'center' });
      if (productTypeName) {
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(productTypeName, pageWidth / 2, yPos + 16, { align: 'center' });
      }
      yPos += 30;

      // Separator line
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // --- Equipment Table with Images ---
      // Image cell size: 60x60 pt (~0.83 inches, from 300x300 source)
      const imgCellSize = 60;
      const rowPadding = 5;
      const rowHeight = imgCellSize + (rowPadding * 2);

      // Build a quick lookup: row index -> has image loaded
      const rowHasImage = equipmentItems.map(item => !!(imageCache[item.ecode] && imageCache[item.ecode].data));
      const hasAnyImages = rowHasImage.some(Boolean);

      // Always include Image column so layout is ready as images are added
      const columns = [
        { header: 'Image', dataKey: 'image' },
        { header: 'Ecode', dataKey: 'ecode' },
        { header: 'Equipment Name', dataKey: 'name' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Total Weight (lbs)', dataKey: 'weight' }
      ];

      // Table data
      const tableData = equipmentItems.map(item => ({
        image: '',
        ecode: item.ecode,
        name: item.name,
        quantity: item.quantity.toString(),
        weight: item.weight ? (Number(item.weight) * item.quantity).toFixed(2) : '0.00'
      }));

      // Column styles
      const columnStyles = {
        image: { cellWidth: imgCellSize + 10 },
        ecode: { cellWidth: 70, valign: 'middle', fontSize: 9 },
        name: { valign: 'middle', fontSize: 9 },
        quantity: { cellWidth: 30, halign: 'center', valign: 'middle', fontSize: 10, fontStyle: 'bold' },
        weight: { cellWidth: 55, halign: 'right', valign: 'middle', fontSize: 9 }
      };

      // Generate table using autoTable
      doc.autoTable({
        startY: yPos,
        columns: columns,
        body: tableData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        styles: {
          overflow: 'linebreak',
          cellPadding: 5,
          lineColor: [220, 220, 220],
          lineWidth: 0.5
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        didDrawCell: (data) => {
          // Draw equipment image in the image column
          if (data.column.dataKey === 'image' && data.section === 'body') {
            try {
              const item = equipmentItems[data.row.index];
              if (!item) return;
              const cached = imageCache[item.ecode];
              if (cached && cached.data) {
                // Scale image to fit within imgCellSize x imgCellSize while preserving aspect ratio
                const maxSize = imgCellSize;
                const srcW = cached.width || maxSize;
                const srcH = cached.height || maxSize;
                const scale = Math.min(maxSize / srcW, maxSize / srcH);
                const drawW = srcW * scale;
                const drawH = srcH * scale;
                // Center image within the padded cell area
                const cellInnerW = data.cell.width - rowPadding * 2;
                const cellInnerH = data.cell.height - rowPadding * 2;
                const offsetX = data.cell.x + rowPadding + (cellInnerW - drawW) / 2;
                const offsetY = data.cell.y + rowPadding + (cellInnerH - drawH) / 2;
                doc.addImage(cached.data, 'PNG', offsetX, offsetY, drawW, drawH);
              }
            } catch (e) {
              console.warn('Could not draw image for row', data.row.index, e);
            }
          }
        },
        didParseCell: (data) => {
          // Only set tall row height for rows that actually have an image
          if (data.column.dataKey === 'image' && data.section === 'body') {
            const idx = data.row.index;
            if (idx >= 0 && idx < rowHasImage.length && rowHasImage[idx]) {
              data.cell.styles.minCellHeight = rowHeight;
            }
          }
        }
      });

      // Footer with timestamp
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Generated ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' }
        );
      }

      // Save the PDF
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      doc.save(`Equipment_List_${timestamp}.pdf`);

    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF. Error: ' + error.message);
    } finally {
      // Remove loading indicator
      const indicator = document.getElementById('pdfLoadingIndicator');
      if (indicator) indicator.remove();
    }
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
  },

  /**
   * Load technical-view.html in a hidden iframe, render both wiring diagrams
   * at exportZoom, and return their data URLs.
   */
  renderWiringDiagramsViaIframe(exportParams, exportZoom = 2) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1200px;height:800px;visibility:hidden;pointer-events:none;border:none;';
      document.body.appendChild(iframe);

      const {
        productType, blocksHor, blocksVer, powerDistroType,
        gp2HalfAutoRows = 0, gp2HalfManualRows = 0,
        gp2HalfManualPosition = 'bottom', gp2FullVerticalBlocks
      } = exportParams;

      const blocksVerInt = Math.floor(parseFloat(blocksVer) || 0);
      const fullVBlocks = gp2FullVerticalBlocks != null ? gp2FullVerticalBlocks : blocksVerInt;
      let url = `technical-view.html?product=${encodeURIComponent(productType)}&blocksHor=${blocksHor}&blocksVer=${blocksVerInt}&powerDistroType=${powerDistroType}`;
      url += `&gp2HalfAutoRows=${gp2HalfAutoRows}&gp2HalfManualRows=${gp2HalfManualRows}&gp2HalfManualPosition=${encodeURIComponent(gp2HalfManualPosition)}&gp2FullVerticalBlocks=${fullVBlocks}`;

      iframe.addEventListener('load', () => {
        // Allow inline scripts to fully execute and canvases to paint
        setTimeout(() => {
          try {
            const iwin = iframe.contentWindow;
            const idoc = iframe.contentDocument;

            const dataCanvas = idoc.createElement('canvas');
            iwin.renderDiagramToCanvas(dataCanvas, 'data', exportZoom);

            const powerCanvas = idoc.createElement('canvas');
            iwin.renderDiagramToCanvas(powerCanvas, 'power', exportZoom);

            // Collect screen info from the iframe DOM
            const g = (id) => idoc.getElementById(id)?.textContent?.trim() || '';
            const screenInfo = {
              productName:    g('productInfo').replace(/^Product:\s*/i, ''),
              tileDimensions: g('tileDimensions'),
              sizeFeet:       g('sizeFeet'),
              sizeMeters:     g('sizeMeters'),
              pixelsHor:      g('pixelsHor'),
              pixelsVer:      g('pixelsVer'),
              pixelsTotal:    g('pixelsTotal'),
              totalTiles:     g('totalTiles'),
              totalWeight:    g('totalWeight'),
              powerVoltage:   g('powerVoltage'),
              powerAmps:      g('powerAmps'),
              powerWatts:     g('powerWatts'),
              maxDataChain:   g('maxDataChain'),
              maxPowerChain:  g('maxPowerChain'),
              powerDistroType: idoc.getElementById('powerDistroType')?.value || '',
            };

            resolve({
              dataImage:   dataCanvas.width  > 0 ? dataCanvas.toDataURL('image/png')  : null,
              dataWidth:   dataCanvas.width,
              dataHeight:  dataCanvas.height,
              powerImage:  powerCanvas.width > 0 ? powerCanvas.toDataURL('image/png') : null,
              powerWidth:  powerCanvas.width,
              powerHeight: powerCanvas.height,
              screenInfo,
            });
          } catch (e) {
            console.error('Wiring diagram render error:', e);
            resolve({ dataImage: null, powerImage: null });
          } finally {
            setTimeout(() => iframe.remove(), 200);
          }
        }, 400);
      });

      iframe.src = url;
    });
  },

  /**
   * Export a combined PDF: equipment list with images, then data and power
   * wiring diagrams from technical view on separate pages.
   */
  async exportCombinedPDF() {
    const equipmentItems = this.getCurrentEquipmentData();
    if (equipmentItems.length === 0) {
      alert('No equipment to export. Please configure a wall first.');
      return;
    }

    // Collect current calculator params
    const productType      = document.getElementById('productType')?.value || 'absen';
    const blocksHorRaw     = parseInt(document.getElementById('blocksHor')?.value)  || 10;
    const blocksVerRaw     = parseFloat(document.getElementById('blocksVer')?.value) || 6;
    const powerDistroType  = document.getElementById('powerDistroType')?.value || '208';
    const blocksVerInt     = Math.floor(blocksVerRaw);

    let gp2HalfAutoRows    = 0;
    let gp2HalfManualRows  = 0;
    let gp2HalfManualPosition = 'bottom';
    let gp2FullVerticalBlocks = blocksVerInt;

    if (productType === 'ROEGP26Full') {
      if ((blocksVerRaw % 1) !== 0) {
        gp2HalfAutoRows       = Math.round((blocksVerRaw % 1) * 2);
        gp2FullVerticalBlocks = Math.floor(blocksVerRaw);
      }
      const cb = document.getElementById('gp2HalfCheckbox');
      if (cb?.checked) {
        gp2HalfManualRows    = parseInt(document.getElementById('gp2HalfCount')?.value  || 1, 10);
        gp2HalfManualPosition = document.getElementById('gp2HalfPosition')?.value || 'bottom';
      }
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdfLoadingIndicator';
    loadingDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    loadingDiv.innerHTML = '<div style="background:white;padding:30px 50px;border-radius:10px;font-size:18px;font-family:Arial,sans-serif;">Generating combined PDF…</div>';
    document.body.appendChild(loadingDiv);

    try {
      await this.ensurePDFLibraries();

      // Run equipment image loading and wiring diagram rendering in parallel
      const imageMap   = this.buildImageMap();
      const imageCache = {};
      const uniqueEcodes = [...new Set(equipmentItems.map(i => i.ecode))];

      const [wiringImages] = await Promise.all([
        this.renderWiringDiagramsViaIframe({
          productType, blocksHor: blocksHorRaw, blocksVer: blocksVerInt,
          powerDistroType, gp2HalfAutoRows, gp2HalfManualRows,
          gp2HalfManualPosition, gp2FullVerticalBlocks
        }),
        Promise.all(uniqueEcodes.map(async (ecode) => {
          const path = imageMap[ecode];
          if (path) imageCache[ecode] = await this.loadImageAsBase64(path);
        }))
      ]);

      let logoData = null;
      try {
        const r = await this.loadImageAsBase64('static/images/rentexLogo.png');
        if (r) logoData = r.data;
      } catch (e) { /* logo optional */ }

      const { jsPDF } = jspdf;
      const doc       = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
      const pageW     = doc.internal.pageSize.getWidth();
      const pageH     = doc.internal.pageSize.getHeight();
      const margin    = 40;

      // ── Header helpers ──────────────────────────────────────────────────
      const orderNumber = document.getElementById('orderNumber')?.value || '';
      const orderDate   = document.getElementById('orderDate')?.value   || '';
      const location    = document.getElementById('location')?.value    || '';
      const productTypeSelect = document.getElementById('productType');
      const productTypeName   = productTypeSelect
        ? productTypeSelect.options[productTypeSelect.selectedIndex].text : '';

      const drawPageHeader = (d, w, title) => {
        let y = margin;
        if (logoData) d.addImage(logoData, 'PNG', margin, y, 120, 38);
        d.setFontSize(10); d.setTextColor(100);
        const rx = w - margin;
        if (orderNumber) d.text(`Order #: ${orderNumber}`, rx, y + 12, { align: 'right' });
        if (orderDate)   d.text(`Date: ${orderDate}`,      rx, y + 24, { align: 'right' });
        if (location)    d.text(`Location: ${location}`,   rx, y + 36, { align: 'right' });
        y += 50;
        d.setFontSize(16); d.setTextColor(0);
        d.text(title, w / 2, y, { align: 'center' });
        if (productTypeName) {
          d.setFontSize(11); d.setTextColor(80);
          d.text(productTypeName, w / 2, y + 16, { align: 'center' });
        }
        y += 30;
        d.setDrawColor(200); d.setLineWidth(0.5);
        d.line(margin, y, w - margin, y);
        return y + 10;
      };

      // ── Page 1+: Equipment list ──────────────────────────────────────────
      let yPos = drawPageHeader(doc, pageW, 'Equipment List');

      const imgCellSize  = 60;
      const rowPadding   = 5;
      const rowHeight    = imgCellSize + rowPadding * 2;
      const rowHasImage  = equipmentItems.map(item => !!(imageCache[item.ecode]?.data));

      doc.autoTable({
        startY: yPos,
        columns: [
          { header: 'Image',             dataKey: 'image'    },
          { header: 'Ecode',             dataKey: 'ecode'    },
          { header: 'Equipment Name',    dataKey: 'name'     },
          { header: 'Qty',               dataKey: 'quantity' },
          { header: 'Total Weight (lbs)', dataKey: 'weight'  },
        ],
        body: equipmentItems.map(item => ({
          image:    '',
          ecode:    item.ecode,
          name:     item.name,
          quantity: item.quantity.toString(),
          weight:   item.weight ? (Number(item.weight) * item.quantity).toFixed(2) : '0.00',
        })),
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center', valign: 'middle' },
        styles: { overflow: 'linebreak', cellPadding: 5, lineColor: [220, 220, 220], lineWidth: 0.5 },
        columnStyles: {
          image:    { cellWidth: imgCellSize + 10 },
          ecode:    { cellWidth: 70, valign: 'middle', fontSize: 9 },
          name:     { valign: 'middle', fontSize: 9 },
          quantity: { cellWidth: 30, halign: 'center', valign: 'middle', fontSize: 10, fontStyle: 'bold' },
          weight:   { cellWidth: 55, halign: 'right',  valign: 'middle', fontSize: 9 },
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        didDrawCell: (data) => {
          if (data.column.dataKey === 'image' && data.section === 'body') {
            try {
              const item   = equipmentItems[data.row.index];
              const cached = imageCache[item?.ecode];
              if (cached?.data) {
                const maxSize = imgCellSize;
                const scale   = Math.min(maxSize / (cached.width || maxSize), maxSize / (cached.height || maxSize));
                const drawW   = (cached.width  || maxSize) * scale;
                const drawH   = (cached.height || maxSize) * scale;
                const innerW  = data.cell.width  - rowPadding * 2;
                const innerH  = data.cell.height - rowPadding * 2;
                doc.addImage(cached.data, 'PNG',
                  data.cell.x + rowPadding + (innerW - drawW) / 2,
                  data.cell.y + rowPadding + (innerH - drawH) / 2,
                  drawW, drawH);
              }
            } catch (e) { /* skip bad image */ }
          }
        },
        didParseCell: (data) => {
          if (data.column.dataKey === 'image' && data.section === 'body') {
            if (rowHasImage[data.row.index]) data.cell.styles.minCellHeight = rowHeight;
          }
        },
      });

      // ── Wiring diagram pages (landscape) ──────────────────────────────────
      const si = wiringImages.screenInfo || {};

      const drawWiringHeader = (d, w) => {
        let y = margin;
        // Logo
        if (logoData) d.addImage(logoData, 'PNG', margin, y, 100, 32);
        // Order info top-right
        d.setFontSize(9); d.setTextColor(100);
        const rx = w - margin;
        if (orderNumber) d.text(`Order #: ${orderNumber}`, rx, y + 10, { align: 'right' });
        if (orderDate)   d.text(`Date: ${orderDate}`,      rx, y + 20, { align: 'right' });
        if (location)    d.text(`Location: ${location}`,   rx, y + 30, { align: 'right' });
        y += 38;
        // Product title
        d.setFontSize(18); d.setTextColor(0); d.setFont(undefined, 'bold');
        d.text(si.productName || productTypeName, w / 2, y, { align: 'center' });
        d.setFont(undefined, 'normal');
        y += 14;
        // Separator
        d.setDrawColor(200); d.setLineWidth(0.5);
        d.line(margin, y, w - margin, y);
        y += 8;
        // 5-column info grid
        const colW  = (w - margin * 2) / 5;
        const c1 = margin, c2 = margin + colW, c3 = margin + colW * 2,
              c4 = margin + colW * 3, c5 = margin + colW * 4;
        const lh = 13; // line height pt
        d.setFontSize(9); d.setTextColor(0);

        const col = (x, label, lines) => {
          d.setFont(undefined, 'bold');
          d.text(label, x, y);
          d.setFont(undefined, 'normal');
          d.setFontSize(8); d.setTextColor(60);
          lines.forEach((ln, i) => { if (ln) d.text(ln, x, y + lh * (i + 1)); });
          d.setFontSize(9); d.setTextColor(0);
        };

        col(c1, 'Screen Size', [
          `Tiles: ${si.tileDimensions}`,
          `Size: ${si.sizeFeet}`,
          si.sizeMeters,
        ]);
        col(c2, 'Pixels', [
          `Horizontal: ${si.pixelsHor}`,
          `Vertical: ${si.pixelsVer}`,
          `Total: ${si.pixelsTotal}`,
        ]);
        col(c3, 'Tiles', [
          `Total: ${si.totalTiles}`,
          `Weight: ${si.totalWeight}`,
        ]);
        col(c4, 'Power', [
          `Voltage: ${si.powerVoltage}`,
          `Amps: ${si.powerAmps}`,
          `Watts: ${si.powerWatts}`,
        ]);
        col(c5, 'Daisy Chain Limits', [
          `Max Data Chain: ${si.maxDataChain} tiles`,
          `Max Power Chain: ${si.maxPowerChain} tiles`,
        ]);

        y += lh * 4 + 6;
        d.setDrawColor(220); d.setLineWidth(0.3);
        d.line(margin, y, w - margin, y);
        return y + 6;
      };

      const addWiringPage = (imgData, imgNativeW, imgNativeH, title) => {
        if (!imgData) return;
        doc.addPage([792, 612]); // landscape letter
        const lw = doc.internal.pageSize.getWidth();
        const lh = doc.internal.pageSize.getHeight();
        const headerBottom = drawWiringHeader(doc, lw);

        // Diagram title label
        doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(0);
        doc.text(title, lw / 2, headerBottom + 12, { align: 'center' });
        doc.setFont(undefined, 'normal');

        const availW = lw - margin * 2;
        const availH = lh - headerBottom - 22 - margin;
        const scale  = Math.min(availW / imgNativeW, availH / imgNativeH, 1);
        const drawW  = imgNativeW * scale;
        const drawH  = imgNativeH * scale;
        const x      = margin + (availW - drawW) / 2;
        const y      = headerBottom + 20 + (availH - drawH) / 2;
        doc.addImage(imgData, 'PNG', x, y, drawW, drawH);
      };

      const powerLabel = `Power Wiring Diagram (${si.powerDistroType || powerDistroType}V)`;
      addWiringPage(wiringImages.dataImage,  wiringImages.dataWidth,  wiringImages.dataHeight,  'Data Wiring Diagram');
      addWiringPage(wiringImages.powerImage, wiringImages.powerWidth, wiringImages.powerHeight, powerLabel);

      // ── Footer on every page ───────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Generated ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`, w / 2, h - 20, { align: 'center' });
      }

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      doc.save(`Combined_Export_${ts}.pdf`);

    } catch (err) {
      console.error('Combined PDF export error:', err);
      alert('Failed to generate combined PDF. Error: ' + err.message);
    } finally {
      const ind = document.getElementById('pdfLoadingIndicator');
      if (ind) ind.remove();
    }
  }
};

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
  window.exportToExcel = () => ExportManager.exportToExcel();
  window.captureEntireScreen = () => ExportManager.captureEntireScreen();
  window.exportEquipmentPDF = () => ExportManager.exportToPDF();
  window.exportCombinedPDF  = () => ExportManager.exportCombinedPDF();
  window.getEquipmentForScreen = (config) => ExportManager.getEquipmentForScreen(config);
  window.getScreenSpec = (config) => ExportManager.getScreenSpec(config);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExportManager };
}
