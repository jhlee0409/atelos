import {
  ExplorationLocation,
  ExplorationResult,
  SaveState,
  ScenarioData,
  ActionContext,
  WorldState,
  ConcreteDiscovery,
  WorldLocation,
} from '@/types';
import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { getKoreanStatName } from '@/constants/korean-english-mapping';
import { buildContextSummary, buildCluesSummary } from './context-manager';
import {
  getDiscoverableItems,
  processExploration,
  summarizeWorldState,
} from './world-state-manager';

// 탐색 프롬프트 빌드 (WorldState 활용)
const buildExplorationPrompt = (
  location: ExplorationLocation | WorldLocation | { locationId: string; name: string; description: string },
  saveState: SaveState,
  scenario: ScenarioData,
  discoverableItems: ConcreteDiscovery[] = []
): string => {
  const currentDay = saveState.context.currentDay || 1;
  const actionContext = saveState.context.actionContext;
  const worldState = saveState.context.worldState;

  // 현재 스탯 상황
  const statsSummary = Object.entries(saveState.context.scenarioStats)
    .map(([id, value]) => {
      const statDef = scenario.scenarioStats.find((s) => s.id === id);
      const koreanName = statDef?.name || getKoreanStatName(id) || id;
      const max = statDef?.max || 100;
      const percentage = Math.round((value / max) * 100);
      return `${koreanName}: ${percentage}%`;
    })
    .join(', ');

  // 사용 가능한 스탯 ID들
  const availableStatIds = scenario.scenarioStats.map((s) => s.id);

  // 오늘의 맥락 (이전 행동들)
  const contextSummary = actionContext ? buildContextSummary(actionContext) : '첫 탐색';
  const cluesSummary = actionContext ? buildCluesSummary(actionContext) : '없음';

  // 월드 상태 요약
  const worldSummary = worldState ? summarizeWorldState(worldState) : '정보 없음';

  // 발견 가능한 구체적 아이템 목록
  const discoverableItemsStr = discoverableItems.length > 0
    ? discoverableItems.map((item) => `- ${item.name} (${item.type}): ${item.description}`).join('\n')
    : '특별히 예정된 발견물 없음';

  const prompt = `당신은 ${scenario.title}의 게임 마스터입니다.

## 현재 상황
- Day ${currentDay}/${scenario.endCondition.value || 7}
- 주요 스탯: ${statsSummary}

## 월드 상태
${worldSummary}

## 오늘의 맥락 (이전 행동과 연결할 것)
${contextSummary}

## 발견한 단서
${cluesSummary}

## 탐색 장소
- 장소: ${location.name}
- 설명: ${'currentDescription' in location ? location.currentDescription : location.description}

## 발견 가능한 아이템 (구체적으로 사용할 것)
${discoverableItemsStr}

## 요청
플레이어가 "${location.name}"을(를) 탐색합니다.

**중요 규칙:**
1. 발견물은 반드시 구체적이어야 합니다:
   - ✅ 좋은 예: "녹슨 서랍에서 응급 치료 키트를 발견했다"
   - ✅ 좋은 예: "벽에 붙은 건물 도면을 발견했다. 지하로 가는 통로가 표시되어 있다"
   - ❌ 나쁜 예: "도시 전체에 퍼져 있는 보이지 않는 위협을 감지했다"
   - ❌ 나쁜 예: "뭔가 불길한 기운이 느껴진다"
2. 정보도 구체적이어야 합니다:
   - ✅ 좋은 예: "창문 너머로 동쪽 3블록 거리에서 연기가 피어오르는 것이 보인다"
   - ❌ 나쁜 예: "상황이 좋지 않아 보인다"
3. 아무것도 발견하지 못했다면 왜 그런지 구체적으로 설명하세요

## 응답 규칙
1. 서사는 2-3문장으로 간결하게
2. 발견물은 위 목록에서 선택하거나, 유사한 구체적 아이템 생성
3. 스탯 변화는 -5 ~ +5 범위 내
4. 반드시 한국어로만 응답
5. 분위기는 ${scenario.genre?.join(', ') || '서바이벌'} 장르에 맞게

## 사용 가능한 스탯 ID
${availableStatIds.join(', ')}

## 출력 형식 (JSON만 출력)
{
  "narrative": "탐색 결과 서사 (2-3문장, 구체적 발견물 포함)",
  "discoveredItem": {
    "name": "발견한 아이템/문서 이름" 또는 null,
    "type": "item|document|equipment|clue|resource" 또는 null,
    "description": "구체적 설명" 또는 null
  },
  "rewards": {
    "statChanges": { "스탯ID": 변화량 } 또는 null,
    "significantDiscoveries": ["발견한 중요 사항"] 또는 null,
    "infoGained": "구체적인 획득 정보 (예: '지하 통로가 창고 뒤편에 있다')" 또는 null
  }
}

JSON만 출력하세요.`;

  return prompt;
};

