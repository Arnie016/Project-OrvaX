# Supabase Integration Setup

## What Was Integrated

The application now connects to Supabase and automatically polls the `clinical_observations` table every 1 second to sync periodontal measurements in real-time.

### API Configuration

**Endpoint:** `https://ogfwpsrifkawczcjomux.supabase.co/rest/v1/clinical_observations?select=*`

**Authentication:** 
- API Key and Bearer token are configured in `supabaseConfig.ts`
- For production, use environment variables (see below)

## Quick Setup

### 1. Create Environment File (Optional but Recommended)

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://ogfwpsrifkawczcjomux.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZndwc3JpZmthd2N6Y2pvbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTgzMjEsImV4cCI6MjA3NTMzNDMyMX0.UmjPIVSXIbooNoK_sK_uoikKW2C_H3BHU4TU8OVizBk
```

**Note:** The `.env` file is already in `.gitignore` and won't be committed to version control.

### 2. Restart Development Server

If you created a `.env` file, restart the dev server:

```bash
npm run dev
```

### 3. Verify Connection

1. Open the browser console
2. Look for log messages like: `🔄 Database sync: Updated teeth [3, 8, 14]`
3. Watch teeth blink in cyan when new data arrives

## How It Works

### Data Flow

```
Supabase DB → REST API → fetchClinicalObservations()
              ↓
      processDbMeasurements()
              ↓
      Convert quadrant notation to Universal tooth numbers
              ↓
      Apply measurements to tooth data
              ↓
      Trigger blink animation on updated teeth
```

### Polling Mechanism

- **Frequency:** Every 1 second
- **Method:** HTTP GET request to Supabase REST API
- **Caching:** Compares `created_at` timestamps to avoid re-processing same data
- **Fallback:** Can switch to local JSON file for testing

### Expected Data Format

The `clinical_observations` table should have these fields:

```typescript
{
  type: string;              // "=pocketDepth", "=bleeding", "=plaque", "=recession"
  quadrant: number;          // 1-4 (Q1: upper right, Q2: upper left, Q3: lower left, Q4: lower right)
  tooth_in_quadrant: number; // 1-8 (position within quadrant)
  surface: string;           // "=buccal" or "=lingual"
  distal: number | null;     // Distal site measurement
  middle: number | null;     // Middle site measurement
  mesial: number | null;     // Mesial site measurement
  created_at: string;        // ISO timestamp
}
```

## Testing

### Test with Local Data

To test without the live database:

1. Open `App.tsx`
2. Find the `syncDatabaseData` function
3. Change:
   ```typescript
   const measurements = await fetchDbMeasurements('supabase');
   ```
   To:
   ```typescript
   const measurements = await fetchDbMeasurements('local', '/test.json');
   ```

### Sample Test Data

The `/public/test.json` file contains sample measurements for testing.

## Troubleshooting

### No Data Appearing

1. **Check Console for Errors**
   - Look for "Supabase API error" messages
   - Verify API endpoint is accessible

2. **Verify API Keys**
   - Check if keys are expired
   - Ensure `anon` role has read access to `clinical_observations`

3. **Check Data Format**
   - Ensure table columns match expected format
   - Verify `created_at` field is properly formatted

### CORS Issues

If you see CORS errors:
- Ensure Supabase project has proper CORS settings
- Check if your domain is allowed in Supabase dashboard

### Environment Variables Not Loading

- Restart the dev server after creating/modifying `.env`
- Ensure variables start with `VITE_` prefix (required by Vite)
- Check that `.env` is in the project root directory

## Configuration Files

### `supabaseConfig.ts`
- Contains API credentials with fallback values
- Exports `fetchClinicalObservations()` function
- Can be customized for different endpoints

### `dbDataSync.ts`
- Handles data transformation and processing
- Converts quadrant notation to Universal numbering
- Maps database fields to internal measurement types

### `App.tsx`
- Manages polling interval (currently 1 second)
- Triggers blink animation on updates
- Applies measurements to tooth data

## Next Steps

1. ✅ API integration complete
2. ✅ Polling every 1 second
3. ✅ API keys hidden in config file
4. ✅ Environment variable support
5. ✅ Blink animation on updates

### Recommended Improvements

- [ ] Implement WebSocket for real-time updates (more efficient than polling)
- [ ] Add authentication for secure data access
- [ ] Implement error retry logic
- [ ] Add offline support with local caching
- [ ] Create admin panel for data management

## Security Notes

⚠️ **IMPORTANT:** The API keys are currently in `supabaseConfig.ts` as fallback values. For production:

1. Remove hardcoded keys from `supabaseConfig.ts`
2. Use only environment variables
3. Set up proper Row Level Security (RLS) policies in Supabase
4. Consider implementing user authentication

For more details, see `DATABASE_SYNC_README.md`.

