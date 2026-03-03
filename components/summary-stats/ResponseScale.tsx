'use client';

import React, { useState } from 'react';
import { StimulusType, StatType } from '@/types/summary-stats';
import { SingleItemDisplay } from './ArrayDisplay';
import { sliderToValue, valueToSlider, VALUE_RANGES, STAT_LABELS } from '@/lib/summary-stats/stimuli';

interface ResponseScaleProps {
  stimulusType: StimulusType;
  statType: StatType;
  onConfirm: (value: number) => void;
  language: 'en' | 'he';
  previewSize?: number;
}

export default function ResponseScale({
  stimulusType,
  statType,
  onConfirm,
  language,
  previewSize = 200,
}: ResponseScaleProps) {
  const { min, max } = VALUE_RANGES[stimulusType];

  // Initialise slider at midpoint
  const initialSlider = stimulusType === 'line-orientations' ? 50 : 50;
  const [sliderPos, setSliderPos] = useState(initialSlider);

  const currentValue = sliderToValue(sliderPos, stimulusType);
  const label = STAT_LABELS[stimulusType][statType][language];

  // Unit labels for the slider
  const unitLabels: Record<StimulusType, { low: string; high: string }> = {
    'circles': {
      low: language === 'he' ? 'קטן' : 'Small',
      high: language === 'he' ? 'גדול' : 'Large',
    },
    'line-lengths': {
      low: language === 'he' ? 'קצר' : 'Short',
      high: language === 'he' ? 'ארוך' : 'Long',
    },
    'line-orientations': {
      low: language === 'he' ? 'שמאל' : 'Left',
      high: language === 'he' ? 'ימין' : 'Right',
    },
  };

  const confirmLabel = language === 'he' ? 'אישור' : 'Confirm';

  // For orientation, use -60..+60 range on the slider
  const sliderMin = stimulusType === 'line-orientations' ? 0 : 0;
  const sliderMax = 100;

  return (
    <div className={`flex flex-col items-center gap-6 ${language === 'he' ? 'rtl' : 'ltr'}`}>
      {/* Question */}
      <p className="text-lg font-semibold text-gray-200 text-center max-w-md px-4">
        {label}
      </p>

      {/* Live Preview */}
      <div className="relative">
        <SingleItemDisplay
          value={currentValue}
          stimulusType={stimulusType}
          size={previewSize}
          color="#f97316"
        />
      </div>

      {/* Slider – stable gray track, orange thumb, always LTR so direction doesn't flip gradient */}
      <div className="w-full max-w-md px-4">
        <style>{`
          .ss-slider::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#f97316;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}
          .ss-slider::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#f97316;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}
          .ss-slider::-webkit-slider-runnable-track{height:12px;border-radius:6px;background:#374151;}
          .ss-slider::-moz-range-track{height:12px;border-radius:6px;background:#374151;}
        `}</style>
        <div className="flex justify-between text-xs text-gray-400 mb-1" style={{ direction: 'ltr' }}>
          <span>{unitLabels[stimulusType].low}</span>
          <span>{unitLabels[stimulusType].high}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderPos}
          onChange={e => setSliderPos(Number(e.target.value))}
          className="ss-slider w-full appearance-none cursor-pointer"
          style={{ direction: 'ltr', height: '12px', borderRadius: '6px', background: '#374151' }}
        />
      </div>

      {/* Confirm Button */}
      <button
        onClick={() => onConfirm(currentValue)}
        className="px-10 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// FeedbackDisplay – shown during practice after response
// ──────────────────────────────────────────────

interface FeedbackProps {
  stimulusType: StimulusType;
  trueValue: number;
  responseValue: number;
  statType: StatType;
  language: 'en' | 'he';
  onNext: () => void;
}

export function FeedbackDisplay({
  stimulusType, trueValue, responseValue, statType, language, onNext,
}: FeedbackProps) {
  const absError = Math.abs(responseValue - trueValue).toFixed(1);
  const isGood = Math.abs(responseValue - trueValue) <= (VALUE_RANGES[stimulusType].max - VALUE_RANGES[stimulusType].min) * 0.15;

  const labels = {
    en: {
      yourAnswer: 'Your answer',
      trueValue: 'True value',
      error: `Error: ${absError}`,
      great: 'Great!',
      close: 'Close!',
      nextButton: 'Next Trial',
    },
    he: {
      yourAnswer: 'התשובה שלך',
      trueValue: 'ערך אמיתי',
      error: `שגיאה: ${absError}`,
      great: 'מצוין!',
      close: 'קרוב!',
      nextButton: 'ניסוי הבא',
    },
  };
  const t = labels[language];

  return (
    <div className={`flex flex-col items-center gap-6 ${language === 'he' ? 'rtl' : 'ltr'}`}>
      <div className={`text-2xl font-bold ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
        {isGood ? t.great : t.close}
      </div>
      <div className="text-orange-300 text-lg">{t.error}</div>

      {/* Side-by-side comparison */}
      <div className="flex gap-8 items-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 text-sm">{t.yourAnswer}</p>
          <SingleItemDisplay value={responseValue} stimulusType={stimulusType} size={150} color="#fb923c" />
        </div>
        <div className="text-3xl text-gray-500">vs</div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 text-sm">{t.trueValue}</p>
          <SingleItemDisplay value={trueValue} stimulusType={stimulusType} size={150} color="#34d399" />
        </div>
      </div>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition-colors"
      >
        {t.nextButton}
      </button>
    </div>
  );
}
