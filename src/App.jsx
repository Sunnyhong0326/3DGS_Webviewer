// src/App.jsx
import React, { useRef, useState } from 'react';
import SceneModule from './scene/SceneModule';
import ToggleColmapUI from './components/ToggleColmapUI';
import CameraInfoPanel from './components/CameraInfoPanel';
import WebViewerLayout from './components/WebviewerLayout';
import StatsPanel from './components/StatsPanel';
import SettingsPanel from './components/SettingsPanel';

const App = () => {
  const [toggleFn, setToggleFn] = useState(null);
  const [camerasLoaded, setCamerasLoaded] = useState(false);

  const [colmapPos, setColmapPos] = useState(null);
  const [ecefPos, setEcefPos] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  const [mode, setMode] = useState('view');
  const [showColmap, setShowColmap] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <WebViewerLayout
      currentMode={mode}
      onModeChange={setMode}
      showColmap={showColmap}
      onToggleColmap={(checked) => {
        toggleFn?.(checked);
        setShowColmap(checked);
      }}
      showMesh={showMesh}
      onToggleSettings={() => setShowSettings((prev) => !prev)}
    >
      <SceneModule
        onCamerasLoaded={() => setCamerasLoaded(true)}
        onToggleReady={(fn) => setToggleFn(() => fn)}
        onCameraInfoUpdate={({ colmap, ecef, gps }) => {
          setColmapPos({ x: colmap.x, y: colmap.y, z: colmap.z });
          setEcefPos({ x: ecef.x, y: ecef.y, z: ecef.z });
          setGpsCoords({ lat: +gps.lat, lon: +gps.lon, alt: +gps.alt });
        }}
        showMesh={showMesh}
      />
      <CameraInfoPanel colmap={colmapPos} ecef={ecefPos} gps={gpsCoords} />
      <StatsPanel />
      {showSettings && (
        <SettingsPanel
          showColmap={showColmap}
          onToggleColmap={(checked) => {
            toggleFn?.(checked);
            setShowColmap(checked);
          }}
          showMesh={showMesh}
          onToggleMesh={(checked) => setShowMesh(checked)}
        />
      )}
    </WebViewerLayout>
  );
};

export default App;
