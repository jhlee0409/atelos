'use client';

import { useState, useEffect, useRef } from 'react';
import {
  generateGameResponse,
  validateGameResponse,
  getOptimalAISettings,
  generateInitialDilemma,
  cleanAndValidateAIResponse,
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
import {
  getStatIdByKorean,
  getKoreanStatName,
  getKoreanFlagName,
  getKoreanRoleName,
  getKoreanTraitName,
  getKoreanStatusName,
} from '@/constants/korean-english-mapping';

// --- Game Logic v2.0 ---

interface GameClientProps {
  scenario: ScenarioData;
}

const createInitialSaveState = (scenario: ScenarioData): SaveState => {
  const scenarioStats = scenario.scenarioStats.reduce(
    (acc, stat) => {
      acc[stat.id] = stat.initialValue ?? stat.current;
      return acc;
    },
    {} as { [key: string]: number },
  );

  const flags = scenario.flagDictionary.reduce(
    (acc, flag) => {
      acc[flag.flagName] = flag.initial;
      return acc;
    },
    {} as { [key: string]: boolean | number },
  );

  const hiddenRelationships = scenario.initialRelationships.reduce(
    (acc, rel) => {
      const key = `${rel.personA}-${rel.personB}`;
      acc[key] = rel.value;
      return acc;
    },
    {} as { [key: string]: number },
  );

  // 초기 캐릭터 특성 할당
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

  return {
    context: {
      scenarioId: scenario.scenarioId,
      scenarioStats,
      flags,
      currentDay: 1,
      remainingHours: (scenario.endCondition.value || 7) * 24,
    },
    community: {
      survivors: charactersWithTraits.map((c) => ({
        name: c.characterName,
        role: c.roleName,
        traits: c.currentTrait ? [c.currentTrait.traitName] : [],
        status: 'normal',
      })),
      hiddenRelationships,
    },
    log:
      `[Day 1] ${scenario.synopsis}` ||
      '게임이 시작되었습니다. 첫 번째 선택을 내려주세요.',
    chatHistory: [], // 새 게임 시 채팅 기록 초기화
    dilemma: {
      prompt: '... 로딩 중 ...',
      choice_a: '... 로딩 중 ...',
      choice_b: '... 로딩 중 ...',
    },
  };
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
  // 한국어 스탯 이름을 영어 ID로 매핑하는 함수 (개선된 버전)
  const mapStatNameToId = (
    statName: string,
    scenario: ScenarioData,
  ): string => {
    // 먼저 정확한 ID 매치 시도
    if (scenario.scenarioStats.find((s) => s.id === statName)) {
      return statName;
    }

    // 매핑 상수를 사용한 한국어 -> 영어 변환
    const mappedId = getStatIdByKorean(statName);
    if (mappedId && scenario.scenarioStats.find((s) => s.id === mappedId)) {
      console.log(`📝 스탯 매핑 (상수): "${statName}" -> "${mappedId}"`);
      return mappedId;
    }

    // 한국어 이름으로 매칭 시도 (기존 로직)
    const statByName = scenario.scenarioStats.find((s) => s.name === statName);
    if (statByName) {
      console.log(`📝 스탯 이름 매핑: "${statName}" -> "${statByName.id}"`);
      return statByName.id;
    }

    // 부분 매칭 시도 (한국어 이름이 포함된 경우)
    const statByPartialName = scenario.scenarioStats.find(
      (s) => s.name.includes(statName) || statName.includes(s.name),
    );
    if (statByPartialName) {
      console.log(
        `📝 스탯 부분 매핑: "${statName}" -> "${statByPartialName.id}"`,
      );
      return statByPartialName.id;
    }

    console.warn(
      `⚠️ 스탯 매핑 실패: "${statName}" - 사용 가능한 스탯:`,
      scenario.scenarioStats.map((s) => `${s.name}(${s.id})`),
    );
    return statName; // 매핑 실패 시 원래 이름 반환
  };

  for (const originalKey in scenarioStats) {
    const mappedKey = mapStatNameToId(originalKey, scenario);
    console.log(
      `🔄 스탯 처리: "${originalKey}" -> "${mappedKey}"`,
      scenarioStats[originalKey],
    );

    if (newSaveState.context.scenarioStats[mappedKey] !== undefined) {
      // 동적 증폭 시스템: 스탯의 현재 상태에 따라 변화량을 조절
      const currentValue = newSaveState.context.scenarioStats[mappedKey];
      const statDef = scenario.scenarioStats.find((s) => s.id === mappedKey);

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

        const originalChange = scenarioStats[originalKey];
        const amplifiedChange = Math.round(
          originalChange * amplificationFactor,
        );

        // 스탯이 범위를 벗어나지 않도록 안전장치 추가
        const newValue = currentValue + amplifiedChange;
        const clampedChange = Math.max(
          min - currentValue,
          Math.min(max - currentValue, amplifiedChange),
        );

        newSaveState.context.scenarioStats[mappedKey] += clampedChange;

        console.log(
          `📊 스탯 변화: ${mappedKey} | 원본: ${originalChange} | 증폭: ${amplifiedChange} | 실제 적용: ${clampedChange} | 현재 비율: ${percentage.toFixed(1)}%`,
        );
      } else {
        // 스탯 정의를 찾을 수 없는 경우 기본 증폭 적용
        const amplifiedChange = Math.round(scenarioStats[originalKey] * 2.0);
        newSaveState.context.scenarioStats[mappedKey] += amplifiedChange;
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
      // 다양한 플레이어 참조를 정규화하는 함수
      const normalizeName = (name: string) => {
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes('플레이어') ||
          lowerName.includes('리더') ||
          lowerName.includes('player') ||
          name === '나' ||
          name === '당신'
        ) {
          return '(플레이어)';
        }
        return name;
      };

      // pair 형식과 개별 필드 형식 모두 지원
      let personA: string, personB: string, value: number;

      if ('pair' in change && change.pair) {
        // "A-B" 형식 처리
        const [nameA, nameB] = change.pair.split('-');
        personA = normalizeName(nameA?.trim() || '');
        personB = normalizeName(nameB?.trim() || '');
        value = change.change || 0;
      } else if ('personA' in change && 'personB' in change) {
        // 개별 필드 형식 처리
        personA = normalizeName(change.personA || '');
        personB = normalizeName(change.personB || '');
        value = change.change || 0;
      } else {
        console.warn('⚠️ 비정상적인 관계도 데이터 형식 (무시됨):', change);
        return;
      }

      // personA와 personB가 유효한 이름인지, value가 숫자인지 확인
      if (
        personA &&
        personB &&
        personA !== personB &&
        typeof value === 'number' &&
        !isNaN(value)
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
    scenario.endCondition.type === 'time_limit' &&
    scenario.endCondition.unit === 'hours'
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
  const [isInitialDilemmaLoading, setIsInitialDilemmaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeredEnding, setTriggeredEnding] =
    useState<EndingArchetype | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [languageWarning, setLanguageWarning] = useState<string | null>(null);
  const initialDilemmaGenerated = useRef(false);
  const dilemmaGenerationInProgress = useRef(false); // 딜레마 생성 중복 방지

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [saveState.chatHistory]);

  // 초기 상태에서는 엔딩 체크를 하지 않음 - 게임이 시작된 후에만 엔딩 체크

  // 최초 딜레마 생성 로직
  useEffect(() => {
    // 이미 생성되었거나 생성 중이라면 중복 실행 방지
    if (initialDilemmaGenerated.current || dilemmaGenerationInProgress.current)
      return;

    // 엔딩이 이미 트리거된 상태라면 딜레마 생성하지 않음
    if (triggeredEnding) return;

    const generateAndSetDilemma = async () => {
      dilemmaGenerationInProgress.current = true; // 생성 시작 플래그 설정
      console.log('🤖 AI 초기 딜레마 생성을 시작합니다...');
      setIsInitialDilemmaLoading(true);
      setError(null);
      try {
        const initialState = createInitialSaveState(scenario);
        const aiSettings = getOptimalAISettings(1, 'medium', 0);
        const aiResponse = await generateInitialDilemma(
          initialState,
          scenario,
          aiSettings.useLiteVersion,
        );

        // 초기 딜레마도 언어 검증 및 정리
        const { cleanedResponse, hasLanguageIssues, languageIssues } =
          cleanAndValidateAIResponse(aiResponse);

        if (hasLanguageIssues) {
          console.warn('🌐 초기 딜레마 언어 문제 감지:', languageIssues);
          setLanguageWarning(
            `초기 설정에서 언어 문제가 감지되어 정리했습니다: ${languageIssues.join(', ')}`,
          );
          setTimeout(() => setLanguageWarning(null), 3000);
        }

        if (
          !validateGameResponse(
            cleanedResponse,
            scenario,
            aiSettings.useLiteVersion,
          )
        ) {
          // Fallback if AI response is invalid
          console.warn('AI 응답이 유효하지 않아, 폴백 딜레마를 생성합니다.');
          const fallbackCharacters = initialState.community.survivors.map(
            (c) => {
              const originalChar = scenario.characters.find(
                (char) => char.characterName === c.name,
              );
              return {
                roleId: c.role,
                roleName: c.role,
                characterName: c.name,
                backstory: originalChar?.backstory || '',
                imageUrl: originalChar?.imageUrl || '',
                weightedTraitTypes: originalChar?.weightedTraitTypes || [],
                currentTrait: null,
              };
            },
          );
          const fallbackDilemma = generateFallbackInitialChoices(
            scenario,
            fallbackCharacters,
          );
          setSaveState({
            ...initialState,
            dilemma: fallbackDilemma,
          });
        } else {
          // Valid AI response
          const updatedState = updateSaveState(
            initialState,
            cleanedResponse,
            scenario,
          );
          setSaveState(updatedState);
        }

        initialDilemmaGenerated.current = true; // 생성 완료 플래그 설정
        console.log('✅ AI 초기 딜레마 생성 성공!');
      } catch (err) {
        console.error('초기 딜레마 생성 오류:', err);
        setError(
          '초기 딜레마를 생성하는 데 실패했습니다. 폴백 선택지를 사용합니다.',
        );
        // Fallback on error
        const initialState = createInitialSaveState(scenario);
        const fallbackCharacters = initialState.community.survivors.map((c) => {
          const originalChar = scenario.characters.find(
            (char) => char.characterName === c.name,
          );
          return {
            roleId: c.role,
            roleName: c.role,
            characterName: c.name,
            backstory: originalChar?.backstory || '',
            imageUrl: originalChar?.imageUrl || '',
            weightedTraitTypes: originalChar?.weightedTraitTypes || [],
            currentTrait: null,
          };
        });
        const fallbackDilemma = generateFallbackInitialChoices(
          scenario,
          fallbackCharacters,
        );
        setSaveState({ ...initialState, dilemma: fallbackDilemma });
        initialDilemmaGenerated.current = true; // 오류 발생 시에도 플래그 설정하여 무한 루프 방지
      } finally {
        dilemmaGenerationInProgress.current = false; // 생성 완료 플래그 해제
        console.log('🔄 setIsInitialDilemmaLoading(false) 호출');
        setIsInitialDilemmaLoading(false);
      }
    };

    generateAndSetDilemma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.scenarioId, triggeredEnding]); // 시나리오 ID 변경 시 또는 엔딩 상태 변경 시 실행

  const handlePlayerChoice = async (choiceDetails: string) => {
    // 초기 딜레마 생성 전에는 선택 불가
    if (!initialDilemmaGenerated.current || isLoading) return;

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
      const aiSettings = getOptimalAISettings(
        newSaveState.context.currentDay || 1,
        'medium',
        0, // 초기 토큰 사용량
      );

      // 제미나이 API를 통한 게임 응답 생성
      const aiResponse = await generateGameResponse(
        newSaveState,
        playerAction,
        scenario,
        aiSettings.useLiteVersion,
      );

      // 언어 품질 추가 검증 (generateGameResponse에서 이미 처리되지만 추가 확인)
      const { cleanedResponse, hasLanguageIssues, languageIssues } =
        cleanAndValidateAIResponse(aiResponse);

      if (hasLanguageIssues) {
        console.warn('🌐 언어 문제 감지:', languageIssues);
        setLanguageWarning(
          `언어 혼용 문제가 감지되어 자동으로 정리했습니다: ${languageIssues.join(', ')}`,
        );
        // 3초 후 경고 메시지 자동 제거
        setTimeout(() => setLanguageWarning(null), 3000);
      } else {
        setLanguageWarning(null);
      }

      // 응답 검증 (정리된 응답 사용)
      if (
        !validateGameResponse(
          cleanedResponse,
          scenario,
          aiSettings.useLiteVersion,
        )
      ) {
        throw new Error('AI 응답이 유효하지 않습니다.');
      }

      const updatedSaveState = updateSaveState(
        newSaveState,
        cleanedResponse,
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

      let ending: EndingArchetype | null = null;
      const currentDay = updatedSaveState.context.currentDay || 1;

      // Day 5 이후에만 엔딩 조건 체크
      if (currentDay >= 5) {
        ending = checkEndingConditions(
          currentPlayerState,
          scenario.endingArchetypes,
        );

        if (ending) {
          console.log(
            `🎯 Day ${currentDay}에서 엔딩 조건 만족: ${ending.title}`,
          );
        }
      } else {
        console.log(
          `⏸️ Day ${currentDay} - 엔딩 체크 대기 중 (Day 5 이후 체크)`,
        );
      }

      // 시간제한 엔딩 조건 확인 (Day 7 완료 후 강제 엔딩)
      if (!ending && scenario.endCondition.type === 'time_limit') {
        const timeLimit = scenario.endCondition.value || 0;
        const currentDay = updatedSaveState.context.currentDay || 0;
        const currentHours =
          updatedSaveState.context.remainingHours || Infinity;

        const isTimeUp =
          scenario.endCondition.unit === 'days'
            ? currentDay > timeLimit // > 로 변경하여 Day 7 이후(Day 8)에서 엔딩 체크
            : currentHours <= 0;

        if (isTimeUp) {
          console.log(
            `⏰ 시간 제한 도달! Day ${currentDay}/${timeLimit} - 시간 제한 엔딩을 확인합니다.`,
          );

          // 먼저 일반적인 엔딩 조건 체크를 다시 시도 (더 관대한 조건으로)
          ending = checkEndingConditions(
            currentPlayerState,
            scenario.endingArchetypes,
          );

          // 여전히 엔딩이 없으면 시간 관련 엔딩 찾기
          if (!ending) {
            ending =
              scenario.endingArchetypes.find(
                (e) => e.endingId === 'ENDING_TIME_UP',
              ) || null;
          }

          // 마지막 수단: 기본 시간 초과 엔딩 생성
          if (!ending) {
            ending = {
              endingId: 'DEFAULT_TIME_UP',
              title: '결단의 시간',
              description:
                '7일의 시간이 흘렀다. 모든 결정과 희생이 이 순간을 위해 존재했다. 당신과 당신의 공동체는 이제 운명의 심판을 기다린다.',
              systemConditions: [],
              isGoalSuccess: false,
            };
          }
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
      {/* Language Warning Banner */}
      {languageWarning && (
        <div className="bg-yellow-600 px-4 py-2 text-center text-sm text-white">
          🌐 {languageWarning}
        </div>
      )}

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
        isLoading={isLoading || isInitialDilemmaLoading}
        error={error}
        saveState={saveState}
        isUrgent={isUrgent}
        handlePlayerChoice={handlePlayerChoice}
        isInitialLoading={isInitialDilemmaLoading}
      />
    </div>
  );
}
