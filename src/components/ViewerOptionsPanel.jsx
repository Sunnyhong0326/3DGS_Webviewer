import React from 'react';
import '../styles/ViewerOptionsPanel.css';

const ViewerOptionsPanel = ({
    renderMode,
    onRenderModeChange,
    showCameraHelper,
    onToggleCameraHelper,
    showBVH,
    onToggleBVH,
    showWireFrame,
    onToggleWireFrame,
}) => {
    return (
        <div className="viewer-options-panel">
            <h4>Viewer Options</h4>

            <div className="option-row">
                <label htmlFor="render-mode">Render Mode:</label>
                <select
                    id="render-mode"
                    value={renderMode}
                    onChange={e => onRenderModeChange(e.target.value)}
                >
                    <option value="3dgs">3DGS</option>
                    <option value="mesh">Mesh</option>
                </select>
            </div>

            <div className="option-row">
                <label htmlFor="camera-helper">Show Camera Helper</label>
                <input
                    id="camera-helper"
                    type="checkbox"
                    checked={showCameraHelper}
                    onChange={() => onToggleCameraHelper(prev => !prev)}
                />
            </div>
            <div className="option-row">
                <label htmlFor="bvh-helper">Show BVH</label>
                <input
                    id="bvh-helper"
                    type="checkbox"
                    checked={showBVH}
                    disabled={renderMode !== 'mesh'}
                    onChange={() => onToggleBVH(prev => !prev)}
                />
            </div>
            <div className="option-row">
                <label htmlFor="wireframe-helper">Show WireFrame</label>
                <input
                    id="wireframe-helper"
                    type="checkbox"
                    checked={showWireFrame}
                    disabled={renderMode !== 'mesh'}
                    onChange={() => onToggleWireFrame(prev => !prev)}
                />
            </div>
        </div>
    );
}

export default ViewerOptionsPanel;
