import React from 'react';
import '../styles/WebViewerLayout.css';
import {
  LucideRuler,
  LucideCuboid,
  LucideEye,
  LucideCamera,
  LucideSettings,
} from 'lucide-react'; // ✅ make sure LucideSettings is imported

const modes = [
  { id: 'view', label: 'View', icon: <LucideEye size={18} /> },
  { id: 'measure', label: 'Measure', icon: <LucideRuler size={18} /> },
  { id: 'volume', label: 'Volume', icon: <LucideCuboid size={18} /> },
  { id: 'camera', label: 'Camera', icon: <LucideCamera size={18} /> },
];

const WebViewerLayout = ({
  currentMode,
  onModeChange,
  showColmap,
  onToggleColmap,
  showMesh,
  onToggleMesh,
  onToggleSettings, // ✅ FIX: Add this prop
  children
}) => {
  return (
    <div className="floating-layout-container">
      <div className="floating-toolbar">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`toolbar-btn ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => onModeChange(mode.id)}
            title={mode.label}
          >
            {mode.icon}
          </button>
        ))}
        <hr className="toolbar-separator" />
        <button
          className="toolbar-btn"
          onClick={onToggleSettings}
          title="Settings"
        >
          <LucideSettings size={18} />
        </button>
      </div>

      <main className="viewer-canvas-container">
        {children}
      </main>
    </div>
  );
};

export default WebViewerLayout;
