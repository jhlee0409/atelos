'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ScenarioData, Character, Trait } from '@/types';

interface CastedCharacter extends Character {
  assignedTrait: Trait;
}

interface ScenarioDetailClientProps {
  scenario: ScenarioData;
}

export default function ScenarioDetailClient({
  scenario,
}: ScenarioDetailClientProps) {
  const [showCastingBoard, setShowCastingBoard] = useState(false);
  const [castedCharacters, setCastedCharacters] = useState<CastedCharacter[]>(
    [],
  );
  const [imgSrc, setImgSrc] = useState(scenario.posterImageUrl);

  const handleStartStory = () => {
    const { characters, traitPool } = scenario;
    const allTraits = [...traitPool.buffs, ...traitPool.debuffs];

    const newCastedCharacters = characters.map((char) => {
      const possibleTraits = allTraits.filter((trait) =>
        char.weightedTraitTypes.includes(trait.weightType),
      );
      const randomTrait =
        possibleTraits[Math.floor(Math.random() * possibleTraits.length)] ||
        allTraits[Math.floor(Math.random() * allTraits.length)];
      return { ...char, assignedTrait: randomTrait };
    });

    setCastedCharacters(newCastedCharacters);
    setShowCastingBoard(true);
  };

  if (!showCastingBoard) {
    return (
      <div className="container mx-auto flex max-w-5xl flex-col items-center p-8 lg:flex-row lg:items-start">
        <div className="relative h-96 w-64 flex-shrink-0 lg:h-[32rem] lg:w-96">
          <Image
            src={imgSrc}
            alt={`${scenario.title} Poster`}
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
            onError={() => setImgSrc('/placeholder.jpg')}
          />
        </div>
        <div className="mt-8 flex flex-col items-center text-center lg:ml-12 lg:mt-0 lg:items-start lg:text-left">
          <h1 className="text-4xl font-bold">{scenario.title}</h1>
          <div className="my-4 flex flex-wrap justify-center gap-2 lg:justify-start">
            {scenario.coreKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-gray-700 px-3 py-1 text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-4 text-lg font-semibold text-yellow-400">
            [플레이어 목표]
          </p>
          <p className="text-gray-300">{scenario.playerGoal}</p>
          <p className="mt-6 text-lg font-semibold text-blue-400">[시놉시스]</p>
          <p className="mt-2 whitespace-pre-line text-gray-300">
            {scenario.synopsis}
          </p>
          <button
            onClick={handleStartStory}
            className="mt-8 rounded-lg bg-indigo-600 px-8 py-4 text-xl font-bold transition hover:bg-indigo-500"
          >
            이야기 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold">캐스팅 보드</h1>
      <p className="mt-2 text-lg text-gray-400">
        이번 이야기에서 각 인물은 다음 특성을 가집니다.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {castedCharacters.map((char) => (
          <CharacterCard key={char.roleId} character={char} />
        ))}
      </div>
      <Link
        href={`/game/${scenario.scenarioId}`}
        className="mt-12 inline-block rounded-lg bg-green-600 px-10 py-4 text-2xl font-bold transition hover:bg-green-500"
      >
        게임 시작하기
      </Link>
    </div>
  );
}

function CharacterCard({ character }: { character: CastedCharacter }) {
  const [imgSrc, setImgSrc] = useState(character.imageUrl);
  const traitColor =
    character.assignedTrait.type === '긍정'
      ? 'border-blue-500'
      : 'border-red-500';

  return (
    <div
      className={`flex flex-col items-center rounded-lg bg-gray-800 p-4 shadow-lg ${traitColor} border-2`}
    >
      <div className="relative h-40 w-40 rounded-full">
        <Image
          src={imgSrc}
          alt={character.characterName}
          layout="fill"
          objectFit="cover"
          className="rounded-full"
          onError={() => setImgSrc('/placeholder.jpg')}
        />
      </div>
      <h2 className="mt-4 text-2xl font-bold">{character.characterName}</h2>
      <div className="mt-4 w-full rounded-lg bg-gray-900 p-3 text-left">
        <h4
          className={`text-lg font-bold ${
            character.assignedTrait.type === '긍정'
              ? 'text-blue-400'
              : 'text-red-400'
          }`}
        >
          {character.assignedTrait.traitName}
        </h4>
        <p className="mt-1 text-sm text-gray-300">
          {character.assignedTrait.displayText}
        </p>
      </div>
    </div>
  );
}
