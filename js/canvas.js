/**
 * Rentex LED Wall Calculator - Canvas Rendering Module
 * Handles all wall visualization and canvas drawing operations
 */

/**
 * Canvas configuration and state
 */
const CanvasRenderer = {
  // Image assets
  images: {
    singleHeader: null,
    doubleHeader: null,
    singleBase: null,
    doubleBase: null,
    block: null
  },

  // Configuration
  config: {
    baseBlockPixels: 200,
    screenSpacing: 20,
    headerOffsetMultiplier: 13,
    baseOffsetMultiplier: 11
  },

  /**
   * Initialize canvas renderer and preload images
   */
  init() {
    this.loadImages();
  },

  /**
   * Preload all required images
   * Priority: Load block image immediately, defer others
   */
  loadImages() {
    // Block image - Load immediately (high priority)
    this.images.block = new Image();
    this.images.block.src = 'static/images/block.png';
    this.images.block.loading = 'eager';
    this.images.block.onload = () => console.log('Block image loaded');
    this.images.block.onerror = () => console.error('Error loading block image');

    // Defer loading of header/base images until needed
    this.lazyLoadHeaderBaseImages();
  },

  /**
   * Lazy load header and base images
   */
  lazyLoadHeaderBaseImages() {
    // Use requestIdleCallback if available, otherwise setTimeout
    const loadFn = () => {
      // Single header image
      this.images.singleHeader = new Image();
      this.images.singleHeader.src = 'static/images/single_header.png';
      this.images.singleHeader.loading = 'lazy';
      this.images.singleHeader.onload = () => console.log('Single header image loaded');
      this.images.singleHeader.onerror = () => console.error('Error loading single header image');

      // Double header image
      this.images.doubleHeader = new Image();
      this.images.doubleHeader.src = 'static/images/double_header.png';
      this.images.doubleHeader.loading = 'lazy';
      this.images.doubleHeader.onload = () => console.log('Double header image loaded');
      this.images.doubleHeader.onerror = () => console.error('Error loading double header image');

      // Single base image
      this.images.singleBase = new Image();
      this.images.singleBase.src = 'static/images/single_base.png';
      this.images.singleBase.loading = 'lazy';
      this.images.singleBase.onload = () => console.log('Single base image loaded');
      this.images.singleBase.onerror = () => console.error('Error loading single base image');

      // Double base image
      this.images.doubleBase = new Image();
      this.images.doubleBase.src = 'static/images/double_base.png';
      this.images.doubleBase.loading = 'lazy';
      this.images.doubleBase.onerror = () => console.error('Error loading double base image');
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadFn);
    } else {
      setTimeout(loadFn, 1);
    }
  },

  /**
   * Draw the complete LED wall with all screens
   * @param {Object} wallData - Wall configuration data
   * @param {number} wallData.blocksHor - Horizontal tile count
   * @param {number} wallData.blocksVer - Vertical tile count
   * @param {boolean} wallData.flownSupport - Whether flown support is used
   * @param {boolean} wallData.groundSupport - Whether ground support is used
   * @param {number} zoomLevel - Current zoom level
   * @param {boolean} showNumbers - Whether to show tile numbers
   * @param {HTMLImageElement} blockImage - Tile image to render
   */
  drawWall(wallData, zoomLevel = 4, showNumbers = false, blockImage = null) {
    const canvas = document.getElementById('wallCanvas2D');
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');

    // Use provided blockImage or fall back to loaded image or create fallback
    const tileImage = blockImage || this.images.block;

    const blockSize = (this.config.baseBlockPixels / 4) * zoomLevel;

    // Get number of screens (default to 1)
    const numScreens = parseInt(document.getElementById('numScreens')?.value || "1", 10);

    // Calculate support heights
    const supportHeight = blockSize / 4;
    const extraHeightTop = wallData.flownSupport ? supportHeight * 2 : 0;
    const extraHeightBottom = wallData.groundSupport ? supportHeight * 2 : 0;

    // Add padding to account for grid line width and ensure edges aren't clipped
    const gridLinePadding = 5;

    // Calculate canvas dimensions
    const singleScreenWidth = wallData.blocksHor * blockSize;
    canvas.width = (singleScreenWidth * numScreens) + (this.config.screenSpacing * (numScreens - 1)) + (gridLinePadding * 2);
    canvas.height = wallData.blocksVer * blockSize + extraHeightTop + extraHeightBottom + (gridLinePadding * 2);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each screen
    let tileNumber = 1;
    for (let screenIndex = 0; screenIndex < numScreens; screenIndex++) {
      const xOffset = gridLinePadding + screenIndex * (singleScreenWidth + this.config.screenSpacing);

      // Create clipping region for this screen (expanded to include grid lines at edges)
      ctx.save();
      ctx.beginPath();
      ctx.rect(xOffset - gridLinePadding, 0, singleScreenWidth + (gridLinePadding * 2), canvas.height);
      ctx.clip();

      // Draw wall background as a single stretched image
      const wallWidth = wallData.blocksHor * blockSize;
      const wallHeight = wallData.blocksVer * blockSize;
      const wallX = xOffset;
      const wallY = gridLinePadding + extraHeightTop;

      // Use wallBackgroundImage if available, otherwise fallback to tileImage
      const imageToUse = (window.wallBackgroundImage && window.wallBackgroundImage.complete && window.wallBackgroundImage.naturalHeight !== 0)
        ? window.wallBackgroundImage
        : tileImage;

      if (imageToUse && imageToUse.complete && imageToUse.naturalHeight !== 0) {
        // Draw background image at 55% opacity
        ctx.globalAlpha = 0.55;
        ctx.drawImage(imageToUse, wallX, wallY, wallWidth, wallHeight);
        ctx.globalAlpha = 1.0; // Reset to full opacity
      } else {
        // Fallback: draw colored rectangle
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#444';
        ctx.fillRect(wallX, wallY, wallWidth, wallHeight);
        ctx.globalAlpha = 1.0; // Reset to full opacity
      }

      // Draw grid lines to show block boundaries
      ctx.strokeStyle = '#FFFFFF';  // White grid lines
      ctx.lineWidth = 2;

      // Draw vertical grid lines
      for (let col = 0; col <= wallData.blocksHor; col++) {
        const lineX = xOffset + col * blockSize;
        ctx.beginPath();
        ctx.moveTo(lineX, wallY);
        ctx.lineTo(lineX, wallY + wallHeight);
        ctx.stroke();
      }

      // Draw horizontal grid lines
      for (let row = 0; row <= wallData.blocksVer; row++) {
        const lineY = wallY + row * blockSize;
        ctx.beginPath();
        ctx.moveTo(wallX, lineY);
        ctx.lineTo(wallX + wallWidth, lineY);
        ctx.stroke();
      }

      // Draw wiring diagram if enabled
      if (window.showWiring) {
        this.drawWiringDiagram(ctx, wallData, blockSize, xOffset, gridLinePadding + extraHeightTop);
      }

      // Draw power diagram if enabled
      if (window.showPower) {
        this.drawPowerDiagram(ctx, wallData, blockSize, xOffset, gridLinePadding + extraHeightTop);
      }

      // Draw tile numbers if enabled (drawn after wiring diagrams so they appear on top)
      if (showNumbers) {
        for (let row = 0; row < wallData.blocksVer; row++) {
          for (let col = 0; col < wallData.blocksHor; col++) {
            const posX = xOffset + col * blockSize;
            const posY = gridLinePadding + extraHeightTop + row * blockSize;

            // White text with black outline for visibility
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.font = `bold ${Math.max(12, blockSize / 4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textX = posX + blockSize / 2;
            const textY = posY + blockSize / 2;
            ctx.strokeText(tileNumber, textX, textY);
            ctx.fillText(tileNumber, textX, textY);

            tileNumber++;
          }
        }
      }

      // Draw support structures
      if (wallData.flownSupport) {
        this.drawFlownSupports(ctx, wallData.blocksHor, blockSize, xOffset, supportHeight, zoomLevel);
      }

      if (wallData.groundSupport) {
        this.drawGroundBases(ctx, wallData.blocksHor, wallData.blocksVer, blockSize, xOffset, supportHeight, zoomLevel);
      }

      // Restore context
      ctx.restore();
    }

    console.log('Wall drawing completed');
  },

  /**
   * Draw wiring diagram showing data connections between tiles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} wallData - Wall configuration data
   * @param {number} blockSize - Size of each block in pixels
   * @param {number} xOffset - Horizontal offset for multi-screen
   * @param {number} extraHeightTop - Extra height at top for supports
   */
  drawWiringDiagram(ctx, wallData, blockSize, xOffset, extraHeightTop) {
    // Get product type to determine daisy chain limit
    const productType = document.getElementById('productType')?.value;
    const daisyChainLimits = {
      'absen': 10,
      'BP2B1': 13,  // ROE Black Pearl 2 B1
      'BP2B2': 13,  // ROE Black Pearl 2 B2
      'BP2V2': 13,  // ROE Black Pearl 2V2
      'theatrixx': 10
    };
    const chainLimit = daisyChainLimits[productType] || 10;

    // Get wiring direction and start position
    const direction = window.wiringDirection || 'horizontal';
    const startPosition = window.wiringStartPosition || 'bottom-left';

    // Array of colors for different chains (bright, visible colors)
    const chainColors = [
      '#FF3366', // Red-Pink
      '#33FF66', // Green
      '#3366FF', // Blue
      '#FFFF33', // Yellow
      '#FF9933', // Orange
      '#CC33FF', // Purple
      '#33FFFF', // Cyan
      '#FF3399', // Magenta
      '#99FF33', // Lime
      '#FF6633', // Red-Orange
      '#33FF99', // Teal
      '#9933FF', // Violet
      '#FFCC33', // Gold
      '#33CCFF', // Sky Blue
      '#FF33CC', // Hot Pink
    ];

    // Calculate total tiles
    const totalTiles = wallData.blocksHor * wallData.blocksVer;

    // Set line style for wiring
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let tilesInCurrentChain = 0;
    let chainNumber = 0;
    let chainStartX = 0;
    let chainStartY = 0;

    // Create array of tile positions based on wiring direction and start position
    // Using snake/serpentine pattern for continuous wiring
    const tiles = [];

    if (direction === 'horizontal') {
      // Horizontal wiring (snake left-right on each row)
      if (startPosition === 'bottom-left') {
        // Bottom-left: snake right/left, moving up
        for (let row = wallData.blocksVer - 1; row >= 0; row--) {
          const rowIndex = wallData.blocksVer - 1 - row; // 0, 1, 2, ...
          if (rowIndex % 2 === 0) {
            // Even rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'bottom-right') {
        // Bottom-right: snake left/right, moving up
        for (let row = wallData.blocksVer - 1; row >= 0; row--) {
          const rowIndex = wallData.blocksVer - 1 - row;
          if (rowIndex % 2 === 0) {
            // Even rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-left') {
        // Top-left: snake right/left, moving down
        for (let row = 0; row < wallData.blocksVer; row++) {
          if (row % 2 === 0) {
            // Even rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-right') {
        // Top-right: snake left/right, moving down
        for (let row = 0; row < wallData.blocksVer; row++) {
          if (row % 2 === 0) {
            // Even rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          }
        }
      }
    } else {
      // Vertical wiring (snake up/down on each column)
      if (startPosition === 'bottom-left') {
        // Bottom-left: snake up/down, moving right
        for (let col = 0; col < wallData.blocksHor; col++) {
          if (col % 2 === 0) {
            // Even columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'bottom-right') {
        // Bottom-right: snake up/down, moving left
        for (let col = wallData.blocksHor - 1; col >= 0; col--) {
          const colIndex = wallData.blocksHor - 1 - col;
          if (colIndex % 2 === 0) {
            // Even columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-left') {
        // Top-left: snake down/up, moving right
        for (let col = 0; col < wallData.blocksHor; col++) {
          if (col % 2 === 0) {
            // Even columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-right') {
        // Top-right: snake down/up, moving left
        for (let col = wallData.blocksHor - 1; col >= 0; col--) {
          const colIndex = wallData.blocksHor - 1 - col;
          if (colIndex % 2 === 0) {
            // Even columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          }
        }
      }
    }

    // Draw wiring lines with outline effect for better visibility
    let chainPath = []; // Store path points for current chain

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const posX = xOffset + tile.col * blockSize + blockSize / 2;
      const posY = extraHeightTop + tile.row * blockSize + blockSize / 2;

      if (tilesInCurrentChain === 0) {
        // Start of a new chain
        chainNumber++;
        chainPath = [{ x: posX, y: posY }];

        // Save start position for label
        chainStartX = posX;
        chainStartY = posY;
        tilesInCurrentChain = 1;
      } else {
        // Continue the chain
        chainPath.push({ x: posX, y: posY });
        tilesInCurrentChain++;
      }

      // If we've reached the chain limit or the last tile, finish this chain
      if (tilesInCurrentChain === chainLimit || i === tiles.length - 1) {
        const chainColor = chainColors[(chainNumber - 1) % chainColors.length];

        // Draw white outline first (thicker)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(chainPath[0].x, chainPath[0].y);
        for (let j = 1; j < chainPath.length; j++) {
          ctx.lineTo(chainPath[j].x, chainPath[j].y);
        }
        ctx.stroke();

        // Draw colored line on top (normal width)
        ctx.strokeStyle = chainColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(chainPath[0].x, chainPath[0].y);
        for (let j = 1; j < chainPath.length; j++) {
          ctx.lineTo(chainPath[j].x, chainPath[j].y);
        }
        ctx.stroke();

        // Draw port label at start of chain
        ctx.fillStyle = chainColor;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = `bold ${Math.max(14, blockSize / 3)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelText = `Port ${chainNumber}`;

        // Draw text with black outline for visibility
        ctx.strokeText(labelText, chainStartX, chainStartY);
        ctx.fillText(labelText, chainStartX, chainStartY);

        // Reset for next chain
        tilesInCurrentChain = 0;
        chainPath = [];
      }
    }
  },

  /**
   * Draw power diagram showing power distribution with voltage-dependent tile limits
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} wallData - Wall configuration data
   * @param {number} blockSize - Size of each block in pixels
   * @param {number} xOffset - Horizontal offset for multi-screen
   * @param {number} extraHeightTop - Extra height at top for supports
   */
  drawPowerDiagram(ctx, wallData, blockSize, xOffset, extraHeightTop) {
    // Get product type and voltage to determine power tile limit
    const productType = document.getElementById('productType')?.value;
    const powerDistroType = document.getElementById('powerDistroType')?.value;
    const voltage = (powerDistroType == '110') ? 110 : 208;

    // Power tile limits based on voltage and product type
    const powerTileLimits = {
      'absen': { 110: 10, 208: 30 },
      'BP2B1': { 110: 11, 208: 32 },  // ROE Black Pearl 2 B1
      'BP2B2': { 110: 11, 208: 32 },  // ROE Black Pearl 2 B2
      'BP2V2': { 110: 11, 208: 32 },  // ROE Black Pearl 2V2
      'theatrixx': { 110: 10, 208: 30 }
    };

    const chainLimit = powerTileLimits[productType]?.[voltage] || 10;

    // Get power wiring direction and start position
    const direction = window.powerDirection || 'horizontal';
    const startPosition = window.powerStartPosition || 'bottom-left';

    // Array of colors for different power chains (warmer tones to distinguish from data)
    const chainColors = [
      '#FF6B35', // Red-Orange
      '#FFB627', // Amber
      '#FF1744', // Red
      '#FF9100', // Orange
      '#FFD600', // Yellow
      '#DD2C00', // Deep Orange
      '#FF6F00', // Dark Orange
      '#F4511E', // Deep Orange Red
      '#FB8C00', // Orange
      '#FFA726', // Light Orange
      '#FFAB40', // Amber
      '#FFC107', // Amber
      '#FFD54F', // Yellow
      '#FF7043', // Deep Orange
      '#FF5722', // Red-Orange
    ];

    // Calculate total tiles
    const totalTiles = wallData.blocksHor * wallData.blocksVer;

    // Set line style for power wiring (dashed to distinguish from data)
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([10, 5]); // Dashed line pattern

    let tilesInCurrentChain = 0;
    let chainNumber = 0;
    let chainStartX = 0;
    let chainStartY = 0;

    // Create array of tile positions based on wiring direction and start position
    // Using snake/serpentine pattern for continuous wiring
    const tiles = [];

    if (direction === 'horizontal') {
      // Horizontal wiring (snake left-right on each row)
      if (startPosition === 'bottom-left') {
        // Bottom-left: snake right/left, moving up
        for (let row = wallData.blocksVer - 1; row >= 0; row--) {
          const rowIndex = wallData.blocksVer - 1 - row; // 0, 1, 2, ...
          if (rowIndex % 2 === 0) {
            // Even rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'bottom-right') {
        // Bottom-right: snake left/right, moving up
        for (let row = wallData.blocksVer - 1; row >= 0; row--) {
          const rowIndex = wallData.blocksVer - 1 - row;
          if (rowIndex % 2 === 0) {
            // Even rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-left') {
        // Top-left: snake right/left, moving down
        for (let row = 0; row < wallData.blocksVer; row++) {
          if (row % 2 === 0) {
            // Even rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-right') {
        // Top-right: snake left/right, moving down
        for (let row = 0; row < wallData.blocksVer; row++) {
          if (row % 2 === 0) {
            // Even rows: go left
            for (let col = wallData.blocksHor - 1; col >= 0; col--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd rows: go right
            for (let col = 0; col < wallData.blocksHor; col++) {
              tiles.push({ row, col });
            }
          }
        }
      }
    } else {
      // Vertical wiring (snake up/down on each column)
      if (startPosition === 'bottom-left') {
        // Bottom-left: snake up/down, moving right
        for (let col = 0; col < wallData.blocksHor; col++) {
          if (col % 2 === 0) {
            // Even columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'bottom-right') {
        // Bottom-right: snake up/down, moving left
        for (let col = wallData.blocksHor - 1; col >= 0; col--) {
          const colIndex = wallData.blocksHor - 1 - col;
          if (colIndex % 2 === 0) {
            // Even columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-left') {
        // Top-left: snake down/up, moving right
        for (let col = 0; col < wallData.blocksHor; col++) {
          if (col % 2 === 0) {
            // Even columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          }
        }
      } else if (startPosition === 'top-right') {
        // Top-right: snake down/up, moving left
        for (let col = wallData.blocksHor - 1; col >= 0; col--) {
          const colIndex = wallData.blocksHor - 1 - col;
          if (colIndex % 2 === 0) {
            // Even columns: go down
            for (let row = 0; row < wallData.blocksVer; row++) {
              tiles.push({ row, col });
            }
          } else {
            // Odd columns: go up
            for (let row = wallData.blocksVer - 1; row >= 0; row--) {
              tiles.push({ row, col });
            }
          }
        }
      }
    }

    // Draw power wiring lines with outline effect for better visibility
    let chainPath = []; // Store path points for current chain

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const posX = xOffset + tile.col * blockSize + blockSize / 2;
      const posY = extraHeightTop + tile.row * blockSize + blockSize / 2;

      if (tilesInCurrentChain === 0) {
        // Start of a new chain
        chainNumber++;
        chainPath = [{ x: posX, y: posY }];

        // Save start position for label
        chainStartX = posX;
        chainStartY = posY;
        tilesInCurrentChain = 1;
      } else {
        // Continue the chain
        chainPath.push({ x: posX, y: posY });
        tilesInCurrentChain++;
      }

      // If we've reached the chain limit or the last tile, finish this chain
      if (tilesInCurrentChain === chainLimit || i === tiles.length - 1) {
        const chainColor = chainColors[(chainNumber - 1) % chainColors.length];

        // Draw white outline first (thicker, dashed)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(chainPath[0].x, chainPath[0].y);
        for (let j = 1; j < chainPath.length; j++) {
          ctx.lineTo(chainPath[j].x, chainPath[j].y);
        }
        ctx.stroke();

        // Draw colored line on top (normal width, dashed)
        ctx.strokeStyle = chainColor;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(chainPath[0].x, chainPath[0].y);
        for (let j = 1; j < chainPath.length; j++) {
          ctx.lineTo(chainPath[j].x, chainPath[j].y);
        }
        ctx.stroke();

        // Draw power connection label at start of chain
        ctx.setLineDash([]); // Solid for text
        ctx.fillStyle = chainColor;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = `bold ${Math.max(14, blockSize / 3)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelText = `Pwr ${chainNumber}`;

        // Draw text with black outline for visibility
        ctx.strokeText(labelText, chainStartX, chainStartY);
        ctx.fillText(labelText, chainStartX, chainStartY);

        // Reset for next chain
        tilesInCurrentChain = 0;
        chainPath = [];
      }
    }

    // Reset line dash after drawing
    ctx.setLineDash([]);
  },

  /**
   * Draw flown support headers
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} horizontalBlocks - Number of horizontal blocks
   * @param {number} blockSize - Size of each block in pixels
   * @param {number} xOffset - Horizontal offset for multi-screen
   * @param {number} supportHeight - Height of support structure
   * @param {number} zoomLevel - Current zoom level
   */
  drawFlownSupports(ctx, horizontalBlocks, blockSize, xOffset, supportHeight, zoomLevel) {
    const headerOffset = this.config.headerOffsetMultiplier * zoomLevel;
    const flownSupportType = document.getElementById('flownSupportType')?.value || 'Single Header';

    for (let i = 0; i < horizontalBlocks; i++) {
      let posX, posY, headerImage, imageWidth;

      if (flownSupportType === 'Double Header') {
        // Double headers: every other position (skip odd indices)
        if (i % 2 !== 0) continue;
        // Check if double header would extend past the wall
        if (i + 2 > horizontalBlocks) {
          // Use single header for the remaining odd tile
          posX = i * blockSize;
          posY = headerOffset;
          imageWidth = blockSize;
          headerImage = this.images.singleHeader;
        } else {
          posX = i * blockSize;
          posY = headerOffset;
          imageWidth = 2 * blockSize;
          headerImage = this.images.doubleHeader;
        }
      } else {
        // Single headers: every position
        posX = i * blockSize;
        posY = headerOffset;
        imageWidth = blockSize;
        headerImage = this.images.singleHeader;
      }

      // Add screen offset
      posX += xOffset;
      const imageHeight = supportHeight;

      // Draw header image (only if loaded)
      if (headerImage && headerImage.complete && headerImage.naturalHeight !== 0) {
        ctx.drawImage(headerImage, posX, posY, imageWidth, imageHeight);
      }
    }
  },

  /**
   * Draw ground support bases
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} horizontalBlocks - Number of horizontal blocks
   * @param {number} verticalBlocks - Number of vertical blocks
   * @param {number} blockSize - Size of each block in pixels
   * @param {number} xOffset - Horizontal offset for multi-screen
   * @param {number} supportHeight - Height of support structure
   * @param {number} zoomLevel - Current zoom level
   */
  drawGroundBases(ctx, horizontalBlocks, verticalBlocks, blockSize, xOffset, supportHeight, zoomLevel) {
    const baseOffset = this.config.baseOffsetMultiplier * zoomLevel;
    const groundSupportType = document.getElementById('groundSupportType')?.value || 'Single Base';

    for (let i = 0; i < horizontalBlocks; i++) {
      let posX, posY, baseImage, imageWidth;

      if (groundSupportType === 'Double Base') {
        // Double bases: every other position (skip odd indices)
        if (i % 2 !== 0) continue;
        // Check if double base would extend past the wall
        if (i + 2 > horizontalBlocks) {
          // Use single base for the remaining odd tile
          posX = i * blockSize;
          posY = (verticalBlocks * blockSize) - supportHeight + baseOffset;
          imageWidth = blockSize;
          baseImage = this.images.singleBase;
        } else {
          posX = i * blockSize;
          posY = (verticalBlocks * blockSize) - supportHeight + baseOffset;
          imageWidth = 2 * blockSize;
          baseImage = this.images.doubleBase;
        }
      } else {
        // Single bases: every position
        posX = i * blockSize;
        posY = (verticalBlocks * blockSize) - supportHeight + baseOffset;
        imageWidth = blockSize;
        baseImage = this.images.singleBase;
      }

      // Add screen offset
      posX += xOffset;
      const imageHeight = supportHeight;

      // Draw base image (only if loaded)
      if (baseImage && baseImage.complete && baseImage.naturalHeight !== 0) {
        ctx.drawImage(baseImage, posX, posY, imageWidth, imageHeight);
      }
    }
  },

  /**
   * Display wall dimensions in the UI
   * @param {string} productType - Type of LED product
   */
  displayWallDimensions(productType) {
    const dimensionsDiv = document.getElementById('wallDimensions');
    if (!dimensionsDiv) return;

    // Get configuration values
    const horizontalBlocks = parseInt(document.getElementById('blocksHor')?.value || 1, 10);
    const verticalBlocks = parseInt(document.getElementById('blocksVer')?.value || 1, 10);
    const numScreens = parseInt(document.getElementById('numScreens')?.value || 1, 10);

    // Get product-specific pixel size
    let pixelsPerTile;
    let depth;

    switch (productType) {
      case 'BP2B1':
      case 'BP2B2':
      case 'BP2V2':
        pixelsPerTile = 176;
        depth = '44"';
        break;
      case 'theatrixx':
        pixelsPerTile = 192;
        depth = '47"';
        break;
      case 'absen':
      default:
        pixelsPerTile = 200;
        depth = '35"';
        break;
    }

    // Calculate dimensions
    const totalWidthPixels = (horizontalBlocks * pixelsPerTile * numScreens) + (this.config.screenSpacing * (numScreens - 1));
    const totalHeightPixels = verticalBlocks * pixelsPerTile;
    const totalPixels = (totalWidthPixels * totalHeightPixels).toLocaleString();

    const totalWidthFeet = (horizontalBlocks * 1.64 * numScreens).toFixed(2);
    const totalHeightFeet = (verticalBlocks * 1.64).toFixed(2);

    const totalTiles = horizontalBlocks * verticalBlocks * numScreens;

    // Update display
    dimensionsDiv.innerHTML = `
      <div style="text-align: center;">
        <strong>Wall Dimensions:</strong><br>
        ${totalWidthPixels} px (W) x ${totalHeightPixels} px (H)<br>
        ${totalWidthFeet}' (W) x ${totalHeightFeet}' (H) x ${depth} (D)<br>
        Total Tiles: ${totalTiles}
      </div>
    `;
  }
};

// Backward compatibility - expose functions globally
if (typeof window !== 'undefined') {
  window.CanvasRenderer = CanvasRenderer;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CanvasRenderer.init());
  } else {
    CanvasRenderer.init();
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasRenderer;
}
