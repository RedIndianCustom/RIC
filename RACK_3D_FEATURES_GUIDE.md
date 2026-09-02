# Rack3D Visual Features Guide

## 🏗️ Complete Industrial Rack Structure

```
                    ┌─────────────────────┐  ← Top Frame Cap
                    │   WARNING STRIPE    │  ← Yellow/Orange Diagonal
    Vertical    → ┃ │  🏷️ RACK: A-R01-01 │  ← Header with Code
    Support       ┃ │  📍 Row 01 · Rack 01│  ← Location Info
    Column        ┃ │  ████████░░ 80% Full│  ← Capacity Bar
    (Front        ┃ └─────────────────────┘
    Left)         ┃  ╱─────────────────────╲ ← Shelf (Top)
                  ┃ ╱ 🔲 🔲 🔲 🔲 🔲 🔲  ╲  Positions with Tires
    Cross         ✗├─────────────────────┤─┐ ← Metal Beam
    Bracing    →  ┃ ╱─────────────────────╲ │ ← Shelf
                  ┃╱ 🔲 🔲 🔲 🔲 🔲 🔲  ╲│
                  ✗├─────────────────────┤─┤
                  ┃ ╱─────────────────────╲ │
                  ┃╱ 🔲 🔲 🔲 🔲 🔲 🔲  ╲│
                  ┃├═════════════════════┤─┘
                  ┃│  📦 Stock: 145/200  │  ← Footer Stats
                  ┃│  ✓ Usage: 73%      │
    Support    → ┃└─────────────────────┘
    Bracket       ├▼  ← Shelf Bracket
                  ║══════════════════════  ← Base Platform
                  ● ●                ● ●  ← Anchor Bolts
```

## 🎯 Position Card States

### Empty Position
```
┌──────────────┐
│  ╭────╮      │  ← Dashed border
│  │📦  │      │  ← Package icon
│  ╰────╯      │
│    Empty     │
│   0 / 8      │
│  Position 12 │
└──────────────┘
```

### Active Position (with Tires)
```
┌──────────────┐
│        [73%] │ ← Utilization badge
│  ╭────────╮  │
│  │ ⚫⚪⚫  │ ← Tire with tread
│  │ ⚫ 🔩 ⚫│    & rim bolts
│  │ ⚫⚪⚫  │
│  ╰──[×4]──╯  │ ← Stack counter
│  205/55R16   │ ← Tire size
│    4 / 8     │ ← Quantity
│  A-R01-S1-2  │ ← Position code
└──────────────┘
```

### Almost Full Position (Warning)
```
┌──────────────┐
│ ⚠️     [92%] │ ← Warning icon + badge
│  ╭────────╮  │   (Yellow background)
│  │ ⚫⚪⚫  │
│  │ ⚫ 🔩 ⚫│
│  │ ⚫⚪⚫  │
│  ╰──[×7]──╯  │
│  225/45R17   │
│    7 / 8     │
│  A-R01-S2-3  │
└──────────────┘
```

### Full Position (Alert)
```
┌──────────────┐
│       [100%] │ ← Red pulsing badge
│  ╭────────╮  │   (Red background)
│  │ ⚫⚪⚫  │
│  │ ⚫ 🔩 ⚫│
│  │ ⚫⚪⚫  │
│  ╰──[×8]──╯  │
│  195/65R15   │
│    8 / 8     │
│  A-R01-S3-1  │
└──────────────┘
```

## 🔧 Shelf Construction Detail

```
Side View:
                   ┌─ Shelf Label (S08)
    ║══════════════╪═══════════════  ← Metal Beam (Front)
    ║  Position    │  Position  ║
    ║  Cards...    │  Cards...  ║
    ║              │            ║─── ← Shelf Surface
    ║══════════════╪═══════════════  ← Metal Beam
    ▲              ▲            ▲
    └─ Bracket     └─ Support   └─ Side Beam
       (Left)         Bar          (3D depth)
```

## 🚗 Tire Visual Components

### Single Tire (Detailed View)
```
    ╭──────────╮
    │ ▐        │  ← Tread pattern (4 lines)
    │   ╭────╮ │
    │   │🔩  │ │  ← Rim with 5 bolts
    │   │ ⚪ │ │     arranged in star
    │   │🔩🔩│ │
    │   ╰────╯ │
    │  ▐       │
    ╰──────────╯
```

