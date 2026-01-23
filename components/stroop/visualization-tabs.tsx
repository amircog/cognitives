'use client';

import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  description: string;
}

interface VisualizationTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function VisualizationTabs({ tabs, activeTab, onTabChange }: VisualizationTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeTab === tab.id
              ? 'bg-emerald-400 text-zinc-900'
              : 'bg-card border border-border text-muted hover:text-foreground hover:border-emerald-400/50'
            }`}
        >
          {tab.label}
        </motion.button>
      ))}
    </div>
  );
}
