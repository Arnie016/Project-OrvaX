# 🦷 Quick Start Guide - 3D Tooth Models

## What Was Built

A complete system for replacing procedural teeth with realistic 3D .glb models, including:

✅ **GLB Model Loading** - Each tooth loads from a separate .glb file  
✅ **Transform Controls** - Position, rotate, and scale any tooth  
✅ **Automatic Mirroring** - Right-side teeth auto-mirror from left  
✅ **Persistent Storage** - Settings save to localStorage  
✅ **Interactive UI** - Double-click teeth to adjust them  
✅ **Help System** - Built-in guide for users  

## 🚀 How to Use (3 Steps)

### Step 1: Add Your .glb Files
Place these 16 files in your project root:

```
📁 project-root/
  ├── maxillary_first_molar.glb
  ├── maxillary_second_molar.glb
  ├── maxillary_third_molar.glb
  ├── maxillary_first_premolar.glb
  ├── maxillary_second_premolar.glb
  ├── maxillary_canine.glb
  ├── maxillary_lateral_incisor.glb
  ├── maxillary_left_central_incisor.glb
  ├── mandibular_first_molar.glb
  ├── mandibular_second_molar.glb
  ├── mandibular_third_molar.glb
  ├── mandibular_first_premolar.glb
  ├── mandibular_left_second_premolar.glb
  ├── mandibular_left_canine.glb
  ├── mandibular_left_lateral_incisor.glb
  └── mandibular_left_central_incisor.glb
```

### Step 2: Run the App
```bash
npm run dev
```

### Step 3: Adjust Teeth
1. **Single Click** → Select a tooth
2. **Double Click** → Open transform controls
3. Adjust position/rotation/scale with sliders
4. Click **"Save"** to persist changes

## 🎮 Controls

| Action | Result |
|--------|--------|
| **Single Click Tooth** | Select/highlight tooth |
| **Double Click Tooth** | Open transform controls panel |
| **Mouse Drag** | Rotate camera view |
| **Mouse Wheel** | Zoom in/out |
| **? Help Button** | Show/hide help guide |

## 📐 Transform Controls

Each tooth can be adjusted in 3 ways:

### 🔹 Position
Move tooth along X, Y, Z axes (-5 to +5)

### 🔄 Rotation  
Rotate tooth around X, Y, Z axes (-180° to +180°)

### 📏 Scale
Resize tooth on X, Y, Z axes (0.01 to 1.0)

**Tip**: Click "Uniform Scale" to maintain proportions

## 💾 Data Persistence

Transformations automatically save to browser localStorage when you click "Save"

To reset everything:
```javascript
// Open browser console (F12) and run:
localStorage.removeItem('tooth_transforms');
location.reload();
```

## 📂 Files Created/Modified

### New Files ✨
- `toothModelMapping.ts` - Configuration for all 32 teeth
- `components/ToothTransformControls.tsx` - Transform UI panel
- `components/ToothModelGuide.tsx` - Help overlay
- `TOOTH_MODELS_README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `QUICK_START.md` - This file

### Modified Files 🔧
- `components/PerioChart.tsx` - Added GLB loading, wrapper groups, transform handlers

## 🎯 Key Features

### Automatic Mirroring
The system automatically creates right-side teeth by mirroring left-side models:
- **Teeth 1-8** (upper right) → mirrored
- **Teeth 9-16** (upper left) → use as-is
- **Teeth 17-24** (lower left) → use as-is
- **Teeth 25-32** (lower right) → mirrored

This means you only need **16 unique models** for all **32 teeth**!

### Wrapper Groups
Each tooth is wrapped in a `THREE.Group`:
- **Group Level**: Fixed position in dental arch
- **Model Level**: Your custom transforms (position, rotation, scale)

This allows easy rotation/manipulation without affecting arch positioning.

### Fallback System
If a .glb file is missing:
1. System logs a warning to console
2. Falls back to procedural geometry (the original shapes)
3. App continues working normally

## 🔍 Troubleshooting

### Models Not Loading?
- Check file names match exactly (case-sensitive)
- Look at browser console (F12) for error messages
- Verify files are in project root, not subfolders

### Models Too Big/Small?
1. Double-click the tooth
2. Adjust scale sliders (or click "Uniform Scale")
3. Click "Save"

Or adjust the default scale in `toothModelMapping.ts`:
```typescript
scale: { x: 0.1, y: 0.1, z: 0.1 }  // Change these values
```

### Transforms Not Saving?
- Make sure to click the "Save" button
- Check localStorage is enabled in your browser
- Try incognito/private mode if issues persist

## 🎨 Example Workflow

```
1. Start app → See help guide
2. Click "Got it!" to dismiss guide
3. Double-click tooth #14 (upper left first molar)
4. Adjust position Y to +0.5 (raise tooth)
5. Adjust rotation X to 15° (tilt forward)
6. Adjust scale uniformly to 0.12 (slightly larger)
7. Click "Save" → Changes persist
8. Refresh page → Changes still there ✓
```

## 📊 Model Mapping Reference

Quick reference for which models are used where:

| Tooth Type | Model File | Used For |
|------------|------------|----------|
| Central Incisor | `maxillary_left_central_incisor.glb` | #8, #9 (mirrored, as-is) |
| Lateral Incisor | `maxillary_lateral_incisor.glb` | #7, #10 (mirrored, as-is) |
| Canine | `maxillary_canine.glb` | #6, #11 (mirrored, as-is) |
| First Premolar | `maxillary_first_premolar.glb` | #5, #12 (mirrored, as-is) |
| Second Premolar | `maxillary_second_premolar.glb` | #4, #13 (mirrored, as-is) |
| First Molar | `maxillary_first_molar.glb` | #3, #14 (mirrored, as-is) |
| Second Molar | `maxillary_second_molar.glb` | #2, #15 (mirrored, as-is) |
| Third Molar | `maxillary_third_molar.glb` | #1, #16 (mirrored, as-is) |

(Similar pattern for mandibular teeth #17-32)

## 🎓 Learn More

- **Full Documentation**: See `TOOTH_MODELS_README.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`
- **In-App Help**: Click "? Help" button

## ✨ Tips & Tricks

1. **Start with one tooth**: Double-click tooth #9 (upper left central incisor) to test
2. **Use numeric inputs**: More precise than sliders
3. **Reset if stuck**: Click "Reset" button to restore defaults
4. **Save often**: Click "Save" after each successful adjustment
5. **Check console**: Browser console shows helpful error messages

## 🎉 You're Ready!

The system is fully implemented and ready to use. Just add your .glb files and start customizing!

**Need Help?** Click the "? Help" button in the app or see `TOOTH_MODELS_README.md` for detailed documentation.

