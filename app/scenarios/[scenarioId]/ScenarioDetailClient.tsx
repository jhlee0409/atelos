'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ScenarioData, Character, Trait } from '@/types';

interface CastedCharacter extends Character {
  assignedTrait: Trait;
}

interface ScenarioDetailClientProps {
  scenario: ScenarioData;
}

/**
 * 플레이 가능한 캐릭터 목록을 반환
 * 1. playableCharacters 배열이 있으면 해당 캐릭터들
 * 2. isPlayable=true인 캐릭터들
 * 3. 둘 다 없으면 빈 배열 (기존 방식 유지 - 선택 불가)
 */
const getPlayableCharacters = (scenario: ScenarioData): Character[] => {
  // playableCharacters 배열이 설정되어 있으면 해당 캐릭터 ID로 필터
  if (scenario.playableCharacters && scenario.playableCharacters.length > 0) {
    return scenario.characters.filter((c) =>
      scenario.playableCharacters!.includes(c.roleId),
    );
  }
  // isPlayable 플래그로 필터
  const playableByFlag = scenario.characters.filter((c) => c.isPlayable);
  if (playableByFlag.length > 0) {
    return playableByFlag;
  }
  // 둘 다 없으면 빈 배열 (선택 UI 표시 안 함)
  return [];
};

/**
 * 기본 주인공 캐릭터 ID를 반환
 */
const getDefaultProtagonistId = (scenario: ScenarioData): string | null => {
  // defaultProtagonist 필드가 있으면 사용
  if (scenario.defaultProtagonist) {
    return scenario.defaultProtagonist;
  }
  // isDefaultProtagonist=true인 캐릭터 찾기
  const defaultChar = scenario.characters.find((c) => c.isDefaultProtagonist);
  if (defaultChar) {
    return defaultChar.roleId;
  }
  // 플레이 가능한 캐릭터 중 첫 번째
  const playable = getPlayableCharacters(scenario);
  if (playable.length > 0) {
    return playable[0].roleId;
  }
  return null;
};

