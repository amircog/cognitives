'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

function LockedContent() {
  const params      = useSearchParams();
  const experiment  = params.get('experiment') ?? '';

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Lock className="w-9 h-9 text-gray-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-gray-200">ניסוי זה נעול כרגע</h1>
          <p className="text-gray-500 text-sm">This experiment is currently locked.</p>
          <p className="text-gray-600 text-xs mt-3 leading-relaxed">
            אנא המתן להוראות המרצה
            <br />
            Please wait for the instructor&apos;s instructions.
          </p>
        </div>
        {experiment && (
          <p className="text-gray-700 text-xs font-mono">/{experiment}</p>
        )}
      </div>
    </main>
  );
}

export default function LockedPage() {
  return (
    <Suspense>
      <LockedContent />
    </Suspense>
  );
}
