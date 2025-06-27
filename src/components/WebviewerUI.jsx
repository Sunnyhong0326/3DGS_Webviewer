import React, { useState } from 'react';

const WebViewerUI = ({
  currentMode,
  onModeChange,
  showColmapCameras,
  onToggleColmap,
  showMesh,
  onToggleMesh,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: '16px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        zIndex: 1000,
        minWidth: '220px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <strong>🕹️ Interaction Mode</strong>
        <select
          value={currentMode}
          onChange={(e) => onModeChange(e.target.value)}
          style={{
            marginTop: '6px',
            width: '100%',
            padding: '6px',
            borderRadius: '4px',
          }}
        >
          <option value="view">View Mode</option>
          <option value="measure">Measure Mode</option>
          <option value="volume">Volume Calc Mode</option>
          <option value="camera">Camera Select Mode</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>📷 Visualization</strong>
        <div style={{ marginTop: '6px' }}>
          <label>
            <input
              type="checkbox"
              checked={showColmapCameras}
              onChange={(e) => onToggleColmap(e.target.checked)}
            />{' '}
            Show COLMAP Cameras
          </label>
        </div>
        <div style={{ marginTop: '4px' }}>
          <label>
            <input
              type="checkbox"
              checked={showMesh}
              onChange={(e) => onToggleMesh(e.target.checked)}
            />{' '}
            Toggle 3DGS / Mesh
          </label>
        </div>
      </div>
    </div>
  );
};

export default WebViewerUI;
