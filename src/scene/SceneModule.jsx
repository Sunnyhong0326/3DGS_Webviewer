import React, { useEffect, useRef } from 'react';
import { SceneManager } from './core/SceneManager';

const SceneModule = ({ onToggleReady, onCamerasLoaded, onCameraInfoUpdate }) => {
    const canvasRef = useRef(null);
    const sceneManagerRef = useRef(null);

    useEffect(() => {
        const sceneManager = new SceneManager(canvasRef.current);
        sceneManagerRef.current = sceneManager;

        if (onToggleReady) {
            onToggleReady((state) => {
                sceneManager.cameraSwitcher?.toggleColmapCameras(state);
            });
        }

        sceneManager.setCameraInfoCallback(onCameraInfoUpdate);

        sceneManager.init().then(() => {
            onCamerasLoaded?.();
        });

        return () => {
            sceneManagerRef.current?.dispose?.();
            sceneManagerRef.current = null;
        };
    }, []); 

    return (
        <canvas
            ref={canvasRef}
            id="viewer-canvas"
            style={{ width: '100vw', height: '100vh', display: 'block' }}
        />
    );
};

export default SceneModule;