### Stacked Tires (Multiple Quantity)
```
   Shadow     Main
    Tire      Tire
    ╭───╮   ╭───╮
    │░░░│   │███│  ← Darker tire behind
    │░⚪░│   │⚪█│     (blur + opacity)
    │░░░│   │███│
    ╰───╯   ╰─┬─╯
             [×5]   ← Counter badge
```

## 📊 Header Components

### Capacity Indicator Bar
```
┌──────────────────────────────┐
│ ████████████████░░░░░░░  73% │
└──────────────────────────────┘
Green: 0-70%  │  Orange: 70-90%  │  Red: 90-100%
              ↓                   ↓
           ██████               ██████ (pulsing)
```

### Warning Stripe (Top of Header)
```
▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓  ← Yellow/Orange diagonal stripes
                           (Safety marking)
```

## 📈 Footer Stats Layout

```
┌─────────────────────────────────┐
│  ╭──╮                ╭──╮       │
│  │📦│ Stock      │    │✓│ Usage │
│  ╰──╯ 145/200    │    ╰──╯ 73%  │
└──────────────────┴──────────────┘
       ↑           ↑         ↑
     Icon      Divider    Color-coded
                              (✓/●/⚠️)
```

### Safety Notice (When ≥90% full)
```
┌────────────────────────────────┐
│  ⚠️  NEAR CAPACITY             │  ← Yellow banner
└────────────────────────────────┘
```

## 🎨 Color-Coded Status System

### Utilization Levels
- **0-69%**: 🟢 Green (Normal operation)
- **70-89%**: 🟠 Orange (Monitor closely)
- **90-99%**: 🟡 Yellow (Almost full - warning)
- **100%**: 🔴 Red (Full - critical)

### Visual Indicators
```
Normal:      Warning:     Full:
[73%]       [92%] ⚠️     [100%] (pulsing)
Green       Yellow       Red
No icon     Triangle     Alert + pulse
```

## 🔩 Metal Texture Details

### Vertical Column Texture
```
║ ← Light edge (highlight)
║░  Repeating horizontal
║░  lines for metal
║░  texture effect
║ ← Dark edge (shadow)
```

### Anchor Bolt (Ground Level)
```
    ●  ← Circular bolt head
   ╱│╲    Radial gradient
  ╱ │ ╲   Dark border
 ●──●──●  Shadow beneath
```

## 📏 Dimensions & Spacing

```
Rack Width: 320px
Rack Height: 420px+ (dynamic)
Position Card: 85px wide × 70px tall
Shelf Height: 52px
Header Height: Variable
Footer Height: Variable
Gap between shelves: 12px
Gap between positions: 8px
```

## 🎭 Hover Effects

### Rack Hover
```
Before:                  After:
┌─────────┐             ┌─────────┐
│  RACK   │    →        │  RACK   │  ← Elevated
│  [3D]   │             │  [3D]   │     Rotated more
└─────────┘             └─────────┘     Larger shadow
 rotateY(-10deg)         rotateY(-15deg)
                         scale(1.02)
                         translateZ(15px)
```

### Position Card Hover
```
Normal            Hover
┌─────┐          ┌─────┐
│ 🔲  │    →    │ 🔲  │  ← Lifted up
│     │          │     │     Blue border
└─────┘          └─────┘     Tooltip appears
                  ╲───────╱
                   Tooltip
```

## 💡 Interactive Elements

### Clickable Areas
1. **Position Cards** → Opens assign/edit modal
2. **Rack Frame** → Context/selection
3. **Stats** → Filter/details view

### Tooltips (on hover)
```
╭──────────────────────╮
│ Position: A-R01-S1-1 │
│ Section: 1           │
│ Shelf: 1             │
│ Subsection: 1        │
│ Tire: 205/55R16      │
│ Stock: 4 / 8         │
│ Utilization: 50%     │
│                      │
│ Click to assign/edit │
╰──────────────────────╯
        ╲
         ▼
    [Position Card]
```

---

**Total Enhancement Elements:** 25+ visual features  
**CSS Classes Added:** 40+ new classes  
**Animations:** 5 (pulse, bounce, shine, transitions, hover)  
**3D Effects:** Perspective, rotation, depth, shadows
