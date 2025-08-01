import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './core/SceneManager';

const SceneModule = ({renderMode, currentMode, showBVH, showCameraHelper, showWireframe,  onCameraInfoUpdate }) => {
    const [isReady, setIsReady] = useState(false);
    const canvasRef = useRef(null);
    const sceneManagerRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            const sceneManager = SceneManager.getInstance(canvasRef.current);
            sceneManagerRef.current = sceneManager;
            sceneManager.setCameraInfoCallback(onCameraInfoUpdate);

            sceneManager.init().then(() => {
                setIsReady(true);
            });
        }

        return () => {
            sceneManagerRef.current?.dispose?.();
            sceneManagerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const sceneManager = sceneManagerRef.current;
        if (!isReady || !sceneManager ) return;

        const shouldEnableRaycast = currentMode === 'measure' || currentMode === 'volume';

        if (shouldEnableRaycast) {
            sceneManager.registerClickHandler((hit) => {
                console.log('[Raycast] Triangle hit:', hit.faceIndex);
            });
        } else {
            sceneManager.unregisterClickHandler();
        }

        return () => {
            sceneManager.unregisterClickHandler();
        };
    }, [currentMode, isReady]);

    useEffect(() => {
        if (!isReady) return;
        sceneManagerRef.current?.setRenderMode?.(renderMode);
    }, [renderMode, isReady]);

    useEffect(() => {
        if (!isReady) return;
        sceneManagerRef.current?.setShowCameraHelper?.(showCameraHelper);
    }, [showCameraHelper, isReady]);

    useEffect(() => {
        if (!isReady) return;
        sceneManagerRef.current?.toggleBVHHelper?.(showBVH);
    }, [showBVH, isReady]);

    useEffect(() => {
        if (!isReady) return;
        sceneManagerRef.current?.setShowWireframe?.(showWireframe);
    }, [showWireframe, isReady]);

    return (
        <canvas
            ref={canvasRef}
            id="viewer-canvas"
            style={{ width: '100vw', height: '100vh', display: 'block' }}
        />
    );
};

export default SceneModule;
