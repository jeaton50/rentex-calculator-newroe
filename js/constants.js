/**
 * Rentex LED Wall Calculator - Constants and Configuration
 * All magic numbers and configuration data centralized
 */

const CONSTANTS = {
  // Block/Tile Dimensions
  BLOCK_SIZE_MM: 500,
  BLOCK_SIZE_FEET: 500 / 304.8,

  // Power calculation multipliers
  POWER: {
    absen: {
      voltage110Multiplier: 1.745,
      voltage208Multiplier: 0.923,
      ampsPer110: 0.59,
      ampsPer208: 0.312,
      wattsPerTile: 192
    },
    BP2: {
      voltage110Numerator: 160,
      voltage110Denominator: 110,
      voltage208Numerator: 190,
      voltage208Denominator: 208,
      ampsPer110Numerator: 95,
      ampsPer208Numerator: 95,
      wattsPerTile: 190
    },
    theatrixx: {
      voltage110Multiplier: 2.40909,
      voltage208Multiplier: 1.27403,
      ampsPer110: 1.63636,
      ampsPer208Divisor: 1000,
      ampsPer208Multiplier: 865.38461,
      wattsPerTile: 190
    },
    ROEGP26Full: {
      ampsPer110: 2.91,
      ampsPer208: 1.54,
      wattsPerTile: 320
    },
    ROEGP26Half: {
      ampsPer110: 1.45,
      ampsPer208: 0.77,
      wattsPerTile: 160
    }
  },

  // Product types
  PRODUCTS: {
    ABSEN: 'absen',
    BP2B1: 'BP2B1',
    BP2B2: 'BP2B2',
    BP2V2: 'BP2V2',
    THEATRIXX: 'theatrixx',
    ROEGP26FULL: 'ROEGP26Full',
    ROEGP26HALF: 'ROEGP26Half'
  },

  // Vertical tile limits
  MAX_VERTICAL_TILES: {
    absen: 11,
    BP2B1: 13,
    BP2B2: 12,
    BP2V2: 13,
    theatrixx: 13,
    ROEGP26Full: 7,
    ROEGP26Half: 13
  },

  // Data cascade limits (tiles per data port)
  MAX_DATA_CASCADE: {
    absen: 10,
    BP2: 13,
    theatrixx: 10,
    ROEGP26Full: 5,
    ROEGP26Half: 11
  },

  // Processor limits
  PROCESSOR: {
    maxPanelsPerS8: 100,
    maxPixelsPerMX40PRO: 9000000,
    bromptonMaxWidth: 4096,
    bromptonMaxHeight: 2160,
    bromptonS8MaxWidth: 2000,
    bromptonS8MaxHeight: 2000
  },

  // Pixels per tile
  PIXELS_PER_TILE: {
    absen: 200,
    BP2: 176,
    theatrixx: 192,
    ROEGP26Full: 192,
    ROEGP26Half: 192
  },

  // Distribution types
  DISTRO_TYPES: {
    AUTO: 'Auto',
    CUBEDIST: 'CUBEDIST',
    TP1: 'TP1',
    VOLTAGE_110: '110',
    CUSTOMER: '208'
  },

  // Redundancy types
  REDUNDANCY: {
    NONE: 'None',
    DISTRIBUTION_CABLES: 'Distribution and Cables',
    FULLY_REDUNDANT: 'Fully Redundant'
  },

  // Table row colors by product type
  TABLE_COLORS: {
    absen: '#ffecec',
    BP2B1: '#ecf7ff',
    BP2B2: '#eaffec',
    BP2V2: '#fdf7e7',
    theatrixx: '#f3eaff',
    ROEGP26Full: '#ffe5f0',
    ROEGP26Half: '#fff0e5'
  }
};

// Sandbag lookup tables
// GP2.6 Full based on manufacturer spec (10×4 wall = 2835 lbs total)
// GP2.6 Half based on weight ratio with safety margin (0.709 scaling)
const SANDBAG_TABLES = {
  absen: [0, 0, 0, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 8, 8],
  ROE: [0, 0, 0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9],
  theatrixx: [0, 0, 0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9],
  // Half: GP2.6 Full × 1.153 kg/m² ratio (20.76/18.00 - more frame per m²)
  ROEGP26Half: [0.09, 1.10, 6.47, 13.17, 21.20, 30.54, 41.22, 53.23, 66.55, 81.21, 97.19],
  // Full: Quadratic fit (12×3=1682 lbs, 10×4=2835 lbs, 32×4=9140 lbs)
  ROEGP26Full: [0.08, 0.95, 5.61, 11.42, 18.38, 26.49, 35.75, 46.16, 57.72, 70.43, 84.29]
};

