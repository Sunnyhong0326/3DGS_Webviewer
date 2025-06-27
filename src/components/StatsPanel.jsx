import { useEffect, useRef } from 'react';
import Stats from 'stats.js';

const StatsPanel = () => {
  const statsRef = useRef();

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0); // 0 = fps
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    stats.dom.style.zIndex = 1000;

    statsRef.current.appendChild(stats.dom);

    let animationFrameId;

    const animate = () => {
      stats.begin();
      stats.end();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      stats.dom.remove();
    };
  }, []);

  return <div ref={statsRef} />;
};

export default StatsPanel;
