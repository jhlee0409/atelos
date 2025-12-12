/**
 * 게임플레이 설정 유틸리티
 * 하드코딩된 값들을 동적으로 계산하는 헬퍼 함수들
 */

import type { GameplayConfig, ScenarioData, RouteScoreConfig, ActionHistoryEntry } from '@/types';

// ============================================================================
// 기본값 상수 (기존 하드코딩 값들을 여기로 이동)
// ============================================================================

export const DEFAULT_GAMEPLAY_CONFIG: Required<Omit<GameplayConfig, 'routeScores' | 'customFallbackChoices'>> = {
  // Day 기반 설정 (7일 게임 기준)
  routeActivationRatio: 0.4,      // Day 3 (7 * 0.4 ≈ 2.8 → 3)
  endingCheckRatio: 0.7,          // Day 5 (7 * 0.7 ≈ 4.9 → 5)
  narrativePhaseRatios: {
    setup: 0.3,                   // Day 1-2
    rising_action: 0.6,           // Day 3-4
    midpoint: 0.75,               // Day 5
    climax: 1.0,                  // Day 6-7
  },

  // Action Points 설정
  actionPointsPerDay: 3,

  // 스탯 임계값 설정
  criticalStatThreshold: 0.4,     // 40% 미만 = 위험
  warningStatThreshold: 0.5,      // 50% 미만 = 경고

  // AI 토큰 설정
  tokenBudgetMultiplier: 1.0,

  // Fallback 설정
  useGenreFallback: true,
};

// 기본 루트 점수 설정 (ActionHistory 패턴 기반)
export const DEFAULT_ROUTE_SCORES: RouteScoreConfig[] = [
  {
    routeName: '탈출',
    actionPatterns: [
      { description: '탈출 관련 행동', targetKeywords: ['탈출', '도망', '떠나', '차량', '이동'], score: 20 },
      { description: '외부 탐색', actionType: 'exploration', targetKeywords: ['출구', '입구', '외부'], score: 15 },
    ],
    statScores: [
      { statId: 'cityStability', comparison: '<=', threshold: 30, score: 20 },
    ],
  },
  {
    routeName: '항전',
    actionPatterns: [
      { description: '방어 관련 행동', targetKeywords: ['방어', '싸우', '저항', '무기', '경비'], score: 20 },
      { description: '자원 확보', targetKeywords: ['물자', '자원', '비축', '보급'], score: 15 },
    ],
    statScores: [
      { statId: 'groupCohesion', comparison: '>=', threshold: 70, score: 20 },
    ],
  },
  {
    routeName: '협상',
    actionPatterns: [
      { description: '협상/외교 행동', targetKeywords: ['협상', '대화', '동맹', '협력', '연합'], score: 20 },
      { description: '정보 수집', actionType: 'dialogue', targetKeywords: ['정보', '소식', '연락'], score: 15 },
    ],
    statScores: [
      { statId: 'groupCohesion', comparison: '>=', threshold: 50, score: 10 },
    ],
  },
];

// ============================================================================
// 헬퍼 함수: 설정값 가져오기
// ============================================================================

/**
 * 시나리오에서 gameplayConfig를 가져오거나 기본값 반환
 */
export function getGameplayConfig(scenario?: ScenarioData | null): Required<Omit<GameplayConfig, 'routeScores' | 'customFallbackChoices'>> & Pick<GameplayConfig, 'routeScores' | 'customFallbackChoices'> {
  const config = scenario?.gameplayConfig || {};

  return {
    routeActivationRatio: config.routeActivationRatio ?? DEFAULT_GAMEPLAY_CONFIG.routeActivationRatio,
    endingCheckRatio: config.endingCheckRatio ?? DEFAULT_GAMEPLAY_CONFIG.endingCheckRatio,
    narrativePhaseRatios: config.narrativePhaseRatios ?? DEFAULT_GAMEPLAY_CONFIG.narrativePhaseRatios,
    actionPointsPerDay: config.actionPointsPerDay ?? DEFAULT_GAMEPLAY_CONFIG.actionPointsPerDay,
    criticalStatThreshold: config.criticalStatThreshold ?? DEFAULT_GAMEPLAY_CONFIG.criticalStatThreshold,
    warningStatThreshold: config.warningStatThreshold ?? DEFAULT_GAMEPLAY_CONFIG.warningStatThreshold,
    tokenBudgetMultiplier: config.tokenBudgetMultiplier ?? DEFAULT_GAMEPLAY_CONFIG.tokenBudgetMultiplier,
    useGenreFallback: config.useGenreFallback ?? DEFAULT_GAMEPLAY_CONFIG.useGenreFallback,
    routeScores: config.routeScores,
    customFallbackChoices: config.customFallbackChoices,
  };
}

/**
 * 시나리오의 총 일수 가져오기
 */
export function getTotalDays(scenario?: ScenarioData | null): number {
  return scenario?.endCondition?.value || 7;
}

