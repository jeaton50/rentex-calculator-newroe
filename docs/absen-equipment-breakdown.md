# Absen PL2.5 Equipment Breakdown

This document explains how the ROE LED Wall Calculator determines every line item for an Absen PL2.5 wall given **H** (horizontal tiles) and **V** (vertical tiles).

---

## Tile Specs

| Property | Value |
|---|---|
| Model | Absen PL2.5 |
| Pixel pitch | 2.5 mm |
| Tile size | 500 × 500 mm (0.5 m × 0.5 m) |
| Pixel resolution | 200 × 200 px per tile |
| Weight per tile | 20.61 lbs |
| Power per tile | 192 W |
| Tiles per case | 8 |

---

## 1. Tiles & Cases

```
totalTiles         = H × V
totalSpares        = calcSpares(totalTiles, 8, 1.5)
totalWithSpares    = totalTiles + totalSpares
casesNeeded        = ceil(totalWithSpares / 8)
```

### calcSpares formula
Uses 8% as the base spare percentage and a 1.5× safety factor:

```
sparesPercent  = ceil(totalTiles × 0.08)
rawTotal       = totalTiles + sparesPercent
roundedTotal   = 8 × round(rawTotal / 8)
spares         = roundedTotal - totalTiles
```

If `spares < 1`, falls back to `ceil(totalTiles × 0.08 × 1.5)`.

### Equipment output

| SKU | Description | Qty |
|---|---|---|
| 8PPL25 | Absen PL2.5 8× tile package | `casesNeeded` |
| PL25 | Absen PL2.5 tile (active) | `totalTiles` |
| PL25 | Absen PL2.5 tile (spares) | `totalSpares` |
| PL25CASE | Case, Absen PL2.5, 8× (161 lbs ea) | `casesNeeded` |

---

## 2. Processors

Threshold: **80 tiles**

| Condition | Processor(s) |
|---|---|
| `totalTiles ≤ 80` | 1× S8 |
| `totalTiles > 80` | 1× SX40 + XD10 distribution units |

### Pixel/cascade limits
- Max data cascade: **10**
- S8 max panels: `floor(2000/200) × floor(2000/200)` = **100**
- SX40 max panels: `floor(4096/200) × floor(2160/200)` = **216**

For large walls the processor count also accounts for minimum processors from pixel dimensions:
```
minProcessorsForPixels = ceil(H×200 / 4096) × ceil(V×200 / 2160)
tilesPerCascade        = ceil(totalTiles / 10)
baseProcessorCount     = max(ceil(totalTiles/216), ceil(tilesPerCascade/40), minProcessorsForPixels)
```

### Equipment output

| SKU | Description | Condition |
|---|---|---|
| SX40 | Brompton Tessera SX40 (includes XD10) | `totalTiles > 80` |
| XD10 | Brompton Tessera XD 10G distribution | Large walls |
| S8 | Brompton Tessera S8 | `totalTiles ≤ 80` |

---

## 3. Ground Support Hardware

*(Ground support type, Flat wall)*

### Base Bars

**Single Base mode** (default):
```
singleBases = H
doubleBases = 0
```

**Double Base mode**:
```
doubleBases = floor(H / 2)
singleBases = H mod 2
```

### Outriggers, Clamps & Ladders
```
outriggers = ceil(H / 1.9)
clamps     = floor(V / 2) × outriggers
ladders    = clamps
```

### Support Beams & Connectors (activated when V > 5.1)
```
O13 = ceil((H / 2) - 1)
O14 = ceil((H / 2) - O13)
P13 = ceil(O13 - (O13 × 0.25))
P15 = ceil(P13 × 0.25)
N12 = (V > 5.1) ? 2 : 0

supportBeams1000mm = (O13 × N12) - (P15 × N12)    → SKU: PL25BEAM1K
supportBeams50mm   = O14 × N12                     → SKU: PL25BEAM50
beamConnectors     = P15 × N12                     → SKU: PL25BEAMAD
```

### Platforms
```
O54 = ceil(O13 / 2)
platforms = O54  (only when sandbag table value > 0.01)
```

### Equipment output

| SKU | Description | Weight (lbs) | Qty |
|---|---|---|---|
| PL25BB1 | Base bar, 1W, 0.5 m | 16 | `singleBases` |
| PL25BB2 | Base bar, 2W, 1 m | 37 | `doubleBases` |
| PL25OUT | Outrigger | 17 | `outriggers` |
| PL25LAD1M | Ladder, 1 m | 9 | `ladders` |
| PL25CLAMP | Clamp | 3.2 | `clamps` |
| PL25BEAM50 | Support beam, 500 mm | 4 | `supportBeams50mm` |
| PL25BEAM1K | Support beam, 1000 mm | 6 | `supportBeams1000mm` |
| PL25BEAMAD | Support beam connector, adjustable | 7 | `beamConnectors` |
| PL25PLAT | Platform | 10 | `platforms` |

---

## 4. Sandbags

Lookup table indexed by `V` (vertical tiles, 1-based):

