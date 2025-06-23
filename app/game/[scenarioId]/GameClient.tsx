'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  generateGameResponse,
  validateGameResponse,
  getOptimalAISettings,
} from '@/lib/game-ai-client';
import type {
  ScenarioData,
  Character,
  PlayerState,
  EndingArchetype,
  SystemCondition,
  ScenarioFlag,
} from '@/types';
import { buildInitialDilemmaPrompt } from '@/lib/prompt-builder';
import { callGeminiAPI, parseGeminiJsonResponse } from '@/lib/gemini-client';

// --- Locally Defined Types (to fix import errors) ---
export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
  };
  community: {
    survivors: {
      name: string;
      role: string;
      traits: string[];
      status: string;
    }[];
    hiddenRelationships: { [key: string]: number };
  };
  log: string;
  chatHistory: {
    type: 'system' | 'player' | 'ai';
    content: string;
    timestamp: number;
  }[];
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
}

export interface AIResponse {
  log: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
  statChanges: {
    scenarioStats: { [key: string]: number };
    survivorStatus: { name: string; newStatus: string }[];
    hiddenRelationships_change: any[]; // Type can be refined if needed
    flags_acquired: string[];
    shouldAdvanceTime?: boolean; // AI가 시간 진행 여부를 결정
  };
}

export interface PlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

export interface AvailableAction {
  actionId: string;
  description_for_ai: string;
}

// AI client functions are imported at the top

// --- Ending Check Utility (from simulation-utils) ---
// Placing it here because file creation failed.

const checkStatCondition = (
  condition: Extract<SystemCondition, { type: '필수 스탯' }>,
  stats: PlayerState['stats'],
): boolean => {
  const statValue = stats[condition.statId];
  if (statValue === undefined) return false;

  switch (condition.comparison) {
    case '>=':
      return statValue >= condition.value;
    case '<=':
      return statValue <= condition.value;
    case '==':
      return statValue === condition.value;
    default:
      return false;
  }
};

const checkFlagCondition = (
  condition: Extract<SystemCondition, { type: '필수 플래그' }>,
  flags: PlayerState['flags'],
): boolean => {
  const flagValue = flags[condition.flagName];
  // For boolean flags, we check for true. For count flags, we just check for existence and > 0.
  if (typeof flagValue === 'boolean') {
    return flagValue === true;
  } else if (typeof flagValue === 'number') {
    return flagValue > 0;
  }
  return false;
};

const checkEndingConditions = (
  playerState: PlayerState,
  endingArchetypes: EndingArchetype[],
): EndingArchetype | null => {
  for (const ending of endingArchetypes) {
    const allConditionsMet = ending.systemConditions.every((condition) => {
      if (condition.type === '필수 스탯') {
        return checkStatCondition(condition, playerState.stats);
      }
      if (condition.type === '필수 플래그') {
        return checkFlagCondition(condition, playerState.flags);
      }
      if (condition.type === '생존자 수') {
        return true; // Placeholder
      }
      return false;
    });

    if (allConditionsMet) {
      return ending;
    }
  }
  return null;
};

// --- Components ---

// 날짜 변경을 표시하는 컴포넌트
const DaySeparator = ({ day }: { day: number }) => (
  <div className="absolute left-0 top-0 z-10 flex h-10 w-full items-center bg-black">
    <div className="flex w-full items-center">
      <div className="flex-grow border-t border-gray-600"></div>
      <span className="mx-4 flex-shrink-0 text-sm font-bold text-gray-400">
        Day {day}
      </span>
      <div className="flex-grow border-t border-gray-600"></div>
    </div>
  </div>
);

const ChatMessage = ({
  message,
}: {
  message: {
    type: 'system' | 'player' | 'ai';
    content: string;
    timestamp: number;
  };
}) => {
  const getMessageStyle = () => {
    switch (message.type) {
      case 'system':
        return 'bg-gray-700/50 text-gray-300 border-l-4 border-gray-500';
      case 'player':
        return 'bg-blue-600/20 text-blue-200 border-l-4 border-blue-500 ml-8';
      case 'ai':
        return 'bg-purple-600/20 text-purple-200 border-l-4 border-purple-500 mr-8';
      default:
        return 'bg-gray-600/20 text-gray-300';
    }
  };

  const getMessagePrefix = () => {
    switch (message.type) {
      case 'system':
        return '[시스템]';
      case 'player':
        return '[나의 선택]';
      case 'ai':
        return '[상황 변화]';
      default:
        return '';
    }
  };

  return (
    <div className={cn('mb-4 rounded-lg p-4', getMessageStyle())}>
      <div className="mb-1 text-xs font-semibold opacity-70">
        {getMessagePrefix()}
      </div>
      <div className="whitespace-pre-wrap">{message.content}</div>
    </div>
  );
};

