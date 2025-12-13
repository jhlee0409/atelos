'use client';

import { useState, useEffect, useRef } from 'react';
import {
  generateGameResponse,
  validateGameResponse,
  getOptimalAISettings,
  generateInitialDilemma,
  generateInitialDilemmaWithOpening,
  hasStoryOpening,
  cleanAndValidateAIResponse,
  createPlayerAction,
  resetSessionStats,
} from '@/lib/game-ai-client';
import type {
  ScenarioData,
  Character,
  PlayerState,
  EndingArchetype,
  ScenarioFlag,
  GameMode,
  DialogueTopic,
  ExplorationLocation,
} from '@/types';
import { buildInitialDilemmaPrompt } from '@/lib/prompt-builder';
import { callGeminiAPI, parseGeminiJsonResponse } from '@/lib/gemini-client';
import { StatsBar } from '@/components/client/GameClient/StatsBar';
import { ChatHistory } from '@/components/client/GameClient/ChatHistory';
import { ChoiceButtons } from '@/components/client/GameClient/ChoiceButtons';
import { SaveState, AIResponse, PlayerAction, ActionType, ActionRecord, ActionHistoryEntry, DynamicEndingResult } from '@/types';
import { checkEndingConditions } from '@/lib/ending-checker';
import {
  generateFallbackInitialChoices,
  detectUrgency,
} from '@/lib/game-builder';
import { CharacterDialoguePanel } from '@/components/client/GameClient/CharacterDialoguePanel';
import { ExplorationPanel } from '@/components/client/GameClient/ExplorationPanel';
import { TimelineProgress } from '@/components/client/GameClient/TimelineProgress';
import { DynamicEndingDisplay } from '@/components/client/GameClient/DynamicEndingDisplay';
import { generateDialogueResponse } from '@/lib/dialogue-generator';
import { generateExplorationResult } from '@/lib/exploration-generator';
import {
  createInitialContext,
  updateContextAfterExploration,
  updateContextAfterDialogue,
  updateContextAfterChoice,
  resetContextForNewDay,
  generateDynamicLocations,
  generateDynamicCharacters,
} from '@/lib/context-manager';
import {
  createInitialWorldState,
  processExploration,
  processEvents,
  advanceWorldStateToNewDay,
  getLocationsForUI,
  updateLocationStatus,
  addDiscoveredLocations,
} from '@/lib/world-state-manager';
import { canCheckEnding, getActionPointsPerDay } from '@/lib/gameplay-config';
import { calculateDynamicAPCost, getActionSynergy, type DynamicAPCost } from '@/lib/action-engagement-system';
import type { WorldState, WorldLocation } from '@/types';

// 레거시 폴백용 정적 매핑 (시나리오 데이터에서 매핑 실패 시에만 사용)
const LEGACY_STAT_MAPPING: Record<string, string> = {
  '도시 혼란도': 'cityChaos',
  '공동체 응집력': 'communityCohesion',
  '생존 기반': 'survivalFoundation',
  '산소 잔량': 'oxygenLevel',
  '함체 내구도': 'hullIntegrity',
  '정신력': 'crewSanity',
};

// --- Game Logic v2.0 ---

// =============================================================================
// 행동 게이지 시스템 상수 및 함수
// =============================================================================

/** 일일 기본 행동 포인트 (폴백용 - 시나리오별 설정은 getActionPointsPerDay 사용) */
const ACTION_POINTS_PER_DAY = 3;

/** 기본 행동 비용 (동적 비용 계산 실패 시 폴백) */
const DEFAULT_ACTION_COST = 1;

/**
 * 행동 포인트 소모 및 Day 전환 처리
 * 동적 AP 비용 시스템 적용 (신뢰도, 상황 기반)
 */
const consumeActionPoint = (
  currentSaveState: SaveState,
  scenario: ScenarioData,
  actionType: ActionType,
  target?: string,
  result?: ActionRecord['result']
): { newState: SaveState; shouldAdvanceDay: boolean; newDay?: number; apCostInfo?: DynamicAPCost } => {
  const newState: SaveState = JSON.parse(JSON.stringify(currentSaveState));
  const currentAP = newState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  const maxAP = newState.context.maxActionPoints ?? ACTION_POINTS_PER_DAY;
  const currentDay = newState.context.currentDay ?? 1;

  // 동적 AP 비용 계산
  const apCostInfo = calculateDynamicAPCost(actionType, currentSaveState, scenario, target);
  const cost = apCostInfo.adjustedCost;

  // 행동 기록 초기화 (없는 경우)
  if (!newState.context.actionsThisDay) {
    newState.context.actionsThisDay = [];
  }

  // 행동 기록 추가
  const actionRecord: ActionRecord = {
    actionType,
    timestamp: Date.now(),
    target,
    cost,
    day: currentDay,
    result,
  };
  newState.context.actionsThisDay.push(actionRecord);

  // AP 소모
  const newAP = currentAP - cost;
  newState.context.actionPoints = newAP;

  // 하위 호환성: turnsInCurrentDay도 동기화 (deprecated)
  newState.context.turnsInCurrentDay = (newState.context.turnsInCurrentDay ?? 0) + 1;

  // 동적 비용 정보 로깅
  const costDetail = apCostInfo.bonus ? `[${apCostInfo.reason}] ${apCostInfo.bonus}` : `[${apCostInfo.reason}]`;
  console.log(`⚡ AP 소모: ${actionType} | ${currentAP} -> ${newAP} (비용: ${cost}) ${costDetail}`);

  // Day 전환 체크
  const shouldAdvanceDay = newAP <= 0;

  if (shouldAdvanceDay) {
    const newDay = currentDay + 1;
    newState.context.currentDay = newDay;
    // Day 전환 시 maxAP로 충전 (시나리오별 설정 값 사용)
    newState.context.actionPoints = maxAP;
    // maxActionPoints는 유지 (초기화 시 설정된 시나리오별 값)
    newState.context.actionsThisDay = [];
    newState.context.turnsInCurrentDay = 0; // 하위 호환성

    // 맥락 연결 시스템: Day 전환 시 오늘 행동 리셋 (단서는 유지)
    if (newState.context.actionContext) {
      newState.context.actionContext = resetContextForNewDay(
        newState.context.actionContext,
        newDay
      );
      console.log(`📝 맥락 리셋: Day ${newDay}로 전환 (발견한 단서는 유지됨)`);
    }

    // 동적 월드 시스템: Day 전환 시 이벤트 처리
    if (newState.context.worldState) {
      const worldResult = advanceWorldStateToNewDay(
        newState.context.worldState,
        newDay,
        newState
      );
      newState.context.worldState = worldResult.worldState;

      // 월드 이벤트 알림
      if (worldResult.notifications.length > 0) {
        console.log(`🌍 월드 이벤트:`, worldResult.notifications);
      }
    }

    // Day 전환 시스템 메시지 (몰입감 있는 형식)
    newState.chatHistory.push({
      type: 'system',
      content: `Day ${newDay}`,
      timestamp: Date.now(),
    });

    console.log(`🌅 Day 전환: Day ${currentDay} -> Day ${newDay}`);

    return { newState, shouldAdvanceDay: true, newDay, apCostInfo };
  }

  return { newState, shouldAdvanceDay: false, apCostInfo };
};

/**
 * 현재 AP 부족 여부 체크 (동적 비용 적용)
 */
const hasInsufficientAP = (
  saveState: SaveState,
  actionType: ActionType,
  scenario?: ScenarioData,
  target?: string
): boolean => {
  const currentAP = saveState.context.actionPoints ?? ACTION_POINTS_PER_DAY;
  // 시나리오가 있으면 동적 비용 계산, 없으면 기본 비용 사용
  const cost = scenario
    ? calculateDynamicAPCost(actionType, saveState, scenario, target).adjustedCost
    : DEFAULT_ACTION_COST;
  return currentAP < cost;
};

/**
 * 초기 만난 캐릭터 목록 생성 (storyOpening 설정 기반)
 *
 * characterIntroductionStyle에 따라:
 * - 'gradual': 첫 번째 캐릭터만 (천천히 소개)
 * - 'immediate': 모든 캐릭터 (즉시 소개)
 * - 'contextual': firstCharacterToMeet만 (기본값)
 *
 * @param scenario 시나리오 데이터
 * @returns 초기에 만난 캐릭터 이름 배열
 */
const getInitialMetCharacters = (scenario: ScenarioData): string[] => {
  const storyOpening = scenario.storyOpening;
  const introStyle = storyOpening?.characterIntroductionStyle || 'contextual';
  const introSequence = storyOpening?.characterIntroductionSequence;
  const firstCharacter = storyOpening?.firstCharacterToMeet;

  // 1. 'immediate' 스타일: 모든 캐릭터를 즉시 만남
  if (introStyle === 'immediate') {
    if (introSequence && introSequence.length > 0) {
      return introSequence
        .sort((a, b) => a.order - b.order)
        .map((s) => s.characterName);
    }
    // introSequence가 없으면 모든 NPC
    const npcs = scenario.characters.filter((c) => c.characterName !== '(플레이어)');
    return npcs.map((c) => c.characterName);
  }

  // 2. 'gradual' 스타일: 첫 번째 캐릭터만 (나머지는 게임 진행 중 추가)
  if (introStyle === 'gradual' && introSequence && introSequence.length > 0) {
    const firstInSequence = introSequence.find((s) => s.order === 1);
    if (firstInSequence) {
      return [firstInSequence.characterName];
    }
  }

  // 3. 'contextual' 또는 기본: firstCharacterToMeet 사용
  if (firstCharacter) {
    return [firstCharacter];
  }

  // 4. 폴백: 첫 번째 NPC 캐릭터
  const npcs = scenario.characters.filter((c) => c.characterName !== '(플레이어)');
  return npcs.length > 0 ? [npcs[0].characterName] : [];
};

/**
 * 초기 survivors 목록 생성 (만난 캐릭터만 포함)
 */
