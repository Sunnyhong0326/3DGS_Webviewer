import React, { useEffect, useRef } from 'react';
import { SceneManager } from './core/SceneManager';

const SceneModule = ({renderMode, showCameraHelper, onCameraInfoUpdate }) => {
    const canvasRef = useRef(null);
    const sceneManagerRef = useRef(null);

    useEffect(() => {
        const sceneManager = new SceneManager(canvasRef.current);
        sceneManagerRef.current = sceneManager;

        sceneManager.setCameraInfoCallback(onCameraInfoUpdate);

        sceneManager.init();

        return () => {
            sceneManagerRef.current?.dispose?.();
            sceneManagerRef.current = null;
        };
    }, []); 

    useEffect(() => {
        sceneManagerRef.current?.setRenderMode?.(renderMode);
    }, [renderMode]);

    useEffect(() => {
        sceneManagerRef.current?.setShowCameraHelper?.(showCameraHelper);
    }, [showCameraHelper]);

    return (
        <canvas
            ref={canvasRef}
            id="viewer-canvas"
            style={{ width: '100vw', height: '100vh', display: 'block' }}
        />
    );
};

export default SceneModule;
