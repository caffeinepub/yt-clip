import { useCallback } from "react";

interface DualRangeSliderProps {
  min: number;
  max: number;
  start: number;
  end: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
}

export function DualRangeSlider({
  min,
  max,
  start,
  end,
  onStartChange,
  onEndChange,
}: DualRangeSliderProps) {
  const range = max - min || 1;
  const leftPct = ((start - min) / range) * 100;
  const rightPct = ((end - min) / range) * 100;

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (v < end) onStartChange(v);
    },
    [end, onStartChange],
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (v > start) onEndChange(v);
    },
    [start, onEndChange],
  );

  return (
    <div className="dual-range-container">
      <div className="dual-range-track" />
      <div
        className="dual-range-fill"
        style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
      />
      <input
        type="range"
        className="dual-range-input"
        min={min}
        max={max}
        value={start}
        onChange={handleStartChange}
        style={{ zIndex: start > max - 10 ? 5 : 3 }}
      />
      <input
        type="range"
        className="dual-range-input"
        min={min}
        max={max}
        value={end}
        onChange={handleEndChange}
        style={{ zIndex: 4 }}
      />
    </div>
  );
}
