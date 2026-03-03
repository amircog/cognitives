'use client';
// Recognition is now handled within the main interleaved experiment (ensemble/page.tsx).
// This page simply redirects there.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecognitionRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/summaryStats/ensemble'); }, [router]);
  return null;
}