export default function ScenarioDetailClient({
  scenario,
}: ScenarioDetailClientProps) {
  const [showCastingBoard, setShowCastingBoard] = useState(false);
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [selectedProtagonistId, setSelectedProtagonistId] = useState<string | null>(null);
  const [castedCharacters, setCastedCharacters] = useState<CastedCharacter[]>(
    [],
  );
  const [imgSrc, setImgSrc] = useState(scenario.posterImageUrl);

  // 플레이 가능한 캐릭터 목록
  const playableCharacters = useMemo(() => getPlayableCharacters(scenario), [scenario]);
  const hasPlayableSelection = playableCharacters.length > 0;

  // 기본 주인공 ID (선택 안 했을 때 사용)
  const defaultProtagonistId = useMemo(() => getDefaultProtagonistId(scenario), [scenario]);

  const handleStartStory = () => {
    // 플레이 가능한 캐릭터가 있으면 선택 화면으로
    if (hasPlayableSelection) {
      setSelectedProtagonistId(defaultProtagonistId);
      setShowCharacterSelection(true);
      return;
    }
    // 없으면 기존 플로우 (캐스팅 보드로 직행)
    proceedToCastingBoard();
  };

  const handleCharacterSelected = () => {
    proceedToCastingBoard();
  };

  const proceedToCastingBoard = () => {
    const { characters, traitPool } = scenario;

    // traitPool이 없거나 빈 경우 기본 특성 생성
    const buffs = traitPool?.buffs || [];
    const debuffs = traitPool?.debuffs || [];
    const allTraits = [...buffs, ...debuffs];

    // 특성이 없는 경우 기본 특성 제공
    const defaultTrait: Trait = {
      traitId: 'default',
      traitName: 'survivor',
      displayName: '생존자',
      type: 'positive',
      weightType: 'default',
      displayText: '극한의 상황에서도 포기하지 않는 의지를 가졌다.',
      systemInstruction: '생존 본능이 강하며 위기 상황에서 침착함을 유지한다.',
      iconUrl: '',
    };

    const newCastedCharacters = characters.map((char) => {
      // 특성 풀이 비어있으면 기본 특성 사용
      if (allTraits.length === 0) {
        return {
          ...char,
          assignedTrait: defaultTrait,
          currentTrait: defaultTrait,
        };
      }

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
    setShowCharacterSelection(false);
    setShowCastingBoard(true);
  };

  // 선택된 주인공 정보
  const selectedProtagonist = useMemo(() => {
    if (!selectedProtagonistId) return null;
    return playableCharacters.find((c) => c.roleId === selectedProtagonistId) || null;
  }, [selectedProtagonistId, playableCharacters]);

  // 캐릭터 선택 화면
  if (showCharacterSelection && hasPlayableSelection) {
    return (
      <>
        {/* Navigation */}
        <nav className="mb-12 flex items-center justify-between">
          <button
            onClick={() => setShowCharacterSelection(false)}
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

        {/* Character Selection */}
        <div className="text-center">
          <span className="mb-4 inline-block border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            Protagonist Selection
          </span>
          <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">
            플레이할 캐릭터 선택
          </h1>
          <div className="mx-auto my-6 h-1 w-20 bg-red-900" />
          <p className="text-lg text-zinc-400">
            어떤 캐릭터의 시점으로 이야기를 경험하시겠습니까?
          </p>

          {/* Character Selection Grid */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {playableCharacters.map((char) => {
              const isSelected = selectedProtagonistId === char.roleId;
              const isDefault = char.isDefaultProtagonist || char.roleId === defaultProtagonistId;
              return (
                <PlayableCharacterCard
                  key={char.roleId}
                  character={char}
                  isSelected={isSelected}
                  isDefault={isDefault}
                  onSelect={() => setSelectedProtagonistId(char.roleId)}
                />
              );
            })}
          </div>

          {/* Selected Character Info */}
          {selectedProtagonist && (
            <div className="mx-auto mt-8 max-w-2xl border border-zinc-700 bg-zinc-900/50 p-6 text-left">
              <h3 className="text-xl font-bold text-white">
                {selectedProtagonist.characterName}
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  ({selectedProtagonist.roleName})
                </span>
              </h3>
              <p className="mt-2 text-zinc-400">{selectedProtagonist.backstory}</p>
            </div>
          )}

          {/* Proceed Button */}
          <button
            onClick={handleCharacterSelected}
            disabled={!selectedProtagonistId}
            className="mt-10 border border-red-700 bg-red-900 px-12 py-4 text-xl font-bold text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-red-800 hover:shadow-[0_0_25px_rgba(127,29,29,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            이 캐릭터로 시작
          </button>
        </div>
      </>
    );
  }

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

            {/* Playable Characters Hint */}
            {hasPlayableSelection && (
              <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{playableCharacters.length}명의 플레이 가능한 캐릭터</span>
              </div>
            )}

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
          href={`/game/${scenario.scenarioId}${selectedProtagonistId ? `?protagonist=${selectedProtagonistId}` : ''}`}
          className="mt-12 inline-block border border-red-700 bg-red-900 px-12 py-4 text-xl font-bold text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-red-800 hover:shadow-[0_0_25px_rgba(127,29,29,0.6)]"
        >
          게임 시작하기
        </Link>
      </div>
    </>
  );
}

/**
 * 플레이 가능한 캐릭터 선택 카드 컴포넌트
 */
function PlayableCharacterCard({
  character,
  isSelected,
  isDefault,
  onSelect,
}: {
  character: Character;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(character.imageUrl);

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center border p-6 text-left transition-all duration-300 ${
        isSelected
          ? 'border-red-500 bg-red-950/30 ring-2 ring-red-500/50'
          : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50'
      }`}
    >
      {/* Default Badge */}
      {isDefault && (
        <span className="mb-2 self-start border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          추천
        </span>
      )}

      {/* Character Image */}
      <div
        className={`relative h-32 w-32 overflow-hidden rounded-full border-2 transition-all ${
          isSelected ? 'border-red-500' : 'border-zinc-700'
        }`}
      >
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
      <p className="mt-1 text-sm text-zinc-500">{character.roleName}</p>

      {/* Character Backstory Preview */}
      <p className="mt-2 line-clamp-2 text-center text-xs text-zinc-500">
        {character.backstory}
      </p>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="mt-4 flex items-center gap-1 text-sm text-red-400">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          선택됨
        </div>
      )}
    </button>
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
