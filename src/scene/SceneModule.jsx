import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './core/SceneManager';

const SceneModule = ({renderMode, currentMode, selectionMode, showBVH, showCameraHelper, showWireframe,  onCameraInfoUpdate }) => {
    const [isReady, setIsReady] = useState(false);
    const canvasRef = useRef(null);
    const lassoCanvasRef = useRef(null);
    const sceneManagerRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && lassoCanvasRef.current) {
            const sceneManager = SceneManager.getInstance(canvasRef.current);
            sceneManagerRef.current = sceneManager;
            sceneManager.setCameraInfoCallback(onCameraInfoUpdate);
            sceneManager.setLassoCanvas(lassoCanvasRef.current);

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
        sceneManagerRef.current?.enableLassoMode?.(selectionMode === 'lasso');
        sceneManagerRef.current?.enableBoxMode?.(selectionMode === 'box');
    }, [selectionMode, isReady]);

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

    useEffect(() => {
        const canvas = lassoCanvasRef.current;
        if (!canvas) return;
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            <canvas
                ref={canvasRef}
                id="viewer-canvas"
                style={{ width: '100vw', height: '100vh', display: 'block' }}
            />
            <canvas
                ref={lassoCanvasRef}
                id="lasso-canvas"
                style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}
            />
        </div>
    );
};

export default SceneModule;