const StatDisplay = ({
  name,
  value,
  min,
  max,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
}) => {
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  let stateColor = 'bg-blue-500';
  let stateKeyword = '안정';
  if (percentage < 33) {
    stateColor = 'bg-red-600';
    stateKeyword = '위험';
  } else if (percentage < 66) {
    stateColor = 'bg-yellow-500';
    stateKeyword = '불안';
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-gray-400">{name}</span>
        <span
          className={cn('text-xs font-semibold', {
            'text-red-400': percentage < 33,
            'text-yellow-400': percentage >= 33 && percentage < 66,
            'text-blue-400': percentage >= 66,
          })}
        >
          {stateKeyword}
        </span>
      </div>
      <div className="h-1.5 w-full rounded bg-gray-700">
        <div
          className={cn('h-1.5 rounded', stateColor)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- Game Logic v2.0 ---

interface GameClientProps {
  scenario: ScenarioData;
}

// Helper to create the initial state from scenario data
// 기존의 동기 방식 함수 이름을 변경하여 폴백으로 사용
const generateFallbackInitialChoices = (
  scenario: ScenarioData,
  characters: Character[],
) => {
  let prompt = '';
  let choice_a = '';
  let choice_b = '';

  const criticalStats = scenario.scenarioStats.filter((stat) => {
    const percentage = (stat.current - stat.min) / (stat.max - stat.min);
    return percentage < 0.4;
  });

  const charactersByRole = characters.reduce(
    (acc, char) => {
      if (!acc[char.roleName]) acc[char.roleName] = [];
      acc[char.roleName].push(char);
      return acc;
    },
    {} as Record<string, Character[]>,
  );

  // 플레이어를 제외한 NPC들만으로 딜레마를 구성
  const npcs = characters.filter((char) => char.characterName !== '(플레이어)');

  // 2. 캐릭터 기반 초기 딜레마 생성 (NPC들 간의 갈등)
  // 2-1. NPC가 2명 이상일 때: 특성을 기반으로 한 갈등
  if (npcs.length >= 2) {
    const char1 = npcs[0];
    const char2 = npcs[1];

    const char1MainTrait =
      char1.currentTrait?.traitName || char1.weightedTraitTypes[0] || '신중함';
    const char2MainTrait =
      char2.currentTrait?.traitName ||
      char2.weightedTraitTypes[0] ||
      '실용주의';

    prompt = `${char1.characterName}은(는) "${char1MainTrait}" 특성을 바탕으로 한 해결책을, ${char2.characterName}은(는) "${char2MainTrait}"적인 관점에서 다른 방법을 제안했다. 두 의견이 팽팽하다. 리더인 나는 어떤 결정을 내려야 할까?`;
    choice_a = `${char1.characterName}의 제안을 받아들여, "${char1MainTrait}"을 우선으로 고려한다.`;
    choice_b = `${char2.characterName}의 손을 들어주어, "${char2MainTrait}"적인 가능성에 기대를 건다.`;
  }
  // 2-2. 위험한 스탯이 있을 때: 전문가의 과감한 제안 vs 안전
  else if (criticalStats.length > 0) {
    const criticalStat = criticalStats[0];
    const expertCharacter =
      npcs.find(
        (char) =>
          char.currentTrait?.traitName.includes('생존') ||
          char.currentTrait?.traitName.includes('기술') ||
          char.currentTrait?.traitName.includes('자원') ||
          char.weightedTraitTypes.some(
            (trait) =>
              trait.includes('생존') ||
              trait.includes('기술') ||
              trait.includes('자원'),
          ),
      ) || npcs[0];

    prompt = `${criticalStat.name} 수치가 위험 수준이다. ${expertCharacter.characterName}이(가) 자신의 전문성을 믿고 과감한 해결책을 제시했지만, 실패할 경우의 위험도 크다. 나는 어떤 결단을 내려야 할까?`;
    choice_a = `위험을 감수하고 ${expertCharacter.characterName}의 방식을 시도한다.`;
    choice_b = `안전을 우선하여, 더 신중한 방법을 찾아본다.`;
  }
  // 2-3. 역할 기반 갈등
  else if (Object.keys(charactersByRole).length > 1) {
    const roles = Object.keys(charactersByRole);
    const role1Characters = charactersByRole[roles[0]].filter(
      (c: Character) => c.characterName !== '(플레이어)',
    );
    const role2Characters = charactersByRole[roles[1]].filter(
      (c: Character) => c.characterName !== '(플레이어)',
    );

    if (role1Characters.length > 0 && role2Characters.length > 0) {
      const char1 = role1Characters[0];
      const char2 = role2Characters[0];
      prompt = `${char1.roleName}인 ${char1.characterName}과(와) ${char2.roleName}인 ${char2.characterName}이(가) 공동체의 다음 목표를 두고 다른 의견을 내고 있다. 둘 다 공동체를 위한 마음이지만, 방향이 다르다. 리더로서 나는 어느 길을 택해야 할까?`;
      choice_a = `${char1.characterName}의 의견에 따라, ${char1.roleName}의 역할을 우선시한다.`;
      choice_b = `${char2.characterName}의 말에 따라, ${char2.roleName}의 관점을 존중한다.`;
    } else {
      // 이 조건에 맞는 NPC가 없으면 기본 폴백으로
      prompt = `새로운 환경에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?`;
      choice_a = '내가 직접 안전한 거주지부터 확보한다';
      choice_b = '내가 직접 식량과 물자 수집을 시작한다';
    }
  }
  // 3. 기본 폴백: 직접 행동 결정
  else {
    prompt = `새로운 환경에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?`;
    choice_a = '내가 직접 안전한 거주지부터 확보한다';
    choice_b = '내가 직접 식량과 물자 수집을 시작한다';
  }

  return { prompt, choice_a, choice_b };
};

const createInitialSaveState = (scenario: ScenarioData): SaveState => {
  const {
    endCondition,
    synopsis,
    scenarioId,
    scenarioStats,
    characters,
    initialRelationships,
    flagDictionary,
    traitPool,
  } = scenario;

  // AI가 생성하기 전, 로딩 상태의 딜레마를 설정
  const initialDilemma = {
    prompt: '동료들의 의견을 종합하여, 첫 번째 결정을 내리는 중입니다...',
    choice_a: '상황 분석 중...',
    choice_b: '잠시만 기다려주세요...',
  };

  // 관계 데이터를 올바른 형태로 초기화 (키 정렬 추가)
  const hiddenRelationships: { [key: string]: number } = {};
  initialRelationships.forEach((rel) => {
    // 키는 항상 알파벳 순으로 정렬하여 일관성 유지
    const key = [rel.personA, rel.personB].sort().join('-');
    hiddenRelationships[key] = rel.value;
  });

  const initialState: SaveState = {
    context: {
      scenarioId,
      scenarioStats: scenarioStats.reduce(
        (acc, stat) => {
          acc[stat.id] = stat.current; // Use current value
          return acc;
        },
        {} as { [key: string]: number },
      ),
      flags: flagDictionary.reduce(
        (acc, flag) => {
          acc[flag.flagName] = flag.initial; // Use initial value
          return acc;
        },
        {} as { [key: string]: boolean | number },
      ),
      currentDay: 1, // 명시적으로 초기값 설정
    },
    community: {
      survivors: characters.map((char: Character) => ({
        name: char.characterName,
        role: char.roleName,
        traits: char.currentTrait
          ? [char.currentTrait.traitName]
          : char.weightedTraitTypes,
        status: '정상',
      })),
      hiddenRelationships, // 수정된 관계 데이터
    },
    log: synopsis, // Base log is the synopsis
    chatHistory: [
      {
        type: 'system',
        content: synopsis,
        timestamp: Date.now(),
      },
    ],
    dilemma: initialDilemma,
  };

  // Set time-based context based on EndCondition
  if (endCondition.type === '시간제한' && endCondition.unit === '시간') {
    initialState.context.remainingHours = endCondition.value;
    initialState.log = `남은 시간: ${endCondition.value}시간. ${synopsis}`;
  } else {
    // Default to day-based tracking for all other scenarios
    initialState.log = `[Day 1] ${synopsis}`;
  }

  return initialState;
};

// Mock AI API function removed - now using real Gemini API

// State updater function v2.0
const updateSaveState = (
  currentSaveState: SaveState,
  aiResponse: AIResponse,
  scenario: ScenarioData,
): SaveState => {
  const newSaveState = JSON.parse(JSON.stringify(currentSaveState));

  newSaveState.log = aiResponse.log;
  newSaveState.dilemma = aiResponse.dilemma;

  // Add AI response to chat history
  newSaveState.chatHistory.push({
    type: 'ai',
    content: aiResponse.log,
    timestamp: Date.now(),
  });

  const {
    scenarioStats,
    survivorStatus,
    flags_acquired,
    hiddenRelationships_change,
    shouldAdvanceTime,
  } = aiResponse.statChanges;

  for (const key in scenarioStats) {
    if (newSaveState.context.scenarioStats[key] !== undefined) {
      newSaveState.context.scenarioStats[key] += scenarioStats[key];
    }
  }

  survivorStatus.forEach((update: { name: string; newStatus: string }) => {
    const survivor = newSaveState.community.survivors.find(
      (s: { name: string }) => s.name === update.name,
    );
    if (survivor) {
      survivor.status = update.newStatus;
    }
  });

  // 관계도 업데이트 로직 강화
  if (hiddenRelationships_change && Array.isArray(hiddenRelationships_change)) {
    hiddenRelationships_change.forEach((change) => {
      // 역할명 '리더'를 플레이어 이름으로 교체하는 함수
      const normalizeName = (name: string) =>
        name === '리더' ? '(플레이어)' : name;

      let { personA, personB, change: value } = change;
      personA = normalizeName(personA);
      personB = normalizeName(personB);

      // personA와 personB가 유효한 이름인지, value가 숫자인지 확인
      if (
        personA &&
        personB &&
        personA !== personB &&
        typeof value === 'number'
      ) {
        // 키는 항상 알파벳 순으로 정렬하여 일관성 유지
        const key = [personA, personB].sort().join('-');
        if (newSaveState.community.hiddenRelationships[key] === undefined) {
          newSaveState.community.hiddenRelationships[key] = 0;
        }
        newSaveState.community.hiddenRelationships[key] += value;
        console.log(
          `🤝 관계도 변경: ${key} | 변화: ${value} | 현재: ${newSaveState.community.hiddenRelationships[key]}`,
        );
      } else {
        console.warn('⚠️ 비정상적인 관계도 데이터 수신 (무시됨):', change);
      }
    });
  }

  // Add new flags, preventing duplicates
  if (flags_acquired && flags_acquired.length > 0) {
    console.log('🏴 획득 플래그 처리 시작:', flags_acquired);
    flags_acquired.forEach((flag: string) => {
      if (newSaveState.context.flags[flag] === undefined) {
        const flagDef = scenario.flagDictionary.find(
          (f: ScenarioFlag) => f.flagName === flag,
        );
        if (flagDef?.type === 'count') {
          newSaveState.context.flags[flag] = 1;
        } else {
          newSaveState.context.flags[flag] = true;
        }
        console.log(
          `🚩 새로운 플래그 획득: ${flag} | 값: ${newSaveState.context.flags[flag]}`,
        );
      } else if (typeof newSaveState.context.flags[flag] === 'number') {
        (newSaveState.context.flags[flag] as number) += 1;
        console.log(
          `🚩 기존 플래그 카운트 증가: ${flag} | 값: ${newSaveState.context.flags[flag]}`,
        );
      }
    });
  }

  // 시간 진행 로직 개선
  if (
    scenario.endCondition.type === '시간제한' &&
    scenario.endCondition.unit === '시간'
  ) {
    // 시간 기반 시나리오 (기존 로직 유지)
    if (newSaveState.context.remainingHours !== undefined) {
      newSaveState.context.remainingHours -= 1;
      newSaveState.log = `[남은 시간: ${newSaveState.context.remainingHours}시간] ${aiResponse.log}`;
    }
  } else {
    // 날짜 기반 시나리오 - AI의 판단에 따라 날짜 진행
    // shouldAdvanceTime이 false가 아닐 경우 (true이거나 undefined일 경우) 시간을 진행시켜 호환성 유지
    const dayBeforeUpdate = newSaveState.context.currentDay || 1;
    let dayAfterUpdate = dayBeforeUpdate;

    if (shouldAdvanceTime !== false) {
      if (newSaveState.context.currentDay !== undefined) {
        newSaveState.context.currentDay += 1;
        dayAfterUpdate = newSaveState.context.currentDay;
        console.log(
          `⏳ 시간이 진행됩니다. Day ${dayBeforeUpdate} -> Day ${dayAfterUpdate}`,
        );
      }
    } else {
      console.log(`⏳ 시간 유지. Day ${dayBeforeUpdate} (변화 없음)`);
    }
    // 로그에 날짜 정보 포함 (시간이 흐르지 않아도 현재 날짜 표시)
    newSaveState.log = `[Day ${dayAfterUpdate}] ${aiResponse.log}`;
  }

  return newSaveState;
};

export default function GameClient({ scenario }: GameClientProps) {
  const isMobile = useIsMobile();
  const [saveState, setSaveState] = useState<SaveState>(() =>
    createInitialSaveState(scenario),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggeredEnding, setTriggeredEnding] =
    useState<EndingArchetype | null>(null);
  const [isInitialDilemmaLoading, setIsInitialDilemmaLoading] = useState(true);
  const initialDilemmaGenerated = useRef(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [saveState.chatHistory]);

  // Effect to check for endings on initial state (e.g. immediate failure/success)
  useEffect(() => {
    const initialPlayerState: PlayerState = {
      stats: saveState.context.scenarioStats,
      flags: saveState.context.flags,
      // These are not used in ending checks yet, but are part of the type
      traits: [],
      relationships: saveState.community.hiddenRelationships,
    };
    const ending = checkEndingConditions(
      initialPlayerState,
      scenario.endingArchetypes,
    );
    if (ending) {
      setTriggeredEnding(ending);
    }
  }, []); // Run only once on mount

  // AI를 통해 초기 딜레마를 동적으로 생성하는 useEffect
  useEffect(() => {
    const generateAndSetDilemma = async () => {
      // 초기 캐릭터 특성 할당 로직은 createInitialSaveState에서 가져와 여기서 처리
      const charactersWithTraits = scenario.characters.map((char) => {
        if (!char.currentTrait) {
          const allTraits = [
            ...scenario.traitPool.buffs,
            ...scenario.traitPool.debuffs,
          ];
          const possibleTraits = allTraits.filter((trait) =>
            char.weightedTraitTypes.includes(trait.weightType),
          );
          const randomTrait =
            possibleTraits[Math.floor(Math.random() * possibleTraits.length)] ||
            allTraits[Math.floor(Math.random() * allTraits.length)];
          return { ...char, currentTrait: randomTrait };
        }
        return char;
      });

      try {
        console.log('🤖 AI 초기 딜레마 생성을 시작합니다...');
        const systemPrompt = buildInitialDilemmaPrompt(
          scenario,
          charactersWithTraits,
        );
        const response = await callGeminiAPI({
          systemPrompt: systemPrompt,
          userPrompt:
            '제공된 컨텍스트를 바탕으로, 지침에 따라 플레이어의 첫 번째 딜레마를 JSON 형식으로 생성해주세요.',
        });
        const newDilemma = parseGeminiJsonResponse<{
          prompt: string;
          choice_a: string;
          choice_b: string;
        }>(response);

        setSaveState((prevState) => ({
          ...prevState,
          dilemma: newDilemma,
          // AI가 생성하는 동안 변경될 수 있는 다른 초기 상태도 여기서 최종 확정
          community: {
            ...prevState.community,
            survivors: charactersWithTraits.map((c) => ({
              name: c.characterName,
              role: c.roleName,
              traits: [c.currentTrait!.traitName],
              status: '정상',
            })),
          },
        }));
        console.log('✅ AI 초기 딜레마 생성 성공!');
      } catch (error) {
        console.error(
          '❌ AI 초기 딜레마 생성 실패, 폴백 로직을 사용합니다:',
          error,
        );
        const fallbackDilemma = generateFallbackInitialChoices(
          scenario,
          charactersWithTraits,
        );
        setSaveState((prevState) => ({
          ...prevState,
          dilemma: fallbackDilemma,
        }));
      } finally {
        setIsInitialDilemmaLoading(false);
      }
    };

    if (scenario && !initialDilemmaGenerated.current) {
      initialDilemmaGenerated.current = true;
      generateAndSetDilemma();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const handlePlayerChoice = async (choiceDetails: string) => {
    if (isInitialDilemmaLoading) return; // 로딩 중 선택 방지
    setIsLoading(true);
    setError(null);

    // Add player choice to chat history
    const newSaveState = { ...saveState };
    newSaveState.chatHistory.push({
      type: 'player',
      content: choiceDetails,
      timestamp: Date.now(),
    });
    setSaveState(newSaveState);

    // Generate a more descriptive action ID based on the choice content
    const actionId =
      choiceDetails === saveState.dilemma.choice_a ? 'choice_a' : 'choice_b';

    // Extract action type from choice for better AI understanding
    let actionType = 'general';
    if (
      choiceDetails.includes('공격') ||
      choiceDetails.includes('싸운') ||
      choiceDetails.includes('진압')
    ) {
      actionType = 'combat';
    } else if (
      choiceDetails.includes('치료') ||
      choiceDetails.includes('의료') ||
      choiceDetails.includes('부상')
    ) {
      actionType = 'medical';
    } else if (
      choiceDetails.includes('협상') ||
      choiceDetails.includes('대화') ||
      choiceDetails.includes('설득')
    ) {
      actionType = 'diplomacy';
    } else if (
      choiceDetails.includes('탐험') ||
      choiceDetails.includes('수색') ||
      choiceDetails.includes('찾아')
    ) {
      actionType = 'exploration';
    } else if (
      choiceDetails.includes('건설') ||
      choiceDetails.includes('방어') ||
      choiceDetails.includes('구축')
    ) {
      actionType = 'construction';
    } else if (
      choiceDetails.includes('자원') ||
      choiceDetails.includes('물자') ||
      choiceDetails.includes('수집')
    ) {
      actionType = 'resource';
    }

    const playerAction: PlayerAction = {
      actionId: `${actionType}_${actionId}`,
      actionDescription: choiceDetails,
      playerFeedback: `플레이어가 ${actionType} 타입의 행동을 선택했습니다.`,
    };

    try {
      // 비용 효율적인 AI 설정 가져오기
      const aiSettings = getOptimalAISettings();

      // 제미나이 API를 통한 게임 응답 생성
      const aiResponse = await generateGameResponse(
        newSaveState,
        playerAction,
        scenario,
        aiSettings.useLiteVersion,
      );

      // 응답 검증
      if (!validateGameResponse(aiResponse)) {
        throw new Error('AI 응답이 유효하지 않습니다.');
      }

      const updatedSaveState = updateSaveState(
        newSaveState,
        aiResponse,
        scenario,
      );
      setSaveState(updatedSaveState);

      console.log('🔄 상태 업데이트 완료, 엔딩 조건 확인 시작...');

      // Check for ending condition after state is updated
      const currentPlayerState: PlayerState = {
        stats: updatedSaveState.context.scenarioStats,
        flags: updatedSaveState.context.flags,
        traits: [],
        relationships: updatedSaveState.community.hiddenRelationships,
      };

      let ending = checkEndingConditions(
        currentPlayerState,
        scenario.endingArchetypes,
      );

      // 시간제한 엔딩 조건 확인
      if (!ending && scenario.endCondition.type === '시간제한') {
        const timeLimit = scenario.endCondition.value || 0;
        const isTimeUp =
          scenario.endCondition.unit === '일'
            ? (updatedSaveState.context.currentDay || 0) > timeLimit
            : (updatedSaveState.context.remainingHours || Infinity) <= 0;

        if (isTimeUp) {
          console.log('⏰ 시간 초과! 시간제한 엔딩을 확인합니다.');
          // "시간 초과"와 관련된 엔딩을 찾거나, 없으면 기본 엔딩을 생성
          ending = scenario.endingArchetypes.find((e) =>
            e.title.includes('시간'),
          ) || {
            endingId: 'TIME_UP',
            title: '시간 초과',
            description:
              '정해진 시간 안에 목표를 달성하지 못했습니다. 모든 것이 불확실한 상황 속에서, 당신의 공동체는 미래를 기약할 수 없게 되었습니다.',
            systemConditions: [],
          };
        }
      }

      if (ending) {
        console.log(`🎉 엔딩 발동! -> ${ending.title}`);
        setTriggeredEnding(ending);
      }
    } catch (err) {
      console.error('게임 AI 오류:', err);

      if (err instanceof Error) {
        if (err.message.includes('API 키')) {
          setError(
            '제미나이 API 키가 설정되지 않았거나 유효하지 않습니다. 환경 변수를 확인해주세요.',
          );
        } else if (
          err.message.includes('할당량') ||
          err.message.includes('QUOTA')
        ) {
          setError(
            '제미나이 API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.',
          );
        } else if (
          err.message.includes('요청 한도') ||
          err.message.includes('RATE_LIMIT')
        ) {
          setError('API 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(`AI 처리 오류: ${err.message}`);
        }
      } else {
        setError('AI 응답을 처리하는 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatValue = (statId: string) => {
    return saveState.context.scenarioStats[statId] ?? 0;
  };

  if (triggeredEnding) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <div className="mx-auto max-w-2xl rounded-lg bg-gray-900 p-8 text-center shadow-2xl">
          <h1 className="mb-4 text-4xl font-bold text-red-500">
            {triggeredEnding.title}
          </h1>
          <p className="text-lg text-gray-300">{triggeredEnding.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-black text-white">
      {/* Left Panel: Stats */}
      <aside
        className={cn(
          'flex-shrink-0 border-r border-gray-700 p-4',
          isMobile ? 'w-full' : 'w-80',
        )}
      >
        <h2 className="mb-4 text-lg font-bold text-white">상태</h2>
        <div className="space-y-4">
          {scenario.scenarioStats.map((stat) => (
            <StatDisplay
              key={stat.id}
              name={stat.name}
              value={getStatValue(stat.id)}
              min={stat.min}
              max={stat.max}
            />
          ))}
        </div>
      </aside>

      {/* Main Panel: Chat History */}
      <main className="relative flex flex-1 flex-col">
        <div id="chat-container" className="flex-1 overflow-y-auto px-4">
          <div className="container mx-auto mt-10 max-w-4xl">
            {saveState.chatHistory.map((message, index) => {
              const previousMessage = saveState.chatHistory[index - 1];
              let showDaySeparator = false;

              // 첫 메시지이거나, 이전 메시지와 날짜가 다를 경우 날짜 구분선 표시
              if (message.type === 'ai' && previousMessage) {
                const currentDay =
                  message.content.match(/\[Day (\d+)\]/)?.[1] ||
                  message.content.match(/남은 시간: (\d+)시간/)?.[1];
                const previousDay =
                  previousMessage.content.match(/\[Day (\d+)\]/)?.[1] ||
                  previousMessage.content.match(/남은 시간: (\d+)시간/)?.[1];

                if (currentDay && currentDay !== previousDay) {
                  showDaySeparator = true;
                }
              } else if (index === 0) {
                // 첫 시스템 메시지에 Day 1 표시
                showDaySeparator = true;
              }

              const dayMatch = message.content.match(/\[Day (\d+)\]/);
              const dayNumber = dayMatch
                ? parseInt(dayMatch[1], 10)
                : saveState.context.currentDay || 1;

              return (
                <Fragment key={message.timestamp}>
                  {showDaySeparator && <DaySeparator day={dayNumber} />}
                  <ChatMessage message={message} />
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Choice Window */}
        <footer className="flex-shrink-0 border-t border-gray-700 bg-gray-900/50 p-4 shadow-inner">
          <div className="container mx-auto max-w-4xl">
            {isLoading ? (
              <div className="text-center text-gray-400">
                AI가 다음 이야기를 생성 중입니다...
              </div>
            ) : error ? (
              <div className="text-center text-red-400">오류: {error}</div>
            ) : (
              <>
                <p className="mb-4 text-center text-lg text-yellow-300">
                  {saveState.dilemma.prompt}
                </p>
                <div
                  className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-2',
                  )}
                >
                  <button
                    onClick={() =>
                      handlePlayerChoice(saveState.dilemma.choice_a)
                    }
                    className="rounded-md bg-indigo-600 p-4 font-bold transition hover:bg-indigo-500"
                    disabled={isInitialDilemmaLoading}
                  >
                    {saveState.dilemma.choice_a}
                  </button>
                  <button
                    onClick={() =>
                      handlePlayerChoice(saveState.dilemma.choice_b)
                    }
                    className="rounded-md bg-indigo-600 p-4 font-bold transition hover:bg-indigo-500"
                    disabled={
                      isInitialDilemmaLoading || !saveState.dilemma.choice_b
                    }
                  >
                    {saveState.dilemma.choice_b}
                  </button>
                </div>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
