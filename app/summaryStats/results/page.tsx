'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, Home } from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Eye className="w-12 h-12 text-orange-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-3">Ensemble Perception</h1>
        <p className="text-gray-400 mb-8">Results are available in the Teacher Dashboard.</p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl border border-gray-600 transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
      </motion.div>
    </div>
  );
}
