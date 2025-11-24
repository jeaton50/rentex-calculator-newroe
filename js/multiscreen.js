/**
 * Rentex LED Wall Calculator - Multi-Screen Module
 * Handles multiple screen configurations, equipment combining, and power distribution
 */

/**
 * Screen Configuration Class
 * Represents a single screen with all its properties
 */
class ScreenConfig {
  constructor(id) {
    this.id = id;
    this.productType = 'absen';
    this.blocksHor = 10;
    this.blocksVer = 10;
    this.wallType = 'Flat';
    this.supportType = 'groundSupport';
    this.supportOption = 'Single Base';
    this.powerDistroType = 'Auto';
    this.redundancy = 'None';
    this.sourceSignals = 1;
    this.dummyTiles = false;
    this.dummyTileCount = 1;
  }
}

/**
 * MultiScreenManager namespace for all multi-screen functions
 */
const MultiScreenManager = {

  /**
   * Check if equipment is power distribution related
   * @param {string} ecode - Equipment code
   * @param {string} name - Equipment name
   * @returns {boolean} True if power distribution equipment
   */
  isPowerDistroEquipment(ecode, name) {
    const powerDistroEcodes = ['CUBEDIST', 'TP1', 'L2130T1FB', 'L2130EDFB', 'SOCA6XTRU1', 'TXT32SOCA'];

    // Specific True1 cables to keep (not filter out)
    const keepItems = [
      { ecode: 'TRUE125FT', name: "True1 to True1 cable, 25'" },
      { ecode: 'T11M', name: "True1 power cable 1M (3')" }
    ];

    // Check if item is in the keep list
    for (const keepItem of keepItems) {
      if (ecode === keepItem.ecode || name.includes(keepItem.name)) {
        return false;
      }
    }

    // Check if ecode is in the list
    if (powerDistroEcodes.includes(ecode)) {
      return true;
    }

    // Keywords for power distribution items
    const powerDistroKeywords = ['distro', 'power', 'soca', 'socapex', 'edison'];

    return powerDistroKeywords.some(keyword =>
      name.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  /**
   * Check if equipment is processing related
   * @param {string} ecode - Equipment code
   * @param {string} name - Equipment name
   * @returns {boolean} True if processing equipment
   */
  isProcessingEquipment(ecode, name) {
    const processingEcodes = ['SX40', 'XD10', 'S8', 'MX40PRO'];
    const processingKeywords = ['processor', 'brompton', 'tessera', 'novastar'];

    if (processingEcodes.includes(ecode)) {
      return true;
    }

    return processingKeywords.some(keyword =>
      name.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  /**
   * Check if equipment is dummy tile related
   * @param {string} ecode - Equipment code
   * @param {string} name - Equipment name
   * @returns {boolean} True if dummy tile equipment
   */
  isDummyTileEquipment(ecode, name) {
    return ecode === 'BP2DT' || name.toLowerCase().includes('dummy tile');
  },

  /**
   * Add multi-screen CSS styles to the page
   */
  addMultiScreenStyles() {
    const styleId = 'multiScreenStyles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        .screen-selector { margin: 20px 0; padding: 15px; background-color: #f8f8f8; border-radius: 5px; border: 1px solid #ddd; }
        .screen-selector h3 { margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; }
        .screen-buttons { display: flex; gap: 10px; margin-bottom: 10px; }
        .screen-tabs { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 5px; }
        .screen-tab { padding: 5px 10px; background-color: #eee; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; white-space: nowrap; }
        .screen-tab.active { background-color: #007bff; color: white; border-color: #0056b3; }
        .screen-equipment-container { margin-top: 30px; border: 1px solid #ddd; border-radius: 5px; padding: 0; max-width: 100%; }
        .screen-equipment-section { margin-bottom: 30px; padding-left: 0; }
        .screen-equipment-section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 0; padding-left: 5px; }
      `;
      document.head.appendChild(styleSheet);
    }
  },

  /**
   * Create the multi-screen UI elements
   */
  createMultiScreenUI() {
    const configContainer = document.getElementById('configContainer');
    if (!configContainer) return;

    const screenSelectorDiv = document.createElement('div');
    screenSelectorDiv.id = 'screenSelector';
    screenSelectorDiv.className = 'screen-selector';
    screenSelectorDiv.style.display = 'none';

    screenSelectorDiv.innerHTML = `
      <h3>Multiple Screen Management</h3>
      <div class="screen-buttons">
        <button type="button" onclick="addScreenConfiguration()">Add Screen</button>
        <button type="button" id="removeScreenBtn" onclick="removeActiveScreen()">Remove Screen</button>
      </div>
      <div id="screenTabs" class="screen-tabs"></div>
    `;

    const productTypeDropdown = document.getElementById('productTypeDropdown');
    configContainer.insertBefore(screenSelectorDiv, productTypeDropdown);

    // Add "Generate Combined Equipment" button
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'combineEquipmentButtonContainer';
      buttonContainer.style.display = 'none';
      buttonContainer.style.textAlign = 'center';
      buttonContainer.style.marginBottom = '20px';

      const generateAllButton = document.createElement('button');
      generateAllButton.type = 'button';
      generateAllButton.className = 'generate-all-btn';
      generateAllButton.textContent = 'Generate Equipment Lists';
      generateAllButton.onclick = () => window.generateAllEquipment();

      buttonContainer.appendChild(generateAllButton);
      controlsDiv.insertBefore(buttonContainer, controlsDiv.firstChild);
    }

    this.updateScreenSelector();
  },

  /**
   * Update screen selector UI
   */
  updateScreenSelector() {
    this.updateScreenTabs();
    const removeBtn = document.getElementById('removeScreenBtn');
    if (removeBtn) {
      removeBtn.disabled = window.screenConfigurations.length <= 1;
    }
  },

  /**
   * Update screen tabs display
   */
  updateScreenTabs() {
    const tabsDiv = document.getElementById('screenTabs');
    if (!tabsDiv) return;

    tabsDiv.innerHTML = '';
    window.screenConfigurations.forEach((config, index) => {
      const tab = document.createElement('div');
      tab.className = 'screen-tab' + (index === window.activeScreenIndex ? ' active' : '');
      tab.textContent = `Screen ${config.id}`;
      tab.onclick = () => window.switchToScreen(index);
      tabsDiv.appendChild(tab);
    });
  },

  /**
   * Save current screen configuration to screenConfigurations array
   */
  saveCurrentScreenConfig() {
    if (window.activeScreenIndex >= 0 && window.activeScreenIndex < window.screenConfigurations.length) {
      const config = window.screenConfigurations[window.activeScreenIndex];

      config.productType = document.getElementById('productType')?.value || 'absen';
      config.blocksHor = parseInt(document.getElementById('blocksHor')?.value || 10, 10);
      config.blocksVer = parseInt(document.getElementById('blocksVer')?.value || 10, 10);

      const wallTypeRadios = document.querySelectorAll('input[name="wallType"]');
      for (const radio of wallTypeRadios) {
        if (radio.checked) {
          config.wallType = radio.value;
          break;
        }
      }

      config.supportType = document.getElementById('groundSupport')?.checked ? 'groundSupport' : 'flownSupport';
      config.supportOption = config.supportType === 'groundSupport'
        ? document.getElementById('groundSupportType')?.value || 'Single Base'
        : document.getElementById('flownSupportType')?.value || 'Single Header';

      config.powerDistroType = document.getElementById('powerDistroType')?.value || 'Auto';
      config.redundancy = document.getElementById('redundancy')?.value || 'None';
      config.sourceSignals = parseInt(document.getElementById('sourceSignals')?.value || 1, 10);
    }
  },

  /**
   * Load screen configuration into UI
   * @param {ScreenConfig} config - Configuration to load
   */
  loadScreenConfig(config) {
    const productTypeEl = document.getElementById('productType');
    const blocksHorEl = document.getElementById('blocksHor');
    const blocksVerEl = document.getElementById('blocksVer');
    const groundSupportEl = document.getElementById('groundSupport');
    const flownSupportEl = document.getElementById('flownSupport');
    const groundSupportOptionsEl = document.getElementById('groundSupportOptions');
    const flownSupportOptionsEl = document.getElementById('flownSupportOptions');
    const groundSupportTypeEl = document.getElementById('groundSupportType');
    const flownSupportTypeEl = document.getElementById('flownSupportType');
    const powerDistroTypeEl = document.getElementById('powerDistroType');
    const redundancyEl = document.getElementById('redundancy');
    const sourceSignalsEl = document.getElementById('sourceSignals');

    if (productTypeEl) productTypeEl.value = config.productType;
    if (blocksHorEl) blocksHorEl.value = config.blocksHor;
    if (blocksVerEl) blocksVerEl.value = config.blocksVer;

    const wallTypeRadios = document.querySelectorAll('input[name="wallType"]');
    for (const radio of wallTypeRadios) {
      radio.checked = (radio.value === config.wallType);
    }

    if (config.supportType === 'groundSupport') {
      if (groundSupportEl) groundSupportEl.checked = true;
      if (flownSupportEl) flownSupportEl.checked = false;
      if (groundSupportOptionsEl) groundSupportOptionsEl.style.display = 'block';
      if (flownSupportOptionsEl) flownSupportOptionsEl.style.display = 'none';
      if (groundSupportTypeEl) groundSupportTypeEl.value = config.supportOption;
    } else {
      if (groundSupportEl) groundSupportEl.checked = false;
      if (flownSupportEl) flownSupportEl.checked = true;
      if (groundSupportOptionsEl) groundSupportOptionsEl.style.display = 'none';
      if (flownSupportOptionsEl) flownSupportOptionsEl.style.display = 'block';
      if (flownSupportTypeEl) flownSupportTypeEl.value = config.supportOption;
    }

    if (powerDistroTypeEl) powerDistroTypeEl.value = config.powerDistroType;
    if (redundancyEl) redundancyEl.value = config.redundancy;
    if (sourceSignalsEl) sourceSignalsEl.value = config.sourceSignals;
  },

  /**
   * Calculate combined power distribution requirements for all screens
   * @returns {Object} Combined distribution equipment requirements
   */
  calculateCombinedDistro() {
    let totalTiles = 0;
    let combinedPowerRequirements = {
      voltage110: false,
      voltage208: false,
      totalAmps110: 0,
      totalAmps208: 0,
      totalWatts: 0
    };

    const productTypes = new Set();

    // Calculate totals from all screens
    window.screenConfigurations.forEach((config) => {
      const screenTiles = config.blocksHor * config.blocksVer;
      totalTiles += screenTiles;
      productTypes.add(config.productType);

      // Calculate power requirements based on product type
      let voltage = (config.powerDistroType == '110') ? 110 : 208;
      let amps110 = 0, amps208 = 0, watts = 0;

      if (config.productType === 'absen') {
        amps110 = screenTiles * 0.59;
        amps208 = screenTiles * 0.312;
        watts = screenTiles * 192;
      } else if (['BP2B1', 'BP2B2', 'BP2V2'].includes(config.productType)) {
        amps110 = (screenTiles * 95) / 110;
        amps208 = (screenTiles * 95) / 208;
        watts = screenTiles * 190;
      } else if (config.productType === 'theatrixx') {
        amps110 = screenTiles * 1.63636;
        amps208 = (screenTiles * 865.38461) / 1000;
        watts = screenTiles * 190;
      }

      // Add to totals based on configured voltage
      if (voltage === 110) {
        combinedPowerRequirements.voltage110 = true;
        combinedPowerRequirements.totalAmps110 += amps110;
      } else {
        combinedPowerRequirements.voltage208 = true;
        combinedPowerRequirements.totalAmps208 += amps208;
      }
      combinedPowerRequirements.totalWatts += watts;
    });

    // Calculate distribution requirements
    let CUBEDIST = 0, TP1 = 0, L2130T1FB = 0, SOCA6XTRU1 = 0, TXT32SOCA = 0;

    // For 208V calculations
    if (combinedPowerRequirements.voltage208) {
      let totalAmps208 = combinedPowerRequirements.totalAmps208;

      if (totalAmps208 <= 200) {
        CUBEDIST = 1;
        L2130T1FB = Math.ceil(totalTiles / 16 / 3);
      } else {
        TP1 = Math.ceil(totalAmps208 / 400);
        SOCA6XTRU1 = Math.ceil(totalTiles / 16 / 6);

        if (productTypes.has('theatrixx')) {
          TXT32SOCA = SOCA6XTRU1;
          SOCA6XTRU1 = 0;
        }
      }
    }

    // For 110V calculations
    let EDT110M = 0;
    if (combinedPowerRequirements.voltage110) {
      let divisor = 8; // Default for Absen
      if (productTypes.has('BP2B1') || productTypes.has('BP2B2') || productTypes.has('BP2V2')) {
        divisor = 11;
      } else if (productTypes.has('theatrixx')) {
        // Use Calculator module if available
        let totalSpares;
        if (typeof Calculator !== 'undefined' && Calculator.calculateSpares) {
          totalSpares = Calculator.calculateSpares(totalTiles, 10, 2);
        } else if (typeof calcSpares === 'function') {
          totalSpares = calcSpares(totalTiles, 10, 2);
        } else {
          totalSpares = Math.ceil(totalTiles * 0.1);
        }
        let totalBlocksWithSpares = totalTiles + totalSpares;
        let O25 = Math.ceil(totalBlocksWithSpares / 2.409);
        EDT110M = Math.ceil((O25 / 8.302) * 2);
      } else {
        let O32 = Math.ceil(totalTiles / divisor);
        EDT110M = Math.ceil(O32 + (O32 * 0.05));
      }

      if (!productTypes.has('theatrixx')) {
        let O32 = Math.ceil(totalTiles / divisor);
        EDT110M = Math.ceil(O32 + (O32 * 0.05));
      }
    }

    return {
      CUBEDIST,
      TP1,
      L2130T1FB,
      SOCA6XTRU1,
      TXT32SOCA,
      EDT110M,
      powerRequirements: combinedPowerRequirements
    };
  },

  /**
   * Show combined power distribution dialog
   */
  showCombineDistroDialog() {
    const distroReqs = this.calculateCombinedDistro();

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 500px;
      width: 90%;
    `;

    let distroHTML = '<h3>Combined Power Distribution Requirements</h3>';
    distroHTML += '<div style="margin-bottom: 15px;">';
    distroHTML += `<p><strong>Total Power:</strong> ${distroReqs.powerRequirements.totalWatts}W</p>`;

    if (distroReqs.powerRequirements.voltage208) {
      distroHTML += `<p><strong>208V Total Amperage:</strong> ${distroReqs.powerRequirements.totalAmps208.toFixed(2)}A</p>`;
    }
    if (distroReqs.powerRequirements.voltage110) {
      distroHTML += `<p><strong>110V Total Amperage:</strong> ${distroReqs.powerRequirements.totalAmps110.toFixed(2)}A</p>`;
    }

    distroHTML += '</div>';
    distroHTML += '<h4>Recommended Distribution Equipment:</h4>';
    distroHTML += '<table style="width: 100%; border-collapse: collapse;">';
    distroHTML += '<tr><th style="border: 1px solid #ccc; padding: 8px;">Equipment</th><th style="border: 1px solid #ccc; padding: 8px;">Quantity</th></tr>';

    if (distroReqs.CUBEDIST > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Indu Electric 200A Cube Distro</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.CUBEDIST}</td></tr>`;
    }
    if (distroReqs.TP1 > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Indu Electric 400A Power Distro w/ (4) 208v Soca</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.TP1}</td></tr>`;
    }
    if (distroReqs.L2130T1FB > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">L2130 floor box to 3x True1 with pass through</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.L2130T1FB}</td></tr>`;
    }
    if (distroReqs.SOCA6XTRU1 > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">19 Pin Socapex to 6x True1 Power Cable</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.SOCA6XTRU1}</td></tr>`;
    }
    if (distroReqs.TXT32SOCA > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Theatrixx Nomad XVT3 to Socapex</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.TXT32SOCA}</td></tr>`;
    }
    if (distroReqs.EDT110M > 0) {
      distroHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Edison to True1 power cable, 10 meter</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${distroReqs.EDT110M}</td></tr>`;
    }

    distroHTML += '</table>';
    distroHTML += '<div style="margin-top: 20px; text-align: center;">';
    distroHTML += '<button onclick="applyCombinedDistro()" style="background-color: #28a745; color: white; padding: 8px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Apply to Equipment List</button>';
    distroHTML += '<button onclick="closeCombineDistroDialog()" style="background-color: #6c757d; color: white; padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer;">Close</button>';
    distroHTML += '</div>';

    dialog.innerHTML = distroHTML;
    dialog.id = 'combineDistroDialog';

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    backdrop.id = 'combineDistroBackdrop';
    backdrop.onclick = () => this.closeCombineDistroDialog();

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
  },

  /**
   * Close combined distro dialog
   */
  closeCombineDistroDialog() {
    const dialog = document.getElementById('combineDistroDialog');
    const backdrop = document.getElementById('combineDistroBackdrop');
    if (dialog) dialog.remove();
    if (backdrop) backdrop.remove();
  },

  /**
   * Apply combined distribution equipment to equipment list
   */
  applyCombinedDistro() {
    const distroReqs = this.calculateCombinedDistro();

    const combinedTable = document.querySelector('.equipment-table:not(.screen-equipment-section .equipment-table)');
    if (!combinedTable) {
      alert('Please generate the combined equipment list first.');
      this.closeCombineDistroDialog();
      return;
    }

    const tbody = combinedTable.querySelector('tbody');
    const totalRow = tbody.querySelector('.total-row');

    // Remove existing power distribution items
    const rows = Array.from(tbody.querySelectorAll('tr:not(.total-row)'));
    rows.forEach(row => {
      if (row.cells.length >= 2) {
        const ecode = row.cells[0].textContent.trim();
        const name = row.cells[1].textContent.trim();
        if (this.isPowerDistroEquipment(ecode, name)) {
          row.remove();
        }
      }
    });

    // Add new combined distro equipment
    const distroItems = [
      { ecode: 'CUBEDIST', name: 'Indu Electric 200A Cube Distro', weight: 177, quantity: distroReqs.CUBEDIST },
      { ecode: 'TP1', name: 'Indu Electric 400A Power Distro w/ (4) 208v Soca', weight: 197, quantity: distroReqs.TP1 },
      { ecode: 'L2130T1FB', name: 'L2130 floor box to 3x True1 with pass through', weight: 7.5, quantity: distroReqs.L2130T1FB },
      { ecode: 'SOCA6XTRU1', name: '19 Pin Socapex to 6x True1 Power Cable', weight: 5, quantity: distroReqs.SOCA6XTRU1 },
      { ecode: 'TXT32SOCA', name: 'Theatrixx Nomad XVT3 to Socapex', weight: 22, quantity: distroReqs.TXT32SOCA },
      { ecode: 'EDT110M', name: 'Edison to True1 power cable, 10 meter', weight: 3.2, quantity: distroReqs.EDT110M }
    ];

    distroItems.forEach(item => {
      if (item.quantity > 0) {
        const row = document.createElement('tr');
        row.className = 'combined-distro-item';
        row.innerHTML = `
          <td>${item.ecode}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${(item.weight * item.quantity).toFixed(2)}</td>
        `;
        tbody.insertBefore(row, totalRow);
      }
    });

    this.updateCombinedEquipment();
    this.closeCombineDistroDialog();
    alert('Combined power distribution equipment has been applied to the equipment list.');
  },

  /**
   * Update combined equipment table totals
   * @returns {number} Total weight
   */
  updateCombinedEquipment() {
    const combinedTable = document.querySelector('.equipment-table:not(.screen-equipment-section .equipment-table)');
    if (!combinedTable) return 0;

    let totalWeight = 0;
    const rows = combinedTable.querySelectorAll('tbody tr:not(.total-row)');

    rows.forEach(row => {
      if (row.style.display !== 'none' && row.cells.length >= 4) {
        const weight = parseFloat(row.cells[3].textContent) || 0;
        totalWeight += weight;
      }
    });

    const totalRow = combinedTable.querySelector('.total-row');
    if (totalRow && totalRow.cells.length >= 4) {
      totalRow.cells[3].innerHTML = `<strong>${totalWeight.toFixed(2)} lbs</strong>`;
    }

    return totalWeight;
  },

  /**
   * Calculate combined processing requirements for all screens
   * @returns {Object} Combined processing equipment requirements
   */
  calculateCombinedProcessing() {
    let totalTiles = 0;
    let totalDataPorts = 0;
    const productTypes = new Set();
    const processorRequirements = {
      SX40: 0,
      XD10: 0,
      S8: 0,
      MX40PRO: 0
    };

    // Calculate totals from all screens
    window.screenConfigurations.forEach((config) => {
      const screenTiles = config.blocksHor * config.blocksVer;
      totalTiles += screenTiles;
      productTypes.add(config.productType);

      // Calculate data ports needed based on product type
      let daisyChainLimit = 10; // Default for Absen and Theatrixx
      if (['BP2B1', 'BP2B2', 'BP2V2'].includes(config.productType)) {
        daisyChainLimit = 13;
      }
      const screenDataPorts = Math.ceil(screenTiles / daisyChainLimit);
      totalDataPorts += screenDataPorts;
    });

    // Determine processor requirements based on total data ports
    // SX40 can handle up to 16 outputs
    // S8 can handle up to 8 outputs
    if (totalDataPorts <= 8) {
      processorRequirements.S8 = 1;
    } else if (totalDataPorts <= 16) {
      processorRequirements.SX40 = 1;
    } else {
      // Need multiple processors
      processorRequirements.SX40 = Math.ceil(totalDataPorts / 16);
    }

    return {
      totalTiles,
      totalDataPorts,
      productTypes: Array.from(productTypes),
      processors: processorRequirements
    };
  },

  /**
   * Show combined processing dialog
   */
  showCombineProcessingDialog() {
    console.log('showCombineProcessingDialog called');
    const processingReqs = this.calculateCombinedProcessing();
    console.log('Processing requirements:', processingReqs);

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 500px;
      width: 90%;
    `;

    let processingHTML = '<h3>Combined Processing Requirements</h3>';
    processingHTML += '<div style="margin-bottom: 15px;">';
    processingHTML += `<p><strong>Total Tiles:</strong> ${processingReqs.totalTiles}</p>`;
    processingHTML += `<p><strong>Total Data Ports Needed:</strong> ${processingReqs.totalDataPorts}</p>`;
    processingHTML += `<p><strong>Product Types:</strong> ${processingReqs.productTypes.join(', ')}</p>`;
    processingHTML += '</div>';

    processingHTML += '<h4>Recommended Processing Equipment:</h4>';
    processingHTML += '<table style="width: 100%; border-collapse: collapse;">';
    processingHTML += '<tr><th style="border: 1px solid #ccc; padding: 8px;">Equipment</th><th style="border: 1px solid #ccc; padding: 8px;">Quantity</th></tr>';

    if (processingReqs.processors.SX40 > 0) {
      processingHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Brompton SX40 Processor</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${processingReqs.processors.SX40}</td></tr>`;
    }
    if (processingReqs.processors.S8 > 0) {
      processingHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Brompton S8 Processor</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${processingReqs.processors.S8}</td></tr>`;
    }
    if (processingReqs.processors.XD10 > 0) {
      processingHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Brompton XD10 Processor</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${processingReqs.processors.XD10}</td></tr>`;
    }
    if (processingReqs.processors.MX40PRO > 0) {
      processingHTML += `<tr><td style="border: 1px solid #ccc; padding: 8px;">Brompton MX40 Pro Processor</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${processingReqs.processors.MX40PRO}</td></tr>`;
    }

    processingHTML += '</table>';
    processingHTML += '<div style="margin-top: 20px; text-align: center;">';
    processingHTML += '<button onclick="applyCombinedProcessing()" style="background-color: #28a745; color: white; padding: 8px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Apply to Equipment List</button>';
    processingHTML += '<button onclick="closeCombineProcessingDialog()" style="background-color: #6c757d; color: white; padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer;">Close</button>';
    processingHTML += '</div>';

    dialog.innerHTML = processingHTML;
    dialog.id = 'combineProcessingDialog';

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    backdrop.id = 'combineProcessingBackdrop';
    backdrop.onclick = () => this.closeCombineProcessingDialog();

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
  },

  /**
   * Close combined processing dialog
   */
  closeCombineProcessingDialog() {
    const dialog = document.getElementById('combineProcessingDialog');
    const backdrop = document.getElementById('combineProcessingBackdrop');
    if (dialog) dialog.remove();
    if (backdrop) backdrop.remove();
  },

  /**
   * Apply combined processing equipment to equipment list
   */
  applyCombinedProcessing() {
    const processingReqs = this.calculateCombinedProcessing();

    const combinedTable = document.querySelector('.equipment-table:not(.screen-equipment-section .equipment-table)');
    if (!combinedTable) {
      alert('Please generate the combined equipment list first.');
      this.closeCombineProcessingDialog();
      return;
    }

    const tbody = combinedTable.querySelector('tbody');
    const totalRow = tbody.querySelector('.total-row');

    // Remove existing processing items
    const rows = Array.from(tbody.querySelectorAll('tr:not(.total-row)'));
    rows.forEach(row => {
      if (row.cells.length >= 2) {
        const ecode = row.cells[0].textContent.trim();
        const name = row.cells[1].textContent.trim();
        if (this.isProcessingEquipment(ecode, name)) {
          row.remove();
        }
      }
    });

    // Add new combined processing equipment
    const processingItems = [
      { ecode: 'SX40', name: 'Brompton SX40 Processor', weight: 12, quantity: processingReqs.processors.SX40 },
      { ecode: 'S8', name: 'Brompton S8 Processor', weight: 8, quantity: processingReqs.processors.S8 },
      { ecode: 'XD10', name: 'Brompton XD10 Processor', weight: 10, quantity: processingReqs.processors.XD10 },
      { ecode: 'MX40PRO', name: 'Brompton MX40 Pro Processor', weight: 15, quantity: processingReqs.processors.MX40PRO }
    ];

    processingItems.forEach(item => {
      if (item.quantity > 0) {
        const row = document.createElement('tr');
        row.className = 'combined-processing-item';
        row.innerHTML = `
          <td>${item.ecode}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${(item.weight * item.quantity).toFixed(2)}</td>
        `;
        tbody.insertBefore(row, totalRow);
      }
    });

    this.updateCombinedEquipment();
    this.closeCombineProcessingDialog();
    alert('Combined processing equipment has been applied to the equipment list.');
  },

  /**
   * Add equipment toggle checkboxes to screen section
   * @param {HTMLElement} screenSection - Screen section element
   * @param {number} screenId - Screen ID
   */
  addEquipmentTogglesToScreen(screenSection, screenId) {
    const togglesContainer = document.createElement('div');
    togglesContainer.style.marginTop = '8px';
    togglesContainer.style.marginBottom = '-100px';
    togglesContainer.className = 'equipment-toggles';
    togglesContainer.style.display = 'flex';
    togglesContainer.style.justifyContent = 'flex-start';
    togglesContainer.style.alignItems = 'center';
    togglesContainer.style.gap = '100px';
    togglesContainer.style.flexWrap = 'wrap';

    // Power distribution toggle
    const powerDistroLabel = document.createElement('label');
    powerDistroLabel.style.display = 'flex';
    powerDistroLabel.style.alignItems = 'center';
    powerDistroLabel.style.fontSize = '13px';
    powerDistroLabel.style.cursor = 'pointer';
    powerDistroLabel.style.marginRight = '20px';
    powerDistroLabel.style.whiteSpace = 'nowrap';

    const powerDistroCheckbox = document.createElement('input');
    powerDistroCheckbox.type = 'checkbox';
    powerDistroCheckbox.className = 'remove-power-distro-checkbox';
    powerDistroCheckbox.dataset.screenId = screenId;
    powerDistroCheckbox.style.marginRight = '5px';
    powerDistroLabel.appendChild(powerDistroCheckbox);
    powerDistroLabel.appendChild(document.createTextNode('Remove power distribution equipment'));

    // Processing equipment toggle
    const processingLabel = document.createElement('label');
    processingLabel.style.display = 'flex';
    processingLabel.style.alignItems = 'center';
    processingLabel.style.fontSize = '13px';
    processingLabel.style.cursor = 'pointer';
    processingLabel.style.whiteSpace = 'nowrap';

    const processingCheckbox = document.createElement('input');
    processingCheckbox.type = 'checkbox';
    processingCheckbox.className = 'remove-processing-checkbox';
    processingCheckbox.dataset.screenId = screenId;
    processingCheckbox.style.marginRight = '5px';
    processingLabel.appendChild(processingCheckbox);
    processingLabel.appendChild(document.createTextNode('Remove processing equipment'));

    // Dummy tiles toggle
    const dummyLabel = document.createElement('label');
    dummyLabel.style.display = 'flex';
    dummyLabel.style.alignItems = 'center';
    dummyLabel.style.fontSize = '13px';
    dummyLabel.style.cursor = 'pointer';
    dummyLabel.style.whiteSpace = 'nowrap';

    const dummyCheckbox = document.createElement('input');
    dummyCheckbox.type = 'checkbox';
    dummyCheckbox.className = 'remove-dummy-checkbox';
    dummyCheckbox.dataset.screenId = screenId;
    dummyCheckbox.style.marginRight = '5px';
    dummyLabel.appendChild(dummyCheckbox);
    dummyLabel.appendChild(document.createTextNode('Remove dummy tiles'));

    togglesContainer.appendChild(powerDistroLabel);
    togglesContainer.appendChild(processingLabel);
    togglesContainer.appendChild(dummyLabel);

    // Add event listeners
    const updateVisibility = () => this.updateScreenEquipmentVisibility(screenSection);
    powerDistroCheckbox.addEventListener('change', updateVisibility);
    processingCheckbox.addEventListener('change', updateVisibility);
    dummyCheckbox.addEventListener('change', updateVisibility);

    screenSection.querySelector('h3').after(togglesContainer);
  },

  /**
   * Update screen equipment visibility based on toggle checkboxes
   * @param {HTMLElement} screenSection - Screen section element
   */
  updateScreenEquipmentVisibility(screenSection) {
    const powerDistroCheckbox = screenSection.querySelector('.remove-power-distro-checkbox');
    const processingCheckbox = screenSection.querySelector('.remove-processing-checkbox');
    const dummyCheckbox = screenSection.querySelector('.remove-dummy-checkbox');

    const table = screenSection.querySelector('.equipment-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr:not(.total-row)');
    let visibleWeight = 0;

    rows.forEach(row => {
      if (row.cells.length >= 4) {
        const ecode = row.cells[0].textContent.trim();
        const name = row.cells[1].textContent.trim();
        const weight = parseFloat(row.cells[3].textContent) || 0;

        let shouldHide = false;

        if (powerDistroCheckbox?.checked && this.isPowerDistroEquipment(ecode, name)) {
          shouldHide = true;
        }
        if (processingCheckbox?.checked && this.isProcessingEquipment(ecode, name)) {
          shouldHide = true;
        }
        if (dummyCheckbox?.checked && this.isDummyTileEquipment(ecode, name)) {
          shouldHide = true;
        }

        row.style.display = shouldHide ? 'none' : '';
        if (!shouldHide) {
          visibleWeight += weight;
        }
      }
    });

    // Update total weight
    const totalRow = table.querySelector('.total-row');
    if (totalRow && totalRow.cells.length >= 4) {
      totalRow.cells[3].innerHTML = `<strong>${visibleWeight.toFixed(2)} lbs</strong>`;
    }
  }
};

// Initialize multi-screen system
function initMultiScreenSystem() {
  if (window.multiScreenInitialized) return;

  MultiScreenManager.addMultiScreenStyles();
  MultiScreenManager.createMultiScreenUI();

  // Override generateWall to save current config
  window.originalGenerateWall = window.generateWall;
  window.generateWall = function() {
    MultiScreenManager.saveCurrentScreenConfig();
    window.originalGenerateWall.apply(this, arguments);
  };

  // Save and override addEquipmentRow
  window.originalAddEquipmentRow = window.addEquipmentRow;
  window.addEquipmentRow = function(ecode, name, weight, quantity, tbody) {
    if (window.isCollectingEquipment) {
      if (quantity > 0) {
        window.equipmentCollector.push({
          ecode: ecode,
          name: name,
          weight: weight,
          quantity: quantity
        });
      }
      return;
    }
    window.originalAddEquipmentRow(ecode, name, weight, quantity, tbody);
  };

  window.multiScreenInitialized = true;
}

// Toggle multi-screen management mode
function toggleMultiScreenManagement() {
  const checked = document.getElementById('multipleScreenManagementCheckbox')?.checked || false;

  if (checked && !window.multiScreenInitialized) {
    initMultiScreenSystem();
  }

  const screenSelector = document.getElementById('screenSelector');
  if (screenSelector) {
    screenSelector.style.display = checked ? 'block' : 'none';
  }

  const combineButton = document.getElementById('combineEquipmentButtonContainer');
  if (combineButton) {
    combineButton.style.display = checked ? 'block' : 'none';
  }
}

// Global function exports for backward compatibility
if (typeof window !== 'undefined') {
  // Initialize global variables
  if (!window.screenConfigurations) {
    window.screenConfigurations = [new ScreenConfig(1)];
  }
  if (typeof window.activeScreenIndex === 'undefined') {
    window.activeScreenIndex = 0;
  }
  if (!window.equipmentCollector) {
    window.equipmentCollector = [];
  }
  if (typeof window.isCollectingEquipment === 'undefined') {
    window.isCollectingEquipment = false;
  }
  if (typeof window.multiScreenInitialized === 'undefined') {
    window.multiScreenInitialized = false;
  }

  // Export class
  window.ScreenConfig = ScreenConfig;

  // Export manager
  window.MultiScreenManager = MultiScreenManager;

  // Export standalone functions
  window.initMultiScreenSystem = initMultiScreenSystem;
  window.toggleMultiScreenManagement = toggleMultiScreenManagement;

  // Export add/remove/switch functions
  window.addScreenConfiguration = function() {
    const newId = window.screenConfigurations.length + 1;
    window.screenConfigurations.push(new ScreenConfig(newId));
    MultiScreenManager.updateScreenSelector();
    window.switchToScreen(newId - 1);
  };

  window.removeActiveScreen = function() {
    if (window.screenConfigurations.length > 1) {
      window.screenConfigurations.splice(window.activeScreenIndex, 1);
      window.screenConfigurations.forEach((config, idx) => {
        config.id = idx + 1;
      });
      MultiScreenManager.updateScreenSelector();
      if (window.activeScreenIndex >= window.screenConfigurations.length) {
        window.switchToScreen(0);
      } else {
        window.switchToScreen(window.activeScreenIndex);
      }
    }
  };

  window.switchToScreen = function(index) {
    index = parseInt(index);
    if (index < 0 || index >= window.screenConfigurations.length) return;

    MultiScreenManager.saveCurrentScreenConfig();
    window.activeScreenIndex = index;
    MultiScreenManager.loadScreenConfig(window.screenConfigurations[window.activeScreenIndex]);
    MultiScreenManager.updateScreenTabs();
    if (typeof window.generateWall === 'function') {
      window.generateWall();
    }
  };

  // Export distro functions
  window.showCombineDistroDialog = () => MultiScreenManager.showCombineDistroDialog();
  window.closeCombineDistroDialog = () => MultiScreenManager.closeCombineDistroDialog();
  window.applyCombinedDistro = () => MultiScreenManager.applyCombinedDistro();

  // Export processing functions
  window.showCombineProcessingDialog = () => MultiScreenManager.showCombineProcessingDialog();
  window.closeCombineProcessingDialog = () => MultiScreenManager.closeCombineProcessingDialog();
  window.applyCombinedProcessing = () => MultiScreenManager.applyCombinedProcessing();

  // Export equipment visibility functions
  window.isPowerDistroEquipment = (ecode, name) => MultiScreenManager.isPowerDistroEquipment(ecode, name);
  window.isProcessingEquipment = (ecode, name) => MultiScreenManager.isProcessingEquipment(ecode, name);
  window.isDummyTileEquipment = (ecode, name) => MultiScreenManager.isDummyTileEquipment(ecode, name);
  window.updateScreenEquipmentVisibility = (section) => MultiScreenManager.updateScreenEquipmentVisibility(section);
  window.updateCombinedEquipment = () => MultiScreenManager.updateCombinedEquipment();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ScreenConfig,
    MultiScreenManager,
    initMultiScreenSystem,
    toggleMultiScreenManagement
  };
}