// Equipment codes and names
// Images stored in static/images/equipment/ using the equipment code as filename (e.g., PL25.png)
const EQUIPMENT = {
  // Absen
  PL25: { code: 'PL25', name: 'Absen PL2.5 tile', weight: 20.61, image: 'PL25.png' },
  PL25_CASE: { code: 'PL25CASE', name: 'Case, Absen PL2.5, 8x', weight: 161.12, image: 'PL25CASE.png' },
  PL25_BB1: { code: 'PL25BB1', name: 'Absen PL2.5 base bar, 1W, 0.5m', weight: 16, image: 'PL25BB1.png' },
  PL25_BB2: { code: 'PL25BB2', name: 'Absen PL2.5 base bar, 2W, 1m', weight: 37, image: 'PL25BB2.png' },
  PL25_HEAD1: { code: 'PL25HEAD1', name: 'Absen PL2.5 header, 1W, 0.5m', weight: 12, image: 'PL25HEAD1.png' },
  PL25_HEAD2: { code: 'PL25HEAD2', name: 'Absen PL2.5 header, 2W, 1m', weight: 19, image: 'PL25HEAD2.png' },
  PL25_CLAMP: { code: 'PL25CLAMP', name: 'Absen PL2.5 clamp', weight: 0, image: 'PL25CLAMP.png' },
  PL25_BEAM1K: { code: 'PL25BEAM1K', name: 'Absen PL2.5 support beam, 1000 mm', weight: 0, image: 'PL25BEAM1K.png' },
  PL25_OUT: { code: 'PL25OUT', name: 'Absen PL2.5 outrigger', weight: 0, image: 'PL25OUT.png' },
  PL25_PLAT: { code: 'PL25PLAT', name: 'Absen PL2.5 platform', weight: 0, image: 'PL25PLAT.png' },
  PL25_BEAMAD: { code: 'PL25BEAMAD', name: 'Absen PL2.5 support beam conn, adjustable', weight: 0, image: 'PL25BEAMAD.png' },
  PL25_LAD1M: { code: 'PL25LAD1M', name: 'Absen PL2.5 ladder 1m', weight: 0, image: 'PL25LAD1M.png' },
  PL25_BEAM50: { code: 'PL25BEAM50', name: 'Absen PL2.5 support beam, 500 mm', weight: 0, image: 'PL25BEAM50.png' },

  // ROE Black Pearl
  BP2B1: { code: 'BP2B1', name: 'ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)', weight: 20.61, image: 'BP2B1.png' },
  BP2B2: { code: 'BP2B2', name: 'ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)', weight: 20.61, image: 'BP2B2.png' },
  BP2V2: { code: 'BP2V2', name: 'BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)', weight: 20.61, image: 'BP2V2.png' },
  BP2V2_CASE: { code: 'BP2V2CASE', name: 'Case, ROE Black Pearl version2, 8x (BP2V2)', weight: 161.12, image: 'BP2V2CASE.png' },
  BPBO_HEAD1: { code: 'BPBOHEAD1', name: 'ROE Black Pearl header, 1W, 0.5m', weight: 12, image: 'BPBOHEAD1.png' },
  BPBO_HEAD2: { code: 'BPBOHEAD2', name: 'ROE Black Pearl header, 2W, 1m', weight: 19, image: 'BPBOHEAD2.png' },
  BPBO_BB1: { code: 'BPBOBB1', name: 'ROE Black Pearl base bar, 1W, 0.5m', weight: 16, image: 'BPBOBB1.png' },
  BPBO_BB2: { code: 'BPBOBB2', name: 'ROE Black Pearl base bar, 2W, 1.0m', weight: 28, image: 'BPBOBB2.png' },
  BP25DREE: { code: 'BP25DGREE', name: 'ROE Black Pearl 5 Degree Bracket', weight: 0.25, image: 'BP25DGREE.png' },
  BPGPUBT: { code: 'BPGPUBT', name: 'ROE Black Pearl universal base truss', weight: 17, image: 'BPGPUBT.png' },
  BPGPREAR1: { code: 'BPGPREAR1', name: 'ROE Black Pearl rear truss', weight: 1, image: 'BPGPREAR1.png' },
  BPGPREAR05: { code: 'BPGPREAR1', name: 'ROE BP2 / GP2 rear truss .5 meter', weight: 1, image: 'BPGPREAR05.png' },
  BPGPBRIDGE: { code: 'BPGPBRIDGE', name: 'ROE Black Pearl rear bridge clamp', weight: 1, image: 'BPGPBRIDGE.png' },
  LED4FTS40: { code: 'LED4FTS40', name: 'Schedule 40 1.5" non-threaded pipe 4\'', weight: 1, image: 'LED4FTS40.png' },
  '15PIPECPL': { code: '15PIPECPL', name: '1 1/2" ID pipe coupler with 1/2 Cheesborough clamp', weight: 1, image: '15PIPECPL.png' },
  
  

  // ROE GP2 Graphite
  GP2BASE1: { code: 'GP2BASE1', name: 'ROE Graphite GP base bar, 1W', weight: 0, image: 'GP2BASE1.png' },
  GP2BASE2: { code: 'GP2BASE2', name: 'ROE Graphite GP base bar, 2W, V1.5', weight: 0, image: 'GP2BASE2.png' },
  GP2HEAD1: { code: 'GP2HEAD1', name: 'ROE Graphite GP hanging bar, 1W, clamp and shackle', weight: 0, image: 'GP2HEAD1.png' },
  GP2HEAD2: { code: 'GP2HEAD2', name: 'ROE Graphite GP hanging bar, 2W, clamp and shackle', weight: 0, image: 'GP2HEAD2.png' },
  ROEGP26FULL: { code: 'ROEGP26FULL', name: 'ROE GP2.6 Full LED tile 500x1000mm', weight: 0, image: 'ROEGP26FULL.png' },
  ROEGP26HALF: { code: 'ROEGP26HALF', name: 'ROE GP2.6 Half LED tile 500x500mm', weight: 0, image: 'ROEGP26HALF.png' },

  // Theatrixx
  TX_NOMAD26: { code: 'TXNOMAD26', name: 'Theatrixx Nomad LED panel 500x500 2.6mm', weight: 24, image: 'TXNOMAD26.png' },
  TX_NOMAD26_SPARE: { code: 'TXNOMAD26', name: 'Theatrixx Nomad LED panel 500x500 2.6mm ** Spare Tiles **', weight: 24, image: 'TXNOMAD26.png' },
  TX_10PT_NOMAD: { code: '10PTXNOMAD', name: 'Theatrixx Nomad 2.6 10x package', weight: 0 },
  CATXLED: { code: 'CATXLED', name: 'Case, Theatrixx Nomad tile 10x', weight: 187, image: 'CATXLED.png' },
  TX_BASE1W: { code: 'TXBASE1W', name: 'Theatrixx Nomad Exact stacking base, 1 wide', weight: 27, image: 'TXBASE1W.png' },
  TX_BASE2W: { code: 'TXBASE2W', name: 'Theatrixx Nomad Exact stacking base, 2 wide', weight: 12, image: 'TXBASE2W.png' },
  TX_DBL_HEAD: { code: 'TXDBLHEAD', name: 'Theatrixx Nomad double header', weight: 12, image: 'TXDBLHEAD.png' },
  TX_SNGL_HEAD: { code: 'TXSNGLHEAD', name: 'Theatrixx Nomad single header', weight: 8, image: 'TXSNGLHEAD.png' },
  TX_SKIFRAME: { code: 'TXSKIFRAME', name: 'Theatrixx Nomad Exact ski frame (T base)', weight: 0, image: 'TXSKIFRAME.png' },
  TX_STAKEXT: { code: 'TXSTAKEXT', name: 'Theatrixx Nomad Exact ski stacking extension', weight: 0, image: 'TXSTAKEXT.png' },
  TX_LADDER: { code: 'TXLADDER', name: 'Theatrixx Nomad Exact ladder frame', weight: 0, image: 'TXLADDER.png' },
  TX_BRACKETS: { code: 'TXBRACKETS', name: 'Theatrixx Nomad Exact bracket-straight', weight: 0, image: 'TXBRACKETS.png' },
  TX_BRACKETC: { code: 'TXBRACKETC', name: 'Theatrixx Nomad Exact bracket-curved', weight: 0, image: 'TXBRACKETC.png' },
  TX_VERTSPRT: { code: 'TXVERTSPRT', name: 'Theatrixx Nomad Exact vertical support', weight: 0, image: 'TXVERTSPRT.png' },
  TX_SKIFTSNG: { code: 'TXSKIFTSNG', name: 'Theatrixx Nomad Exact single foot', weight: 0, image: 'TXSKIFTSNG.png' },
  TX_M10B: { code: 'TXM10B', name: 'Theatrixx Nomad Exact M10 Screw', weight: 0, image: 'TXM10B.png' },
  TX_T92T9: { code: 'TXT92TXT9', name: "Theatrixx Nomad XVT9 to XVT9 data 3'", weight: 0, image: 'TXT92TXT9.png' },
  TX_T32T125: { code: 'TXT32T125', name: "Theatrixx Nomad XVT3 to True1 25'", weight: 0, image: 'TXT32T125.png' },
  TX_T3POWER: { code: 'TXT3POWER', name: "Theatrixx Nomad XVT3 to XVT3 power 4'", weight: 0, image: 'TXT3POWER.png' },
  TX_T92ETRCN: { code: 'TXT92ETRCN', name: 'Theatrixx Nomad XVT9 to EtherCon adapter', weight: 0, image: 'TXT92ETRCN.png' },

  // Processors
  SX40: { code: 'SX40', name: 'Brompton Tessera SX40 **Kit includes an XD10**', weight: 17, image: 'SX40.png' },
  XD10: { code: 'XD10', name: 'Brompton Tessera XD 10G data distribution unit', weight: 8.16, image: 'XD10.png' },
  S8: { code: 'S8', name: 'Brompton Tessera S8', weight: 17, image: 'S8.png' },
  MX40PRO: { code: 'MX40PRO', name: 'Novastar MX40 PRO', weight: 17, image: 'MX40PRO.png' },

  // Power Distribution
  CUBEDIST: { code: 'CUBEDIST', name: 'Indu Electric 200A Cube Distro', weight: 177, image: 'CUBEDIST.png' },
  TP1: { code: 'TP1', name: 'Indu Electric 400A Power Distro w/ (4) 208v Soca', weight: 197, image: 'TP1.png' },
  L2130T1FB: { code: 'L2130T1FB', name: 'L2130 floor box to 3x True1 with pass through', weight: 7.5, image: 'L2130T1FB.png' },
  SOCA6XTRU1: { code: 'SOCA6XTRU1', name: '19 Pin Socapex to 6x True1 Power Cable', weight: 5, image: 'SOCA6XTRU1.png' },

  // Cables
  ECON010C6: { code: 'ECON010C6', name: "Ethercon (CAT6) 10'", weight: 1, image: 'ECON010C6.png' },
  ECON050C6: { code: 'ECON050C6', name: "Ethercon (CAT6) 50'", weight: 3, image: 'ECON050C6.png' },
  ECON100C6: { code: 'ECON100C6', name: "Ethercon (CAT6) 100'", weight: 6, image: 'ECON100C6.png' },
  ECON1M: { code: 'ECON1M', name: "Ethercon to Ethercon 1m", weight: 0.25, image: 'ECON1M.png' },
  T1025: { code: 'T1025', name: "True1 power cable 25'", weight: 4, image: 'T1025.png' },
  EDT110M: { code: 'EDT110M', name: "Edison to True1 power cable, 10 meter", weight: 3.2, image: 'EDT110M.png' },
  T1003: { code: 'T1003', name: "True1 power cable 1m (3')", weight: 0.44, image: 'T1003.png' },

  // Misc
  SANDBAG25: { code: 'SANDBAG25', name: 'Sand Bag 25 lbs.', weight: 25, image: 'SANDBAG25.png' }
};

