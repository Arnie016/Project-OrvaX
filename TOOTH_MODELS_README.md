# 3D Tooth Models System

![Intro](public/images/iNTRO.png)

## Overview

This system replaces procedurally generated teeth with realistic 3D models loaded from .glb files. Each tooth can be individually transformed (positioned, rotated, scaled) with an intuitive UI, and transformations persist across sessions.

## Features

✅ **GLB Model Loading** - Load realistic 3D tooth models from .glb files  
✅ **Automatic Mirroring** - Right-side teeth are automatically mirrored from left-side models  
✅ **Transform Controls** - Adjust position, rotation, and scale for each tooth  
✅ **Persistent Storage** - Transformations are saved to localStorage  
✅ **Wrapper Groups** - Each tooth is wrapped in a THREE.Group for easy manipulation  
✅ **Fallback Rendering** - Falls back to procedural geometry if .glb files are missing  
✅ **Interactive UI** - Double-click any tooth to open transform controls  

## Required .glb Files

Place these 16 .glb model files in your project root directory:

### Maxillary (Upper) Teeth
```
maxillary_first_molar.glb
maxillary_second_molar.glb
maxillary_third_molar.glb
maxillary_first_premolar.glb
maxillary_second_premolar.glb
maxillary_canine.glb
maxillary_lateral_incisor.glb
maxillary_left_central_incisor.glb
```

### Mandibular (Lower) Teeth
```
mandibular_first_molar.glb
mandibular_second_molar.glb
mandibular_third_molar.glb
mandibular_first_premolar.glb
mandibular_left_second_premolar.glb
mandibular_left_canine.glb
mandibular_left_lateral_incisor.glb
mandibular_left_central_incisor.glb
```

## Tooth Assembly Order

### Upper Arch (Teeth 1-16)

| Position | Tooth # | Action | Model File |
|----------|---------|--------|------------|
| **Right Side** | | | |
| Upper Right Third Molar | 1 | Mirror | maxillary_third_molar.glb |
| Upper Right Second Molar | 2 | Mirror | maxillary_second_molar.glb |
| Upper Right First Molar | 3 | Mirror | maxillary_first_molar.glb |
| Upper Right Second Premolar | 4 | Mirror | maxillary_second_premolar.glb |
| Upper Right First Premolar | 5 | Mirror | maxillary_first_premolar.glb |
| Upper Right Canine | 6 | Mirror | maxillary_canine.glb |
| Upper Right Lateral Incisor | 7 | Mirror | maxillary_lateral_incisor.glb |
| Upper Right Central Incisor | 8 | Mirror | maxillary_left_central_incisor.glb |
| **Left Side** | | | |
| Upper Left Central Incisor | 9 | Use As-Is | maxillary_left_central_incisor.glb |
| Upper Left Lateral Incisor | 10 | Use As-Is | maxillary_lateral_incisor.glb |
| Upper Left Canine | 11 | Use As-Is | maxillary_canine.glb |
| Upper Left First Premolar | 12 | Use As-Is | maxillary_first_premolar.glb |
| Upper Left Second Premolar | 13 | Use As-Is | maxillary_second_premolar.glb |
| Upper Left First Molar | 14 | Use As-Is | maxillary_first_molar.glb |
| Upper Left Second Molar | 15 | Use As-Is | maxillary_second_molar.glb |
| Upper Left Third Molar | 16 | Use As-Is | maxillary_third_molar.glb |

### Lower Arch (Teeth 17-32)

| Position | Tooth # | Action | Model File |
|----------|---------|--------|------------|
| **Left Side** | | | |
| Lower Left Third Molar | 17 | Use As-Is | mandibular_third_molar.glb |
| Lower Left Second Molar | 18 | Use As-Is | mandibular_second_molar.glb |
| Lower Left First Molar | 19 | Use As-Is | mandibular_first_molar.glb |
| Lower Left Second Premolar | 20 | Use As-Is | mandibular_left_second_premolar.glb |
| Lower Left First Premolar | 21 | Use As-Is | mandibular_first_premolar.glb |
| Lower Left Canine | 22 | Use As-Is | mandibular_left_canine.glb |
| Lower Left Lateral Incisor | 23 | Use As-Is | mandibular_left_lateral_incisor.glb |
| Lower Left Central Incisor | 24 | Use As-Is | mandibular_left_central_incisor.glb |
| **Right Side** | | | |
| Lower Right Central Incisor | 25 | Mirror | mandibular_left_central_incisor.glb |
| Lower Right Lateral Incisor | 26 | Mirror | mandibular_left_lateral_incisor.glb |
| Lower Right Canine | 27 | Mirror | mandibular_left_canine.glb |
| Lower Right First Premolar | 28 | Mirror | mandibular_first_premolar.glb |
| Lower Right Second Premolar | 29 | Mirror | mandibular_left_second_premolar.glb |
| Lower Right First Molar | 30 | Mirror | mandibular_first_molar.glb |
| Lower Right Second Molar | 31 | Mirror | mandibular_second_molar.glb |
| Lower Right Third Molar | 32 | Mirror | mandibular_third_molar.glb |

