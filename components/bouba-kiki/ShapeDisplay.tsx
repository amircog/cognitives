// Bouba-Kiki Shape Display Component
// SVG-based shapes (no external image files needed)

'use client';

import React from 'react';

interface ShapeDisplayProps {
  shapeId: string;
  size?: number;
  className?: string;
}

// Define rounded shapes (smooth, curved, blob-like)
const ROUNDED_SHAPES: Record<string, React.ReactElement> = {
  'rounded_01.png': (
    <ellipse cx="100" cy="100" rx="80" ry="60" fill="currentColor" />
  ),
  'rounded_02.png': (
    <circle cx="100" cy="100" r="70" fill="currentColor" />
  ),
  'rounded_03.png': (
    <path
      d="M 100 30 Q 160 50, 160 100 Q 160 150, 100 170 Q 40 150, 40 100 Q 40 50, 100 30"
      fill="currentColor"
    />
  ),
  'rounded_04.png': (
    <path
      d="M 100 40 C 140 40, 150 70, 150 100 C 150 130, 140 160, 100 160 C 60 160, 50 130, 50 100 C 50 70, 60 40, 100 40"
      fill="currentColor"
    />
  ),
  'rounded_05.png': (
    <ellipse cx="100" cy="100" rx="60" ry="80" fill="currentColor" />
  ),
  'rounded_06.png': (
    <path
      d="M 100 30 Q 150 30, 170 80 Q 170 120, 120 160 Q 80 160, 30 120 Q 30 80, 50 30 Q 70 30, 100 30"
      fill="currentColor"
    />
  ),
};

// Define spiky shapes (angular, sharp, jagged)
const SPIKY_SHAPES: Record<string, React.ReactElement> = {
  'spiky_01.png': (
    <polygon
      points="100,20 130,80 190,80 140,120 160,180 100,140 40,180 60,120 10,80 70,80"
      fill="currentColor"
    />
  ),
  'spiky_02.png': (
    <polygon
      points="100,30 120,90 180,90 130,130 150,190 100,150 50,190 70,130 20,90 80,90"
      fill="currentColor"
    />
  ),
  'spiky_03.png': (
    <path
      d="M 100 20 L 120 70 L 170 60 L 130 100 L 180 130 L 120 130 L 130 180 L 100 140 L 70 180 L 80 130 L 20 130 L 70 100 L 30 60 L 80 70 Z"
      fill="currentColor"
    />
  ),
  'spiky_04.png': (
    <polygon
      points="100,10 110,60 160,40 120,80 170,100 120,120 140,170 100,130 60,170 80,120 30,100 80,80 40,40 90,60"
      fill="currentColor"
    />
  ),
  'spiky_05.png': (
    <path
      d="M 100 30 L 115 75 L 165 75 L 125 105 L 140 150 L 100 120 L 60 150 L 75 105 L 35 75 L 85 75 Z"
      fill="currentColor"
    />
  ),
  'spiky_06.png': (
    <polygon
      points="100,25 108,65 145,55 115,85 155,105 115,125 125,165 100,135 75,165 85,125 45,105 85,85 55,55 92,65"
      fill="currentColor"
    />
  ),
};

export default function ShapeDisplay({ shapeId, size = 200, className = '' }: ShapeDisplayProps) {
  const isRounded = shapeId.startsWith('rounded');
  const shapes = isRounded ? ROUNDED_SHAPES : SPIKY_SHAPES;
  const shapeElement = shapes[shapeId];

  if (!shapeElement) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="text-gray-400">Shape not found</div>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`text-gray-800 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {shapeElement}
    </svg>
  );
}
