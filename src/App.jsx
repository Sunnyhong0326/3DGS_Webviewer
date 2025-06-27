import React, { useState, useEffect } from 'react';
import StatsPanel from './components/StatsPanel';
import SceneModule from './scene/SceneModule';
import CameraInfoPanel from './components/CameraInfoPanel';
import FloatingToolbar from './components/FloatingToolbar';
import ViewerOptionsPanel from './components/ViewerOptionsPanel';

const App = () => {
  const [colmapPos, setColmapPos] = useState(null);
  const [ecefPos, setEcefPos] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  const [mode, setMode] = useState('view');
  const [showSettings, setShowSettings] = useState(false);
  
  const [renderMode, setRenderMode] = useState('3dgs');
  const [showCameraHelper, setShowCameraHelper] = useState(true);

  return (
    <>
      <StatsPanel />
      <FloatingToolbar
        currentMode={mode}
        onModeChange={setMode}
        onToggleSettings={() => setShowSettings(prev => !prev)}
      />
      
      {showSettings && (
        <ViewerOptionsPanel
          renderMode={renderMode}
          onRenderModeChange={setRenderMode}
          showCameraHelper={showCameraHelper}
          onToggleCameraHelper={() => setShowCameraHelper(h => !h)}
        />
      )}

      <SceneModule
        renderMode={renderMode}
        showCameraHelper={showCameraHelper}
        onCameraInfoUpdate={({ colmap, ecef, gps }) => {
          setColmapPos({ x: colmap.x, y: colmap.y, z: colmap.z });
          setEcefPos({ x: ecef.x, y: ecef.y, z: ecef.z });
          setGpsCoords({ lat: +gps.lat, lon: +gps.lon, alt: +gps.alt });
        }}
      />
      <CameraInfoPanel colmap={colmapPos} ecef={ecefPos} gps={gpsCoords} />
    </>
  );
};

export default App;