## User Interface

### Camera Controls
- **Left Click + Drag**: Rotate camera view
- **Right Click + Drag**: Pan camera
- **Mouse Wheel**: Zoom in/out

### Tooth Selection
- **Single Click**: Select a tooth (highlights it)
- **Double Click**: Open transform controls for that tooth

### Transform Controls Panel
When you double-click a tooth, a control panel appears with:

#### Position Controls
- **X Axis**: Move tooth left/right (-5 to +5)
- **Y Axis**: Move tooth up/down (-5 to +5)
- **Z Axis**: Move tooth forward/backward (-5 to +5)

#### Rotation Controls
- **X Axis**: Rotate around X (-180° to +180°)
- **Y Axis**: Rotate around Y (-180° to +180°)
- **Z Axis**: Rotate around Z (-180° to +180°)

#### Scale Controls
- **X Scale**: Width (0.01 to 1.0)
- **Y Scale**: Height (0.01 to 1.0)
- **Z Scale**: Depth (0.01 to 1.0)
- **Uniform Scale Button**: Makes all scales equal to the average

#### Action Buttons
- **Reset**: Restore default transform values
- **Save**: Persist current transforms to localStorage

### Charting Sequence

The standard chairside entry sequence used by the app's command parser and UI.

![Charting Sequence](public/images/Charting%20Sequence.png)

## Technical Architecture

### File Structure
```
├── toothModelMapping.ts          # Tooth-to-model configuration
├── components/
│   ├── PerioChart.tsx            # Main 3D scene (updated with GLB loading)
│   ├── ToothTransformControls.tsx # Transform UI panel
│   └── ToothModelGuide.tsx       # Help/guide overlay
```

### Key Components

#### `toothModelMapping.ts`
- Maps each tooth ID (1-32) to its .glb file
- Specifies which teeth need mirroring
- Provides localStorage utilities for persistence

#### `PerioChart.tsx`
- Uses `GLTFLoader` to load .glb models
- Creates `THREE.Group` wrappers for each tooth
- Applies transformations and mirroring
- Handles click events (single/double-click detection)
- Falls back to procedural geometry if models fail to load

#### `ToothTransformControls.tsx`
- Provides sliders and number inputs for transformations
- Real-time preview of changes
- Save/Reset functionality

#### `ToothModelGuide.tsx`
- Help overlay with usage instructions
- Can be minimized to a "? Help" button

### Voice + Webhook Tools (ElevenLabs → Tools)

High-level view of the voice layer and the set of webhook tools that back clinical commands.

![ElevenLabs Tools](public/images/ELEVANLABS.png)

### Mirroring Logic

Right-side teeth are mirrored by flipping the X-axis scale:
```typescript
if (modelConfig.shouldMirror) {
  model.scale.x *= -1;
}
```

### Automation Flow (n8n)

Automation/orchestration pipeline that normalizes incoming voice intent and routes to the correct tool.

![n8n Flow](public/images/N8N.png)

This creates anatomically correct right-side teeth from left-side models.

### Data Persistence

Transformations are saved to `localStorage` with the key `tooth_transforms`:
```typescript
{
  "14": {
    "position": { "x": 0.1, "y": 0.2, "z": 0 },
    "rotation": { "x": 0, "y": 1.57, "z": 0 },
    "scale": { "x": 0.15, "y": 0.15, "z": 0.15 }
  },
  // ... more teeth
}
```

## Development

### Adding New Model Files

1. Place your .glb file in the project root
2. Update `toothModelMapping.ts` if needed (the mapping is already complete for all 32 teeth)
3. Refresh the application - models will load automatically

### Adjusting Default Scale

If your .glb models are too large or small by default, adjust the default scale in `toothModelMapping.ts`:

```typescript
export const getDefaultTransform = (): ToothTransform => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 0.1, y: 0.1, z: 0.1 }, // Adjust this value
});
```

### Troubleshooting

**Models not loading?**
- Check the browser console for error messages
- Verify .glb files are in the project root
- Ensure file names match exactly (case-sensitive)

**Models too large/small?**
- Double-click the tooth to open transform controls
- Adjust the scale values
- Click "Save" to persist

**Transforms not saving?**
- Check browser localStorage is enabled
- Open DevTools → Application → Local Storage
- Look for the `tooth_transforms` key

## Future Enhancements

Potential improvements:
- [ ] Bulk transform operations (apply to multiple teeth)
- [ ] Import/Export transform configurations
- [ ] Animation presets for tooth movement
- [ ] Collision detection between teeth
- [ ] Texture/material customization per tooth
- [ ] Support for DRC compressed models
- [ ] Undo/Redo functionality

## Credits

Built with:
- **Three.js** - 3D rendering engine
- **GLTFLoader** - .glb model loading
- **React** - UI framework
- **TypeScript** - Type safety