// ============================================================================
// Day 기반 계산 함수
// ============================================================================

/**
 * 루트 분기 활성화 Day 계산
 * @param scenario 시나리오 데이터
 * @returns 루트가 활성화되는 최소 Day (이 Day부터 루트 표시)
 */
export function getRouteActivationDay(scenario?: ScenarioData | null): number {
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  return Math.ceil(totalDays * config.routeActivationRatio);
}

/**
 * 엔딩 체크 시작 Day 계산
 * @param scenario 시나리오 데이터
 * @returns 엔딩 체크가 시작되는 최소 Day
 */
export function getEndingCheckDay(scenario?: ScenarioData | null): number {
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  return Math.ceil(totalDays * config.endingCheckRatio);
}

/**
 * 현재 Day에서 서사 단계 계산
 * @param currentDay 현재 Day
 * @param scenario 시나리오 데이터
 * @returns 'setup' | 'rising_action' | 'midpoint' | 'climax'
 */
export type NarrativePhase = 'setup' | 'rising_action' | 'midpoint' | 'climax';

export function getNarrativePhase(currentDay: number, scenario?: ScenarioData | null): NarrativePhase {
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  const ratios = config.narrativePhaseRatios;

  const dayRatio = currentDay / totalDays;

  if (dayRatio <= ratios.setup) return 'setup';
  if (dayRatio <= ratios.rising_action) return 'rising_action';
  if (dayRatio <= ratios.midpoint) return 'midpoint';
  return 'climax';
}

/**
 * 현재 Day가 루트 분기 전인지 확인
 * @param currentDay 현재 Day
 * @param scenario 시나리오 데이터
 * @returns true면 아직 루트 미정
 */
export function isBeforeRouteActivation(currentDay: number, scenario?: ScenarioData | null): boolean {
  return currentDay < getRouteActivationDay(scenario);
}

/**
 * 현재 Day가 엔딩 체크 가능한지 확인
 * @param currentDay 현재 Day
 * @param scenario 시나리오 데이터
 * @returns true면 엔딩 체크 가능
 */
export function canCheckEnding(currentDay: number, scenario?: ScenarioData | null): boolean {
  return currentDay >= getEndingCheckDay(scenario);
}

// ============================================================================
// Action Points 관련 함수
// ============================================================================

/**
 * 하루당 Action Points 가져오기
 */
export function getActionPointsPerDay(scenario?: ScenarioData | null): number {
  const config = getGameplayConfig(scenario);
  return config.actionPointsPerDay;
}

// ============================================================================
// 스탯 임계값 관련 함수
// ============================================================================

/**
 * 스탯이 위험 상태인지 확인
 * @param percentage 스탯의 현재 비율 (0~1)
 * @param scenario 시나리오 데이터
 */
export function isStatCritical(percentage: number, scenario?: ScenarioData | null): boolean {
  const config = getGameplayConfig(scenario);
  return percentage < config.criticalStatThreshold;
}

/**
 * 스탯이 경고 상태인지 확인
 * @param percentage 스탯의 현재 비율 (0~1)
 * @param scenario 시나리오 데이터
 */
export function isStatWarning(percentage: number, scenario?: ScenarioData | null): boolean {
  const config = getGameplayConfig(scenario);
  return percentage < config.warningStatThreshold && percentage >= config.criticalStatThreshold;
}

// ============================================================================
// 루트 점수 계산 함수
// ============================================================================

/**
 * 루트 점수 설정 가져오기 (시나리오 정의 또는 기본값)
 */
export function getRouteScores(scenario?: ScenarioData | null): RouteScoreConfig[] {
  const config = getGameplayConfig(scenario);
  return config.routeScores || DEFAULT_ROUTE_SCORES;
}

/**
 * ActionHistory 패턴 기반 루트 점수 계산
 * @param actionHistory 플레이어 행동 기록
 * @param stats 현재 스탯 상태 (스탯 조건용)
 * @param scenario 시나리오 데이터
 * @returns 각 루트별 점수 맵
 */
