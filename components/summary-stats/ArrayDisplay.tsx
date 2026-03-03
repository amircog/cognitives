'use client';

import React from 'react';
import { ArrayItem, StimulusType } from '@/types/summary-stats';

interface ArrayDisplayProps {
  items: ArrayItem[];
  stimulusType: StimulusType;
  size?: number; // SVG size (square)
}

// Fixed-length for orientation lines (px)
const ORIENTATION_LINE_HALF = 30;

export default function ArrayDisplay({ items, stimulusType, size = 500 }: ArrayDisplayProps) {
  // Scale positions from 0–500 coordinate space to actual size
  const scale = size / 500;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      style={{ background: '#1a1a2e' }}
    >
      {items.map(item => {
        const cx = item.x * scale;
        const cy = item.y * scale;

        if (stimulusType === 'circles') {
          return (
            <circle
              key={item.id}
              cx={cx}
              cy={cy}
              r={item.value * scale}
              fill="#f97316"
              fillOpacity={0.85}
              stroke="#fb923c"
              strokeWidth={1.5}
            />
          );
        }

        if (stimulusType === 'line-lengths') {
          const halfLen = (item.value * scale) / 2;
          return (
            <line
              key={item.id}
              x1={cx - halfLen}
              y1={cy}
              x2={cx + halfLen}
              y2={cy}
              stroke="#f97316"
              strokeWidth={3 * scale}
              strokeLinecap="round"
            />
          );
        }

        // line-orientations: rotate around center
        const angleRad = (item.value * Math.PI) / 180;
        const halfLen = ORIENTATION_LINE_HALF * scale;
        const dx = halfLen * Math.sin(angleRad);
        const dy = halfLen * Math.cos(angleRad);
        return (
          <line
            key={item.id}
            x1={cx - dx}
            y1={cy - dy}
            x2={cx + dx}
            y2={cy + dy}
            stroke="#f97316"
            strokeWidth={3 * scale}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────
// SingleItemDisplay – for recognition probes and response previews
// ──────────────────────────────────────────────

interface SingleItemProps {
  value: number;
  stimulusType: StimulusType;
  size?: number;
  color?: string;
}

export function SingleItemDisplay({ value, stimulusType, size = 200, color = '#f97316' }: SingleItemProps) {
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      style={{ background: '#1a1a2e', borderRadius: 12 }}
    >
      {stimulusType === 'circles' && (
        <circle
          cx={cx}
          cy={cy}
          r={value}
          fill={color}
          fillOpacity={0.85}
          stroke={color}
          strokeWidth={2}
        />
      )}

      {stimulusType === 'line-lengths' && (
        <line
          x1={cx - value / 2}
          y1={cy}
          x2={cx + value / 2}
          y2={cy}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}

      {stimulusType === 'line-orientations' && (() => {
        const angleRad = (value * Math.PI) / 180;
        const halfLen = size * 0.35;
        const dx = halfLen * Math.sin(angleRad);
        const dy = halfLen * Math.cos(angleRad);
        return (
          <line
            x1={cx - dx}
            y1={cy - dy}
            x2={cx + dx}
            y2={cy + dy}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })()}
    </svg>
  );
}
