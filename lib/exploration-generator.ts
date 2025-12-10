import { ExplorationLocation, ExplorationResult, SaveState, ScenarioData } from '@/types';
import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { getKoreanStatName } from '@/constants/korean-english-mapping';

// 탐색 프롬프트 빌드
const buildExplorationPrompt = (
  location: ExplorationLocation,
  saveState: SaveState,
  scenario: ScenarioData
): string => {
  const currentDay = saveState.context.currentDay || 1;

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

  // 사용 가능한 플래그들
  const availableFlags = scenario.flagDictionary
    .filter((f) => !saveState.context.flags[f.flagName])
    .slice(0, 5)
    .map((f) => f.flagName);

  const prompt = `당신은 ${scenario.title}의 게임 마스터입니다.

## 현재 상황
- Day ${currentDay}/${scenario.endCondition.value || 7}
- 주요 스탯: ${statsSummary}

## 탐색 장소
- 장소: ${location.name}
- 설명: ${location.description}

## 요청
플레이어가 "${location.name}"을(를) 탐색합니다. 짧은 탐색 결과 서사와 보상을 생성해주세요.

## 응답 규칙
1. 서사는 2-3문장으로 간결하게
2. 보상은 선택적입니다 (없어도 됨)
3. 스탯 변화는 -5 ~ +5 범위 내
4. 반드시 한국어로만 응답
5. 분위기는 ${scenario.genre?.join(', ') || '서바이벌'} 장르에 맞게

## 사용 가능한 스탯 ID
${availableStatIds.join(', ')}

## 부여 가능한 플래그 (선택적)
${availableFlags.length > 0 ? availableFlags.join(', ') : '없음'}

## 출력 형식 (JSON만 출력)
{
  "narrative": "탐색 결과 서사 (2-3문장)",
  "rewards": {
    "statChanges": { "스탯ID": 변화량 } 또는 null,
    "flagsAcquired": ["플래그명"] 또는 null,
    "infoGained": "획득한 정보" 또는 null
  }
}

rewards의 각 필드는 모두 null일 수 있습니다 (아무것도 발견하지 못한 경우).
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

// 탐색 결과 생성
export const generateExplorationResult = async (
  location: ExplorationLocation,
  saveState: SaveState,
  scenario: ScenarioData
): Promise<ExplorationResult> => {
  try {
    const userPrompt = buildExplorationPrompt(location, saveState, scenario);

    console.log(`🔍 탐색 결과 생성 요청: ${location.name}`);

    const response = await callGeminiAPI({
      systemPrompt: `당신은 ${scenario.title}의 게임 마스터입니다. 플레이어의 탐색 행동에 대한 결과를 JSON 형식으로 생성합니다.`,
      userPrompt,
      temperature: 0.7,
      maxTokens: 400,
    });

    if (!response) {
      console.warn('🔍 탐색 API 응답 없음, 폴백 사용');
      return generateFallbackExplorationResult(location);
    }

    const parsed = parseGeminiJsonResponse<{
      narrative: string;
      rewards?: {
        statChanges?: { [key: string]: number } | null;
        flagsAcquired?: string[] | null;
        infoGained?: string | null;
      };
    }>(response);

    if (!parsed || !parsed.narrative) {
      console.warn('🔍 탐색 파싱 실패, 폴백 사용');
      return generateFallbackExplorationResult(location);
    }

    console.log(`🔍 탐색 결과 생성 완료: "${parsed.narrative.substring(0, 50)}..."`);

    return {
      locationId: location.locationId,
      narrative: parsed.narrative,
      rewards: parsed.rewards
        ? {
            statChanges: parsed.rewards.statChanges || undefined,
            flagsAcquired: parsed.rewards.flagsAcquired || undefined,
            infoGained: parsed.rewards.infoGained || undefined,
          }
        : undefined,
    };
  } catch (error) {
    console.error('🔍 탐색 생성 오류:', error);
    return generateFallbackExplorationResult(location);
  }
};
