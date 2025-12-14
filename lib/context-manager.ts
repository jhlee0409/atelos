/**
 * 맥락 연결 시스템 (Context Linking System)
 * 탐색, 대화, 선택지가 서로 연결되어 자연스러운 스토리 흐름을 만듭니다.
 */

import {
  ActionContext,
  CharacterPresence,
  DiscoveredClue,
  DynamicLocation,
  SaveState,
  ScenarioData,
} from '@/types';

// ClueId 카운터 (충돌 방지)
let clueIdCounter = 0;

/**
 * 고유한 clueId 생성 (충돌 방지)
 * @param source 출처 타입 ('exploration', 'dialogue', 'choice')
 * @param identifier 추가 식별자 (locationId, characterName 등)
 */
const generateClueId = (source: string, identifier: string): string => {
  clueIdCounter++;
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `clue_${source}_${identifier}_${Date.now()}_${clueIdCounter}_${randomPart}`;
};

// =============================================================================
// 초기 맥락 생성
// =============================================================================

/**
 * 시나리오 시작 시 초기 ActionContext 생성
 */
export const createInitialContext = (
  scenario: ScenarioData,
  saveState: SaveState
): ActionContext => {
  const currentDay = saveState.context.currentDay || 1;

  // v1.2: 시나리오 설정에서 초기 위치 가져오기
  const initialLocation = scenario.storyOpening?.openingLocation || '본부';

  // 캐릭터 초기 위치/상태 설정
  const characterPresences: CharacterPresence[] = scenario.characters.map((char) => ({
    characterName: char.characterName,
    currentLocation: initialLocation,
    availableForDialogue: true,
    currentActivity: '대기 중',
  }));

  // 기본 탐색 가능 위치
  const availableLocations: DynamicLocation[] = [
    {
      locationId: 'main_area',
      name: initialLocation,
      description: '현재 머물고 있는 주요 거점입니다.',
      available: true,
      type: 'interior',
    },
    {
      locationId: 'surroundings',
      name: '주변 구역',
      description: `${initialLocation} 근처를 둘러볼 수 있습니다.`,
      available: true,
      type: 'exterior',
    },
  ];

  return {
    currentLocation: initialLocation,
    currentSituation: scenario.synopsis.substring(0, 200),
    todayActions: {
      explorations: [],
      dialogues: [],
      choices: [],
    },
    discoveredClues: [],
    urgentMatters: [],
    characterPresences,
    availableLocations,
    lastUpdated: {
      day: currentDay,
      actionIndex: 0,
    },
  };
};

// =============================================================================
// 맥락 업데이트
// =============================================================================

/**
 * 탐색 결과 후 맥락 업데이트
 * v1.2: significantDiscoveries 지원 추가
 */
export const updateContextAfterExploration = (
  context: ActionContext,
  locationName: string,
  narrative: string,
  rewards?: {
    statChanges?: Record<string, number>;
    // [v1.4 REMOVED] flagsAcquired - significantDiscoveries로 대체됨
    significantDiscoveries?: string[]; // v1.2: 발견한 주요 사항들
    infoGained?: string;
  },
  currentDay: number = 1
): ActionContext => {
  const actionIndex = (context.lastUpdated.actionIndex || 0) + 1;

  // 오늘 탐색 기록 추가
  const newTodayActions = {
    ...context.todayActions,
    explorations: [
      ...context.todayActions.explorations,
      { location: locationName, result: narrative.substring(0, 100) },
    ],
  };

  // 단서 추가 (정보 획득 시)
  const newClues: DiscoveredClue[] = [...context.discoveredClues];

  // v1.2: infoGained를 단서로 추가
  if (rewards?.infoGained) {
    newClues.push({
      clueId: generateClueId('exploration', locationName),
      content: rewards.infoGained,
      source: {
        type: 'exploration',
        locationId: locationName,
      },
      discoveredAt: { day: currentDay, actionIndex },
      importance: rewards.significantDiscoveries?.length ? 'high' : 'medium',
    });
  }

  // v1.2: significantDiscoveries도 개별 단서로 추가
  if (rewards?.significantDiscoveries?.length) {
    rewards.significantDiscoveries.forEach((discovery, idx) => {
      // infoGained와 중복되지 않는 것만 추가
      if (!rewards.infoGained || !rewards.infoGained.includes(discovery)) {
        newClues.push({
          clueId: generateClueId('exploration', `${locationName}_${idx}`),
          content: discovery,
          source: {
            type: 'exploration',
            locationId: locationName,
          },
          discoveredAt: { day: currentDay, actionIndex: actionIndex + idx + 1 },
          importance: 'medium',
        });
      }
    });
  }

  return {
    ...context,
    currentLocation: locationName, // v1.2: 탐색 시 현재 위치 업데이트
    todayActions: newTodayActions,
    discoveredClues: newClues,
    lastUpdated: { day: currentDay, actionIndex },
  };
};

/**
 * 대화 결과 후 맥락 업데이트
 */