// 기본 탐색 결과 (폴백)
const generateFallbackExplorationResult = (
  location: ExplorationLocation
): ExplorationResult => {
  const fallbackResults: Record<string, ExplorationResult> = {
    storage: {
      locationId: 'storage',
      narrative: '창고를 둘러보았다. 대부분의 물자는 이미 정리되어 있었지만, 구석에서 쓸만한 물품 몇 가지를 발견했다.',
      rewards: {
        statChanges: { survivalFoundation: 2 },
      },
    },
    entrance: {
      locationId: 'entrance',
      narrative: '입구 근처에서 외부 상황을 살폈다. 멀리서 희미한 소리가 들려왔지만, 당장 위험해 보이진 않았다.',
      rewards: {
        infoGained: '외부 상황이 비교적 안정적임을 확인',
      },
    },
    medical: {
      locationId: 'medical',
      narrative: '의무실을 점검했다. 부상자들은 안정적인 상태였고, 의료 물자는 충분해 보였다.',
      rewards: undefined,
    },
    roof: {
      locationId: 'roof',
      narrative: '옥상에 올라가 전체 상황을 조망했다. 도시의 모습이 한눈에 들어왔다. 상황은 생각보다 심각했다.',
      rewards: {
        infoGained: '주변 지역의 전체적인 상황 파악',
      },
    },
    basement: {
      locationId: 'basement',
      narrative: '지하 공간을 탐색했다. 어둡고 습했지만, 아직 발견하지 못했던 보급품이 있었다.',
      rewards: {
        statChanges: { survivalFoundation: 3 },
      },
    },
    quarters: {
      locationId: 'quarters',
      narrative: '숙소 구역을 둘러보았다. 개인 물품들 사이에서 유용할 수 있는 물건들을 발견했다.',
      rewards: undefined,
    },
  };

  return (
    fallbackResults[location.locationId] || {
      locationId: location.locationId,
      narrative: `${location.name}을(를) 탐색했지만, 특별히 눈에 띄는 것은 없었다.`,
      rewards: undefined,
    }
  );
};

