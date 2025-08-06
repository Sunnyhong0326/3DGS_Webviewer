import React from 'react';

const CameraInfoPanel = ({ colmap, ecef, gps }) => {
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'Arial',
                fontSize: '13px',
                lineHeight: '1.4',
                zIndex: 100,
                minWidth: 240
            }}
        >
            <div><strong>COLMAP Position</strong></div>
            <div>X: {colmap?.x?.toFixed(2)}&nbsp; Y: {colmap?.y?.toFixed(2)}&nbsp; Z: {colmap?.z?.toFixed(2)}</div>

            <div style={{ marginTop: 8 }}><strong>ECEF</strong></div>
            <div>X: {ecef?.x?.toFixed(2)}&nbsp; Y: {ecef?.y?.toFixed(2)}&nbsp; Z: {ecef?.z?.toFixed(2)}</div>

            <div style={{ marginTop: 8 }}><strong>GPS</strong></div>
            <div>Lat: {gps?.lat?.toFixed(6)}&nbsp; Lon: {gps?.lon?.toFixed(6)}&nbsp; Alt: {gps?.alt?.toFixed(2)}</div>

            <a
                href={`https://www.google.com/maps?q=${gps?.lat},${gps?.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4FC3F7', textDecoration: 'underline', fontSize: '12px', display: 'inline-block', marginTop: 6 }}
            >
                View on Google Maps
            </a>
        </div>
    );
};

export default CameraInfoPanel;
