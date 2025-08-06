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
  const [selectionMode, setSelectionMode] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const [renderMode, setRenderMode] = useState('3dgs');
  const [showCameraHelper, setShowCameraHelper] = useState(false);
  const [showBVH, setShowBVH] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);

  useEffect(() => {
    if (renderMode !== 'mesh' && showBVH) {
      setShowBVH(false);
    }
  }, [renderMode]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode !== 'volume') {
      setSelectionMode(null);
    }
  };

  return (
    <>
      <StatsPanel />
      <FloatingToolbar
        currentMode={mode}
        selectionMode={selectionMode}
        onModeChange={handleModeChange}
        onSelectionModeChange={setSelectionMode}
        onToggleSettings={() => setShowSettings(prev => !prev)}
      />
      
      {showSettings && (
        <ViewerOptionsPanel
          renderMode={renderMode}
          onRenderModeChange={setRenderMode}
          showCameraHelper={showCameraHelper}
          onToggleCameraHelper={setShowCameraHelper}
          showBVH={showBVH}
          onToggleBVH={setShowBVH}
          showWireframe={showWireframe}
          onToggleWireFrame={setShowWireframe}
          />
        )}

      <SceneModule
        renderMode={renderMode}
        currentMode={mode}
        selectionMode={selectionMode}
        showBVH={showBVH}
        showCameraHelper={showCameraHelper}
        showWireframe={showWireframe}
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
