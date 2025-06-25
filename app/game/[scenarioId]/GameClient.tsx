'use client';

import { useState, useEffect, useRef } from 'react';
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
  ScenarioFlag,
} from '@/types';
import { buildInitialDilemmaPrompt } from '@/lib/prompt-builder';
import { callGeminiAPI, parseGeminiJsonResponse } from '@/lib/gemini-client';
import { StatsBar } from '@/pages/client/GameClient/StatsBar';
import { ChatHistory } from '@/pages/client/GameClient/ChatHistory';
import { ChoiceButtons } from '@/pages/client/GameClient/ChoiceButtons';
import { SaveState, AIResponse, PlayerAction } from '@/types';
import { checkEndingConditions } from '@/lib/ending-checker';
import {
  generateFallbackInitialChoices,
  detectUrgency,
} from '@/lib/game-builder';

// --- Game Logic v2.0 ---

interface GameClientProps {
  scenario: ScenarioData;
}

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
        content: 'Day 1 시작 - 새로운 모험이 시작됩니다.',
        timestamp: Date.now() - 1, // 시놉시스보다 먼저 표시
      },
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
    console.log(scenarioStats, key, newSaveState.context.scenarioStats[key]);
    if (newSaveState.context.scenarioStats[key] !== undefined) {
      // 동적 증폭 시스템: 스탯의 현재 상태에 따라 변화량을 조절
      const currentValue = newSaveState.context.scenarioStats[key];
      const statDef = scenario.scenarioStats.find((s) => s.id === key);

      if (statDef) {
        const { min, max } = statDef;
        const range = max - min;
        const percentage = ((currentValue - min) / range) * 100;

        let amplificationFactor: number;

        // 스탯이 위험하거나 최대치에 가까울 때는 부드럽게 증폭
        if (percentage <= 25 || percentage >= 75) {
          amplificationFactor = 1.5;
        }
        // 스탯이 안정적인 중간 구간일 때는 크게 증폭하여 긴장감 조성
        else {
          amplificationFactor = 3.0;
        }

        const originalChange = scenarioStats[key];
        const amplifiedChange = Math.round(
          originalChange * amplificationFactor,
        );

        // 스탯이 범위를 벗어나지 않도록 안전장치 추가
        const newValue = currentValue + amplifiedChange;
        const clampedChange = Math.max(
          min - currentValue,
          Math.min(max - currentValue, amplifiedChange),
        );

        newSaveState.context.scenarioStats[key] += clampedChange;

        console.log(
          `📊 스탯 변화: ${key} | 원본: ${originalChange} | 증폭: ${amplifiedChange} | 실제 적용: ${clampedChange} | 현재 비율: ${percentage.toFixed(1)}%`,
        );
      } else {
        // 스탯 정의를 찾을 수 없는 경우 기본 증폭 적용
        const amplifiedChange = Math.round(scenarioStats[key] * 2.0);
        newSaveState.context.scenarioStats[key] += amplifiedChange;
      }
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

        // 날짜가 바뀔 때 채팅 히스토리에 시스템 메시지 추가
        newSaveState.chatHistory.push({
          type: 'system',
          content: `Day ${dayAfterUpdate} 시작 - 새로운 하루가 밝았습니다.`,
          timestamp: Date.now() + 1, // AI 메시지보다 1ms 늦게 설정하여 순서 보장
        });

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
  const [saveState, setSaveState] = useState<SaveState>(() =>
    createInitialSaveState(scenario),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggeredEnding, setTriggeredEnding] =
    useState<EndingArchetype | null>(null);
  const [isInitialDilemmaLoading, setIsInitialDilemmaLoading] = useState(true);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
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

  const isUrgent = detectUrgency(
    saveState.dilemma.choice_a,
    saveState.dilemma.choice_b,
  );

  return (
    <div className="flex h-screen w-full flex-col bg-black text-white">
      {/* Stats Bar */}
      <StatsBar
        scenario={scenario}
        saveState={saveState}
        isExpanded={isStatsExpanded}
        onToggle={() => setIsStatsExpanded(!isStatsExpanded)}
      />

      {/* Chat History - Takes up most of the screen */}
      <ChatHistory saveState={saveState} />

      {/* Sticky Choice Buttons - Always visible at bottom */}
      <ChoiceButtons
        isLoading={isLoading}
        error={error}
        saveState={saveState}
        isUrgent={isUrgent}
        handlePlayerChoice={handlePlayerChoice}
      />
    </div>
  );
}
