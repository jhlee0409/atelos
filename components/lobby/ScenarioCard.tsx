'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ScenarioData } from '@/types';

interface ScenarioCardProps {
  scenario: ScenarioData;
}

export default function ScenarioCard({ scenario }: ScenarioCardProps) {
  const [imgSrc, setImgSrc] = useState(scenario.posterImageUrl);

  return (
    <div className="group cursor-pointer overflow-hidden rounded-lg bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-2xl">
      <div className="relative h-96 w-full">
        <Image
          src={imgSrc}
          alt={`${scenario.title} Poster`}
          layout="fill"
          objectFit="cover"
          onError={() => setImgSrc('/placeholder.jpg')}
          className="transition-opacity duration-300 group-hover:opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 p-4">
          <h3 className="text-xl font-bold">{scenario.title}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {scenario.coreKeywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
