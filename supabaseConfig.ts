/**
 * Supabase Configuration
 * 
 * IMPORTANT: For production, move these values to environment variables:
 * 1. Create a .env file in the root directory
 * 2. Add: VITE_SUPABASE_URL=your-url
 * 3. Add: VITE_SUPABASE_ANON_KEY=your-key
 * 4. Update this file to use: import.meta.env.VITE_SUPABASE_URL
 */

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://ogfwpsrifkawczcjomux.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZndwc3JpZmthd2N6Y2pvbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTgzMjEsImV4cCI6MjA3NTMzNDMyMX0.UmjPIVSXIbooNoK_sK_uoikKW2C_H3BHU4TU8OVizBk'
};

/**
 * Fetch clinical observations from Supabase
 */
export const fetchClinicalObservations = async () => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/clinical_observations?select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Supabase API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return [];
  }
};


