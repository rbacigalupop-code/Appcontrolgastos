import { useEffect, useRef, useCallback } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useUserMode } from '../../context/UserModeContext';

const FFT_SIZE = 2048;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  w: number,
  h: number,
  isDaw: boolean
) {
  const midY = h / 2;

  // Background
  ctx.fillStyle = isDaw ? '#0e0e0e' : '#f0f4ff';
  ctx.fillRect(0, 0, w, h);

  // Center line
  ctx.strokeStyle = isDaw ? '#1e1e1e' : '#c7d2fe';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Waveform glow (DAW mode only)
  if (isDaw) {
    ctx.shadowColor = '#00ff9d';
    ctx.shadowBlur = 6;
  }

  // Main waveform
  ctx.strokeStyle = isDaw ? '#00ff9d' : '#6366f1';
  ctx.lineWidth = isDaw ? 1.5 : 2;
  ctx.beginPath();

  const sliceW = w / data.length;
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const y = midY + v * midY * 0.9;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.stroke();

  if (isDaw) {
    ctx.shadowBlur = 0;

    // Secondary fill (semi-transparent area under waveform)
    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = 'rgba(0,255,157,0.04)';
    ctx.lineTo(w, midY);
    ctx.lineTo(0, midY);
    ctx.closePath();
    ctx.fill();
  }

  // Amplitude indicator bars (DAW)
  if (isDaw) {
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
    const barH = peak * (h - 4);
    ctx.fillStyle = peak > 0.85
      ? 'rgba(239,68,68,0.7)'
      : peak > 0.5
      ? 'rgba(245,158,11,0.6)'
      : 'rgba(0,255,157,0.5)';
    ctx.fillRect(w - 6, (h - barH) / 2, 4, barH);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisualizerScreen() {
  const { waveAnalyser, isReady } = useAudioEngine();
  const { mode } = useUserMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const isDaw = mode === 'C';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = waveAnalyser.current;
    if (!canvas) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const w = canvas.width;
    const h = canvas.height;

    if (analyser) {
      const raw = analyser.getValue();
      // Tone.Analyser waveform returns Float32Array; guard against fft tuple variant
      const data: Float32Array =
        raw instanceof Float32Array
          ? raw
          : Array.isArray(raw)
          ? (raw[0] instanceof Float32Array ? raw[0] : new Float32Array(raw as unknown as number[]))
          : new Float32Array(2048);
      drawWaveform(ctx2d, data, w, h, isDaw);
    } else {
      // Engine not initialized — draw idle state
      ctx2d.fillStyle = isDaw ? '#0e0e0e' : '#f0f4ff';
      ctx2d.fillRect(0, 0, w, h);
      const midY = h / 2;
      ctx2d.strokeStyle = isDaw ? '#1e1e1e' : '#c7d2fe';
      ctx2d.lineWidth = 1;
      ctx2d.setLineDash([4, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(0, midY);
      ctx2d.lineTo(w, midY);
      ctx2d.stroke();
      ctx2d.setLineDash([]);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [waveAnalyser, isDaw]);

  // Start animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Keep canvas resolution in sync with layout size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = Math.floor(width  * dpr);
        canvas.height = Math.floor(height * dpr);
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) ctx2d.scale(dpr, dpr);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={`rounded-xl overflow-hidden border flex flex-col ${
        isDaw
          ? 'bg-daw-surface border-daw-border'
          : 'bg-lab-card border-lab-border shadow-sm'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isDaw ? 'border-daw-border' : 'border-lab-border'
        }`}
      >
        <div>
          <h2
            className={`font-semibold text-sm tracking-wide ${
              isDaw ? 'text-daw-text font-mono' : 'text-lab-text'
            }`}
          >
            {isDaw ? 'WAVEFORM ANALYSER — FFT' : '📊 Forma de Onda en Tiempo Real'}
          </h2>
          <p className={`text-xs mt-0.5 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {isDaw
              ? `${FFT_SIZE}-point waveform  |  Amplitude: −1 → +1`
              : 'Cada sonido que escuchas tiene una forma — aquí la ves en vivo'}
          </p>
        </div>
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isReady
                ? 'bg-green-400 animate-pulse-slow'
                : isDaw ? 'bg-daw-muted' : 'bg-lab-muted'
            }`}
          />
          <span className={`text-xs ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
            {isReady ? (isDaw ? 'ENGINE ONLINE' : 'Activo') : (isDaw ? 'STANDBY' : 'Esperando')}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className={`relative ${isDaw ? 'bg-[#0e0e0e]' : 'bg-[#f0f4ff]'}`} style={{ height: 160 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
          aria-label="Visualización de forma de onda en tiempo real"
        />

        {/* Idle overlay when engine not started */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className={`text-xs ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
              {isDaw
                ? '— Interactúa con un módulo para inicializar el AudioContext —'
                : 'Toca el mástil o el secuenciador para ver la onda aquí'}
            </p>
          </div>
        )}
      </div>

      {/* Axis labels (Mode C) */}
      {isDaw && (
        <div className="px-4 py-1.5 flex items-center justify-between border-t border-daw-border">
          <span className="text-xs font-mono text-daw-muted">0</span>
          <span className="text-xs font-mono text-daw-muted">Tiempo →</span>
          <span className="text-xs font-mono text-daw-muted">{FFT_SIZE} muestras</span>
        </div>
      )}

      {/* Info row (Mode G) */}
      {!isDaw && (
        <div className="px-4 py-2 border-t border-lab-border bg-indigo-50/50 text-xs text-lab-muted">
          La línea sube y baja con la vibración del sonido.
          Una nota alta vibra más rápido (más ondas). Una nota baja vibra más lento.
        </div>
      )}
    </div>
  );
}
