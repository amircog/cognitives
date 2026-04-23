'use client';

import React from 'react';
import { Condition } from '@/types/composite-face';
import { CUT_FRAC, FACE_SIZE, OFFSETS } from '@/lib/composite-face/stimuli';

// ── Composite test face ──────────────────────────────────────────────────────
// Splits two face images at CUT_FRAC and joins them, with optional horizontal
// offset on the bottom half to simulate misalignment.

interface FaceDisplayProps {
  topSrc: string;
  bottomSrc: string;
  condition: Condition;
  size?: number;
}

export function FaceDisplay({ topSrc, bottomSrc, condition, size = FACE_SIZE }: FaceDisplayProps) {
  const topH    = Math.round(size * CUT_FRAC);
  const bottomH = size - topH;
  const offset  = Math.round(size * OFFSETS[condition]);

  return (
    <div style={{ display: 'inline-block', userSelect: 'none' }}>
      {/* Top half */}
      <div style={{ width: size, height: topH, overflow: 'hidden' }}>
        <img
          src={topSrc}
          draggable={false}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
        />
      </div>
      {/* Bottom half — shifted right for misaligned conditions */}
      <div style={{ width: size, height: bottomH, overflow: 'hidden', marginLeft: offset }}>
        <img
          src={bottomSrc}
          draggable={false}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block', marginTop: -topH }}
        />
      </div>
    </div>
  );
}

// ── Whole study face ─────────────────────────────────────────────────────────

interface StudyFaceProps {
  src: string;
  size?: number;
}

export function StudyFace({ src, size = FACE_SIZE }: StudyFaceProps) {
  return (
    <img
      src={src}
      draggable={false}
      style={{ width: size, height: size, objectFit: 'cover', display: 'block', userSelect: 'none' }}
    />
  );
}