| V | Sandbags per base |
|---|---|
| 1 | 0 |
| 2 | 0 |
| 3 | 0 |
| 4 | 4 |
| 5 | 6 |
| 6 | 8 |
| 7 | 11 |
| 8 | 15 |
| 9 | 17 |
| 10 | 19 |
| 11 | 21 |
| 12 | 23 |

```
baseCount = singleBases + doubleBases
sandbags  = ceil(tableValue[V] × baseCount / 1.0525)
```

| SKU | Description | Weight (lbs) | Qty |
|---|---|---|---|
| SANDBAG25 | Sand Bag 25 lbs. | 25 | `sandbags` |

---

## 5. Headers (Flown Support)

| SKU | Description | Weight (lbs) | Qty |
|---|---|---|---|
| PL25HEAD1 | Header, 1W, 0.5 m | 12 | `singleHeaders` |
| PL25HEAD2 | Header, 2W, 1 m | 19 | `doubleHeaders` |

---

## 6. Data Cables

Cable distance is computed from the wall geometry and processor count:

```
B41 = processorCountWithCascade
B42 = (H × 1.64) / (B41 × 2)    ← half-width per processor in feet
B39 = V × 1.64                   ← height in feet
cableDistance = sqrt(B42² + B39²)
```

Cable type selected by distance:

| Distance | SKU | Description |
|---|---|---|
| < 7 ft | CAT5ES005 | CAT5e ethernet cable 5' |
| 7–10 ft | ECON010C6 | Ethercon (CAT6) 10' |
| 11–50 ft | ECON050C6 | Ethercon (CAT6) 50' |
| ≥ 51 ft | ECON100C6 | Ethercon (CAT6) 100' |

Additional data cables always included:

| SKU | Description | Qty |
|---|---|---|
| ECON1M | Ethercon to Ethercon 1 m | `totalTilesWithSpares` |

---

## 7. Power Cables

```
circuits       = ceil(totalTiles / 16)
T1025qty       = ceil(circuits × 1.05)
EDT110Mqty     = ceil(totalTilesWithSpares / 8 × 1.05)   ← 120V only
T1003qty       = totalTilesWithSpares
```

| SKU | Description | Weight (lbs) | Qty | Condition |
|---|---|---|---|---|
| T1025 | True1 power cable 25' | 4 | `T1025qty` | Always |
| EDT110M | Edison to True1, 10 m | 3.2 | `EDT110Mqty` | 120V only |
| T1003 | True1 power cable 1 m (3') | 0.44 | `T1003qty` | Always |

---

## 8. Power

```
watts    = totalTiles × 192
amps120  = watts / 120
amps208  = watts / 208
```

---

## 9. Power Distribution

Decision based on 208V amperage:

```
cubeUnits = ceil(amps208 / 200)
tp1Units  = ceil(amps208 / 400)

if amps208 > 200 → use TP1
else             → use CUBEDIST
```

**With CUBEDIST (200A):**
```
circuits   = ceil(totalTiles / 16)
L2130T1FB  = ceil(circuits / 3)
CUBEDIST   = max(cubeUnits, ceil(L2130T1FB / 6))
```

**With TP1 (400A):**
```
SOCA6XTRU1 = ceil(circuits / 6)
TP1        = max(tp1Units, ceil(SOCA6XTRU1 / 4))
```

| SKU | Description | Weight (lbs) | Qty |
|---|---|---|---|
| CUBEDIST | Indu Electric 200A Cube Distro | 177 | `CUBEDIST` |
| L2130T1FB | L2130 floor box to 3× True1 w/ pass-through | 7.5 | `L2130T1FB` |
| TP1 | Indu Electric 400A Power Distro w/ (4) 208V Soca | 197 | `TP1` |
| SOCA6XTRU1 | 19-pin Soccapex to 6× True1 power cable, 2 m | 197 | `SOCA6XTRU1` |

---

## 10. Total Pixels & Weight

```
totalPixels = H × 200 × V × 200
totalWeight = totalTiles × 20.61 lbs
```

---

## Worked Example — 10 Wide × 8 Tall (80 tiles)

| Step | Formula | Result |
|---|---|---|
| Total tiles | 10 × 8 | 80 |
| Spares | calcSpares(80, 8, 1.5) | 8 |
| Total w/ spares | 80 + 8 | 88 |
| Cases | ceil(88 / 8) | 11 |
| Processor | 80 ≤ 80 → S8 | 1× S8 |
| Watts | 80 × 192 | 15,360 W |
| Amps @ 208V | 15360 / 208 | 73.8 A → CUBEDIST |
| Circuits | ceil(80 / 16) | 5 |
| T1025 cables | ceil(5 × 1.05) | 6 |
| L2130T1FB | ceil(5 / 3) | 2 |
| CUBEDIST | max(1, ceil(2/6)) | 1 |
| Single bases | 10 | 10 |
| Outriggers | ceil(10 / 1.9) | 6 |
| Clamps/Ladders | floor(8 / 2) × 6 | 24 |
| Sandbags | ceil(table[8]=15 × 10 / 1.0525) | 143 |
| Total pixels | 10×200 × 8×200 | 3,200,000 px |
| Wall weight | 80 × 20.61 | 1,649 lbs |
