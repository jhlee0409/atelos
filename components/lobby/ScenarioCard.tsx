'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ScenarioSummary } from '@/lib/firebase-scenarios';

interface ScenarioCardProps {
  scenario: ScenarioSummary;
}

export default function ScenarioCard({ scenario }: ScenarioCardProps) {
  const [imgSrc, setImgSrc] = useState(scenario.posterImageUrl);

  return (
    <div className="group cursor-pointer overflow-hidden border border-zinc-800 bg-zinc-900/20 transition-all duration-300 hover:border-red-900/50 hover:bg-zinc-900/50">
      <div className="relative h-80 w-full overflow-hidden">
        <Image
          src={imgSrc || '/placeholder.jpg'}
          alt={`${scenario.title} Poster`}
          layout="fill"
          objectFit="cover"
          onError={() => setImgSrc('/placeholder.jpg')}
          className="transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-telos-black via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <h3 className="font-serif text-xl font-bold text-white">
            {scenario.title}
          </h3>
        </div>
      </div>
      <div className="border-t border-zinc-800/50 p-4">
        <div className="flex flex-wrap gap-2">
          {scenario.coreKeywords?.map((keyword) => (
            <span
              key={keyword}
              className="border border-red-900/30 bg-red-950/20 px-2 py-1 text-xs font-semibold text-red-400"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
