'use client';

import React from 'react';
import { ArrayItem, StimulusType } from '@/types/summary-stats';

interface ArrayDisplayProps {
  items: ArrayItem[];
  stimulusType: StimulusType;
}

export default function ArrayDisplay({ items, stimulusType }: ArrayDisplayProps) {
  return (
    <svg
      width="100%"
      viewBox="0 0 500 500"
      className="block"
      style={{ background: '#1a1a2e' }}
    >
      {items.map(item => {
        if (stimulusType === 'circles') {
          return (
            <circle
              key={item.id}
              cx={item.x}
              cy={item.y}
              r={item.value}
              fill="#f97316"
              fillOpacity={0.85}
              stroke="#fb923c"
              strokeWidth={1.5}
            />
          );
        }

        // line-lengths: horizontal line centred at (x, y)
        const halfLen = item.value / 2;
        return (
          <line
            key={item.id}
            x1={item.x - halfLen}
            y1={item.y}
            x2={item.x + halfLen}
            y2={item.y}
            stroke="#f97316"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────
// SingleItemDisplay – for recognition probes and 2AFC options
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
        <circle cx={cx} cy={cy} r={value} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={2} />
      )}
      {stimulusType === 'line-lengths' && (
        <line
          x1={cx - value / 2} y1={cy}
          x2={cx + value / 2} y2={cy}
          stroke={color} strokeWidth={4} strokeLinecap="round"
        />
      )}
    </svg>
  );
}
