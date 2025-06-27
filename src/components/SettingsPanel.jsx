import React from 'react';
import '../styles/SettingsPanel.css';

const SettingsPanel = ({
  showColmap,
  onToggleColmap,
  showMesh,
  onToggleMesh,
}) => {
  return (
    <div className="settings-panel">
      <h4>View Options</h4>

      <div className="toggle-row">
        <label>COLMAP Cameras</label>
        <input
          type="checkbox"
          checked={showColmap}
          onChange={(e) => onToggleColmap(e.target.checked)}
        />
      </div>

      <div className="toggle-row">
        <label>Mesh View</label>
        <input
          type="checkbox"
          checked={showMesh}
          onChange={(e) => onToggleMesh(e.target.checked)}
        />
      </div>

      {/* Add more toggles here as needed */}
    </div>
  );
};

export default SettingsPanel;
