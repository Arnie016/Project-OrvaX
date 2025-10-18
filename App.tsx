
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ToothData, MeasurementType, MeasurementLocation, MeasurementSiteValue, PerioSiteMeasurements, NonSiteLocation } from './types.ts';
import { INITIAL_CHART_DATA } from './constants.ts';
import DentalChart3D from './components/PerioChart.tsx';
import { InfoPanel } from './components/Tooth.tsx';
import Toolbar from './components/Toolbar.tsx';
import { fetchDbMeasurements, processDbMeasurements } from './dbDataSync.ts';

// A custom hook to manage chart data logic, defined in-file to avoid adding new files.
const useChartData = () => {
  const [data, setData] = useState<ToothData[]>(INITIAL_CHART_DATA);

  const calculateData = (tooth: ToothData): { cal: PerioSiteMeasurements, riskScore: number } => {
    const cal: PerioSiteMeasurements = {};
    let riskScore = 0;
    
    const pd = tooth.measurements[MeasurementType.POCKET_DEPTH] || {};
    const rec = tooth.measurements[MeasurementType.RECESSION] || {};
    const bop = tooth.measurements[MeasurementType.BLEEDING] || {};

    const locations: MeasurementLocation[] = ['disto_buccal', 'mid_buccal', 'mesio_buccal', 'disto_lingual', 'mid_lingual', 'mesio_lingual'];
    
    locations.forEach(loc => {
      const pocketDepth = typeof pd[loc] === 'number' ? pd[loc] as number : 0;
      const recession = typeof rec[loc] === 'number' ? rec[loc] as number : 0;
      cal[loc] = pocketDepth + recession;

      if (pocketDepth > 4) riskScore += pocketDepth - 4;
      if (recession > 2) riskScore += recession - 2;
      if (typeof cal[loc] === 'number' && (cal[loc] as number) > 5) riskScore += (cal[loc] as number) - 5;
      if (bop[loc]) riskScore += 2;
    });

    riskScore += (tooth.mobility || 0) * 10;
    riskScore += (tooth.furcation?.buccal || 0) * 8;
    riskScore += (tooth.furcation?.lingual || 0) * 8;

    return { cal, riskScore };
  };
  
  const processedData = useMemo(() => {
    return data.map(tooth => {
      if (tooth.isMissing) return { ...tooth, cal: {}, riskScore: 0 };
      const { cal, riskScore } = calculateData(tooth);
      return { ...tooth, cal, riskScore };
    });
  }, [data]);

  const overallScores = useMemo(() => {
    let totalSites = 0;
    let bopSites = 0;
    let plaqueSites = 0;
    
    processedData.forEach(tooth => {
        if (!tooth.isMissing) {
            totalSites += 6;
            const bopData = tooth.measurements[MeasurementType.BLEEDING] || {};
            const plaqueData = tooth.measurements[MeasurementType.PLAQUE] || {};
            const locations: MeasurementLocation[] = ['disto_buccal', 'mid_buccal', 'mesio_buccal', 'disto_lingual', 'mid_lingual', 'mesio_lingual'];
            locations.forEach(loc => {
                if (bopData[loc]) bopSites++;
                if (plaqueData[loc]) plaqueSites++;
            });
        }
    });

    const bopPercentage = totalSites > 0 ? (bopSites / totalSites) * 100 : 0;
    const plaquePercentage = totalSites > 0 ? (plaqueSites / totalSites) * 100 : 0;

    return { bopPercentage, plaquePercentage };
  }, [processedData]);

  const updateChartData = useCallback((
    toothId: number,
    location: MeasurementLocation | NonSiteLocation,
    type: MeasurementType,
    value: MeasurementSiteValue
  ) => {
    setData(prevData => {
      const newData = [...prevData];
      const toothIndex = newData.findIndex(t => t.id === toothId);
      if (toothIndex === -1) return prevData;

      const newToothData = JSON.parse(JSON.stringify(newData[toothIndex]));

      if (type === MeasurementType.MOBILITY) {
        newToothData.mobility = value as number;
      } else if (type === MeasurementType.FURCATION) {
        if (!newToothData.furcation) newToothData.furcation = {};
        if (location === 'furcation_buccal') newToothData.furcation.buccal = value as number;
        if (location === 'furcation_lingual') newToothData.furcation.lingual = value as number;
      } else {
        const measurementBlock = newToothData.measurements[type] || {};
        measurementBlock[location] = value;
        newToothData.measurements[type] = measurementBlock;
      }
      newData[toothIndex] = newToothData;
      return newData;
    });
  }, []);

  return { chartData: processedData, updateChartData, overallScores };
};


