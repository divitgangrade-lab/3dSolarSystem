import { useEffect, useRef, useState } from 'react';
import { mountSurface } from './scene/surface.js';

const TEMP_MIN = -220;
const TEMP_MAX = 480;

function tempPct(value) {
  return Math.max(0, Math.min(100, ((value - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100));
}

function formatTemp(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(0)}`;
}

function formatHumidity(value) {
  if (value < 1) return value.toFixed(2);
  return value.toFixed(0);
}

/* Order matches the on-screen pad: forward, left, back, right. */
const PAD = [
  { code: 'KeyW', label: 'Walk forward', glyph: '\u25b2', slot: 'up' },
  { code: 'KeyA', label: 'Strafe left', glyph: '\u25c0', slot: 'left' },
  { code: 'KeyS', label: 'Walk back', glyph: '\u25bc', slot: 'down' },
  { code: 'KeyD', label: 'Strafe right', glyph: '\u25b6', slot: 'right' },
];

export default function Surface({ body, onExit }) {
  const canvasRef = useRef(null);
  const mountRef = useRef(null);
  const [sensor, setSensor] = useState(null);

  useEffect(() => {
    const mount = mountSurface(canvasRef.current, body);
    if (!mount) {
      onExit();
      return undefined;
    }
    mountRef.current = mount;
    const unsubscribe = mount.subscribe(setSensor);

    const onKey = (event) => {
      if (event.key === 'Escape' || event.key === 'l' || event.key === 'L') {
        event.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKey);
      mountRef.current = null;
      mount.dispose();
    };
  }, [body, onExit]);

  /* Press and release are separate events so a held key keeps walking. */
  const hold = (code, down) => (event) => {
    event.preventDefault();
    mountRef.current?.press(code, down);
  };

  const temp = sensor ? sensor.temp : 0;
  const humidity = sensor ? sensor.humidity : 0;
  const day = sensor ? sensor.elevation : 0;

  return (
    <div className="surface" role="region" aria-label={`Surface of ${body.name}`}>
      <canvas
        ref={canvasRef}
        className="surface-canvas"
        aria-label={`Walkable terrain on ${body.name}. Drag to look around.`}
      />

      <div className="surface-head">
        <span className="surface-kicker">Surface</span>
        <span className="surface-name">{body.name}</span>
        <span className="surface-note">{sensor ? sensor.note : ''}</span>
      </div>

      <button type="button" className="surface-exit" onClick={onExit} autoFocus>
        Return to orbit <span className="drawer-key">Esc</span>
      </button>

      <div className="surface-cross" aria-hidden="true" />

      <div className="surface-pad" role="group" aria-label="Walking controls">
        {PAD.map((key) => (
          <button
            key={key.code}
            type="button"
            className={`pad-key pad-${key.slot}`}
            aria-label={key.label}
            onPointerDown={hold(key.code, true)}
            onPointerUp={hold(key.code, false)}
            onPointerLeave={hold(key.code, false)}
            onPointerCancel={hold(key.code, false)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span aria-hidden="true">{key.glyph}</span>
          </button>
        ))}
        <span className="pad-hint">Drag to look</span>
      </div>

      <div className="sensors" role="group" aria-label="Surface sensors">
        <div className="sensor">
          <span className="sensor-label">Thermometer</span>
          <div className="sensor-gauge">
            <span className="sensor-fill" style={{ height: `${tempPct(temp)}%` }} />
            <span className="sensor-tick" style={{ bottom: '58%' }} aria-hidden="true" />
          </div>
          <span className="sensor-value">
            {formatTemp(temp)}
            <span className="sensor-unit"> °C</span>
          </span>
        </div>

        <div className="sensor">
          <span className="sensor-label">Humidity</span>
          <div className="sensor-gauge">
            <span className="sensor-fill sensor-fill--water" style={{ height: `${Math.min(100, humidity)}%` }} />
          </div>
          <span className="sensor-value">
            {formatHumidity(humidity)}
            <span className="sensor-unit"> %</span>
          </span>
        </div>

        <div className="sensor sensor--readout">
          <span className="sensor-label">Sun</span>
          <span className="sensor-sun">{day > 0.08 ? 'Up' : day > -0.1 ? 'Low' : 'Down'}</span>
          <span className="sensor-hint">WASD move · drag to look · Shift to run</span>
        </div>
      </div>
    </div>
  );
}
