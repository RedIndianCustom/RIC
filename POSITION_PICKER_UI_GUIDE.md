# Position Picker UI Guide

## Visual Interface Layout

### Full Modal View
```
╔═══════════════════════════════════════════════════════════════╗
║  📍 Assign Storage Positions                              [X] ║
║  Red Indian Customs Classic Sawtooth - 130/90-15 - 200 tires  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🏢 Step 1: Select Warehouse                                  ║
║  ┌─────────────┐  ┌─────────────┐                            ║
║  │   🏢 WH1    │  │    🏢 WH2   │                            ║
║  │     ✓       │  │             │                            ║
║  └─────────────┘  └─────────────┘                            ║
║                                                               ║
║  📦 Step 2: Select Rack                                       ║
║  ┌────────────────────────────────────────────────┐          ║
║  │ Rack: WH1-LOC-519440                     ▼     │          ║
║  └────────────────────────────────────────────────┘          ║
║                                                               ║
║  📋 Step 3: Select Positions (Multiple Sections)             ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ [Expand All ▼]  [Collapse All ▶]                    │    ║
║  ├──────────────────────────────────────────────────────┤    ║
║  │                                                      │    ║
║  │ ▼ 📁 S01 · SH08 (12 positions)      [3 selected]   │    ║
║  │ ┌────────────────────────────────────────────────┐ │    ║
║  │ │ ☑ WH1-LOC-519440-S01-SH08-SUB01               │ │    ║
║  │ │   50 available | Current: RIC Classic 130/90  │ │    ║
║  │ │   Capacity: ████████░░ 40/50                  │ │    ║
║  │ ├────────────────────────────────────────────────┤ │    ║
║  │ │ ☑ WH1-LOC-519440-S01-SH08-SUB02               │ │    ║
║  │ │   50 available                                 │ │    ║
║  │ │   Capacity: ████░░░░░░ 20/50                  │ │    ║
║  │ ├────────────────────────────────────────────────┤ │    ║
║  │ │ ☑ WH1-LOC-519440-S01-SH08-SUB03               │ │    ║
║  │ │   40 available | Current: Bridgestone 140/80  │ │    ║
║  │ │   Capacity: ██████░░░░ 30/50                  │ │    ║
║  │ └────────────────────────────────────────────────┘ │    ║
║  │                                                      │    ║
║  │ ▼ 📁 S02 · SH03 (8 positions)       [2 selected]   │    ║
║  │ ┌────────────────────────────────────────────────┐ │    ║
║  │ │ ☑ WH1-LOC-519440-S02-SH03-SUB01               │ │    ║
║  │ │   50 available                                 │ │    ║
║  │ │   Capacity: ██░░░░░░░░ 10/50                  │ │    ║
║  │ ├────────────────────────────────────────────────┤ │    ║
║  │ │ ☑ WH1-LOC-519440-S02-SH03-SUB02               │ │    ║
║  │ │   50 available                                 │ │    ║
║  │ │   Capacity: ░░░░░░░░░░ 0/50                   │ │    ║
║  │ └────────────────────────────────────────────────┘ │    ║
║  │                                                      │    ║
║  │ ▶ 📁 S03 · SH05 (10 positions)                     │    ║
║  │                                                      │    ║
║  │ ▶ 📁 S04 · SH02 (6 positions)                      │    ║
║  │                                                      │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ ✅ Selected capacity: 250 tires | Need: 200 tires   │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                   [Cancel] [Confirm ✓]       ║
╚═══════════════════════════════════════════════════════════════╝
```

## UI States

### Collapsed Section
```
┌────────────────────────────────────────────────┐
│ ▶ 📁 S01 · SH08 (12 positions)                │
└────────────────────────────────────────────────┘
```

### Expanded Section (No Selection)
```
┌────────────────────────────────────────────────┐
│ ▼ 📁 S01 · SH08 (12 positions)                │
├────────────────────────────────────────────────┤
│ ☐ WH1-LOC-519440-S01-SH08-SUB01               │
│   50 available                                 │
│   Capacity: ░░░░░░░░░░ 0/50                   │
├────────────────────────────────────────────────┤
│ ☐ WH1-LOC-519440-S01-SH08-SUB02               │
│   30 available                                 │
│   Capacity: ████░░░░░░ 20/50                  │
└────────────────────────────────────────────────┘
```

### Expanded Section (With Selection)
```
┌────────────────────────────────────────────────┐
│ ▼ 📁 S01 · SH08 (12 positions)  [3 selected]  │  ← Badge shows count
├────────────────────────────────────────────────┤
│ ☑ WH1-LOC-519440-S01-SH08-SUB01               │  ← Checked + highlight
│   50 available                                 │
│   Capacity: ████████░░ 40/50                  │
├────────────────────────────────────────────────┤
│ ☑ WH1-LOC-519440-S01-SH08-SUB02               │  ← Checked + highlight
│   50 available                                 │
│   Capacity: ████░░░░░░ 20/50                  │
└────────────────────────────────────────────────┘
```

## Color Coding

### Capacity Indicators
```
Empty Position (0-30% filled):
████░░░░░░░░░░░░  [Green/Emerald]

Moderate (30-70% filled):
████████░░░░░░░░  [Amber/Yellow]

Nearly Full (70-90% filled):
████████████░░░░  [Amber/Orange]

Full (90-100% filled):
████████████████  [Red]
```

