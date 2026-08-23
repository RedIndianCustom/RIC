# 🔧 Scanner Troubleshooting Guide

## 🎯 **NEW VISUAL INDICATORS**

Your scanner now shows **real-time feedback**! Look for these indicators:

### **Top Status Bar:**
```
┌─────────────────────────────────┐
│  🔍 ACTIVELY SCANNING           │  ← Scanner is working!
└─────────────────────────────────┘
```

**Status Colors:**
- **Blue (Indigo):** 🔍 ACTIVELY SCANNING - Scanner is looking for codes
- **Green:** ✓ BARCODE FOUND! - Detected successfully
- **Blue:** ⏳ LOADING DATA... - Fetching from database
- **Gray:** 📷 Ready - Camera on, waiting

### **Bottom Status:**
```
┌─────────────────────────────────┐
│  🔍 Scanning... (127)           │  ← Attempt counter
│  Last: RIC000000000001          │  ← Last detected code
└─────────────────────────────────┘
```

### **Corner Brackets:**
- **Pulsing green:** Scanner actively looking
- **Bright green + enlarged:** Barcode detected!
- **Static green:** Camera ready

---

## ❓ **COMMON ISSUES & SOLUTIONS**

### **1. "Scanner shows but never detects barcode"**

**Symptoms:**
- Camera shows ✅
- "🔍 ACTIVELY SCANNING" appears ✅
- Attempt counter increasing ✅
- But nothing happens ❌

**Possible Causes & Fixes:**

#### **A. Barcode Too Small**
```
Problem: Barcode fills <10% of scan box
Solution: Use ZOOM controls!
```
**Fix:**
1. Click **[+]** zoom button 2-3 times
2. Get closer (6-10 inches)
3. Try again

#### **B. Poor Lighting**
```
Problem: Barcode in shadow or too dark
Solution: Enable FLASH or add light
```
**Fix:**
1. Click **Flash** button (turns yellow)
2. OR move to brighter area
3. OR use desk lamp

#### **C. Barcode Reflection/Glare**
```
Problem: Shiny label reflecting light
Solution: Change angle
```
**Fix:**
1. Tilt barcode slightly
2. Avoid direct light reflection
3. Use matte-finish labels if possible

#### **D. Movement/Shaking**
```
Problem: Camera or barcode moving
Solution: Hold steady
```
**Fix:**
1. Place item on flat surface
2. Hold camera steady for 2-3 seconds
3. Use both hands
4. Rest elbows on table

#### **E. Out of Focus**
```
Problem: Barcode blurry
Solution: Adjust distance
```
**Fix:**
1. Move to 8-10 inches away
2. Wait 1 second for autofocus
3. Keep steady
4. Try zoom if too far

---

### **2. "Scanner never shows 🔍 ACTIVELY SCANNING"**

**Symptoms:**
- Camera shows ✅
- Status stays at "📷 Ready" ❌
- No attempt counter ❌

**This means scanner isn't running!**

**Fixes:**

#### **A. Page not loaded properly**
```
1. Refresh page (F5 or Ctrl+R)
2. Click Camera tab again
3. Allow camera permission when prompted
```

#### **B. Camera permission denied**
```
1. Check browser address bar for 🚫 camera icon
2. Click it and select "Allow"
3. Refresh page
4. Try again
```

#### **C. Another app using camera**
```
1. Close Zoom, Teams, Skype, etc.
2. Close other browser tabs with camera
3. Restart browser
4. Try again
```

---

### **3. "Shows 'BARCODE FOUND!' but then error"**

**Symptoms:**
- Scanner detects: ✅ BARCODE FOUND!
- Changes to: ⏳ LOADING DATA...
- Then shows error ❌

**Possible Causes:**

