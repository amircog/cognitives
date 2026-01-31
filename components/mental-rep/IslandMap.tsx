'use client';

import React from 'react';
import { LANDMARKS } from '@/lib/mental-rep/scanning';

interface IslandMapProps {
  width?: number;
  height?: number;
  showLabels?: boolean;
  highlightLandmark?: string;
  language?: 'en' | 'he';
}

export default function IslandMap({
  width = 600,
  height = 450,
  showLabels = true,
  highlightLandmark,
  language = 'en',
}: IslandMapProps) {
  // Scale landmark positions to actual dimensions
  const scaleX = (x: number) => (x / 100) * width;
  const scaleY = (y: number) => (y / 100) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto"
    >
      {/* Island shape - organic blob */}
      <defs>
        <linearGradient id="islandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#90EE90" />
          <stop offset="50%" stopColor="#228B22" />
          <stop offset="100%" stopColor="#006400" />
        </linearGradient>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#87CEEB" />
          <stop offset="100%" stopColor="#4169E1" />
        </linearGradient>
        <linearGradient id="lakeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00CED1" />
          <stop offset="100%" stopColor="#008B8B" />
        </linearGradient>
        <linearGradient id="beachGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F4A460" />
          <stop offset="100%" stopColor="#DEB887" />
        </linearGradient>
      </defs>

      {/* Ocean background */}
      <rect x="0" y="0" width={width} height={height} fill="url(#waterGradient)" />

      {/* Island main body */}
      <path
        d={`
          M ${scaleX(5)} ${scaleY(40)}
          Q ${scaleX(10)} ${scaleY(10)}, ${scaleX(40)} ${scaleY(5)}
          Q ${scaleX(70)} ${scaleY(2)}, ${scaleX(90)} ${scaleY(25)}
          Q ${scaleX(98)} ${scaleY(50)}, ${scaleX(92)} ${scaleY(70)}
          Q ${scaleX(85)} ${scaleY(90)}, ${scaleX(55)} ${scaleY(95)}
          Q ${scaleX(25)} ${scaleY(98)}, ${scaleX(10)} ${scaleY(75)}
          Q ${scaleX(2)} ${scaleY(55)}, ${scaleX(5)} ${scaleY(40)}
          Z
        `}
        fill="url(#islandGradient)"
        stroke="#228B22"
        strokeWidth="2"
      />

      {/* Beach area */}
      <ellipse
        cx={scaleX(85)}
        cy={scaleY(60)}
        rx={scaleX(8)}
        ry={scaleY(12)}
        fill="url(#beachGradient)"
      />

      {/* Lake */}
      <ellipse
        cx={scaleX(55)}
        cy={scaleY(50)}
        rx={scaleX(10)}
        ry={scaleY(8)}
        fill="url(#lakeGradient)"
        stroke="#008B8B"
        strokeWidth="1"
      />

      {/* Landmarks */}
      {LANDMARKS.map((landmark) => {
        const cx = scaleX(landmark.x);
        const cy = scaleY(landmark.y);
        const isHighlighted = highlightLandmark === landmark.id;
        const label = language === 'he' ? landmark.nameHe : landmark.name;

        return (
          <g key={landmark.id}>
            {/* Landmark icons */}
            {landmark.id === 'hut' && (
              <>
                {/* Hut - simple house shape */}
                <polygon
                  points={`${cx},${cy - 15} ${cx - 12},${cy} ${cx + 12},${cy}`}
                  fill="#8B4513"
                  stroke={isHighlighted ? '#FF0000' : '#5D3A1A'}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
                <rect
                  x={cx - 8}
                  y={cy}
                  width="16"
                  height="12"
                  fill="#DEB887"
                  stroke={isHighlighted ? '#FF0000' : '#5D3A1A'}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
              </>
            )}

            {landmark.id === 'tree' && (
              <>
                {/* Tree - triangle on rectangle */}
                <rect
                  x={cx - 3}
                  y={cy}
                  width="6"
                  height="15"
                  fill="#8B4513"
                  stroke={isHighlighted ? '#FF0000' : '#5D3A1A'}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
                <polygon
                  points={`${cx},${cy - 20} ${cx - 15},${cy + 5} ${cx + 15},${cy + 5}`}
                  fill="#228B22"
                  stroke={isHighlighted ? '#FF0000' : '#006400'}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
              </>
            )}

            {landmark.id === 'well' && (
              <>
                {/* Well - circle with rim */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  fill="#4169E1"
                  stroke={isHighlighted ? '#FF0000' : '#696969'}
                  strokeWidth={isHighlighted ? 3 : 3}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="8"
                  fill="#00008B"
                />
              </>
            )}

            {landmark.id === 'rock' && (
              <>
                {/* Rock - irregular polygon */}
                <polygon
                  points={`${cx - 10},${cy + 8} ${cx - 12},${cy - 3} ${cx - 5},${cy - 10} ${cx + 5},${cy - 8} ${cx + 12},${cy} ${cx + 8},${cy + 8}`}
                  fill="#808080"
                  stroke={isHighlighted ? '#FF0000' : '#505050'}
                  strokeWidth={isHighlighted ? 3 : 2}
                />
              </>
            )}

            {landmark.id === 'lake' && (
              <>
                {/* Lake marker - wave symbol */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="15"
                  fill="none"
                  stroke={isHighlighted ? '#FF0000' : '#00CED1'}
                  strokeWidth={isHighlighted ? 3 : 2}
                />
                <path
                  d={`M ${cx - 8} ${cy} Q ${cx - 4} ${cy - 5}, ${cx} ${cy} Q ${cx + 4} ${cy + 5}, ${cx + 8} ${cy}`}
                  fill="none"
                  stroke={isHighlighted ? '#FF0000' : '#00CED1'}
                  strokeWidth="2"
                />
              </>
            )}

            {landmark.id === 'beach' && (
              <>
                {/* Beach - umbrella shape */}
                <line
                  x1={cx}
                  y1={cy - 15}
                  x2={cx}
                  y2={cy + 10}
                  stroke={isHighlighted ? '#FF0000' : '#8B4513'}
                  strokeWidth={isHighlighted ? 3 : 2}
                />
                <path
                  d={`M ${cx - 15} ${cy - 5} Q ${cx} ${cy - 25}, ${cx + 15} ${cy - 5}`}
                  fill="#FF6347"
                  stroke={isHighlighted ? '#FF0000' : '#FF4500'}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
              </>
            )}

            {landmark.id === 'cave' && (
              <>
                {/* Cave - dark opening */}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx="15"
                  ry="12"
                  fill="#2F4F4F"
                  stroke={isHighlighted ? '#FF0000' : '#1C1C1C'}
                  strokeWidth={isHighlighted ? 3 : 2}
                />
                <ellipse
                  cx={cx}
                  cy={cy + 2}
                  rx="10"
                  ry="8"
                  fill="#0D0D0D"
                />
              </>
            )}

            {/* Labels */}
            {showLabels && (
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                fill={isHighlighted ? '#FF0000' : '#000000'}
                fontSize="14"
                fontWeight={isHighlighted ? 'bold' : 'normal'}
                className="select-none"
              >
                {label}
              </text>
            )}

            {/* Highlight circle */}
            {isHighlighted && (
              <circle
                cx={cx}
                cy={cy}
                r="25"
                fill="none"
                stroke="#FF0000"
                strokeWidth="3"
                strokeDasharray="5,5"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="10"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
