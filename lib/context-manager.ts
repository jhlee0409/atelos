/**
 * 맥락 연결 시스템 (Context Linking System)
 * 탐색, 대화, 선택지가 서로 연결되어 자연스러운 스토리 흐름을 만듭니다.
 */

import {
  ActionContext,
  CharacterPresence,
  DiscoveredClue,
  DynamicLocation,
  ContextUpdate,
  SaveState,
  ScenarioData,
  ActionRecord,
} from '@/types';
import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { getRouteActivationDay, getEndingCheckDay } from './gameplay-config';

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

  // 캐릭터 초기 위치/상태 설정
  const characterPresences: CharacterPresence[] = scenario.characters.map((char) => ({
    characterName: char.characterName,
    currentLocation: '본부', // 기본 위치
    availableForDialogue: true,
    currentActivity: '대기 중',
  }));

  // 기본 탐색 가능 위치
  const availableLocations: DynamicLocation[] = [
    {
      locationId: 'main_area',
      name: '본부',
      description: '현재 머물고 있는 주요 거점입니다.',
      available: true,
      type: 'interior',
    },
    {
      locationId: 'surroundings',
      name: '주변 구역',
      description: '본부 근처를 둘러볼 수 있습니다.',
      available: true,
      type: 'exterior',
    },
  ];

  return {
    currentLocation: '본부',
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
    flagsAcquired?: string[]; // @deprecated - use significantDiscoveries
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
// 동적 탐색 위치 생성
// =============================================================================

/**
 * 현재 맥락을 기반으로 동적 탐색 위치 생성
 */
export const generateDynamicLocations = async (
  context: ActionContext,
  saveState: SaveState,
  scenario: ScenarioData
): Promise<DynamicLocation[]> => {
  const currentDay = saveState.context.currentDay || 1;

  // 오늘 이미 방문한 장소들
  const visitedToday = context.todayActions.explorations.map((e) => e.location);

  // 맥락 요약
  const contextSummary = buildContextSummary(context);

  const prompt = `당신은 ${scenario.title}의 게임 마스터입니다.

## 현재 상황
- Day ${currentDay}/${scenario.endCondition.value || 7}
- 현재 위치: ${context.currentLocation}
- 상황: ${context.currentSituation}

## 오늘의 행동
${contextSummary}

## 발견한 단서
${context.discoveredClues.slice(-5).map((c) => `- ${c.content}`).join('\n') || '없음'}

## 요청
현재 상황에서 플레이어가 탐색할 수 있는 장소 3-4개를 생성해주세요.
- 이전에 발견한 단서와 연관된 새로운 장소
- 현재 상황과 자연스럽게 연결되는 장소
- 오늘 이미 방문한 장소 제외: ${visitedToday.join(', ') || '없음'}

## 출력 형식 (JSON)
{
  "locations": [
    {
      "locationId": "unique_id",
      "name": "장소 이름",
      "description": "현재 상황과 연결된 설명 (30자 이내)",
      "type": "interior|exterior|hidden|temporary",
      "hint": "이곳에서 발견할 수 있는 것 힌트 (20자 이내)",
      "available": true
    }
  ]
}`;

  try {
    const response = await callGeminiAPI({
      systemPrompt: '게임 탐색 위치를 생성하는 AI입니다. JSON만 출력합니다.',
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 600,
    });

    const parsed = parseGeminiJsonResponse<{
      locations: DynamicLocation[];
    }>(response);

    if (parsed?.locations?.length) {
      console.log(`🗺️ 동적 위치 ${parsed.locations.length}개 생성`);
      return parsed.locations;
    }
  } catch (error) {
    console.error('🗺️ 동적 위치 생성 실패:', error);
  }

  // 폴백: 기본 위치 반환
  return generateFallbackLocations(context, currentDay, scenario);
};

/**
 * 폴백 탐색 위치
 */
const generateFallbackLocations = (
  context: ActionContext,
  currentDay: number,
  scenario?: ScenarioData | null
): DynamicLocation[] => {
  const visitedToday = context.todayActions.explorations.map((e) => e.location);

  // 동적 Day 계산
  const routeActivationDay = getRouteActivationDay(scenario);
  const endingCheckDay = getEndingCheckDay(scenario);

  const baseLocations: DynamicLocation[] = [
    {
      locationId: 'storage',
      name: '창고',
      description: '물자가 보관된 곳입니다.',
      type: 'interior',
      available: true,
      hint: '보급품을 찾을 수 있을지도',
    },
    {
      locationId: 'entrance',
      name: '입구 근처',
      description: '외부 상황을 살필 수 있습니다.',
      type: 'exterior',
      available: true,
      hint: '외부 동향 파악',
    },
    {
      locationId: 'rest_area',
      name: '휴게 구역',
      description: '사람들이 쉬는 공간입니다.',
      type: 'interior',
      available: true,
      hint: '누군가의 이야기를 들을 수 있을지도',
    },
  ];

  // 루트 활성화 시점 이후 추가 위치 (기본: Day 3+ for 7일 게임)
  if (currentDay >= routeActivationDay) {
    baseLocations.push({
      locationId: 'roof',
      name: '옥상',
      description: '전체 상황을 조망할 수 있습니다.',
      type: 'exterior',
      available: true,
      hint: '주변 전체 상황 파악',
    });
  }

  // 엔딩 체크 시점 이후 추가 위치 (기본: Day 5+ for 7일 게임)
  if (currentDay >= endingCheckDay) {
    baseLocations.push({
      locationId: 'basement',
      name: '지하',
      description: '아직 탐색하지 않은 어두운 곳.',
      type: 'hidden',
      available: true,
      hint: '숨겨진 무언가가 있을지도',
    });
  }

  // 오늘 방문한 곳 제외
  return baseLocations.filter((loc) => !visitedToday.includes(loc.name));
};

// =============================================================================
// 동적 대화 상대 결정
// =============================================================================

/**
 * 현재 맥락을 기반으로 대화 가능한 캐릭터 결정
 */
export const generateDynamicCharacters = async (
  context: ActionContext,
  saveState: SaveState,
  scenario: ScenarioData
): Promise<CharacterPresence[]> => {
  const currentDay = saveState.context.currentDay || 1;

  // 오늘 이미 대화한 캐릭터들
  const talkedToday = context.todayActions.dialogues.map((d) => d.character);

  // 맥락 요약
  const contextSummary = buildContextSummary(context);

  const characterList = scenario.characters
    .map((c) => `- ${c.characterName} (${c.roleName}): ${c.backstory.substring(0, 50)}`)
    .join('\n');

  const prompt = `당신은 ${scenario.title}의 게임 마스터입니다.

## 현재 상황
- Day ${currentDay}/${scenario.endCondition.value || 7}
- 현재 위치: ${context.currentLocation}
- 상황: ${context.currentSituation}

## 캐릭터 목록
${characterList}

## 오늘의 행동
${contextSummary}

## 요청
현재 상황에서 각 캐릭터가 어디서 무엇을 하고 있는지, 대화 가능한지 결정해주세요.
- 오늘 이미 대화한 캐릭터: ${talkedToday.join(', ') || '없음'}
- 스토리 맥락에 맞게 캐릭터 위치/활동 설정
- 이미 대화한 캐릭터도 다른 활동 중일 수 있음

## 출력 형식 (JSON)
{
  "characters": [
    {
      "characterName": "이름",
      "currentLocation": "현재 위치",
      "currentActivity": "현재 하는 일 (20자 이내)",
      "availableForDialogue": true/false,
      "unavailableReason": "대화 불가 사유 (불가일 때만)"
    }
  ]
}`;

  try {
    const response = await callGeminiAPI({
      systemPrompt: '게임 캐릭터 상태를 생성하는 AI입니다. JSON만 출력합니다.',
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 600,
    });

    const parsed = parseGeminiJsonResponse<{
      characters: CharacterPresence[];
    }>(response);

    if (parsed?.characters?.length) {
      console.log(`👥 동적 캐릭터 상태 ${parsed.characters.length}개 생성`);
      return parsed.characters;
    }
  } catch (error) {
    console.error('👥 동적 캐릭터 생성 실패:', error);
  }

  // 폴백: 기존 상태 반환
  return context.characterPresences;
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
## 오늘의 맥락
${buildContextSummary(context)}

## 발견한 단서
${buildCluesSummary(context)}

## 긴급 사안
${context.urgentMatters.length > 0 ? context.urgentMatters.map((m) => `⚠️ ${m}`).join('\n') : '없음'}
`.trim();
};