function App() {
  const { chartData, updateChartData, overallScores } = useChartData();
  const [selectedToothId, setSelectedToothId] = useState<number | null>(null);
  const [activeSurface, setActiveSurface] = useState<'buccal' | 'lingual' | null>('buccal');
  const [showPlaque, setShowPlaque] = useState(false);
  const [cameraControls, setCameraControls] = useState<any>(null);
  const [blinkingTeeth, setBlinkingTeeth] = useState<Set<number>>(new Set());
  const lastFetchTimeRef = useRef<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedToothData = useMemo(() => {
    return chartData.find(t => t.id === selectedToothId) || null;
  }, [selectedToothId, chartData]);

  const handleToothSelect = useCallback((toothId: number) => {
    if (chartData.find(t => t.id === toothId)?.isMissing) return;
    setSelectedToothId(currentId => currentId === toothId ? null : toothId);
  }, [chartData]);
  
  const handleSetSurface = useCallback((surface: 'buccal' | 'lingual' | null) => {
    setActiveSurface(surface);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedToothId(null);
  }, []);
  
  const handleResetCamera = useCallback(() => {
    if (cameraControls) {
      // Set camera to specific position
      cameraControls.object.position.set(0, 2, -15);
      cameraControls.target.set(0, 0, 2);
      cameraControls.update();
    }
  }, [cameraControls]);
  
  const handleTogglePlaque = useCallback(() => {
    setShowPlaque(prev => !prev);
  }, []);

  // Function to sync data from database
  const syncDatabaseData = useCallback(async () => {
    // Fetch from Supabase API (change to 'local' for testing with test.json)
    const measurements = await fetchDbMeasurements('supabase');
    if (measurements.length === 0) return;

    // Process measurements and apply updates
    const { updates, updatedTeethIds } = processDbMeasurements(measurements);
    
    // Check if there are any new updates (comparing timestamps)
    const latestTimestamp = measurements[measurements.length - 1]?.created_at || '';
    if (latestTimestamp === lastFetchTimeRef.current) {
      return; // No new data
    }
    
    lastFetchTimeRef.current = latestTimestamp;

    // Apply all updates
    updates.forEach(update => {
      updateChartData(update.toothId, update.location, update.type, update.value);
    });

    // Trigger blink animation for updated teeth
    if (updatedTeethIds.length > 0) {
      console.log('🔄 Database sync: Updated teeth', updatedTeethIds);
      
      setBlinkingTeeth(new Set(updatedTeethIds));
      
      // Stop blinking after 2 blinks (approximately 1 second)
      setTimeout(() => {
        setBlinkingTeeth(new Set());
      }, 1000);
    }
  }, [updateChartData]);

  // Start polling for database updates every 1 second (after 2 second delay)
  useEffect(() => {
    // Wait 2 seconds before starting database sync
    const initialDelayTimeout = setTimeout(() => {
      // Initial sync after 2 seconds
      syncDatabaseData();

      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        syncDatabaseData();
      }, 1000); // Poll every 1 second
    }, 2000); // Wait 2 seconds before first sync

    // Cleanup on unmount
    return () => {
      clearTimeout(initialDelayTimeout);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [syncDatabaseData]);

  return (
    <div className="w-screen h-screen font-sans">
       <header className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-[rgba(25,30,45,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-3 rounded-xl">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Agentic Periodontal Digital Twin</h1>
          <p className="text-md text-slate-300 drop-shadow-md">Interactive 3D Assessment Tool</p>
        </div>
        <div className="pointer-events-auto">
          <Toolbar onResetCamera={handleResetCamera} onTogglePlaque={handleTogglePlaque} isPlaqueVisible={showPlaque} />
        </div>
      </header>
      
      <DentalChart3D
        chartData={chartData}
        onToothSelect={handleToothSelect}
        selectedToothData={selectedToothData}
        showPlaque={showPlaque}
        setCameraControls={setCameraControls}
        activeSurface={activeSurface}
        blinkingTeeth={blinkingTeeth}
      />
      
      {selectedToothData && (
        <InfoPanel
          key={selectedToothData.id}
          toothData={selectedToothData}
          onUpdate={updateChartData}
          onClose={handleClosePanel}
          onSelectTooth={handleToothSelect}
          activeSurface={activeSurface}
          onSetSurface={handleSetSurface}
          overallScores={overallScores}
        />
      )}

      <footer className="absolute bottom-0 left-0 p-2 text-slate-400 text-xs z-10">
        <p>Not for clinical use. All data is for demonstration purposes only.</p>
      </footer>
    </div>
  );
}

export default App;
