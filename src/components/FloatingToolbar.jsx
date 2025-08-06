import '../styles/FloatingToolbar.css';
import {
  LucideRuler,
  LucideCuboid,
  LucideEye,
  LucideSettings,
  LucideLasso,
  LucideSquare,
} from 'lucide-react';

const modes = [
  { id: 'view', label: 'View', icon: <LucideEye size={18} /> },
  { id: 'measure', label: 'Measure', icon: <LucideRuler size={18} /> },
  { id: 'volume', label: 'Volume', icon: <LucideCuboid size={18} /> },
];

const selectionModes = [
  { id: 'lasso', label: 'Lasso', icon: <LucideLasso size={18} /> },
  { id: 'box', label: 'Box', icon: <LucideSquare size={18} /> },
];

const FloatingToolbar = ({
  currentMode,
  selectionMode,
  onModeChange,
  onSelectionModeChange,
  onToggleSettings
}) => {
  return (
    <div className="floating-toolbar-container">
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
      {currentMode === 'volume' && (
        <div className="selection-toolbar">
          {selectionModes.map((mode) => (
            <button
              key={mode.id}
              className={`toolbar-btn ${selectionMode === mode.id ? 'active' : ''}`}
              onClick={() => onSelectionModeChange(selectionMode === mode.id ? null : mode.id)}
              title={mode.label}
            >
              {mode.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FloatingToolbar;