// Canonical equipment display order
const CANONICAL_EQUIPMENT_ORDER = [
  // Tile packages/cases
  '8PPL25', '8PBP2B1', '8PBP2B2', '8PBP2V2', '6GP2FULL', '6GP2HALF', '10PTXNOMAD',
  'PL25CASE', 'BP2V2CASE', 'CATXLED', 'BP2DTCASE',

  // Tiles
  'PL25', 'BP2B1', 'BP2B2', 'BP2V2', 'ROEGP26FULL', 'ROEGP26HALF', 'TXNOMAD26', 'BP2DT',

  // Processors
  'SX40', 'XD10', 'S8', 'MX40PRO',

  // Structural (Headers, Bases, Truss, etc)
  'PL25HEAD1', 'PL25HEAD2', 'BPBOHEAD1', 'BPBOHEAD2', 'GP2HEAD1', 'GP2HEAD2', 'TXDBLHEAD', 'TXSNGLHEAD',
  'PL25BB1', 'PL25BB2', 'BPBOBB1', 'BPBOBB2', 'GP2BASE1', 'GP2BASE2', 'TXBASE1W', 'TXBASE2W',
  'BPGPUBT', 'BPGPREAR05', 'BPGPREAR1', 'BPGPBRIDGE',
  'TXSKIFRAME', 'TXSTAKEXT', 'TXLADDER', 'TXBRACKETS', 'TXVERTSPRT', 'TXSKIFTSNG', 'TXBRACKETC', 'TXM10B',
  'PL25OUT', 'PL25LAD1M', 'PL25CLAMP', 'PL25BEAM50', 'PL25BEAM1K', 'PL25BEAMAD', 'PL25PLAT',
  'BP25DGREE', 'BP2BBOLT', 'LED4FTS40', '15PIPECPL',
  'SANDBAG25',

  // Cables
  'CAT5ES005', 'ECON010C6', 'ECON050C6', 'ECON100C6', 'ECON1M', 'TXT92TXT9', 'TXT92ETRCN',
  'T1016', 'T1025', 'TXT32T125', 'T1003', 'TXT3POWER', 'EDT110M', 'TXT32ED6',

  // Power Distro
  'CUBEDIST', 'TP1', 'L2130T1FB', 'SOCA6XTRU1', 'TXT32SOCA'
];

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONSTANTS, SANDBAG_TABLES, EQUIPMENT };
}