const getInitialSurvivors = (
  scenario: ScenarioData,
  charactersWithTraits: typeof scenario.characters
): { name: string; role: string; traits: string[]; status: string }[] => {
  const metCharacters = getInitialMetCharacters(scenario);

  return charactersWithTraits
    .filter((c) => metCharacters.includes(c.characterName))
    .map((c) => ({
      name: c.characterName,
      role: c.roleName,
      traits: c.currentTrait ? [c.currentTrait.displayName || c.currentTrait.traitName] : [],
      status: 'normal',
    }));
};

/**
 * 캐릭터 소개 시퀀스에서 다음에 만날 캐릭터 가져오기
 *
 * 'gradual' 스타일에서 게임 진행 중 순차적으로 캐릭터를 소개할 때 사용
 * 이미 만난 캐릭터를 건너뛰고 다음 순서의 캐릭터를 반환
 *
 * @param scenario 시나리오 데이터
 * @param metCharacters 이미 만난 캐릭터 목록
 * @returns 다음에 만날 캐릭터 정보 또는 null
 */
const getNextCharacterToIntroduce = (
  scenario: ScenarioData,
  metCharacters: string[]
): { characterName: string; encounterContext: string; order: number } | null => {
  const introSequence = scenario.storyOpening?.characterIntroductionSequence;

  if (!introSequence || introSequence.length === 0) {
    return null;
  }

  // 순서대로 정렬 후 아직 만나지 않은 첫 캐릭터 찾기
  const sortedSequence = [...introSequence].sort((a, b) => a.order - b.order);

  for (const intro of sortedSequence) {
    if (!metCharacters.includes(intro.characterName)) {
      return {
        characterName: intro.characterName,
        encounterContext: intro.encounterContext,
        order: intro.order,
      };
    }
  }

  return null; // 모든 캐릭터를 이미 만남
};

/**
 * NPC 관계의 가시성 상태 업데이트
 *
 * 플레이어가 특정 관계를 발견했을 때 가시성 변경
 *
 * @param currentStates 현재 관계 상태 배열
 * @param relationId 업데이트할 관계 ID
 * @param newVisibility 새 가시성 ('hinted' | 'revealed')
 * @returns 업데이트된 상태 배열
 */
const updateNPCRelationshipVisibility = (
  currentStates: { relationId: string; visibility: string }[],
  relationId: string,
  newVisibility: 'hinted' | 'revealed'
): { relationId: string; visibility: string }[] => {
  return currentStates.map((state) =>
    state.relationId === relationId
      ? { ...state, visibility: newVisibility }
      : state
  );
};

