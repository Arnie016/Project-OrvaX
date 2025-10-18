# Database Sync Feature

## Overview
The application now automatically syncs periodontal measurements (Pocket Depth, Bleeding, Plaque) from a Supabase database and updates the 3D tooth models in real-time with a visual blinking effect.

## Quick Start

### 1. Setup Environment Variables (Recommended for Production)
Create a `.env` file in the root directory:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The API keys are currently configured in `supabaseConfig.ts` as fallbacks, but you should override them with environment variables for security.

### 2. Data Source
- **Primary Source**: Supabase REST API (`clinical_observations` table)
- **Fallback Source**: `/public/test.json` (for local testing)
- **Polling Frequency**: Every 1 second
- **Data Format**: Array of measurement records

### 2. Data Structure
Each measurement record in the JSON has the following relevant fields:
```json
{
  "type": "=pocketDepth",        // Type: pocketDepth, bleeding, plaque, recession
  "quadrant": 1,                  // 1-4 (Q1: upper right, Q2: upper left, Q3: lower left, Q4: lower right)
  "tooth_in_quadrant": 3,         // 1-8 (position within quadrant)
  "surface": "=buccal",           // buccal or lingual
  "distal": 3.00,                 // Distal site measurement
  "middle": 1.00,                 // Middle site measurement
  "mesial": 1.00                  // Mesial site measurement
}
```

**Ignored fields**: `id`, `patient_id`, `visit_id`, `session_id`, `created_at`

### 3. Tooth Numbering Conversion
The system automatically converts quadrant + tooth_in_quadrant to Universal tooth numbering (1-32):
- **Q1 (Upper Right)**: tooth_in_quadrant 1-8 → Universal #8-1
- **Q2 (Upper Left)**: tooth_in_quadrant 1-8 → Universal #9-16
- **Q3 (Lower Left)**: tooth_in_quadrant 1-8 → Universal #24-17
- **Q4 (Lower Right)**: tooth_in_quadrant 1-8 → Universal #25-32

### 4. Measurement Location Mapping
Each measurement is mapped to specific tooth sites:
- **Surface**: `buccal` or `lingual`
- **Site**: `distal`, `middle`, `mesial`
- **Combined**: e.g., `disto_buccal`, `mid_lingual`, etc.

### 5. Visual Feedback
When teeth are updated:
1. **Blink Animation**: Updated teeth blink twice with a bright cyan/blue color
2. **Duration**: The blinking lasts approximately 1 second (10 Hz frequency)
3. **Color**: Bright cyan (#4DCCFF) mixed with the tooth's current color

## Implementation Details

### Files Modified/Created

1. **`supabaseConfig.ts`** (NEW)
   - Configuration file for Supabase API credentials
   - `fetchClinicalObservations()`: Fetches data from Supabase REST API
   - Uses environment variables with fallback values
   - Includes proper headers: `apikey`, `Authorization`, `Content-Type`

2. **`dbDataSync.ts`** (NEW)
   - `getUniversalToothNumber()`: Converts quadrant + position to universal number
   - `mapDbTypeToMeasurementType()`: Maps database types to internal enums
   - `mapDbSurfaceToLocation()`: Maps surface + site to measurement locations
   - `processDbMeasurements()`: Processes raw database data into updates
   - `fetchDbMeasurements()`: Fetches from either Supabase or local JSON

3. **`App.tsx`**
   - Added database sync polling (every 1 second)
   - Manages `blinkingTeeth` state
   - Triggers blink animation for 1 second when teeth are updated
   - Applies measurement updates via `updateChartData()`
   - Configured to use Supabase by default

4. **`components/PerioChart.tsx`**
   - Added `blinkingTeeth` prop to component interface
   - Added `time` and `isBlinking` uniforms to tooth shader
   - Implemented blinking effect in fragment shader
   - Updates uniforms in animation loop and via useEffect

5. **`.gitignore`**
   - Added `.env` files to prevent committing sensitive API keys

## Usage

### Switching Between Supabase and Local Mode

#### Production Mode (Supabase API)
The app is configured to use Supabase by default. It will automatically poll the `clinical_observations` table every 1 second.

#### Testing Mode (Local JSON)
For local testing without the database, change the source in `App.tsx`:
```typescript
// Change this line:
const measurements = await fetchDbMeasurements('supabase');

// To this:
const measurements = await fetchDbMeasurements('local', '/test.json');
```

### Real-Time Updates
How the sync works:
1. App polls Supabase API every 1 second
2. Detects new records by comparing `created_at` timestamps
3. Processes and applies measurements to teeth
4. Updated teeth blink twice in cyan/blue
5. Measurements are reflected in the tooth's visual appearance and data

### Testing with Sample Data
The `/public/test.json` file contains sample pocket depth measurements for local testing.

### Configuring the API

#### Option 1: Environment Variables (Recommended)
Create a `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Option 2: Direct Configuration (Not Recommended for Production)
Edit `supabaseConfig.ts` to change the hardcoded fallback values.

### Adjusting Poll Frequency
To change how often the app checks for updates, modify the interval in `App.tsx`:
```typescript
pollingIntervalRef.current = setInterval(() => {
  syncDatabaseData();
}, 1000); // Change 1000 to desired milliseconds (currently 1 second)
```

### Customizing Blink Effect
To adjust the blink animation, modify the shader code in `PerioChart.tsx`:
```glsl
float blinkFreq = 10.0;           // Frequency (higher = faster blinks)
vec3 blinkColor = vec3(0.3, 0.8, 1.0); // Color (RGB)
gl_FragColor.rgb = mix(gl_FragColor.rgb, blinkColor, blinkWave * 0.7); // Intensity (0.7 = 70%)
```

And adjust the duration in `App.tsx`:
```typescript
setTimeout(() => {
  setBlinkingTeeth(new Set());
}, 1000); // Change 1000 to desired milliseconds
```

## Data Type Support

Currently supported measurement types:
- ✅ **Pocket Depth** (numeric values)
- ✅ **Recession** (numeric values)
- ✅ **Bleeding on Probing** (boolean: value > 0)
- ✅ **Plaque** (boolean: value > 0)

Future support planned:
- ⏳ Mobility
- ⏳ Furcation

## Security Best Practices

### ⚠️ IMPORTANT: Protect Your API Keys

1. **Never commit `.env` files to version control**
   - The `.gitignore` file is configured to exclude `.env` files
   - Always use environment variables for sensitive credentials

2. **For Production Deployment**
   - Set environment variables in your hosting platform (Vercel, Netlify, etc.)
   - Example for Vercel:
     ```bash
     vercel env add VITE_SUPABASE_URL
     vercel env add VITE_SUPABASE_ANON_KEY
     ```

3. **Current Setup**
   - API keys are hardcoded in `supabaseConfig.ts` as fallbacks
   - **Remove these before deploying to production!**
   - Replace with proper environment variable handling

4. **Supabase Row Level Security**
   - Ensure your `clinical_observations` table has proper RLS policies
   - The `anon` key should only have read access to necessary data
   - Consider implementing authentication for write operations

### Setting Up Environment Variables

#### Development
1. Create `.env` file in project root (already ignored by git)
2. Add your credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Restart the dev server for changes to take effect

#### Production
Configure environment variables in your deployment platform's dashboard.

## Performance Notes
- Polling every 1 second is lightweight for typical use cases
- For production, consider WebSocket subscriptions for real-time updates
- The blinking animation uses GPU shaders for optimal performance
- No performance impact on non-blinking teeth
- Supabase API calls are cached by comparing timestamps to avoid unnecessary processing

