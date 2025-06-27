// src/components/ToggleColmapUI.jsx
import React, { useEffect, useState } from 'react';

/**
 * Props:
 * - onToggle (function): called with boolean when switch is toggled
 * - disabled (boolean): disable toggle until cameras are loaded
 */
const ToggleColmapUI = ({ onToggle, disabled }) => {
    const [checked, setChecked] = useState(false);

    const handleChange = (e) => {
        const newState = e.target.checked;
        setChecked(newState);
        onToggle?.(newState);
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 20,
                left: 20,
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'Arial',
                fontSize: '14px',
                zIndex: 100,
            }}
        >
            <label style={{ position: 'relative', display: 'inline-block', width: 60, height: 34 }}>
                <input
                    type="checkbox"
                    style={{ display: 'none' }}
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                />
                <span
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: checked ? '#4CAF50' : '#ccc',
                        borderRadius: 34,
                        transition: '0.4s',
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: checked ? 30 : 4,
                            width: 26,
                            height: 26,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.4s',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                        }}
                    />
                </span>
            </label>
            <span style={{ marginLeft: 10, fontWeight: 'bold', color: 'white' }}>Show Cameras</span>
        </div>
    );
};

export default ToggleColmapUI;