#### **A. Barcode Not in Database**
```
Error: "Barcode not found or inactive"
Meaning: This barcode doesn't exist in your system
```
**Fix:**
- Verify barcode value (check if it's RIC format)
- Generate barcode first in system
- Check if barcode was deleted

#### **B. Network Error**
```
Error: "Failed to scan barcode. Please try again."
Meaning: Can't reach server
```
**Fix:**
1. Check internet connection
2. Refresh page
3. Try again
4. Contact IT if persists

#### **C. Server Error**
```
Error: "Failed to scan barcode" (generic)
Meaning: Database or server issue
```
**Fix:**
1. Try different barcode
2. Check backend is running
3. Check database connection
4. View browser console (F12) for details

---

### **4. "Camera shows black screen"**

**Symptoms:**
- Camera area is solid black ❌
- No video feed visible ❌

**Fixes:**

#### **A. Camera not started**
```
1. Wait 2-3 seconds for camera to initialize
2. Look for "🔄 Starting Camera..." message
3. If stuck, refresh page
```

#### **B. Camera blocked**
```
1. Check antivirus/firewall
2. Check Windows privacy settings:
   Settings → Privacy → Camera → Allow
3. Check browser permissions
```

#### **C. Hardware issue**
```
1. Test camera in another app (e.g., Camera app)
2. Restart computer
3. Update camera drivers
4. Try different browser
```

---

### **5. "Scanner too slow"**

**Symptoms:**
- Takes 5+ seconds to detect ❌
- Attempt counter very high before detection ❌

**Performance Fixes:**

#### **A. Optimize Barcode Position**
```
✅ DO:
• Center barcode in scan box
• Keep 8-10 inches away
• Horizontal alignment
• Good lighting
• Hold steady

❌ DON'T:
• Off-center barcode
• Too close (<4 inches)
• Tilted at extreme angle
• Dark/shadowy area
• Moving/shaking
```

#### **B. Use Better Camera**
```
Front camera: Usually worse quality
Back camera: Better quality (use this!)
External USB camera: Professional quality
```

#### **C. Clean Camera Lens**
```
Smudges = slow detection
1. Wipe lens with soft cloth
2. Check for scratches
3. Remove protective film if new device
```

---

## 📋 **CHECKLIST: Why Won't It Scan?**

Go through this checklist:

```
Camera:
□ Camera permission granted?
□ Camera feed showing (not black)?
□ "🔍 ACTIVELY SCANNING" appears?
□ Attempt counter increasing?

Barcode:
□ Barcode clearly printed (not faded)?
□ Barcode not damaged/torn?
□ Barcode type supported (CODE 128, QR, EAN)?
□ Barcode in your database?

Positioning:
□ Barcode in center of scan box?
□ Distance 6-12 inches?
□ Barcode horizontal (not tilted)?
□ Holding steady (not moving)?

Lighting:
□ Bright enough to see barcode?
□ No glare/reflection on barcode?
□ Flash enabled if dark?

Focus:
□ Barcode in focus (not blurry)?
□ Camera has time to autofocus (1-2 sec)?
□ Zoom adjusted if needed?
```

---

## 🧪 **TEST PROCEDURE**

### **Test 1: Verify Scanner Works**
```
1. Navigate to /scan-barcode
2. Click "Camera" tab
3. Look for "🔍 ACTIVELY SCANNING" at top
4. Watch attempt counter increase (10, 20, 30...)
5. Point at ANY barcode (cereal box, book, anything)
6. Watch for "✓ BARCODE FOUND!"
```

**Result:**
- ✅ If "BARCODE FOUND!" appears → Scanner works! Issue is with your specific barcode
- ❌ If never shows "ACTIVELY SCANNING" → Camera/permission issue
- ❌ If "ACTIVELY SCANNING" but never detects → Positioning/lighting issue

---

### **Test 2: Test with QR Code**
QR codes are EASIER to scan than linear barcodes.

```
1. Generate QR code online: https://www.qr-code-generator.com/
2. Put any text: "TEST123"
3. Display QR code on phone or print it
4. Scan with camera
5. Watch for "✓ BARCODE FOUND!" → "TEST123"
```

**Result:**
- ✅ If QR scans → Scanner works! Your barcodes may be poor quality
- ❌ If QR doesn't scan → Lighting/distance issue

---

### **Test 3: Test Your RIC Barcode**
```
1. Generate barcode in your system
2. Print it clearly (or display on screen)
3. Enable FLASH if dark
4. Use ZOOM if barcode small
5. Hold 8 inches away, centered
6. Hold steady for 3 seconds
7. Watch status indicators
```

**Watch for:**
```
"📷 Ready"
  ↓
"🔍 ACTIVELY SCANNING" (counter: 10, 20, 30...)
  ↓
"✓ BARCODE FOUND!"
  ↓
"⏳ LOADING DATA..."
  ↓
Results displayed!
```

---

## 💡 **PRO TIPS**

### **Tip 1: Print Quality Matters**
```
Poor Print Quality:
❌ Faded ink
❌ Smudged bars
❌ Low DPI (dots per inch)
❌ Thin paper (see-through)

Good Print Quality:
✅ Black ink, white background
✅ Sharp, clear bars
✅ 300+ DPI printing
✅ Thick, opaque paper/labels
```

### **Tip 2: Optimal Scanning Setup**
```
Best Setup:
• Bright room (office lighting)
• Flat surface (desk/table)
• Item stays still (not handheld)
• Camera 8-10 inches above
• Perpendicular angle (straight down)
```

### **Tip 3: Speed Up Scanning**
```
For Rapid Scanning:
1. Enable "Continuous" mode
2. Place items in line
3. Slide each under camera
4. Wait for beep
5. Slide next item
6. Repeat

Can achieve 40-60 scans/minute!
```

### **Tip 4: Dark Warehouses**
```
If warehouse is dark:
1. Enable Flash immediately
2. Consider buying LED work light
3. Position light at 45° angle
4. Avoid direct reflection
```

---

## 🎯 **VISUAL INDICATORS GUIDE**

### **What Each Indicator Means:**

| Indicator | Status | Meaning | Action |
|-----------|--------|---------|--------|
| 📷 Ready | Idle | Camera on, waiting | Point at barcode |
| 🔍 ACTIVELY SCANNING | Scanning | Looking for codes | Keep steady |
| ✓ BARCODE FOUND! | Detected | Code recognized | Wait... |
| ⏳ LOADING DATA... | Processing | Fetching from DB | Wait... |
| ❌ Error | Failed | Issue occurred | Check message |

### **Attempt Counter:**
```
🔍 Scanning... (0-50):    Normal, keep trying
🔍 Scanning... (51-100):  Might need adjustment
🔍 Scanning... (101-200): Check positioning
🔍 Scanning... (200+):    Issue! See troubleshooting
```

If counter goes above 200 without detection:
1. Check barcode quality
2. Improve lighting
3. Adjust distance/angle
4. Try zoom
5. Try different barcode to test scanner

---

## 🆘 **Still Not Working?**

If you've tried everything above:

### **1. Test in Different Browser**
```
Try these browsers:
• Chrome (recommended)
• Edge (recommended)
• Firefox
• Safari (on Mac/iOS)
```

### **2. Test on Different Device**
```
Try:
• Desktop computer
• Laptop
• Mobile phone (best camera usually!)
• Tablet
```

### **3. Check Console for Errors**
```
1. Press F12 (open developer tools)
2. Click "Console" tab
3. Look for red errors
4. Take screenshot
5. Share with IT support
```

### **4. Contact Support**
```
Provide:
• Browser name and version
• Device type (desktop/mobile)
• Screenshot of scan page
• Screenshot of console errors
• Photo of barcode you're trying to scan
• Status you see ("Actively scanning" or "Ready"?)
```

---

## ✅ **Success Criteria**

**Scanner is working correctly if:**
1. ✅ Camera feed shows clearly (not black)
2. ✅ "🔍 ACTIVELY SCANNING" appears within 1 second
3. ✅ Attempt counter increases steadily
4. ✅ Corner brackets pulse green
5. ✅ Scanning line animates
6. ✅ Detects QR codes easily
7. ✅ Detects barcodes within 3-5 seconds (good conditions)

**If all above are YES:**
- Your scanner works! ✅
- Issue is barcode quality or positioning
- Follow positioning tips above

**If any above are NO:**
- Scanner has technical issue
- Follow troubleshooting steps
- Contact IT support if needed

---

**Last Updated:** August 19, 2026  
**Version:** 4.1.0 (Enhanced Feedback)  
**Status:** ✅ Production Ready with Real-time Indicators