### Position Selection States
```
Unselected:
┌────────────────────┐
│ ☐ Position Name    │  [Gray border, white background]
└────────────────────┘

Selected:
┌────────────────────┐
│ ☑ Position Name    │  [Emerald border, emerald background]
└────────────────────┘

Reserved (Can't Select):
┌────────────────────┐
│ 🔒 Position Name   │  [Amber border, amber background, disabled]
└────────────────────┘
```

## Interactive Elements

### Buttons

#### Expand All
```
┌─────────────────┐
│ ▼ Expand All    │  [Blue background]
└─────────────────┘
```

#### Collapse All
```
┌─────────────────┐
│ ▶ Collapse All  │  [Gray background]
└─────────────────┘
```

#### Confirm Assignment
```
┌─────────────────────┐
│ ✓ Confirm Assignment│  [Green gradient, disabled if no selection]
└─────────────────────┘
```

### Section Headers (Clickable)
```
┌────────────────────────────────────────────────┐
│ ▼ 📁 S01 · SH08 (12 positions)  [3 selected]  │  ← Click to toggle
└────────────────────────────────────────────────┘
```

## Capacity Summary

### Sufficient Capacity (Green)
```
┌──────────────────────────────────────────────────────┐
│ ✅ Selected capacity: 250 tires | Need: 200 tires   │  [Green background]
└──────────────────────────────────────────────────────┘
```

### Insufficient Capacity (Amber)
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ Selected capacity: 150 tires | Need: 200 tires       │  [Amber background]
│    Short by: 50 tires                                   │
└──────────────────────────────────────────────────────────┘
```

### No Selection (Hidden)
```
[Capacity summary only shows when positions are selected]
```

## Workflow Examples

### Example 1: Assigning 200 Tires Across 2 Sections

**Initial State:**
```
Product: Red Indian Customs Classic - 130/90-15
Quantity: 200 tires
Selected: None
```

**Step 1: Expand sections**
```
Click "Expand All"
→ All sections expand showing positions
```

**Step 2: Select from Section 1**
```
S01 · SH08:
☑ SUB01 (50 capacity)
☑ SUB02 (50 capacity)
☑ SUB03 (50 capacity)

Subtotal: 150 tires
```

**Step 3: Select from Section 2**
```
S02 · SH03:
☑ SUB01 (50 capacity)

Subtotal: 50 tires
```

**Final State:**
```
┌──────────────────────────────────────────────────────┐
│ ✅ Selected capacity: 200 tires | Need: 200 tires   │
└──────────────────────────────────────────────────────┘

[Confirm Assignment] ← Now enabled
```

### Example 2: Finding Available Space

**Scenario:** Need 500 tires but sections are partially filled

**Approach:**
1. Click "Expand All"
2. Scan all sections for available capacity
3. Select positions with green capacity bars
4. Check running total in capacity summary
5. Keep selecting until total ≥ 500

**Visual Scanning:**
```
▼ S01 · SH08
  ☑ SUB01: ████████░░ 40/50 → 10 available ❌
  ☑ SUB02: ░░░░░░░░░░  0/50 → 50 available ✓
  ☑ SUB03: ██░░░░░░░░ 10/50 → 40 available ✓

▼ S02 · SH03
  ☑ SUB01: ░░░░░░░░░░  0/50 → 50 available ✓
  ☑ SUB02: ░░░░░░░░░░  0/50 → 50 available ✓
  
... continue selecting until capacity met
```

## Keyboard Shortcuts (Proposed)

Future enhancement ideas:
- `Space` - Toggle current section
- `Ctrl + A` - Expand all sections
- `Ctrl + C` - Collapse all sections
- `Enter` - Confirm assignment
- `Esc` - Cancel and close

## Responsive Design

### Desktop (>1024px)
```
Full modal with 3-column layout for positions
```

### Tablet (768px - 1024px)
```
2-column layout, scrollable position list
```

### Mobile (<768px)
```
Single column, larger touch targets
Sticky capacity summary at bottom
```

## Accessibility Features

- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Color + icon indicators (not color-only)
- ✅ Focus indicators on checkboxes
- ✅ Semantic HTML structure

## Animation & Transitions

### Section Expand/Collapse
```
Duration: 200ms
Easing: ease-in-out
Effect: Smooth height transition
```

### Checkbox Selection
```
Duration: 150ms
Easing: ease-out
Effect: Background color + border transition
```

### Modal Open/Close
```
Duration: 300ms
Easing: cubic-bezier
Effect: Scale + opacity fade
```

## Error States

### No Available Positions
```
┌────────────────────────────────────────┐
│         ⚠️ No available positions      │
│                                        │
│  All positions in this rack are full  │
│  or incompatible with product size    │
└────────────────────────────────────────┘
```

### Reserved Positions Only
```
┌────────────────────────────────────────┐
│ 🔒 S01 · SH08 (12 positions)          │
├────────────────────────────────────────┤
│ All positions in this section are     │
│ reserved for other shipments          │
└────────────────────────────────────────┘
```

## Tips & Best Practices

### For Users
1. **Use "Expand All"** first to see the full picture
2. **Check capacity bars** to find empty positions
3. **Select from multiple sections** to optimize space
4. **Watch the capacity summary** to avoid over/under selection

### For Developers
1. **Group by section/shelf** for logical organization
2. **Show selection counts** on collapsed sections
3. **Disable reserved positions** to prevent conflicts
4. **Calculate capacity in real-time** for instant feedback

---

**UI Status**: ✅ Implemented and working
**Design System**: Tailwind CSS with custom gradients
**Framework**: React with Framer Motion animations
