import { useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

export interface ProgressBarSegment {
  value: number;
  color: string;
  label?: string;
}

export interface ProgressBarProps {
  segments: ProgressBarSegment[];
  height?: number;
  style?: React.CSSProperties;
}

export function ProgressBar({ segments, height = 6, style }: ProgressBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        ...style,
      }}
    >
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const pct = (seg.value / total) * 100;
        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: seg.color,
              position: "relative",
            }}
          >
            {hoveredIndex === i && seg.label && (
              <div
                style={{
                  position: "absolute",
                  bottom: height + 4,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: t.fontSizeXs,
                  lineHeight: "16px",
                  padding: "2px 6px",
                  borderRadius: t.radiusSm,
                  backgroundColor: "rgba(0,0,0,0.85)",
                  color: t.colorTextInverse,
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                {seg.label}: {seg.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
