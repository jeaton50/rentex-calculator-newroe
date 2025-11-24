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
    }
  },

  // Product types
  PRODUCTS: {
    ABSEN: 'absen',
    BP2B1: 'BP2B1',
    BP2B2: 'BP2B2',
    BP2V2: 'BP2V2',
    THEATRIXX: 'theatrixx'
  },

  // Vertical tile limits
  MAX_VERTICAL_TILES: {
    absen: 11,
    BP2B1: 13,
    BP2B2: 12,
    BP2V2: 13,
    theatrixx: 13
  },

  // Data cascade limits
  MAX_DATA_CASCADE: {
    absen: 10,
    BP2: 13,
    theatrixx: 13
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
    theatrixx: 192
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
    theatrixx: '#f3eaff'
  }
};

// Sandbag lookup tables
const SANDBAG_TABLES = {
  absen: [0, 0, 0, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 8, 8],
  ROE: [0, 0, 0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9],
  theatrixx: [0, 0, 0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9]
};

// Equipment codes and names
const EQUIPMENT = {
  // Absen
  PL25: { code: 'PL25', name: 'Absen PL2.5 tile', weight: 20.61 },
  PL25_CASE: { code: 'PL25CASE', name: 'Case, Absen PL2.5, 8x', weight: 161.12 },
  PL25_BB1: { code: 'PL25BB1', name: 'Absen PL2.5 base bar, 1W, 0.5m', weight: 16 },
  PL25_BB2: { code: 'PL25BB2', name: 'Absen PL2.5 base bar, 2W, 1m', weight: 37 },
  PL25_HEAD1: { code: 'PL25HEAD1', name: 'Absen PL2.5 header, 1W, 0.5m', weight: 12 },
  PL25_HEAD2: { code: 'PL25HEAD2', name: 'Absen PL2.5 header, 2W, 1m', weight: 19 },

  // ROE Black Pearl
  BP2B1: { code: 'BP2B1', name: 'ROE Black Pearl 2 Version 1 LED tile batch 1 (BP2)', weight: 20.61 },
  BP2B2: { code: 'BP2B2', name: 'ROE Black Pearl 2 Version 1 LED tile batch 2 (BP2)', weight: 20.61 },
  BP2V2: { code: 'BP2V2', name: 'BP2V2 ROE Black Pearl 2 Version 2.1 LED tile (BP2V2)', weight: 20.61 },
  BP2V2_CASE: { code: 'BP2V2CASE', name: 'Case, ROE Black Pearl version2, 8x (BP2V2)', weight: 161.12 },
  BPBO_HEAD1: { code: 'BPBOHEAD1', name: 'ROE Black Pearl header, 1W, 0.5m', weight: 12 },
  BPBO_HEAD2: { code: 'BPBOHEAD2', name: 'ROE Black Pearl header, 2W, 1m', weight: 19 },
  BPBO_BB1: { code: 'BPBOBB1', name: 'ROE Black Pearl base bar, 1W, 0.5m', weight: 16 },
  BPBO_BB2: { code: 'BPBOBB2', name: 'ROE Black Pearl base bar, 2W, 1.0m', weight: 28 },

  // Theatrixx
  TX_NOMAD26: { code: 'TXNOMAD26', name: 'Theatrixx Nomad LED panel 500x500 2.6mm', weight: 17.6 },
  CATXLED: { code: 'CATXLED', name: 'Case, Theatrixx Nomad tile 10x', weight: 187 },
  TX_BASE1W: { code: 'TXBASE1W', name: 'Theatrixx Nomad Exact stacking base, 1 wide', weight: 27 },
  TX_BASE2W: { code: 'TXBASE2W', name: 'Theatrixx Nomad Exact stacking base, 2 wide', weight: 12 },
  TX_DBL_HEAD: { code: 'TXDBLHEAD', name: 'Theatrixx Nomad double header', weight: 12 },
  TX_SNGL_HEAD: { code: 'TXSNGLHEAD', name: 'Theatrixx Nomad single header', weight: 8 },

  // Processors
  SX40: { code: 'SX40', name: 'Brompton Tessera SX40 **Kit includes an XD10**', weight: 17 },
  XD10: { code: 'XD10', name: 'Brompton Tessera XD 10G data distribution unit', weight: 8.16 },
  S8: { code: 'S8', name: 'Brompton Tessera S8', weight: 17 },
  MX40PRO: { code: 'MX40PRO', name: 'Novastar MX40 PRO', weight: 17 },

  // Power Distribution
  CUBEDIST: { code: 'CUBEDIST', name: 'Indu Electric 200A Cube Distro', weight: 177 },
  TP1: { code: 'TP1', name: 'Indu Electric 400A Power Distro w/ (4) 208v Soca', weight: 197 },
  L2130T1FB: { code: 'L2130T1FB', name: 'L2130 floor box to 3x True1 with pass through', weight: 7.5 },
  SOCA6XTRU1: { code: 'SOCA6XTRU1', name: '19 Pin Socapex to 6x True1 Power Cable', weight: 5 },

  // Cables
  ECONRJ45: { code: 'ECONRJ45', name: "Ethercon to RJ45 (CAT6) 100'", weight: 2.4 },
  CAT5ES005: { code: 'CAT5ES005', name: "CAT5e ethernet cable 5'", weight: 1 },
  ECON010C6: { code: 'ECON010C6', name: "Ethercon (CAT6) 10'", weight: 1 },
  ECON025C6: { code: 'ECON025C6', name: "Ethercon (CAT6) 25'", weight: 1.5 },
  ECON050C6: { code: 'ECON050C6', name: "Ethercon (CAT6) 50'", weight: 3 },
  ECON100C6: { code: 'ECON100C6', name: "Ethercon (CAT6) 100'", weight: 6 },
  ECON1M: { code: 'ECON1M', name: "Ethercon to Ethercon 1m", weight: 0.25 },
  TRUE125FT: { code: 'TRUE125FT', name: "True1 to True1 cable, 25'", weight: 4 },
  EDT110M: { code: 'EDT110M', name: "Edison to True1 power cable, 10 meter", weight: 3.2 },
  T11M: { code: 'T11M', name: "True1 power cable 1M (3')", weight: 0.44 },

  // Misc
  SANDBAG25: { code: 'SANDBAG25', name: 'Sand Bag 25 lbs.', weight: 25 }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONSTANTS, SANDBAG_TABLES, EQUIPMENT };
}
