import '../styles/FloatingToolbar.css';
import {
  LucideRuler,
  LucideCuboid,
  LucideEye,
  LucideCamera,
  LucideSettings,
} from 'lucide-react';

const modes = [
  { id: 'view', label: 'View', icon: <LucideEye size={18} /> },
  { id: 'measure', label: 'Measure', icon: <LucideRuler size={18} /> },
  { id: 'volume', label: 'Volume', icon: <LucideCuboid size={18} /> },
];

const FloatingToolbar = ({
  currentMode,
  onModeChange,
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
    </div>
  );
};

export default FloatingToolbar;