export const updateContextAfterDialogue = (
  context: ActionContext,
  characterName: string,
  topic: string,
  dialogue: string,
  infoGained?: string,
  currentDay: number = 1
): ActionContext => {
  const actionIndex = (context.lastUpdated.actionIndex || 0) + 1;

  // 오늘 대화 기록 추가
  const newTodayActions = {
    ...context.todayActions,
    dialogues: [
      ...context.todayActions.dialogues,
      { character: characterName, topic, outcome: dialogue.substring(0, 80) },
    ],
  };

  // 단서 추가 (정보 획득 시)
  const newClues: DiscoveredClue[] = [...context.discoveredClues];
  if (infoGained) {
    newClues.push({
      clueId: generateClueId('dialogue', characterName),
      content: infoGained,
      source: {
        type: 'dialogue',
        characterName,
      },
      discoveredAt: { day: currentDay, actionIndex },
      importance: 'medium',
      relatedCharacters: [characterName],
    });
  }

  // 캐릭터 마지막 상호작용 업데이트
  const updatedPresences = context.characterPresences.map((p) =>
    p.characterName === characterName
      ? {
          ...p,
          lastInteraction: {
            day: currentDay,
            type: 'dialogue' as const,
            summary: topic,
          },
        }
      : p
  );

  return {
    ...context,
    todayActions: newTodayActions,
    discoveredClues: newClues,
    characterPresences: updatedPresences,
    lastUpdated: { day: currentDay, actionIndex },
  };
};

/**
 * 선택지 선택 후 맥락 업데이트
 */
export const updateContextAfterChoice = (
  context: ActionContext,
  choice: string,
  consequence: string,
  currentDay: number = 1
): ActionContext => {
  const actionIndex = (context.lastUpdated.actionIndex || 0) + 1;

  // 오늘 선택 기록 추가
  const newTodayActions = {
    ...context.todayActions,
    choices: [
      ...context.todayActions.choices,
      { choice: choice.substring(0, 50), consequence: consequence.substring(0, 100) },
    ],
  };

  return {
    ...context,
    todayActions: newTodayActions,
    currentSituation: consequence.substring(0, 200),
    lastUpdated: { day: currentDay, actionIndex },
  };
};

/**
 * [남은 이슈 #2] 스탯 기반 urgentMatters 업데이트
 * 스탯이 위험 수준(40% 이하)일 때 긴급 사안으로 추가
 */
export const updateUrgentMatters = (
  stats: Record<string, number>,
  statRanges: Record<string, { min: number; max: number }>,
  statNameMap?: Record<string, string>
): string[] => {
  const urgentMatters: string[] = [];
  const CRITICAL_THRESHOLD = 0.4; // 40% 이하면 위험

  for (const [statId, value] of Object.entries(stats)) {
    const range = statRanges[statId];
    if (!range) continue;

    const percentage = (value - range.min) / (range.max - range.min);

    if (percentage <= CRITICAL_THRESHOLD) {
      const statName = statNameMap?.[statId] || statId;
      const percentDisplay = Math.round(percentage * 100);
      urgentMatters.push(`⚠️ ${statName} 위험 수준 (${percentDisplay}%)`);
    }
  }

  return urgentMatters;
};

/**
 * Day 전환 시 맥락 리셋 (단서는 유지)
 */
export const resetContextForNewDay = (
  context: ActionContext,
  newDay: number
): ActionContext => {
  return {
    ...context,
    todayActions: {
      explorations: [],
      dialogues: [],
      choices: [],
    },
    urgentMatters: [], // 긴급 사안은 매일 리셋
    lastUpdated: { day: newDay, actionIndex: 0 },
  };
};

// =============================================================================
// 맥락 요약 (프롬프트용)
// =============================================================================

/**
 * 현재 맥락을 AI 프롬프트에 포함할 수 있는 형태로 요약
 */
export const buildContextSummary = (context: ActionContext): string => {
  const parts: string[] = [];

  // 오늘 탐색
  if (context.todayActions.explorations.length > 0) {
    parts.push(
      `[탐색] ${context.todayActions.explorations
        .map((e) => `${e.location}: ${e.result}`)
        .join(' / ')}`
    );
  }

  // 오늘 대화
  if (context.todayActions.dialogues.length > 0) {
    parts.push(
      `[대화] ${context.todayActions.dialogues
        .map((d) => `${d.character}와 ${d.topic}에 대해 대화함`)
        .join(' / ')}`
    );
  }

  // 오늘 선택
  if (context.todayActions.choices.length > 0) {
    parts.push(
      `[선택] ${context.todayActions.choices
        .map((c) => c.consequence)
        .join(' → ')}`
    );
  }

  return parts.length > 0 ? parts.join('\n') : '오늘 아직 특별한 행동 없음';
};

/**
 * 발견한 단서 요약 (최근 5개)
 */
export const buildCluesSummary = (context: ActionContext): string => {
  if (context.discoveredClues.length === 0) {
    return '아직 발견한 단서 없음';
  }

  return context.discoveredClues
    .slice(-5)
    .map((c) => {
      const source =
        c.source.type === 'exploration'
          ? `${c.source.locationId}에서`
          : c.source.type === 'dialogue'
            ? `${c.source.characterName}에게서`
            : '선택을 통해';
      return `- ${source} 발견: ${c.content}`;
    })
    .join('\n');
};

/**
 * 전체 맥락을 AI 프롬프트용으로 포맷팅
 */
export const formatContextForPrompt = (context: ActionContext): string => {
  return `
## 현재 위치
${context.currentLocation}

## 오늘의 맥락
${buildContextSummary(context)}

## 발견한 단서
${buildCluesSummary(context)}

## 긴급 사안
${context.urgentMatters.length > 0 ? context.urgentMatters.map((m) => `⚠️ ${m}`).join('\n') : '없음'}
`.trim();
};