// =============================================================================

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

  // @deprecated - flags system removed, kept empty for backwards compatibility
  const flags: { [key: string]: boolean | number } = {};

  const hiddenRelationships = scenario.initialRelationships.reduce(
    (acc, rel) => {
      const key = `${rel.personA}-${rel.personB}`;
      acc[key] = rel.value;
      return acc;
    },
    {} as { [key: string]: number },
  );

  // 초기 캐릭터 특성 할당
  const buffs = scenario.traitPool?.buffs || [];
  const debuffs = scenario.traitPool?.debuffs || [];
  const allTraits = [...buffs, ...debuffs];

  // 특성이 없는 경우 기본 특성 제공
  const defaultTrait = {
    traitId: 'default',
    traitName: 'survivor',
    displayName: '생존자',
    type: 'positive' as const,
    weightType: 'default',
    displayText: '극한의 상황에서도 포기하지 않는 의지를 가졌다.',
    systemInstruction: '생존 본능이 강하며 위기 상황에서 침착함을 유지한다.',
    iconUrl: '',
  };

  const charactersWithTraits = scenario.characters.map((char) => {
    if (!char.currentTrait) {
      // 특성 풀이 비어있으면 기본 특성 사용
      if (allTraits.length === 0) {
        return { ...char, currentTrait: defaultTrait };
      }

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

  // 시나리오별 Action Points 설정 가져오기
  const actionPointsPerDay = getActionPointsPerDay(scenario);

  // 초기 ActionContext 생성 (맥락 연결 시스템)
  const initialActionContext = createInitialContext(scenario, {
    context: {
      scenarioId: scenario.scenarioId,
      scenarioStats,
      flags,
      currentDay: 1,
      remainingHours: (scenario.endCondition.value || 7) * 24,
      turnsInCurrentDay: 0,
      actionPoints: actionPointsPerDay,
      maxActionPoints: actionPointsPerDay,
      actionsThisDay: [],
    },
    community: {
      survivors: [],
      hiddenRelationships,
    },
    log: '',
    chatHistory: [],
    dilemma: { prompt: '', choice_a: '', choice_b: '' },
  });

  // 초기 WorldState 생성 (동적 월드 시스템)
  const initialWorldState = createInitialWorldState(scenario, 1);

  return {
    context: {
      scenarioId: scenario.scenarioId,
      scenarioStats,
      flags,
      currentDay: 1,
      remainingHours: (scenario.endCondition.value || 7) * 24,
      turnsInCurrentDay: 0, // @deprecated - 하위 호환성 유지
      // 행동 게이지 시스템 초기화 (시나리오별 설정 사용)
      actionPoints: actionPointsPerDay,
      maxActionPoints: actionPointsPerDay,
      actionsThisDay: [],
      // 맥락 연결 시스템 초기화
      actionContext: initialActionContext,
      // 동적 월드 시스템 초기화
      worldState: initialWorldState,

      // =======================================================================
      // [2025 Enhanced] 주인공 지식 시스템
      // 게임 진행 중 주인공이 알게 되는 정보를 추적
      // =======================================================================
      protagonistKnowledge: {
        metCharacters: getInitialMetCharacters(scenario),
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [],
        // 시나리오에서 정의한 초기 지식 병합
        ...scenario.storyOpening?.initialProtagonistKnowledge,
      },

      // =======================================================================
      // [2025 Enhanced] 숨겨진 NPC 관계 가시성 추적
      // 플레이어가 아직 발견하지 못한 NPC 간의 관계를 추적
      // AI 프롬프트에서 "이 관계는 아직 비밀" 등으로 활용
      // =======================================================================
      npcRelationshipStates:
        scenario.storyOpening?.hiddenNPCRelationships?.map((rel) => ({
          relationId: rel.relationId,
          visibility: rel.visibility || 'hidden',
        })) || [],

      // =======================================================================
      // [2025 Enhanced] 이머전트 내러티브 트리거 추적
      // 발동된 스토리 이벤트 ID를 기록하여 중복 발동 방지
      // =======================================================================
      triggeredStoryEvents: [],
    },
    community: {
      // 처음에는 만난 캐릭터만 survivors에 포함 (나머지는 스토리 진행 중 추가)
      survivors: getInitialSurvivors(scenario, charactersWithTraits),
      hiddenRelationships,
    },
    log: scenario.synopsis
      ? `[Day 1] ${scenario.synopsis}`
      : '게임이 시작되었습니다. 첫 번째 선택을 내려주세요.',
    chatHistory: [], // 새 게임 시 채팅 기록 초기화
    dilemma: {
      prompt: '... 로딩 중 ...',
      choice_a: '... 로딩 중 ...',
      choice_b: '... 로딩 중 ...',
    },
    // 캐릭터 아크 초기화
    characterArcs: charactersWithTraits
      .filter((c) => c.characterName !== '(플레이어)')
      .map((c) => ({
        characterName: c.characterName,
        moments: [],
        currentMood: 'anxious' as const,
        trustLevel: 0,
      })),
    // 회상 시스템 - 주요 결정 기록 초기화
    keyDecisions: [],
  };
};

// Mock AI API function removed - now using real Gemini API

/**
 * 캐릭터 이름 쌍을 파싱하는 헬퍼 함수
 * "A-B" 형식의 문자열에서 두 캐릭터 이름을 추출합니다.
 * 캐릭터 이름에 하이픈이 포함될 수 있으므로, 알려진 캐릭터 이름과 매칭하여 파싱합니다.
 */
const parseCharacterPair = (
  pairStr: string,
  knownCharacterNames: string[],
): { personA: string; personB: string } | null => {
  // 먼저 알려진 캐릭터 이름으로 매칭 시도
  for (const nameA of knownCharacterNames) {
    if (pairStr.startsWith(nameA + '-')) {
      const remaining = pairStr.slice(nameA.length + 1);
      // 나머지 부분도 알려진 캐릭터 이름인지 확인
      if (knownCharacterNames.includes(remaining)) {
        return { personA: nameA, personB: remaining };
      }
      // 나머지 부분이 알려진 이름이 아니어도 비어있지 않으면 사용
      if (remaining.length > 0) {
        return { personA: nameA, personB: remaining };
      }
    }
  }

  // 알려진 이름으로 매칭 실패 시, 기본 하이픈 분할 (첫 번째 하이픈 기준)
  const firstDashIndex = pairStr.indexOf('-');
  if (firstDashIndex === -1) return null;

  const personA = pairStr.slice(0, firstDashIndex).trim();
  const personB = pairStr.slice(firstDashIndex + 1).trim();

  if (!personA || !personB) return null;
  return { personA, personB };
};

// 변화 추적용 타입
import type {
  StatChangeRecord,
  RelationshipChangeRecord,
  ChangeSummaryData,
} from '@/types';

// State updater function v2.0
const updateSaveState = (
  currentSaveState: SaveState,
  aiResponse: AIResponse,
  scenario: ScenarioData,
): SaveState => {
  const newSaveState = JSON.parse(JSON.stringify(currentSaveState));

  // 변화 추적 배열 초기화
  const trackedStatChanges: StatChangeRecord[] = [];
  const trackedRelationshipChanges: RelationshipChangeRecord[] = [];
  const trackedFlagsAcquired: string[] = [];

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
    locations_discovered,
  } = aiResponse.statChanges;

  // 시나리오에서 알려진 캐릭터 이름 목록 생성 (관계 파싱에 사용)
  const knownCharacterNames = scenario.characters.map((c) => c.characterName);

  // 한국어 스탯 이름을 영어 ID로 매핑하는 함수 (시나리오 데이터 우선)
  const mapStatNameToId = (
    statName: string,
    scenario: ScenarioData,
  ): string => {
    // 1. 정확한 ID 매치 시도 (이미 영어 ID인 경우)
    if (scenario.scenarioStats.find((s) => s.id === statName)) {
      return statName;
    }

    // 2. 시나리오 데이터 기반: 한국어 이름으로 매칭 (우선!)
    const statByName = scenario.scenarioStats.find((s) => s.name === statName);
    if (statByName) {
      console.log(`📝 스탯 이름 매핑: "${statName}" -> "${statByName.id}"`);
      return statByName.id;
    }

    // 3. 부분 매칭 시도 (한국어 이름이 포함된 경우)
    const statByPartialName = scenario.scenarioStats.find(
      (s) => s.name.includes(statName) || statName.includes(s.name),
    );
    if (statByPartialName) {
      console.log(
        `📝 스탯 부분 매핑: "${statName}" -> "${statByPartialName.id}"`,
      );
      return statByPartialName.id;
    }

    // 4. 폴백: 정적 매핑 상수 사용 (레거시 호환)
    const mappedId = LEGACY_STAT_MAPPING[statName];
    if (mappedId && scenario.scenarioStats.find((s) => s.id === mappedId)) {
      console.log(`📝 스탯 매핑 (폴백 상수): "${statName}" -> "${mappedId}"`);
      return mappedId;
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

        // 스탯이 위험하거나 최대치에 가까울 때는 최소한의 증폭
        if (percentage <= 25 || percentage >= 75) {
          amplificationFactor = 1.2;
        }
        // 스탯이 안정적인 중간 구간일 때는 적당히 증폭하여 긴장감 조성
        else {
          amplificationFactor = 2.0;
        }

        const originalChange = scenarioStats[originalKey];
        const amplifiedChange = Math.round(
          originalChange * amplificationFactor,
        );

        // 스탯이 범위를 벗어나지 않도록 안전장치 추가
        const clampedChange = Math.max(
          min - currentValue,
          Math.min(max - currentValue, amplifiedChange),
        );

        const previousValue = currentValue;
        newSaveState.context.scenarioStats[mappedKey] += clampedChange;
        const newValue = newSaveState.context.scenarioStats[mappedKey];

        // 변화 추적 기록
        if (clampedChange !== 0) {
          trackedStatChanges.push({
            statId: mappedKey,
            statName: statDef.name,
            originalChange,
            amplifiedChange,
            appliedChange: clampedChange,
            previousValue,
            newValue,
          });
        }

        console.log(
          `📊 스탯 변화: ${mappedKey} | 원본: ${originalChange} | 증폭: ${amplifiedChange} | 실제 적용: ${clampedChange} | 현재 비율: ${percentage.toFixed(1)}%`,
        );
      } else {
        // 스탯 정의를 찾을 수 없는 경우 기본 증폭 적용
        const previousValue = newSaveState.context.scenarioStats[mappedKey];
        const amplifiedChange = Math.round(scenarioStats[originalKey] * 2.0);
        newSaveState.context.scenarioStats[mappedKey] += amplifiedChange;
        const newValue = newSaveState.context.scenarioStats[mappedKey];

        if (amplifiedChange !== 0) {
          trackedStatChanges.push({
            statId: mappedKey,
            statName: mappedKey,
            originalChange: scenarioStats[originalKey],
            amplifiedChange,
            appliedChange: amplifiedChange,
            previousValue,
            newValue,
          });
        }
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

      // 문자열 형식 처리 (예: "박준경-한서아:-5 (갈등 심화)")
      if (typeof change === 'string') {
        // 패턴 1: "이름-이름:숫자" 또는 "이름-이름: 숫자" (표준 형식)
        const standardMatch = change.match(/^([^-]+)-([^:]+):\s*(-?\d+)/);
        if (standardMatch) {
          personA = normalizeName(standardMatch[1].trim());
          personB = normalizeName(standardMatch[2].trim());
          value = parseInt(standardMatch[3], 10);
        } else {
          // 패턴 2: "이름:설명" 형식 (숫자 없음) - 설명에서 증가/감소 추론
          const singleNameMatch = change.match(/^([^:]+):\s*(.+)$/);
          if (singleNameMatch) {
            const name = singleNameMatch[1].trim();
            const description = singleNameMatch[2].toLowerCase();

            // 설명에서 관계 변화 추론
            const isPositive = description.includes('증가') ||
                              description.includes('상승') ||
                              description.includes('강화') ||
                              description.includes('신뢰') ||
                              description.includes('존중') ||
                              description.includes('호감');
            const isNegative = description.includes('감소') ||
                              description.includes('하락') ||
                              description.includes('심화') ||
                              description.includes('악화') ||
                              description.includes('적대') ||
                              description.includes('불신') ||
                              description.includes('실망');

            if (isPositive || isNegative) {
              personA = '(플레이어)';
              personB = normalizeName(name);
              value = isPositive ? 5 : -5; // 기본값으로 ±5 적용
            } else {
              // 변화 방향을 알 수 없으면 무시
              console.debug('⚠️ 관계도 변화 방향 불명확 (무시):', change);
              return;
            }
          } else {
            // 패턴 3: "이름-이름:설명" 형식 (숫자 없이 설명만)
            const pairDescMatch = change.match(/^([^-]+)-([^:]+):\s*(.+)$/);
            if (pairDescMatch) {
              personA = normalizeName(pairDescMatch[1].trim());
              personB = normalizeName(pairDescMatch[2].trim());
              const description = pairDescMatch[3].toLowerCase();

              const isPositive = description.includes('증가') ||
                                description.includes('상승') ||
                                description.includes('강화') ||
                                description.includes('개선');
              const isNegative = description.includes('감소') ||
                                description.includes('심화') ||
                                description.includes('악화') ||
                                description.includes('긴장');

              value = isPositive ? 5 : isNegative ? -5 : 0;
              if (value === 0) {
                console.debug('⚠️ 관계도 변화 방향 불명확 (무시):', change);
                return;
              }
            } else {
              console.debug('⚠️ 문자열 형식 관계도 파싱 실패 (무시):', change);
              return;
            }
          }
        }
      } else if (typeof change === 'object' && change !== null) {
        // 객체 형식 처리
        if ('pair' in change && change.pair) {
          // "A-B" 형식 처리 - 캐릭터 이름에 하이픈이 포함될 수 있으므로 스마트 파싱 사용
          const parsed = parseCharacterPair(change.pair, knownCharacterNames);
          if (parsed) {
            personA = normalizeName(parsed.personA);
            personB = normalizeName(parsed.personB);
            value = change.change || 0;
          } else {
            console.warn('⚠️ 관계 쌍 파싱 실패:', change.pair);
            return;
          }
        } else if ('personA' in change && 'personB' in change) {
          // 개별 필드 형식 처리
          personA = normalizeName(change.personA || '');
          personB = normalizeName(change.personB || '');
          value = change.change || 0;
        } else {
          console.warn('⚠️ 비정상적인 관계도 객체 형식 (무시됨):', change);
          return;
        }
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
        const previousValue = newSaveState.community.hiddenRelationships[key] ?? 0;
        if (newSaveState.community.hiddenRelationships[key] === undefined) {
          newSaveState.community.hiddenRelationships[key] = 0;
        }
        // 관계값 변경 후 -100 ~ 100 범위로 clamp
        const newRelationValue = newSaveState.community.hiddenRelationships[key] + value;
        newSaveState.community.hiddenRelationships[key] = Math.max(-100, Math.min(100, newRelationValue));

        // 관계 변화 추적
        if (value !== 0) {
          trackedRelationshipChanges.push({
            pair: key,
            change: value,
            previousValue,
            newValue: newSaveState.community.hiddenRelationships[key],
          });
        }

        console.log(
          `🤝 관계도 변경: ${key} | 변화: ${value} | 현재: ${newSaveState.community.hiddenRelationships[key]}`,
        );
      } else {
        console.warn('⚠️ 비정상적인 관계도 데이터 수신 (무시됨):', change);
      }
    });
  }

  // v1.2: flags_acquired를 context.flags에 적용 (ending/route 조건에 필요)
  if (flags_acquired && flags_acquired.length > 0) {
    flags_acquired.forEach((flagName: string) => {
      if (flagName && typeof flagName === 'string') {
        const normalizedFlag = flagName.startsWith('FLAG_') ? flagName : `FLAG_${flagName}`;
        // boolean 플래그는 true로, count 플래그는 +1
        const currentValue = newSaveState.context.flags[normalizedFlag];
        if (typeof currentValue === 'number') {
          newSaveState.context.flags[normalizedFlag] = currentValue + 1;
        } else {
          newSaveState.context.flags[normalizedFlag] = true;
        }
        trackedFlagsAcquired.push(normalizedFlag);
        console.log(`🏴 플래그 획득: ${normalizedFlag}`);
      }
    });
  }

  // =============================================================================
  // 기존 Day 전환 로직 제거됨 (Phase 4: 행동 게이지 시스템으로 대체)
  // Day 전환은 이제 consumeActionPoint 함수에서 AP 소진 시 처리됩니다.
  // =============================================================================

  // 시간 기반 시나리오의 remainingHours 감소만 유지
  if (
    scenario.endCondition.type === 'time_limit' &&
    scenario.endCondition.unit === 'hours'
  ) {
    if (newSaveState.context.remainingHours !== undefined) {
      newSaveState.context.remainingHours -= 1;
      newSaveState.log = `[남은 시간: ${newSaveState.context.remainingHours}시간] ${aiResponse.log}`;
    }
  } else {
    // 날짜 기반 시나리오 - 로그에 현재 Day 정보 포함
    const currentDay = newSaveState.context.currentDay || 1;
    newSaveState.log = `[Day ${currentDay}] ${aiResponse.log}`;
  }

  // 캐릭터 아크 업데이트
  if (newSaveState.characterArcs) {
    const currentDay = newSaveState.context.currentDay || 1;

    // 상태 변화 트래킹
    survivorStatus.forEach((update: { name: string; newStatus: string }) => {
      const arc = newSaveState.characterArcs?.find(
        (a: { characterName: string }) => a.characterName === update.name,
      );
      if (arc) {
        const impact =
          update.newStatus === 'dead' || update.newStatus === 'injured'
            ? 'negative'
            : update.newStatus === 'healed' || update.newStatus === 'rescued'
              ? 'positive'
              : 'neutral';
        arc.moments.push({
          day: currentDay,
          type: 'status',
          description: `${update.name}의 상태가 ${update.newStatus}(으)로 변경됨`,
          impact: impact as 'positive' | 'negative' | 'neutral',
        });
        // 분위기 업데이트
        if (impact === 'negative') {
          arc.currentMood = 'anxious';
        } else if (impact === 'positive') {
          arc.currentMood = 'hopeful';
        }
      }
    });

    // 관계 변화 트래킹 (플레이어와의 관계만 신뢰도에 반영)
    if (
      hiddenRelationships_change &&
      Array.isArray(hiddenRelationships_change)
    ) {
      hiddenRelationships_change.forEach((change) => {
        let personA: string = '',
          personB: string = '',
          value: number = 0;

        if (typeof change === 'string') {
          // 패턴 1: "이름쌍:숫자" (표준 형식) - 콜론 뒤에 숫자가 오는 경우
          const valueMatch = change.match(/^(.+):\s*(-?\d+)$/);
          if (valueMatch) {
            const namePart = valueMatch[1].trim();
            const parsed = parseCharacterPair(namePart, knownCharacterNames);
            if (parsed) {
              personA = parsed.personA;
              personB = parsed.personB;
              value = parseInt(valueMatch[2], 10);
            }
          }

          if (!personA || !personB) {
            // 패턴 2: "이름:설명" 또는 "이름-이름:설명" 형식
            const descMatch = change.match(/^([^:]+):\s*(.+)$/);
            if (descMatch) {
              const namePart = descMatch[1].trim();
              const description = descMatch[2].toLowerCase();

              // 이름 부분에 대시가 있으면 두 사람 간의 관계
              if (namePart.includes('-')) {
                const parsed = parseCharacterPair(namePart, knownCharacterNames);
                if (parsed) {
                  personA = parsed.personA;
                  personB = parsed.personB;
                } else {
                  // 파싱 실패 시 단일 이름으로 간주
                  personA = '(플레이어)';
                  personB = namePart;
                }
              } else {
                // 단일 이름이면 플레이어와의 관계
                personA = '(플레이어)';
                personB = namePart;
              }

              // 설명에서 변화 방향 추론
              const isPositive = description.includes('증가') ||
                                description.includes('상승') ||
                                description.includes('강화') ||
                                description.includes('신뢰') ||
                                description.includes('존중') ||
                                description.includes('개선');
              const isNegative = description.includes('감소') ||
                                description.includes('심화') ||
                                description.includes('악화') ||
                                description.includes('긴장') ||
                                description.includes('불신') ||
                                description.includes('적대');

              value = isPositive ? 5 : isNegative ? -5 : 0;
            }
          }
        } else if (typeof change === 'object' && change !== null) {
          if ('pair' in change && change.pair) {
            const parsed = parseCharacterPair(change.pair, knownCharacterNames);
            if (parsed) {
              personA = parsed.personA;
              personB = parsed.personB;
              value = change.change || 0;
            }
          } else if ('personA' in change && 'personB' in change) {
            personA = change.personA || '';
            personB = change.personB || '';
            value = change.change || 0;
          }
        }

        if (personA && personB && value !== 0) {
          // 플레이어 관련 관계인지 확인 (normalizeName과 동일한 로직)
          const isPlayerName = (name: string) => {
            const lowerName = name.toLowerCase();
            // 서브스트링 매칭: 플레이어, 리더, player
            if (
              lowerName.includes('플레이어') ||
              lowerName.includes('리더') ||
              lowerName.includes('player')
            ) {
              return true;
            }
            // 정확한 매칭: 나, 당신 (오탐지 방지)
            return name === '나' || name === '당신';
          };

          const isPlayerRelated = isPlayerName(personA) || isPlayerName(personB);

          const otherPerson = isPlayerRelated
            ? isPlayerName(personA)
              ? personB
              : personA
            : null;

          if (otherPerson) {
            const arc = newSaveState.characterArcs?.find(
              (a: { characterName: string }) => a.characterName === otherPerson,
            );
            if (arc) {
              arc.trustLevel = Math.max(
                -100,
                Math.min(100, arc.trustLevel + value),
              );
              arc.moments.push({
                day: currentDay,
                type: 'relationship',
                description:
                  value > 0 ? '플레이어와의 신뢰가 상승' : '플레이어와 갈등 발생',
                relatedCharacter: '플레이어',
                impact: value > 0 ? 'positive' : 'negative',
              });
              // 신뢰도에 따른 분위기 변화
              if (arc.trustLevel >= 30) {
                arc.currentMood = 'determined';
              } else if (arc.trustLevel <= -30) {
                arc.currentMood = 'angry';
              }
            }
          } else {
            // NPC 간 관계 변화
            [personA, personB].forEach((name) => {
              const arc = newSaveState.characterArcs?.find(
                (a: { characterName: string }) => a.characterName === name,
              );
              if (arc) {
                const other = name === personA ? personB : personA;
                arc.moments.push({
                  day: currentDay,
                  type: 'relationship',
                  description:
                    value > 0
                      ? `${other}와(과)의 관계 개선`
                      : `${other}와(과) 갈등 발생`,
                  relatedCharacter: other,
                  impact: value > 0 ? 'positive' : 'negative',
                });
              }
            });
          }
        }
      });
    }

    console.log(
      '👥 캐릭터 아크 업데이트 완료:',
      newSaveState.characterArcs.map(
        (a: { characterName: string; trustLevel: number; moments: unknown[] }) =>
          `${a.characterName}(신뢰:${a.trustLevel}, 순간:${a.moments.length})`,
      ),
    );
  }

  // 변화 요약 생성 및 저장
  const hasAnyChanges =
    trackedStatChanges.length > 0 ||
    trackedRelationshipChanges.length > 0 ||
    trackedFlagsAcquired.length > 0;

  if (hasAnyChanges) {
    const changeSummary: ChangeSummaryData = {
      statChanges: trackedStatChanges,
      relationshipChanges: trackedRelationshipChanges,
      flagsAcquired: trackedFlagsAcquired,
      timestamp: Date.now(),
    };

    // 변화 요약을 chat history에 추가
    newSaveState.chatHistory.push({
      type: 'change-summary',
      content: '', // 내용은 changeSummary에서 렌더링
      timestamp: Date.now() + 1,
      changeSummary,
    });

    // lastChangeSummary도 저장 (필요 시 참조용)
    newSaveState.lastChangeSummary = changeSummary;

    console.log('📋 변화 요약:', {
      stats: trackedStatChanges.length,
      relationships: trackedRelationshipChanges.length,
      flags: trackedFlagsAcquired.length,
    });
  }

  // v1.2: AI 서사에서 새로 등장한 캐릭터 자동 감지 및 metCharacters 업데이트
  const allNpcNames = scenario.characters
    .filter((c) => c.characterName !== '(플레이어)')
    .map((c) => c.characterName);
  const currentMetCharacters = newSaveState.context.protagonistKnowledge?.metCharacters || [];
  const narrative = aiResponse.log || '';

  const newlyIntroducedCharacters: string[] = [];
  allNpcNames.forEach((charName) => {
    // 아직 만나지 않은 캐릭터가 서사에 이름으로 언급되면 metCharacters에 추가
    if (!currentMetCharacters.includes(charName) && narrative.includes(charName)) {
      newlyIntroducedCharacters.push(charName);
    }
  });

  if (newlyIntroducedCharacters.length > 0) {
    // metCharacters 업데이트
    if (newSaveState.context.protagonistKnowledge) {
      newSaveState.context.protagonistKnowledge.metCharacters = [
        ...currentMetCharacters,
        ...newlyIntroducedCharacters,
      ];
    }

    // community.survivors에도 추가 (아직 없는 경우)
    newlyIntroducedCharacters.forEach((charName) => {
      const alreadyInSurvivors = newSaveState.community.survivors.some(
        (s: { name: string }) => s.name === charName
      );
      if (!alreadyInSurvivors) {
        const charData = scenario.characters.find((c) => c.characterName === charName);
        if (charData) {
          newSaveState.community.survivors.push({
            name: charData.characterName,
            role: charData.roleName,
            traits: charData.currentTrait
              ? [charData.currentTrait.displayName || charData.currentTrait.traitName]
              : [],
            status: 'normal',
          });
        }
      }
    });

    console.log('👤 새로 만난 캐릭터:', newlyIntroducedCharacters.join(', '));
  }

  // v1.2: 동적 위치 시스템 - AI가 반환한 locations_discovered 처리
  if (locations_discovered && locations_discovered.length > 0) {
    newSaveState.worldState = addDiscoveredLocations(
      newSaveState.worldState,
      locations_discovered
    );
    console.log('🗺️ 새로 발견된 장소:', locations_discovered.map((l) => l.name).join(', '));
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

  // Phase 3: 게임 모드 상태
  const [gameMode, setGameMode] = useState<GameMode>('choice');
  const [isDialogueLoading, setIsDialogueLoading] = useState(false);
  const [isExplorationLoading, setIsExplorationLoading] = useState(false);

  // Dynamic Ending System: 행동 기록 및 동적 결말
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const [dynamicEnding, setDynamicEnding] = useState<DynamicEndingResult | null>(null);
  const [isGeneratingEnding, setIsGeneratingEnding] = useState(false);

  /**
   * ActionHistory에 행동 기록 추가
   * SDT 기반 동적 결말 생성을 위한 데이터 수집
   * v1.2: isCustomInput 파라미터 추가 (freeText 통합)
   */
  const addToActionHistory = (
    actionType: ActionHistoryEntry['actionType'],
    content: string,
    consequence: ActionHistoryEntry['consequence'],
    narrativeSummary: string,
    target?: string,
    moralAlignment?: ActionHistoryEntry['moralAlignment'],
    isCustomInput?: boolean
  ) => {
    const entry: ActionHistoryEntry = {
      day: saveState.context.currentDay ?? 1,
      timestamp: new Date().toISOString(),
      isCustomInput,
      actionType,
      content,
      target,
      consequence,
      narrativeSummary,
      moralAlignment,
    };

    setActionHistory(prev => [...prev, entry]);
    console.log('📝 ActionHistory 기록:', actionType, content.slice(0, 50) + '...');
  };

  /**
   * 동적 엔딩 생성 함수
   * endingDay에 도달하면 ActionHistory를 기반으로 AI가 결말 생성
   */
  const generateDynamicEnding = async (currentState: SaveState, history: ActionHistoryEntry[]) => {
    if (!scenario.dynamicEndingConfig?.enabled) return;
    if (isGeneratingEnding || dynamicEnding) return;

    const currentDay = currentState.context.currentDay ?? 1;
    const endingDay = scenario.dynamicEndingConfig.endingDay;

    // 엔딩 Day 도달 체크
    if (currentDay < endingDay) return;

    console.log('🎬 동적 엔딩 생성 시작...');
    setIsGeneratingEnding(true);

    try {
      const response = await fetch('/api/generate-ending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.scenarioId,
          scenario: {
            title: scenario.title,
            synopsis: scenario.synopsis,
            genre: scenario.genre,
            playerGoal: scenario.playerGoal,
            characters: scenario.characters,
          },
          dynamicEndingConfig: scenario.dynamicEndingConfig,
          actionHistory: history,
          finalState: {
            stats: currentState.context.scenarioStats,
            relationships: currentState.community.hiddenRelationships,
            day: currentDay,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.ending) {
        console.log('✅ 동적 엔딩 생성 완료:', result.ending.title);
        setDynamicEnding(result.ending);
      } else {
        console.error('❌ 동적 엔딩 생성 실패:', result.error);
      }
    } catch (error) {
      console.error('❌ 동적 엔딩 API 오류:', error);
    } finally {
      setIsGeneratingEnding(false);
    }
  };

  // 엔딩 Day 경고 체크
  const shouldShowEndingWarning = () => {
    if (!scenario.dynamicEndingConfig?.enabled) return false;
    const currentDay = saveState.context.currentDay ?? 1;
    const endingDay = scenario.dynamicEndingConfig.endingDay;
    const warningDays = scenario.dynamicEndingConfig.warningDays;
    return currentDay >= (endingDay - warningDays) && currentDay < endingDay;
  };

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

      // 새 게임 시작 시 세션 통계 리셋 (이전 게임의 토큰 사용량, API 호출 횟수 등 초기화)
      resetSessionStats();
      console.log('📊 세션 통계 초기화 완료');

      setIsInitialDilemmaLoading(true);
      setError(null);
      try {
        const initialState = createInitialSaveState(scenario);
        const aiSettings = getOptimalAISettings(1, 'medium', 0, scenario);

        // 스토리 오프닝 시스템 사용 여부에 따라 다른 함수 호출
        const result = await generateInitialDilemmaWithOpening(
          initialState,
          scenario,
          aiSettings.useLiteVersion,
        );

        // 초기 딜레마도 언어 검증 및 정리
        const { cleanedResponse, hasLanguageIssues, languageIssues } =
          cleanAndValidateAIResponse(result.aiResponse);

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
          // Valid AI response - 스토리 오프닝 사용 시 각 단계를 별도 메시지로 추가
          if (result.usedStoryOpening && result.storyOpeningResult) {
            console.log('📖 스토리 오프닝 3단계 구조 적용');
            const storyOpening = result.storyOpeningResult;
            const timestamp = Date.now();

            // 각 단계를 별도의 chat message로 추가 (더 드라마틱한 표현)
            const chatHistory: typeof initialState.chatHistory = [];

            // 1단계: 프롤로그 (ai-narration 타입 사용)
            if (storyOpening.prologue) {
              chatHistory.push({
                type: 'ai',
                content: storyOpening.prologue,
                timestamp: timestamp,
              });
            }

            // 2단계: 촉발 사건 (ai 타입 사용)
            if (storyOpening.incitingIncident) {
              chatHistory.push({
                type: 'ai',
                content: storyOpening.incitingIncident,
                timestamp: timestamp + 1,
              });
            }

            // 3단계: 첫 캐릭터 만남 (ai-dialogue 스타일)
            if (storyOpening.firstEncounter) {
              chatHistory.push({
                type: 'ai',
                content: storyOpening.firstEncounter,
                timestamp: timestamp + 2,
              });
            }

            // =================================================================
            // [Stage 2] 스토리 오프닝 후 상태 업데이트
            // protagonistKnowledge를 업데이트하여 첫 캐릭터를 만났음을 기록
            // =================================================================
            const firstCharacter = scenario.storyOpening?.firstCharacterToMeet;
            const introSequence = scenario.storyOpening?.characterIntroductionSequence;
            const firstInSequence = introSequence?.find((s) => s.order === 1);
            const metCharacterName = firstInSequence?.characterName || firstCharacter;

            // metCharacters 업데이트 (이미 포함되어 있지 않은 경우만)
            const currentMetCharacters = initialState.context.protagonistKnowledge?.metCharacters || [];
            const updatedMetCharacters = metCharacterName && !currentMetCharacters.includes(metCharacterName)
              ? [...currentMetCharacters, metCharacterName]
              : currentMetCharacters;

            // 첫 만남에서 얻은 기본 정보 기록
            const initialInformationPieces = initialState.context.protagonistKnowledge?.informationPieces || [];
            const newInformationPieces = metCharacterName
              ? [
                  ...initialInformationPieces,
                  {
                    id: `opening_meet_${metCharacterName}`,
                    content: `${metCharacterName}을(를) 처음 만났다.`,
                    source: 'story_opening',
                    discoveredAt: { day: 1, action: 'opening' },
                  },
                ]
              : initialInformationPieces;

            // 상태 업데이트 (log 대신 chatHistory 직접 설정)
            const updatedState: SaveState = {
              ...initialState,
              log: storyOpening.fullLog,
              chatHistory,
              dilemma: storyOpening.dilemma,
              context: {
                ...initialState.context,
                // [Stage 2] protagonistKnowledge 업데이트
                protagonistKnowledge: {
                  ...initialState.context.protagonistKnowledge,
                  metCharacters: updatedMetCharacters,
                  informationPieces: newInformationPieces,
                },
              },
            };

            console.log('📖 스토리 오프닝 완료 - 주인공 지식 업데이트:', {
              metCharacters: updatedMetCharacters,
              newInfo: newInformationPieces.length - initialInformationPieces.length,
            });

            setSaveState(updatedState);
          } else {
            // 기존 방식: 단일 메시지로 표시
            const updatedState = updateSaveState(
              initialState,
              cleanedResponse,
              scenario,
            );
            setSaveState(updatedState);
          }
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

  // v1.2: handlePlayerChoice에 isCustomInput 통합 (handleFreeTextSubmit 흡수)
  const handlePlayerChoice = async (choiceDetails: string, isCustomInput: boolean = false) => {
    // 초기 딜레마 생성 전에는 선택 불가
    if (!initialDilemmaGenerated.current || isLoading) return;

    // 행동 게이지 부족 체크 (동적 비용 적용)
    if (hasInsufficientAP(saveState, 'choice', scenario)) {
      console.warn('⚠️ AP 부족: choice 행동 불가');
      setError('오늘의 행동력을 모두 사용했습니다. 다음 날을 기다려주세요.');
      return;
    }

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

    // 정규표현식 기반 행동 분류 시스템 사용 (P3-1 개선)
    const choiceId =
      choiceDetails === saveState.dilemma.choice_a ? 'choice_a' : 'choice_b';
    const playerAction = createPlayerAction(
      choiceDetails,
      choiceId as 'choice_a' | 'choice_b',
    );

    // v1.2: 직접 입력인 경우 행동 설명 수정
    if (isCustomInput) {
      playerAction.actionDescription = `플레이어 자유 행동: ${choiceDetails}`;
    }

    try {
      // 비용 효율적인 AI 설정 가져오기
      const aiSettings = getOptimalAISettings(
        newSaveState.context.currentDay || 1,
        'medium',
        0, // 초기 토큰 사용량
        scenario,
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

      // v1.2: 시너지 보너스 적용 (Phase 2.1)
      const recentActions = newSaveState.context.actionsThisDay || [];
      if (recentActions.length > 0) {
        const lastAction = recentActions[recentActions.length - 1];
        const synergy = getActionSynergy(lastAction.actionType, 'choice');

        if (synergy?.mechanicEffect?.statBonus && cleanedResponse.statChanges?.scenarioStats) {
          // 시너지 보너스를 첫 번째 양수 스탯 변화에 적용
          const statsToBoost = Object.entries(cleanedResponse.statChanges.scenarioStats)
            .filter(([, v]) => (v as number) > 0);

          if (statsToBoost.length > 0) {
            const [statId] = statsToBoost[0];
            cleanedResponse.statChanges.scenarioStats[statId] =
              (cleanedResponse.statChanges.scenarioStats[statId] || 0) + synergy.mechanicEffect.statBonus;
            console.log(`✨ 시너지 보너스 적용: ${statId} +${synergy.mechanicEffect.statBonus} (${synergy.bonus})`);
          }
        }
      }

      const updatedSaveState = updateSaveState(
        newSaveState,
        cleanedResponse,
        scenario,
      );

      // 회상 시스템 - 주요 결정 기록
      // Bug fix: 상태 업데이트 전의 day/turn 사용 (newSaveState)
      const recordKeyDecision = () => {
        const currentDay = newSaveState.context.currentDay || 1;
        const currentTurn = newSaveState.context.turnsInCurrentDay || 0;

        // 선택 카테고리 결정
        const determineCategory = (
          choice: string,
        ): 'survival' | 'relationship' | 'moral' | 'strategic' => {
          const choiceLower = choice.toLowerCase();
          if (
            choiceLower.includes('자원') ||
            choiceLower.includes('방어') ||
            choiceLower.includes('탈출') ||
            choiceLower.includes('생존')
          ) {
            return 'survival';
          }
          if (
            choiceLower.includes('협상') ||
            choiceLower.includes('신뢰') ||
            choiceLower.includes('동맹') ||
            choiceLower.includes('관계')
          ) {
            return 'relationship';
          }
          if (
            choiceLower.includes('희생') ||
            choiceLower.includes('보호') ||
            choiceLower.includes('구출') ||
            choiceLower.includes('선택')
          ) {
            return 'moral';
          }
          return 'strategic';
        };

        // AI 응답에서 영향받은 캐릭터 추출
        const extractImpactedCharacters = (): string[] => {
          const characters = scenario.characters
            .map((c) => c.characterName)
            .filter((name) => name !== '(플레이어)');
          return characters.filter(
            (name) =>
              cleanedResponse.log.includes(name) ||
              choiceDetails.includes(name),
          );
        };

        // 결과 요약 (50자 이내)
        const summarizeConsequence = (log: string): string => {
          // Day 태그 제거
          const cleanLog = log.replace(/\[Day \d+\]\s*/g, '').trim();
          // 첫 문장 또는 50자까지
          const firstSentence = cleanLog.split(/[.!?。]/)[0];
          return firstSentence.length > 50
            ? firstSentence.substring(0, 47) + '...'
            : firstSentence;
        };

        const keyDecision = {
          day: currentDay,
          turn: currentTurn,
          choice: choiceDetails,
          consequence: summarizeConsequence(cleanedResponse.log),
          category: determineCategory(choiceDetails),
          flagsAcquired: cleanedResponse.statChanges.flags_acquired || [],
          impactedCharacters: extractImpactedCharacters(),
        };

        // 최대 20개까지 저장 (오래된 것부터 삭제)
        if (!updatedSaveState.keyDecisions) {
          updatedSaveState.keyDecisions = [];
        }
        updatedSaveState.keyDecisions.push(keyDecision);
        if (updatedSaveState.keyDecisions.length > 20) {
          updatedSaveState.keyDecisions.shift();
        }

        console.log('📝 주요 결정 기록:', keyDecision);
      };

      recordKeyDecision();

      // Dynamic Ending System: ActionHistory 기록
      {
        // 스탯 변화 추출
        const statsChanged = Object.entries(cleanedResponse.statChanges.scenarioStats || {})
          .filter(([, delta]) => delta !== 0)
          .map(([statId, delta]) => ({
            statId,
            delta: delta as number,
            newValue: updatedSaveState.context.scenarioStats[statId] ?? 0,
          }));

        // 관계 변화 추출
        const relationshipsChanged = (cleanedResponse.statChanges.hiddenRelationships_change || [])
          .filter((r: { characterPair?: string; delta?: number }) => r.delta && r.delta !== 0)
          .map((r: { characterPair?: string; delta?: number }) => {
            const char = r.characterPair?.replace('플레이어-', '') || '';
            return {
              character: char,
              delta: r.delta || 0,
              newValue: updatedSaveState.community.hiddenRelationships[`플레이어-${char}`] ?? 0,
            };
          });

        // 도덕적 성격 판단 (간단한 휴리스틱)
        const determineMoralAlignment = (choice: string): ActionHistoryEntry['moralAlignment'] => {
          const lc = choice.toLowerCase();
          if (lc.includes('희생') || lc.includes('보호') || lc.includes('도움') || lc.includes('구출')) return 'selfless';
          if (lc.includes('자원') || lc.includes('효율') || lc.includes('전략')) return 'pragmatic';
          if (lc.includes('혼자') || lc.includes('포기') || lc.includes('탈출')) return 'selfish';
          return 'neutral';
        };

        addToActionHistory(
          'choice',
          choiceDetails,
          {
            statsChanged,
            relationshipsChanged,
            significantEvents: cleanedResponse.statChanges.flags_acquired || [],
          },
          cleanedResponse.log.slice(0, 200),
          undefined,
          determineMoralAlignment(choiceDetails),
          isCustomInput // v1.2: 직접 입력 여부 기록
        );
      }

      // 맥락 연결 시스템: 선택 결과로 맥락 업데이트
      if (updatedSaveState.context.actionContext) {
        const currentDay = updatedSaveState.context.currentDay || 1;
        updatedSaveState.context.actionContext = updateContextAfterChoice(
          updatedSaveState.context.actionContext,
          choiceDetails,
          cleanedResponse.log,
          currentDay
        );
        console.log(`📝 맥락 업데이트: "${choiceDetails.substring(0, 30)}..." 선택 결과 반영`);
      }

      // 행동 게이지 소모 및 Day 전환 처리 (동적 비용 적용)
      const { newState: stateAfterAP, shouldAdvanceDay, newDay, apCostInfo } = consumeActionPoint(
        updatedSaveState,
        scenario,
        'choice',
        choiceDetails,
        {
          statChanges: cleanedResponse.statChanges?.scenarioStats,
          flagsAcquired: cleanedResponse.statChanges?.flags_acquired,
        }
      );

      setSaveState(stateAfterAP);

      console.log('🔄 상태 업데이트 완료, 엔딩 조건 확인 시작...');
      if (shouldAdvanceDay) {
        console.log(`🌅 Day ${newDay}로 전환됨 - AP 소진`);
      }

      // Dynamic Ending System: 동적 엔딩 체크
      if (scenario.dynamicEndingConfig?.enabled) {
        const currentDay = stateAfterAP.context.currentDay || 1;
        const endingDay = scenario.dynamicEndingConfig.endingDay;
        if (currentDay >= endingDay && !dynamicEnding && !isGeneratingEnding) {
          // actionHistory에 현재 기록이 추가된 상태로 호출
          generateDynamicEnding(stateAfterAP, [...actionHistory]);
          return; // 동적 엔딩 생성 중이므로 기존 엔딩 체크 건너뜀
        }
      }

      // Check for ending condition after state is updated
      // stateAfterAP 사용 (Day 전환이 반영된 상태)
      const currentPlayerState: PlayerState = {
        stats: stateAfterAP.context.scenarioStats,
        flags: stateAfterAP.context.flags,
        traits: [],
        relationships: stateAfterAP.community.hiddenRelationships,
      };

      let ending: EndingArchetype | null = null;
      const currentDay = stateAfterAP.context.currentDay || 1;

      // 엔딩 체크 시점 이후에만 엔딩 조건 체크 (동적 계산)
      // 동적 엔딩 시스템이 비활성화된 경우에만 기존 엔딩 체크
      const survivorCount = stateAfterAP.community.survivors.length;
      if (canCheckEnding(currentDay, scenario) && !scenario.dynamicEndingConfig?.enabled) {
        ending = checkEndingConditions(
          currentPlayerState,
          scenario.endingArchetypes,
          survivorCount,
        );

        if (ending) {
          console.log(
            `🎯 Day ${currentDay}에서 엔딩 조건 만족: ${ending.title}`,
          );
        }
      } else {
        console.log(
          `⏸️ Day ${currentDay} - 엔딩 체크 대기 중 (엔딩 체크 시점 이후 체크)`,
        );
      }

      // 시간제한 엔딩 조건 확인 (Day 7 완료 후 강제 엔딩)
      if (!ending && scenario.endCondition.type === 'time_limit') {
        const timeLimit = scenario.endCondition.value || 0;
        // currentDay는 이미 위에서 선언됨
        const currentHours =
          stateAfterAP.context.remainingHours || Infinity;

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
            survivorCount,
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

  // Phase 3: 캐릭터 대화 핸들러
  const handleDialogueSelect = async (characterName: string, topic: DialogueTopic) => {
    // 행동 게이지 부족 체크 (동적 비용 적용 - 신뢰도 기반)
    if (hasInsufficientAP(saveState, 'dialogue', scenario, characterName)) {
      console.warn('⚠️ AP 부족: dialogue 행동 불가');
      setError('오늘의 행동력을 모두 사용했습니다.');
      return;
    }

    setIsDialogueLoading(true);
    setError(null);

    try {
      console.log(`💬 대화 시작: ${characterName} - ${topic.label}`);

      const dialogueResponse = await generateDialogueResponse(
        characterName,
        topic,
        saveState,
        scenario
      );

      // 대화 내용을 채팅 히스토리에 추가
      const newSaveState = { ...saveState };

      // 플레이어 질문
      newSaveState.chatHistory.push({
        type: 'player',
        content: `[${characterName}에게] ${topic.label}`,
        timestamp: Date.now(),
      });

      // 캐릭터 응답
      newSaveState.chatHistory.push({
        type: 'ai',
        content: `**${characterName}**: "${dialogueResponse.dialogue}"`,
        timestamp: Date.now() + 1,
      });

      // v1.2: 시너지 보너스 적용 (탐색 → 대화: trustBonus)
      let bonusRelationshipChange = 0;
      const recentActions = newSaveState.context.actionsThisDay || [];
      if (recentActions.length > 0) {
        const lastAction = recentActions[recentActions.length - 1];
        const synergy = getActionSynergy(lastAction.actionType, 'dialogue');

        if (synergy?.mechanicEffect?.trustBonus) {
          bonusRelationshipChange = synergy.mechanicEffect.trustBonus;
          console.log(`✨ 시너지 보너스 적용: 신뢰도 +${bonusRelationshipChange} (${synergy.bonus})`);
        }
      }

      // 관계 변화 적용 (시너지 보너스 포함)
      const totalRelationshipChange = (dialogueResponse.relationshipChange || 0) + bonusRelationshipChange;
      if (totalRelationshipChange !== 0) {
        const playerKey = ['(플레이어)', characterName].sort().join('-');
        if (newSaveState.community.hiddenRelationships[playerKey] === undefined) {
          newSaveState.community.hiddenRelationships[playerKey] = 0;
        }
        const newValue = Math.max(-100, Math.min(100,
          newSaveState.community.hiddenRelationships[playerKey] + totalRelationshipChange
        ));
        newSaveState.community.hiddenRelationships[playerKey] = newValue;

        // 캐릭터 아크 업데이트
        const arc = newSaveState.characterArcs?.find(a => a.characterName === characterName);
        if (arc) {
          arc.trustLevel = Math.max(-100, Math.min(100, arc.trustLevel + totalRelationshipChange));
          arc.currentMood = dialogueResponse.mood;
        }

        console.log(`🤝 대화로 관계 변화: ${characterName} ${totalRelationshipChange > 0 ? '+' : ''}${totalRelationshipChange}${bonusRelationshipChange > 0 ? ` (시너지 +${bonusRelationshipChange})` : ''}`);
      }

      // 정보 획득 시 메시지 추가 (몰입감 있는 형식)
      if (dialogueResponse.infoGained) {
        newSaveState.chatHistory.push({
          type: 'ai-thought',
          content: dialogueResponse.infoGained,
          timestamp: Date.now() + 2,
        });
      }

      // Dynamic Ending System: ActionHistory 기록 (대화) - v1.2: 시너지 보너스 반영
      addToActionHistory(
        'dialogue',
        `${topic.label}`,
        {
          statsChanged: [],
          relationshipsChanged: totalRelationshipChange !== 0
            ? [{
                character: characterName,
                delta: totalRelationshipChange,
                newValue: newSaveState.community.hiddenRelationships[
                  ['(플레이어)', characterName].sort().join('-')
                ] ?? 0,
              }]
            : [],
          significantEvents: dialogueResponse.infoGained ? [`정보 획득: ${dialogueResponse.infoGained.slice(0, 50)}`] : [],
        },
        dialogueResponse.dialogue.slice(0, 200),
        characterName,
        'neutral'
      );

      // 맥락 연결 시스템: 대화 결과로 맥락 업데이트
      if (newSaveState.context.actionContext) {
        const currentDay = newSaveState.context.currentDay || 1;
        newSaveState.context.actionContext = updateContextAfterDialogue(
          newSaveState.context.actionContext,
          characterName,
          topic.label,
          dialogueResponse.dialogue,
          dialogueResponse.infoGained,
          currentDay
        );
        console.log(`📝 맥락 업데이트: ${characterName}와 "${topic.label}" 대화 반영`);
      }

      // 행동 게이지 소모 및 Day 전환 처리 (동적 비용 적용 - 신뢰도 기반)
      // v1.2: totalRelationshipChange 사용 (시너지 보너스 포함)
      const { newState: stateAfterAP, shouldAdvanceDay, newDay, apCostInfo } = consumeActionPoint(
        newSaveState,
        scenario,
        'dialogue',
        characterName,  // 대화 대상 캐릭터명 (동적 비용 계산용)
        {
          relationshipChanges: totalRelationshipChange !== 0
            ? { [characterName]: totalRelationshipChange }
            : undefined,
          infoGained: dialogueResponse.infoGained,
        }
      );

      setSaveState(stateAfterAP);
      setGameMode('choice'); // 대화 후 선택 모드로 복귀

      // 동적 비용 피드백 (보너스가 있으면 서사적 메시지로 표시)
      if (apCostInfo?.bonus && apCostInfo.adjustedCost !== 1) {
        console.log(`💬 대화 비용 조정: ${apCostInfo.bonus}`);
      }

      if (shouldAdvanceDay) {
        console.log(`🌅 Day ${newDay}로 전환됨 - AP 소진 (대화)`);
      }

      // 엔딩 체크 (엔딩 체크 시점 이후 항상 체크 - handlePlayerChoice와 동일)
      const currentDay = stateAfterAP.context.currentDay || 1;
      const survivorCount = stateAfterAP.community.survivors.length;

      if (canCheckEnding(currentDay, scenario)) {
        const currentPlayerState: PlayerState = {
          stats: stateAfterAP.context.scenarioStats,
          flags: stateAfterAP.context.flags,
          traits: [],
          relationships: stateAfterAP.community.hiddenRelationships,
        };

        let ending = checkEndingConditions(
          currentPlayerState,
          scenario.endingArchetypes,
          survivorCount
        );

        if (ending) {
          console.log(`🎯 Day ${currentDay} 대화 후 엔딩 조건 만족: ${ending.title}`);
        }

        // 시간제한 엔딩 체크 (handlePlayerChoice와 동일)
        if (!ending && scenario.endCondition.type === 'time_limit') {
          const timeLimit = scenario.endCondition.value || 0;
          const currentHours = stateAfterAP.context.remainingHours || Infinity;
          const isTimeUp =
            scenario.endCondition.unit === 'days'
              ? currentDay > timeLimit
              : currentHours <= 0;

          if (isTimeUp) {
            console.log(`⏰ 시간 제한 도달! Day ${currentDay}/${timeLimit}`);
            ending = checkEndingConditions(currentPlayerState, scenario.endingArchetypes, survivorCount);
            if (!ending) {
              ending = scenario.endingArchetypes.find((e) => e.endingId === 'ENDING_TIME_UP') || null;
            }
            if (!ending) {
              const totalDays = scenario.endCondition.value || 7;
              ending = {
                endingId: 'DEFAULT_TIME_UP',
                title: '결단의 시간',
                description: `${totalDays}일의 시간이 흘렀다. 모든 결정과 희생이 이 순간을 위해 존재했다.`,
                systemConditions: [],
                isGoalSuccess: false,
              };
            }
          }
        }

        if (ending) {
          setTriggeredEnding(ending);
        }
      }
    } catch (err) {
      console.error('💬 대화 오류:', err);
      setError('캐릭터와 대화하는 중 오류가 발생했습니다.');
    } finally {
      setIsDialogueLoading(false);
    }
  };

  // Phase 3: 탐색 핸들러 (WorldState 통합)
  const handleExplore = async (location: ExplorationLocation) => {
    // 행동 게이지 부족 체크 (동적 비용 적용 - 재방문/위험 구역)
    if (hasInsufficientAP(saveState, 'exploration', scenario, location.locationId)) {
      console.warn('⚠️ AP 부족: exploration 행동 불가');
      setError('오늘의 행동력을 모두 사용했습니다.');
      return;
    }

    setIsExplorationLoading(true);
    setError(null);

    try {
      console.log(`🔍 탐색 시작: ${location.name}`);

      // WorldState에서 탐색 처리
      let worldStateResult = null;
      if (saveState.context.worldState) {
        worldStateResult = processExploration(
          saveState.context.worldState,
          location.locationId,
          saveState
        );
        console.log(`🌍 WorldState 탐색 처리:`, {
          discoveries: worldStateResult.newDiscoveries.length,
          events: worldStateResult.triggeredEvents.length,
          locationChanges: worldStateResult.changedLocations.length,
        });
      }

      const explorationResult = await generateExplorationResult(
        location,
        saveState,
        scenario
      );

      // 탐색 결과를 채팅 히스토리에 추가
      const newSaveState = { ...saveState };

      // 플레이어 행동
      newSaveState.chatHistory.push({
        type: 'player',
        content: `[탐색] ${location.name}을(를) 살펴본다`,
        timestamp: Date.now(),
      });

      // 탐색 결과
      newSaveState.chatHistory.push({
        type: 'ai',
        content: explorationResult.narrative,
        timestamp: Date.now() + 1,
      });

      // WorldState 결과 적용
      if (worldStateResult) {
        newSaveState.context.worldState = worldStateResult.worldState;

        // WorldState에서 발견한 아이템 알림 (몰입감 있는 형식)
        for (const discovery of worldStateResult.newDiscoveries) {
          newSaveState.chatHistory.push({
            type: 'ai-narration',
            content: `${discovery.name}을(를) 발견했다.`,
            timestamp: Date.now() + 2,
          });

          // 발견물 효과 적용
          if (discovery.effects?.statChanges) {
            for (const [statId, change] of Object.entries(discovery.effects.statChanges)) {
              if (newSaveState.context.scenarioStats[statId] !== undefined) {
                const statDef = scenario.scenarioStats.find(s => s.id === statId);
                const min = statDef?.min || 0;
                const max = statDef?.max || 100;
                newSaveState.context.scenarioStats[statId] = Math.max(min, Math.min(max,
                  newSaveState.context.scenarioStats[statId] + change
                ));
              }
            }
          }

          // @deprecated - flags system removed, using ActionHistory instead
        }

        // 위치 변경 알림 (몰입감 있는 형식 - 중요한 변화만)
        for (const change of worldStateResult.changedLocations) {
          // 파괴나 차단만 알림 (접근 가능 등은 불필요)
          if (change.newStatus === 'destroyed' || change.newStatus === 'blocked') {
            const narrativeText = change.newStatus === 'destroyed'
              ? `${change.locationId}이(가) 더 이상 갈 수 없는 곳이 되었다.`
              : `${change.locationId}으로 가는 길이 막혔다.`;
            newSaveState.chatHistory.push({
              type: 'ai-narration',
              content: narrativeText,
              timestamp: Date.now() + 3,
            });
          }
        }

        // 트리거된 이벤트 알림
        for (const event of worldStateResult.triggeredEvents) {
          console.log(`🎭 월드 이벤트 발동: ${event.description}`);
        }
      }

      // AI 생성 보상 적용 (WorldState와 별도)
      if (explorationResult.rewards) {
        // 스탯 변화
        if (explorationResult.rewards.statChanges) {
          for (const [statId, change] of Object.entries(explorationResult.rewards.statChanges)) {
            if (newSaveState.context.scenarioStats[statId] !== undefined) {
              const statDef = scenario.scenarioStats.find(s => s.id === statId);
              const min = statDef?.min || 0;
              const max = statDef?.max || 100;
              const newValue = Math.max(min, Math.min(max,
                newSaveState.context.scenarioStats[statId] + change
              ));
              newSaveState.context.scenarioStats[statId] = newValue;
              console.log(`📊 탐색 스탯 변화: ${statId} ${change > 0 ? '+' : ''}${change}`);
            }
          }
        }

        // @deprecated - flags system removed
        // significantDiscoveries logged in ActionHistory instead

        // 정보 획득 (WorldState에서 이미 구체적 발견물을 추가했으므로 중복 방지)
        if (explorationResult.rewards.infoGained && !worldStateResult?.newDiscoveries.length) {
          newSaveState.chatHistory.push({
            type: 'ai-thought',
            content: explorationResult.rewards.infoGained,
            timestamp: Date.now() + 2,
          });
        }
      }

      // Dynamic Ending System: ActionHistory 기록 (탐색)
      {
        const statsChanged = Object.entries(explorationResult.rewards?.statChanges || {})
          .filter(([, delta]) => delta !== 0)
          .map(([statId, delta]) => ({
            statId,
            delta: delta as number,
            newValue: newSaveState.context.scenarioStats[statId] ?? 0,
          }));

        // significantEvents now comes from significantDiscoveries
        const significantEvents = [
          ...(explorationResult.rewards?.significantDiscoveries || []),
          ...(worldStateResult?.newDiscoveries.map(d => `발견: ${d.name}`) || []),
        ];

        addToActionHistory(
          'exploration',
          `${location.name} 탐색`,
          {
            statsChanged,
            relationshipsChanged: [],
            significantEvents,
          },
          explorationResult.narrative.slice(0, 200),
          location.name,
          'pragmatic'
        );
      }

      // 맥락 연결 시스템: 탐색 결과로 맥락 업데이트
      if (newSaveState.context.actionContext) {
        const currentDay = newSaveState.context.currentDay || 1;
        newSaveState.context.actionContext = updateContextAfterExploration(
          newSaveState.context.actionContext,
          location.name,
          explorationResult.narrative,
          explorationResult.rewards,
          currentDay
        );
        console.log(`📝 맥락 업데이트: ${location.name} 탐색 결과 반영`);
      }

      // 행동 게이지 소모 및 Day 전환 처리
      const allStatChanges = {
        ...(worldStateResult?.newDiscoveries.reduce((acc, d) => {
          if (d.effects?.statChanges) Object.assign(acc, d.effects.statChanges);
          return acc;
        }, {} as Record<string, number>) || {}),
        ...(explorationResult.rewards?.statChanges || {}),
      };

      const allFlagsAcquired = [
        ...(worldStateResult?.newDiscoveries.flatMap(d => d.effects?.flagsAcquired || []) || []),
        ...(explorationResult.rewards?.flagsAcquired || []),
      ].filter((flag, i, arr) => arr.indexOf(flag) === i);

      // 행동 게이지 소모 및 Day 전환 처리 (동적 비용 적용 - 재방문/위험 구역)
      const { newState: stateAfterAP, shouldAdvanceDay, newDay, apCostInfo } = consumeActionPoint(
        newSaveState,
        scenario,
        'exploration',
        location.locationId,
        {
          statChanges: Object.keys(allStatChanges).length > 0 ? allStatChanges : undefined,
          flagsAcquired: allFlagsAcquired.length > 0 ? allFlagsAcquired : undefined,
          infoGained: explorationResult.rewards?.infoGained,
        }
      );

      setSaveState(stateAfterAP);
      setGameMode('choice'); // 탐색 후 선택 모드로 복귀

      // 동적 비용 피드백 (보너스가 있으면 서사적 메시지로 표시)
      if (apCostInfo?.bonus && apCostInfo.adjustedCost !== 1) {
        console.log(`🗺️ 탐색 비용 조정: ${apCostInfo.bonus}`);
      }

      if (shouldAdvanceDay) {
        console.log(`🌅 Day ${newDay}로 전환됨 - AP 소진 (탐색)`);
      }

      // 엔딩 체크 (엔딩 체크 시점 이후 항상 체크 - handlePlayerChoice와 동일)
      const currentDay = stateAfterAP.context.currentDay || 1;
      const survivorCount = stateAfterAP.community.survivors.length;

      if (canCheckEnding(currentDay, scenario)) {
        const currentPlayerState: PlayerState = {
          stats: stateAfterAP.context.scenarioStats,
          flags: stateAfterAP.context.flags,
          traits: [],
          relationships: stateAfterAP.community.hiddenRelationships,
        };

        let ending = checkEndingConditions(
          currentPlayerState,
          scenario.endingArchetypes,
          survivorCount
        );

        if (ending) {
          console.log(`🎯 Day ${currentDay} 탐색 후 엔딩 조건 만족: ${ending.title}`);
        }

        // 시간제한 엔딩 체크 (handlePlayerChoice와 동일)
        if (!ending && scenario.endCondition.type === 'time_limit') {
          const timeLimit = scenario.endCondition.value || 0;
          const currentHours = stateAfterAP.context.remainingHours || Infinity;
          const isTimeUp =
            scenario.endCondition.unit === 'days'
              ? currentDay > timeLimit
              : currentHours <= 0;

          if (isTimeUp) {
            console.log(`⏰ 시간 제한 도달! Day ${currentDay}/${timeLimit}`);
            ending = checkEndingConditions(currentPlayerState, scenario.endingArchetypes, survivorCount);
            if (!ending) {
              ending = scenario.endingArchetypes.find((e) => e.endingId === 'ENDING_TIME_UP') || null;
            }
            if (!ending) {
              const totalDays = scenario.endCondition.value || 7;
              ending = {
                endingId: 'DEFAULT_TIME_UP',
                title: '결단의 시간',
                description: `${totalDays}일의 시간이 흘렀다. 모든 결정과 희생이 이 순간을 위해 존재했다.`,
                systemConditions: [],
                isGoalSuccess: false,
              };
            }
          }
        }

        if (ending) {
          setTriggeredEnding(ending);
        }
      }
    } catch (err) {
      console.error('🔍 탐색 오류:', err);
      setError('탐색 중 오류가 발생했습니다.');
    } finally {
      setIsExplorationLoading(false);
    }
  };

  // v1.2: handleFreeTextSubmit 제거됨 - handlePlayerChoice(text, true)로 통합

  // 동적 엔딩 생성 중 로딩 표시
  if (isGeneratingEnding) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-telos-black text-zinc-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/20 via-transparent to-transparent" />
        <div className="relative z-10 text-center space-y-4">
          <div className="animate-pulse">
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-xl font-bold text-zinc-200">결말을 생성하고 있습니다...</h2>
            <p className="text-zinc-400 text-sm mt-2">당신의 여정을 분석하고 있습니다</p>
          </div>
        </div>
      </div>
    );
  }

  // 동적 엔딩 표시
  if (dynamicEnding) {
    return (
      <>
        <DynamicEndingDisplay
          ending={dynamicEnding}
          onClose={() => {
            // 로비로 이동
            window.location.href = '/lobby';
          }}
        />
      </>
    );
  }

  if (triggeredEnding) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-telos-black text-zinc-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
          <span className="mb-6 inline-block border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            {triggeredEnding.isGoalSuccess ? 'Mission Complete' : 'Game Over'}
          </span>
          <h1 className="mb-6 font-serif text-4xl font-bold text-white md:text-5xl">
            {triggeredEnding.title}
          </h1>
          <div className="mx-auto mb-8 h-1 w-20 bg-red-900" />
          <p className="text-lg leading-relaxed text-zinc-400">
            {triggeredEnding.description}
          </p>
          <a
            href="/lobby"
            className="mt-10 inline-block border border-red-700 bg-red-900 px-8 py-3 font-bold text-white shadow-[0_0_15px_rgba(127,29,29,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-red-800"
          >
            로비로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const isUrgent = detectUrgency(
    saveState.dilemma.choice_a,
    saveState.dilemma.choice_b,
  );

  return (
    <div className="flex h-screen w-full flex-col bg-telos-black text-zinc-100">
      {/* Language Warning Banner */}
      {languageWarning && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-4 py-2 text-center text-sm text-red-400">
          {languageWarning}
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

      {/* Phase 3: 게임 모드별 패널 */}
      {gameMode === 'dialogue' ? (
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
          <div className="mx-auto max-w-2xl">
            <CharacterDialoguePanel
              scenario={scenario}
              saveState={saveState}
              onSelectCharacter={handleDialogueSelect}
              onClose={() => setGameMode('choice')}
              isLoading={isDialogueLoading}
            />
          </div>
        </div>
      ) : gameMode === 'exploration' ? (
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-telos-black via-telos-black/95 to-transparent p-4">
          <div className="mx-auto max-w-2xl">
            <ExplorationPanel
              scenario={scenario}
              saveState={saveState}
              onExplore={handleExplore}
              onClose={() => setGameMode('choice')}
              isLoading={isExplorationLoading}
            />
          </div>
        </div>
      ) : (
        /* Sticky Choice Buttons - Always visible at bottom */
        <ChoiceButtons
          isLoading={isLoading || isInitialDilemmaLoading}
          error={error}
          saveState={saveState}
          isUrgent={isUrgent}
          handlePlayerChoice={handlePlayerChoice}
          isInitialLoading={isInitialDilemmaLoading}
          onOpenDialogue={() => setGameMode('dialogue')}
          onOpenExploration={() => setGameMode('exploration')}
          gameMode={gameMode}
          enableDialogue={true}
          enableExploration={true}
          enableCustomInput={true}
        />
      )}
    </div>
  );
}
