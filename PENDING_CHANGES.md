# Pending Changes - Multiscreen Equipment Fix

This file documents changes that need to be committed and pushed to branch `claude/gp2-pipe-coupling-rule-L0593`.

## Problem

When processing multiple screens in multiscreen mode, `displayEquipment()` reads configuration values (redundancy, sourceSignals, powerDistroType, dummyTiles) from the DOM instead of from each screen's configuration object. This causes incorrect equipment to be calculated for screens that aren't currently active in the UI.

## Solution

1. Pass missing parameters from screen config to `displayEquipment()` in `js/export.js`
2. Update `displayEquipment()` in `js/equipment.js` to use data object values with DOM fallback

## Changes Required

### File 1: js/export.js

Around line 62-69, in the `getEquipmentForScreen` function, change the `requestData` object from:

```javascript
const requestData = {
  productType: config.productType,
  blocksHor: config.blocksHor,
  blocksVer: blocksVerWhole,
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
  gp2HalfBottomRow,
  gp2HalfRows,
  gp2HalfPosition,
  gp2FullVerticalBlocks: blocksVerWhole
};
```

To:

```javascript
const requestData = {
  productType: config.productType,
  blocksHor: config.blocksHor,
  blocksVer: blocksVerWhole,
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
  gp2HalfPosition,
  gp2FullVerticalBlocks: blocksVerWhole,
  // Include redundancy and source signals for processor calculations
  redundancyType: config.redundancy || 'None',
  sourceSignalCount: config.sourceSignals || 1,
  // Include dummy tile settings (blankRows is how equipment.js expects it)
  blankRows: (config.dummyTiles && config.dummyTileCount > 0) ? config.dummyTileCount : 0
};
```

### File 2: js/equipment.js

Around line 1879, in the `displayEquipment` function, change:

```javascript
const heightWarning = document.getElementById("blockVerticalWarning")?.textContent || "";
const sourceSignalCount = parseInt(document.getElementById("sourceSignals")?.value || 1, 10);
const redundancyType = document.getElementById("redundancy")?.value || "None";
const selectedDistroType = document.getElementById("powerDistroType")?.value || "Auto";
const companyLabel = document.getElementById("companyName")?.value || "Rentex";
```

To:

```javascript
const heightWarning = document.getElementById("blockVerticalWarning")?.textContent || "";
// Use data object values when available (multiscreen mode), fall back to DOM for backward compatibility
const sourceSignalCount = data.sourceSignalCount ?? parseInt(document.getElementById("sourceSignals")?.value || 1, 10);
const redundancyType = data.redundancyType ?? document.getElementById("redundancy")?.value ?? "None";
const selectedDistroType = data.selectedDistroType ?? document.getElementById("powerDistroType")?.value ?? "Auto";
const companyLabel = document.getElementById("companyName")?.value || "Rentex";
```

## Commit Message

```
Fix multiscreen equipment display and export

Pass missing parameters (redundancy, sourceSignals, blankRows/dummyTiles,
selectedDistroType) from screen config to displayEquipment. Update
displayEquipment to use data object values instead of reading from DOM,
fixing incorrect equipment when processing multiple screen configurations.
```

## Branch

Push to: `claude/gp2-pipe-coupling-rule-L0593`

## After Pushing

Delete this file (PENDING_CHANGES.md) as it will no longer be needed.