// 탐색 결과 생성 (기본 버전 - 하위 호환성 유지)
// v1.5: selectedProtagonistId 추가 (Issue 3 fix)
export const generateExplorationResult = async (
  location: ExplorationLocation,
  saveState: SaveState,
  scenario: ScenarioData,
  selectedProtagonistId?: string
): Promise<ExplorationResult> => {
  try {
    const worldState = saveState.context.worldState;
    const discoverableItems = worldState
      ? getDiscoverableItems(worldState, location.locationId, saveState)
      : [];

    const userPrompt = buildExplorationPrompt(location, saveState, scenario, discoverableItems);

    console.log(`🔍 탐색 결과 생성 요청: ${location.name}`);

    const response = await callGeminiAPI({
      systemPrompt: `당신은 ${scenario.title}의 게임 마스터입니다. 플레이어의 탐색 행동에 대한 결과를 JSON 형식으로 생성합니다. 발견물은 반드시 구체적인 아이템이나 정보여야 합니다.`,
      userPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    if (!response) {
      console.warn('🔍 탐색 API 응답 없음, 폴백 사용');
      return generateFallbackExplorationResult(location);
    }

    const parsed = parseGeminiJsonResponse<{
      narrative: string;
      discoveredItem?: {
        name?: string | null;
        type?: string | null;
        description?: string | null;
      } | null;
      rewards?: {
        statChanges?: { [key: string]: number } | null;
        // [v1.4 REMOVED] flagsAcquired - Dynamic Ending System에서 significantDiscoveries로 대체
        significantDiscoveries?: string[] | null;
        infoGained?: string | null;
      };
    }>(response);

    if (!parsed || !parsed.narrative) {
      console.warn('🔍 탐색 파싱 실패, 폴백 사용');
      return generateFallbackExplorationResult(location);
    }

    console.log(`🔍 탐색 결과 생성 완료: "${parsed.narrative.substring(0, 50)}..."`);

    // discoveredItem이 있으면 infoGained에 추가
    let infoGained = parsed.rewards?.infoGained || undefined;
    if (parsed.discoveredItem?.name && parsed.discoveredItem?.description) {
      const itemInfo = `${parsed.discoveredItem.name}: ${parsed.discoveredItem.description}`;
      infoGained = infoGained ? `${infoGained}. ${itemInfo}` : itemInfo;
    }

    return {
      locationId: location.locationId,
      narrative: parsed.narrative,
      rewards: parsed.rewards || parsed.discoveredItem
        ? {
            statChanges: parsed.rewards?.statChanges || undefined,
            // [v1.4] significantDiscoveries로 대체
            significantDiscoveries: parsed.rewards?.significantDiscoveries || undefined,
            infoGained,
          }
        : undefined,
    };
  } catch (error) {
    console.error('🔍 탐색 생성 오류:', error);
    return generateFallbackExplorationResult(location);
  }
};

// =============================================================================
// WorldState 통합 탐색 결과 생성
// =============================================================================

export interface EnhancedExplorationResult extends ExplorationResult {
  /** 발견한 구체적 아이템 */
  discoveredItems: ConcreteDiscovery[];
  /** 트리거된 월드 이벤트 */
  triggeredEvents: string[];
  /** 상태가 변경된 위치들 */
  locationChanges: { locationId: string; newStatus: string; reason?: string }[];
  /** UI 알림 메시지 */
  notifications: string[];
}

/**
 * WorldState를 활용한 향상된 탐색 결과 생성
 * v1.5: selectedProtagonistId 추가 (Issue 3 fix)
 */
export const generateEnhancedExplorationResult = async (
  location: WorldLocation,
  saveState: SaveState,
  scenario: ScenarioData,
  selectedProtagonistId?: string
): Promise<EnhancedExplorationResult> => {
  const worldState = saveState.context.worldState;

  if (!worldState) {
    // WorldState가 없으면 기본 결과 반환
    const basicResult = await generateExplorationResult(
      {
        locationId: location.locationId,
        name: location.name,
        description: location.currentDescription,
        icon: location.icon,
        available: location.status === 'available',
      },
      saveState,
      scenario
    );
    return {
      ...basicResult,
      discoveredItems: [],
      triggeredEvents: [],
      locationChanges: [],
      notifications: [],
    };
  }

  // WorldState를 사용한 탐색 처리
  const explorationResult = processExploration(worldState, location.locationId, saveState);
  const discoverableItems = getDiscoverableItems(worldState, location.locationId, saveState);

  try {
    // AI를 통한 서사 생성
    const userPrompt = buildExplorationPrompt(location, saveState, scenario, discoverableItems);

    const response = await callGeminiAPI({
      systemPrompt: `당신은 ${scenario.title}의 게임 마스터입니다. 플레이어의 탐색 행동에 대한 결과를 JSON 형식으로 생성합니다. 발견물은 반드시 구체적인 아이템이나 정보여야 합니다.`,
      userPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    if (!response) {
      throw new Error('AI 응답 없음');
    }

    const parsed = parseGeminiJsonResponse<{
      narrative: string;
      discoveredItem?: {
        name?: string | null;
        type?: string | null;
        description?: string | null;
      } | null;
      rewards?: {
        statChanges?: { [key: string]: number } | null;
        // [v1.4 REMOVED] flagsAcquired - significantDiscoveries로 대체
        significantDiscoveries?: string[] | null;
        infoGained?: string | null;
      };
    }>(response);

    if (!parsed?.narrative) {
      throw new Error('파싱 실패');
    }

    // 발견물 정보 구성
    let infoGained = parsed.rewards?.infoGained || undefined;
    if (parsed.discoveredItem?.name && parsed.discoveredItem?.description) {
      const itemInfo = `${parsed.discoveredItem.name}: ${parsed.discoveredItem.description}`;
      infoGained = infoGained ? `${infoGained}. ${itemInfo}` : itemInfo;
    }

    // 알림 메시지 구성
    const notifications = [...explorationResult.notifications];
    if (parsed.discoveredItem?.name) {
      notifications.push(`발견: ${parsed.discoveredItem.name}`);
    }

    // [v1.4] significantDiscoveries 통합
    const significantDiscoveries = [
      ...(parsed.rewards?.significantDiscoveries || []),
      ...explorationResult.newDiscoveries.map((d) => d.name),
    ].filter((item, index, self) => self.indexOf(item) === index); // 중복 제거

    return {
      locationId: location.locationId,
      narrative: parsed.narrative,
      rewards: {
        statChanges: parsed.rewards?.statChanges || undefined,
        significantDiscoveries: significantDiscoveries.length > 0 ? significantDiscoveries : undefined,
        infoGained,
      },
      discoveredItems: explorationResult.newDiscoveries,
      triggeredEvents: explorationResult.triggeredEvents.map((e) => e.description),
      locationChanges: explorationResult.changedLocations.map((c) => ({
        locationId: c.locationId,
        newStatus: c.newStatus,
        reason: c.reason,
      })),
      notifications,
    };
  } catch (error) {
    console.error('🔍 향상된 탐색 생성 오류:', error);

    // 폴백: WorldState 결과만 사용
    return {
      locationId: location.locationId,
      narrative: explorationResult.newDiscoveries.length > 0
        ? `${location.name}을(를) 탐색하여 ${explorationResult.newDiscoveries.map((d) => d.name).join(', ')}을(를) 발견했다.`
        : `${location.name}을(를) 탐색했지만 특별한 것은 발견하지 못했다.`,
      rewards: explorationResult.newDiscoveries.length > 0
        ? {
            infoGained: explorationResult.newDiscoveries.map((d) => `${d.name}: ${d.description}`).join('. '),
            statChanges: explorationResult.newDiscoveries.reduce((acc, d) => {
              if (d.effects?.statChanges) {
                Object.entries(d.effects.statChanges).forEach(([k, v]) => {
                  acc[k] = (acc[k] || 0) + v;
                });
              }
              return acc;
            }, {} as Record<string, number>),
            // [v1.4] significantDiscoveries로 대체
            significantDiscoveries: explorationResult.newDiscoveries.map((d) => d.name),
          }
        : undefined,
      discoveredItems: explorationResult.newDiscoveries,
      triggeredEvents: explorationResult.triggeredEvents.map((e) => e.description),
      locationChanges: explorationResult.changedLocations.map((c) => ({
        locationId: c.locationId,
        newStatus: c.newStatus,
        reason: c.reason,
      })),
      notifications: explorationResult.notifications,
    };
  }
};
