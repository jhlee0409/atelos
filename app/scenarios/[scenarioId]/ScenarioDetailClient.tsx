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

      return {
        ...char,
        assignedTrait: randomTrait,
        currentTrait: randomTrait,
      };
    });

    setCastedCharacters(newCastedCharacters);
    setShowCastingBoard(true);
  };

  if (!showCastingBoard) {
    return (
      <>
        {/* Navigation */}
        <nav className="mb-12 flex items-center justify-between">
          <Link
            href="/lobby"
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">라이브러리로 돌아가기</span>
          </Link>
          <Link
            href="/"
            className="font-serif text-xl font-black tracking-tighter text-white transition-colors hover:text-red-500"
          >
            ATELOS
          </Link>
        </nav>

        {/* Content */}
        <div className="flex flex-col items-center lg:flex-row lg:items-start lg:gap-16">
          {/* Poster */}
          <div className="relative h-96 w-64 flex-shrink-0 overflow-hidden border border-zinc-800 lg:h-[32rem] lg:w-80">
            <Image
              src={imgSrc}
              alt={`${scenario.title} Poster`}
              layout="fill"
              objectFit="cover"
              onError={() => setImgSrc('/placeholder.jpg')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-telos-black/60 via-transparent to-transparent" />
          </div>

          {/* Details */}
          <div className="mt-8 flex flex-col items-center text-center lg:mt-0 lg:items-start lg:text-left">
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">
              {scenario.title}
            </h1>
            <div className="my-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {scenario.coreKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="border border-red-900/30 bg-red-950/20 px-3 py-1 text-sm font-medium text-red-400"
                >
                  {keyword}
                </span>
              ))}
            </div>

            {/* Player Goal Section */}
            <div className="mt-4 w-full border-l-2 border-red-900 pl-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                Mission Objective
              </p>
              <p className="mt-2 text-lg text-zinc-300">{scenario.playerGoal}</p>
            </div>

            {/* Synopsis Section */}
            <div className="mt-8 w-full border-l-2 border-zinc-700 pl-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                Synopsis
              </p>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-zinc-400">
                {scenario.synopsis}
              </p>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartStory}
              className="mt-10 border border-red-700 bg-red-900 px-10 py-4 text-lg font-bold text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-red-800 hover:shadow-[0_0_25px_rgba(127,29,29,0.6)]"
            >
              이야기 시작
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Navigation */}
      <nav className="mb-12 flex items-center justify-between">
        <button
          onClick={() => setShowCastingBoard(false)}
          className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">시나리오 상세로 돌아가기</span>
        </button>
        <Link
          href="/"
          className="font-serif text-xl font-black tracking-tighter text-white transition-colors hover:text-red-500"
        >
          ATELOS
        </Link>
      </nav>

      {/* Casting Board */}
      <div className="text-center">
        <span className="mb-4 inline-block border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
          Character Assignment
        </span>
        <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">
          캐스팅 보드
        </h1>
        <div className="mx-auto my-6 h-1 w-20 bg-red-900" />
        <p className="text-lg text-zinc-400">
          이번 이야기에서 각 인물은 다음 특성을 가집니다
        </p>

        {/* Character Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {castedCharacters.map((char) => (
            <CharacterCard key={char.roleId} character={char} />
          ))}
        </div>

        {/* Start Game Button */}
        <Link
          href={`/game/${scenario.scenarioId}`}
          className="mt-12 inline-block border border-red-700 bg-red-900 px-12 py-4 text-xl font-bold text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-red-800 hover:shadow-[0_0_25px_rgba(127,29,29,0.6)]"
        >
          게임 시작하기
        </Link>
      </div>
    </>
  );
}

function CharacterCard({ character }: { character: CastedCharacter }) {
  const [imgSrc, setImgSrc] = useState(character.imageUrl);
  const isPositive = character.assignedTrait.type === 'positive';

  return (
    <div
      className={`flex flex-col items-center border bg-zinc-900/30 p-6 transition-all duration-300 hover:bg-zinc-900/50 ${
        isPositive ? 'border-zinc-700 hover:border-zinc-600' : 'border-red-900/50 hover:border-red-800/50'
      }`}
    >
      {/* Character Image */}
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-zinc-700">
        <Image
          src={imgSrc}
          alt={character.characterName}
          layout="fill"
          objectFit="cover"
          onError={() => setImgSrc('/placeholder.jpg')}
        />
      </div>

      {/* Character Name */}
      <h2 className="mt-4 font-serif text-xl font-bold text-white">
        {character.characterName}
      </h2>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
        {character.backstory}
      </p>

      {/* Trait Card */}
      <div className={`mt-4 w-full border-t p-3 text-left ${
        isPositive ? 'border-zinc-700 bg-zinc-900/50' : 'border-red-900/30 bg-red-950/20'
      }`}>
        <h4
          className={`text-sm font-bold ${
            isPositive ? 'text-zinc-300' : 'text-red-400'
          }`}
        >
          {character.assignedTrait.displayName || character.assignedTrait.traitName}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {character.assignedTrait.displayText}
        </p>
      </div>
    </div>
  );
}