export function calculateRouteScores(
  actionHistory: ActionHistoryEntry[],
  stats: Record<string, number>,
  scenario?: ScenarioData | null
): Record<string, number> {
  const routeConfigs = getRouteScores(scenario);
  const scores: Record<string, number> = {};

  for (const route of routeConfigs) {
    let score = 0;

    // ActionHistory 패턴 점수 계산
    if (route.actionPatterns) {
      for (const pattern of route.actionPatterns) {
        let matchCount = 0;

        for (const action of actionHistory) {
          // 행동 유형 매칭 (지정된 경우)
          if (pattern.actionType && action.actionType !== pattern.actionType) {
            continue;
          }

          // 키워드 매칭
          if (pattern.targetKeywords) {
            const actionText = `${action.content} ${action.target || ''} ${action.narrativeSummary || ''}`.toLowerCase();
            const hasKeyword = pattern.targetKeywords.some(keyword =>
              actionText.includes(keyword.toLowerCase())
            );
            if (hasKeyword) {
              matchCount++;
            }
          }
        }

        // 매칭된 행동 수에 따라 점수 부여 (최대 3회까지 인정)
        score += Math.min(matchCount, 3) * pattern.score;
      }
    }

    // 스탯 점수 계산 (있는 경우)
    if (route.statScores) {
      for (const { statId, comparison, threshold, score: statScore } of route.statScores) {
        const statValue = stats[statId] ?? 0;
        let conditionMet = false;

        switch (comparison) {
          case '>=': conditionMet = statValue >= threshold; break;
          case '<=': conditionMet = statValue <= threshold; break;
          case '>': conditionMet = statValue > threshold; break;
          case '<': conditionMet = statValue < threshold; break;
          case '==': conditionMet = statValue === threshold; break;
        }

        if (conditionMet) {
          score += statScore;
        }
      }
    }

    scores[route.routeName] = score;
  }

  return scores;
}

/**
 * 가장 높은 점수의 루트 이름 반환
 * @param scores 루트별 점수 맵
 * @returns 가장 높은 점수의 루트 이름, 모두 0이면 null
 */
export function getDominantRoute(scores: Record<string, number>): string | null {
  let maxScore = 0;
  let dominantRoute: string | null = null;

  for (const [routeName, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantRoute = routeName;
    }
  }

  return dominantRoute;
}

// ============================================================================
// Fallback 관련 함수
// ============================================================================

/**
 * 장르별 기본 Fallback 선택지
 */
export const GENRE_FALLBACK_CHOICES: Record<string, { prompt: string; choice_a: string; choice_b: string }> = {
  SF: {
    prompt: '우주선 내부에서 첫 번째 중요한 결정을 내려야 한다. 승무원들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?',
    choice_a: '함선 시스템을 점검하고 상태를 파악한다',
    choice_b: '승무원들의 상태를 확인하고 역할을 배정한다',
  },
  판타지: {
    prompt: '새로운 세계에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?',
    choice_a: '주변 환경을 탐색하고 안전한 거점을 찾는다',
    choice_b: '동료들과 함께 정보를 수집하고 상황을 파악한다',
  },
  호러: {
    prompt: '불길한 기운이 감도는 이곳에서 첫 번째 중요한 결정을 내려야 한다. 무엇부터 시작할까?',
    choice_a: '조심스럽게 주변을 살피며 탈출구를 찾는다',
    choice_b: '일행과 함께 뭉쳐서 안전을 확보한다',
  },
  미스터리: {
    prompt: '수수께끼 같은 상황에서 첫 번째 중요한 결정을 내려야 한다. 무엇부터 시작할까?',
    choice_a: '주변의 단서를 수집하고 분석한다',
    choice_b: '관계자들에게 질문하며 정보를 모은다',
  },
  '포스트 아포칼립스': {
    prompt: '종말 이후의 세계에서 첫 번째 중요한 결정을 내려야 한다. 생존자들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?',
    choice_a: '안전한 거주지부터 확보한다',
    choice_b: '식량과 물자 수집을 시작한다',
  },
  default: {
    prompt: '새로운 환경에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?',
    choice_a: '상황을 파악하고 계획을 세운다',
    choice_b: '즉시 행동에 나서 문제를 해결한다',
  },
};

/**
 * 시나리오에 맞는 Fallback 선택지 가져오기
 */
export function getFallbackChoices(scenario?: ScenarioData | null): { prompt: string; choice_a: string; choice_b: string } {
  const config = getGameplayConfig(scenario);

  // 커스텀 Fallback이 있으면 사용
  if (config.customFallbackChoices) {
    return config.customFallbackChoices;
  }

  // 장르별 Fallback 사용이 비활성화되면 기본값
  if (!config.useGenreFallback) {
    return GENRE_FALLBACK_CHOICES.default;
  }

  // 시나리오 장르에서 매칭되는 Fallback 찾기
  if (scenario?.genre) {
    for (const genre of scenario.genre) {
      if (GENRE_FALLBACK_CHOICES[genre]) {
        return GENRE_FALLBACK_CHOICES[genre];
      }
    }
  }

  return GENRE_FALLBACK_CHOICES.default;
}

// ============================================================================
// UI 표시용 헬퍼 함수
// ============================================================================

/**
 * 엔딩 Day 텍스트 생성 (예: "Day 7")
 */
export function getEndingDayText(scenario?: ScenarioData | null): string {
  return `Day ${getTotalDays(scenario)}`;
}

/**
 * 루트 활성화 전 메시지 (예: "Day 3 이후 결정")
 */
export function getRouteActivationMessage(scenario?: ScenarioData | null): string {
  return `Day ${getRouteActivationDay(scenario)} 이후 결정`;
}
