/**
 * Action Engagement System v1.0
 *
 * 행동 게이지와 액션 풀을 개선하여 전략적 깊이와 몰입감을 높이는 시스템
 *
 * 핵심 개선:
 * 1. 동적 AP 비용 (상황/신뢰도 기반)
 * 2. 행동 시너지 시스템 (선행 행동이 후속 행동에 영향)
 * 3. 동적 대화 주제 (발견/신뢰도/맥락 기반 언락)
 * 4. 탐색 힌트 시스템 (단서 기반 장소 언락)
 * 5. AP 가치 피드백 (예상 효과 표시)
 */

import type {
  ActionType,
  SaveState,
  ScenarioData,
  DialogueTopic,
  CharacterArc,
  KeyDecision,
  ActionRecord,
  ConcreteDiscovery,
} from '@/types';

// =============================================================================
// 타입 정의
// =============================================================================

/** 동적 AP 비용 정보 */
export interface DynamicAPCost {
  baseCost: number;
  adjustedCost: number;
  reason: string;
  bonus?: string; // 할인/보너스 이유
}

/** 행동 시너지 정보 */
export interface ActionSynergy {
  synergyType: 'preparation' | 'insight' | 'momentum' | 'caution';
  sourceAction: ActionType;
  targetAction: ActionType;
  bonus: string;
  mechanicEffect?: {
    statBonus?: number;
    trustBonus?: number;
    infoUnlock?: string;
  };
}

/** 행동 가치 평가 */
export interface ActionValueAssessment {
  actionType: ActionType;
  target?: string;
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  impactReason: string;
  recommendationScore: number; // 0-100
  synergyWithPrevious?: ActionSynergy;
  riskLevel: 'safe' | 'moderate' | 'risky';
  riskReason?: string;
}

/** 동적 대화 주제 */
export interface DynamicDialogueTopic extends DialogueTopic {
  unlockCondition?: string;
  impactHint?: string;
  trustRequired?: number;
  isSecret?: boolean; // 숨겨진 주제 (높은 신뢰도 필요)
}

/** 탐색 힌트 */
export interface ExplorationHint {
  locationId: string;
  hintText: string;
  hintStrength: 'cold' | 'warm' | 'hot';
  unlockRequirement?: string;
}

/** 행동 시퀀스 추적 */
export interface ActionSequence {
  actions: Array<{
    type: ActionType;
    target?: string;
    day: number;
  }>;
  currentCombo?: string;
  comboBonus?: string;
}

// =============================================================================
// 동적 AP 비용 시스템
// =============================================================================

const BASE_AP_COSTS: Record<ActionType, number> = {
  choice: 1,
  dialogue: 1,
  exploration: 1,
  freeText: 1,
};

/**
 * 동적 AP 비용 계산
 * 상황, 신뢰도, 이전 행동에 따라 AP 비용 조정
 */
export function calculateDynamicAPCost(
  actionType: ActionType,
  saveState: SaveState,
  scenario: ScenarioData,
  target?: string // 캐릭터명 또는 장소 ID
): DynamicAPCost {
  const baseCost = BASE_AP_COSTS[actionType];
  let adjustedCost = baseCost;
  let reason = '기본 비용';
  let bonus: string | undefined;

  const currentDay = saveState.context.currentDay || 1;
  const totalDays = scenario.endCondition?.value || 7;
  const recentActions = saveState.context.actionsThisDay || [];

  // === 대화 비용 조정 ===
  if (actionType === 'dialogue' && target) {
    const characterArc = saveState.characterArcs?.find(
      arc => arc.characterName === target
    );
    const trustLevel = characterArc?.trustLevel || 0;

    // 높은 신뢰도 → 대화 용이 (비용 감소)
    if (trustLevel >= 60) {
      adjustedCost = 0.5; // 라운드업 시 1이지만 표시용
      reason = '높은 신뢰도';
      bonus = `${target}와(과)의 신뢰가 높아 대화가 수월하다`;
    }
    // 낮은 신뢰도 → 더 많은 노력 필요
    else if (trustLevel <= -30) {
      adjustedCost = 1.5;
      reason = '낮은 신뢰도';
      bonus = `${target}의 경계심이 높아 대화에 더 많은 에너지가 필요하다`;
    }
  }

  // === 탐색 비용 조정 ===
  if (actionType === 'exploration' && target) {
    // 이미 탐색한 장소 재방문 → 비용 감소
    const previousExplorations = recentActions.filter(
      a => a.actionType === 'exploration' && a.target === target
    );
    if (previousExplorations.length > 0) {
      adjustedCost = 0.5;
      reason = '익숙한 장소';
      bonus = '이미 탐색한 곳이라 빠르게 확인할 수 있다';
    }

    // 위험한 장소 (Day 후반) → 비용 증가
    const dangerousLocations = ['basement', 'roof', 'exterior'];
    if (dangerousLocations.includes(target) && currentDay >= totalDays - 2) {
      adjustedCost = Math.max(adjustedCost, 1.5);
      reason = '위험 구역';
      bonus = '후반부에 접어들어 위험이 높아진 장소다';
    }
  }

  // === 자유 입력 비용 조정 ===
  if (actionType === 'freeText') {
    // 클라이막스 (마지막 2일) → 자유 행동에 더 큰 비중
    if (currentDay >= totalDays - 1) {
      adjustedCost = 1.5;
      reason = '결정적 순간';
      bonus = '이야기의 끝이 가까워 모든 행동이 중요해졌다';
    }
  }

  // === 선행 행동 보너스 (시너지) ===
  const lastAction = recentActions[recentActions.length - 1];
  if (lastAction) {
    const synergy = getActionSynergy(lastAction.actionType, actionType, target);
    if (synergy && synergy.mechanicEffect) {
      // 시너지로 인한 비용 감소
      if (synergy.synergyType === 'preparation') {
        adjustedCost = Math.max(0.5, adjustedCost - 0.5);
        bonus = synergy.bonus;
      }
    }
  }

  // 최소 비용 0.5 (표시는 1로 올림)
  adjustedCost = Math.max(0.5, adjustedCost);

  return {
    baseCost,
    adjustedCost: Math.ceil(adjustedCost),
    reason,
    bonus,
  };
}

// =============================================================================
// 행동 시너지 시스템
// =============================================================================

/**
 * 두 행동 간의 시너지 확인
 */
export function getActionSynergy(
  previousAction: ActionType,
  currentAction: ActionType,
  target?: string
): ActionSynergy | null {
  // 대화 → 선택: 정보 획득 보너스
  if (previousAction === 'dialogue' && currentAction === 'choice') {
    return {
      synergyType: 'insight',
      sourceAction: 'dialogue',
      targetAction: 'choice',
      bonus: '대화를 통해 얻은 정보로 더 나은 판단을 할 수 있다',
      mechanicEffect: {
        infoUnlock: '선택지의 결과 힌트가 표시될 수 있음',
      },
    };
  }

  // 탐색 → 선택: 발견한 것 활용
  if (previousAction === 'exploration' && currentAction === 'choice') {
    return {
      synergyType: 'preparation',
      sourceAction: 'exploration',
      targetAction: 'choice',
      bonus: '탐색에서 발견한 것이 선택에 도움이 될 수 있다',
      mechanicEffect: {
        statBonus: 5, // 스탯 변화 보너스
      },
    };
  }

  // 탐색 → 대화: 화제거리 획득
  if (previousAction === 'exploration' && currentAction === 'dialogue') {
    return {
      synergyType: 'preparation',
      sourceAction: 'exploration',
      targetAction: 'dialogue',
      bonus: '탐색에서 발견한 것을 화제로 삼아 대화가 수월해진다',
      mechanicEffect: {
        trustBonus: 5,
      },
    };
  }

  // 대화 → 탐색: 정보 기반 탐색
  if (previousAction === 'dialogue' && currentAction === 'exploration') {
    return {
      synergyType: 'insight',
      sourceAction: 'dialogue',
      targetAction: 'exploration',
      bonus: '대화에서 들은 정보로 어디를 탐색해야 할지 알게 됐다',
      mechanicEffect: {
        infoUnlock: '숨겨진 장소가 언락될 수 있음',
      },
    };
  }

  // 선택 → 선택: 모멘텀 (연속 결정)
  if (previousAction === 'choice' && currentAction === 'choice') {
    return {
      synergyType: 'momentum',
      sourceAction: 'choice',
      targetAction: 'choice',
      bonus: '결단력 있는 행동이 상황을 빠르게 진전시킨다',
      mechanicEffect: {
        statBonus: 3,
      },
    };
  }

  return null;
}

/**
 * 현재 액션 시퀀스 분석
 */
export function analyzeActionSequence(
  recentActions: ActionRecord[],
  currentDay: number
): ActionSequence {
  const todayActions = recentActions.filter(
    // 오늘 행동만 (최근 3개로 제한)
    (_, i) => i >= recentActions.length - 3
  );

  const sequence: ActionSequence = {
    actions: todayActions.map(a => ({
      type: a.actionType,
      target: a.target,
      day: currentDay,
    })),
  };

  // 콤보 체크
  if (todayActions.length >= 2) {
    const types = todayActions.map(a => a.actionType);

    // 정보수집 콤보: 대화 → 탐색 또는 탐색 → 대화
    if (
      (types.includes('dialogue') && types.includes('exploration')) ||
      (types[0] === 'dialogue' && types[1] === 'exploration')
    ) {
      sequence.currentCombo = '정보수집';
      sequence.comboBonus = '다양한 경로로 정보를 수집했다. 다음 선택에 도움이 될 것이다.';
    }

    // 신중함 콤보: 탐색 → 대화 → 선택
    if (types[0] === 'exploration' && types[1] === 'dialogue') {
      sequence.currentCombo = '신중함';
      sequence.comboBonus = '먼저 상황을 파악하고 조언을 구했다. 현명한 접근이다.';
    }

    // 결단력 콤보: 선택 연속 2회
    if (types.filter(t => t === 'choice').length >= 2) {
      sequence.currentCombo = '결단력';
      sequence.comboBonus = '빠른 결정이 상황을 주도하고 있다.';
    }
  }

  return sequence;
}

// =============================================================================
// 동적 대화 주제 시스템
// =============================================================================

/**
 * 캐릭터별 동적 대화 주제 생성
 * 신뢰도, 발견한 것, 현재 상황에 따라 주제가 달라짐
 */
export function generateDynamicDialogueTopics(
  characterName: string,
  characterRole: string,
  saveState: SaveState,
  scenario: ScenarioData
): DynamicDialogueTopic[] {
  const topics: DynamicDialogueTopic[] = [];
  const characterArc = saveState.characterArcs?.find(
    arc => arc.characterName === characterName
  );
  const trustLevel = characterArc?.trustLevel || 0;
  const currentDay = saveState.context.currentDay || 1;
  const discoveries = saveState.context.worldState?.discoveries || [];
  const keyDecisions = saveState.keyDecisions || [];

  // === 기본 주제 (항상 가능) ===
  topics.push({
    topicId: 'situation',
    label: '현재 상황에 대해 묻는다',
    category: 'info',
    impactHint: '기본적인 정보를 얻을 수 있다',
  });

  topics.push({
    topicId: 'feelings',
    label: '기분이 어떤지 묻는다',
    category: 'personal',
    impactHint: '상대의 감정 상태를 파악할 수 있다',
  });

  // === 신뢰도 기반 주제 ===
  if (trustLevel >= 20) {
    topics.push({
      topicId: 'advice',
      label: '조언을 구한다',
      category: 'advice',
      impactHint: '상황에 대한 조언을 들을 수 있다',
      trustRequired: 20,
    });
  }

  if (trustLevel >= 40) {
    topics.push({
      topicId: 'past',
      label: '과거 이야기를 듣는다',
      category: 'personal',
      impactHint: '캐릭터의 배경을 알 수 있다',
      trustRequired: 40,
      unlockCondition: '신뢰도 40 이상',
    });
  }

  if (trustLevel >= 60) {
    topics.push({
      topicId: 'secret',
      label: '비밀 이야기를 듣는다',
      category: 'relationship',
      impactHint: '중요한 정보나 숨겨진 진실을 알 수 있다',
      trustRequired: 60,
      unlockCondition: '신뢰도 60 이상',
      isSecret: true,
    });
  }

  // === 발견 기반 주제 ===
  const relevantDiscoveries = discoveries.filter(d => {
    // 캐릭터와 관련된 발견물
    return d.name.includes(characterName) ||
           d.description?.includes(characterName) ||
           d.discoveryType === 'document' ||
           d.discoveryType === 'clue';
  });

  if (relevantDiscoveries.length > 0) {
    const latestDiscovery = relevantDiscoveries[relevantDiscoveries.length - 1];
    topics.push({
      topicId: `discovery_${latestDiscovery.discoveryId}`,
      label: `${latestDiscovery.name}에 대해 묻는다`,
      category: 'info',
      impactHint: '발견한 것에 대한 정보를 얻을 수 있다',
      unlockCondition: `'${latestDiscovery.name}' 발견`,
    });
  }

  // === 역할 기반 특수 주제 ===
  const roleLower = characterRole.toLowerCase();

  if (roleLower.includes('리더') || roleLower.includes('leader')) {
    topics.push({
      topicId: 'plan',
      label: '앞으로의 계획을 묻는다',
      category: 'info',
      impactHint: '전체적인 방향성에 대해 알 수 있다',
    });
  }

  if (roleLower.includes('의료') || roleLower.includes('medical')) {
    topics.push({
      topicId: 'medical_status',
      label: '부상자 상태를 묻는다',
      category: 'info',
      impactHint: '의료 상황을 파악할 수 있다',
    });
  }

  if (roleLower.includes('경비') || roleLower.includes('전투')) {
    topics.push({
      topicId: 'threat',
      label: '외부 위협에 대해 묻는다',
      category: 'info',
      impactHint: '보안 상황을 파악할 수 있다',
    });
  }

  // === Day 기반 긴급 주제 ===
  const totalDays = scenario.endCondition?.value || 7;
  if (currentDay >= totalDays - 2) {
    topics.push({
      topicId: 'final_thoughts',
      label: '마지막으로 하고 싶은 말이 있냐고 묻는다',
      category: 'personal',
      impactHint: '캐릭터의 진심을 들을 수 있다',
      unlockCondition: '클라이맥스 구간',
    });
  }

  // === 이전 결정 관련 주제 ===
  const recentDecision = keyDecisions[keyDecisions.length - 1];
  if (recentDecision && currentDay === recentDecision.day) {
    topics.push({
      topicId: 'recent_decision',
      label: '방금 일어난 일에 대해 묻는다',
      category: 'info',
      impactHint: '최근 결정에 대한 반응을 알 수 있다',
      unlockCondition: '오늘 중요한 결정 이후',
    });
  }

  return topics;
}

// =============================================================================
// 탐색 힌트 시스템
// =============================================================================

/**
 * 장소별 탐색 힌트 생성
 * 발견한 단서, 대화 내용 등에 따라 힌트 제공
 */
export function generateExplorationHints(
  saveState: SaveState,
  scenario: ScenarioData
): ExplorationHint[] {
  const hints: ExplorationHint[] = [];
  const discoveries = saveState.context.worldState?.discoveries || [];
  const keyDecisions = saveState.keyDecisions || [];
  const currentDay = saveState.context.currentDay || 1;

  // 지하실 힌트
  if (currentDay < 5) {
    // Day 5 전에는 힌트만 제공
    const hasBasementClue = discoveries.some(
      d => d.description?.includes('지하') || d.name.includes('열쇠')
    );

    if (hasBasementClue) {
      hints.push({
        locationId: 'basement',
        hintText: '열쇠를 발견했다. 지하로 가는 문을 열 수 있을지도...',
        hintStrength: 'hot',
        unlockRequirement: '지하실 열쇠 발견',
      });
    } else {
      hints.push({
        locationId: 'basement',
        hintText: '잠긴 문 너머에서 이상한 소리가 들린다.',
        hintStrength: 'cold',
      });
    }
  }

  // 옥상 힌트
  if (currentDay < 3) {
    const hasRoofMention = keyDecisions.some(
      d => d.choice.includes('옥상') || d.consequence.includes('옥상')
    );

    if (hasRoofMention) {
      hints.push({
        locationId: 'roof',
        hintText: '누군가 옥상에서 신호를 보낸다는 이야기를 들었다.',
        hintStrength: 'warm',
      });
    } else {
      hints.push({
        locationId: 'roof',
        hintText: '높은 곳에서 보면 상황을 파악하기 좋을 것이다.',
        hintStrength: 'cold',
      });
    }
  }

  // 숨겨진 장소 힌트
  const hiddenLocationClue = discoveries.find(
    d => d.discoveryType === 'clue' && d.usable
  );
  if (hiddenLocationClue) {
    hints.push({
      locationId: 'hidden_' + hiddenLocationClue.discoveryId,
      hintText: `${hiddenLocationClue.name}이(가) 가리키는 곳이 있는 것 같다...`,
      hintStrength: 'hot',
      unlockRequirement: hiddenLocationClue.name,
    });
  }

  return hints;
}

// =============================================================================
// 행동 가치 평가 시스템
// =============================================================================

/**
 * 현재 상황에서 각 행동의 가치 평가
 * 유저에게 어떤 행동이 더 가치있는지 힌트 제공
 */
export function assessActionValue(
  actionType: ActionType,
  saveState: SaveState,
  scenario: ScenarioData,
  target?: string
): ActionValueAssessment {
  const currentDay = saveState.context.currentDay || 1;
  const totalDays = scenario.endCondition?.value || 7;
  const recentActions = saveState.context.actionsThisDay || [];
  const lastAction = recentActions[recentActions.length - 1];

  let estimatedImpact: ActionValueAssessment['estimatedImpact'] = 'medium';
  let impactReason = '';
  let recommendationScore = 50;
  let riskLevel: ActionValueAssessment['riskLevel'] = 'moderate';
  let riskReason: string | undefined;
  let synergyWithPrevious: ActionSynergy | undefined;

  // 시너지 체크
  if (lastAction) {
    const synergy = getActionSynergy(lastAction.actionType, actionType, target);
    if (synergy) {
      synergyWithPrevious = synergy;
      recommendationScore += 15;
    }
  }

  // === 선택지 가치 평가 ===
  if (actionType === 'choice') {
    // 클라이막스 구간
    if (currentDay >= totalDays - 1) {
      estimatedImpact = 'critical';
      impactReason = '이야기의 결말이 결정되는 중요한 순간이다';
      recommendationScore = 90;
      riskLevel = 'risky';
      riskReason = '이 선택이 엔딩을 결정할 수 있다';
    } else if (currentDay >= totalDays - 2) {
      estimatedImpact = 'high';
      impactReason = '클라이막스가 다가오고 있다';
      recommendationScore = 75;
    } else {
      impactReason = '이야기를 진행시키는 핵심 행동이다';
    }
  }

  // === 대화 가치 평가 ===
  if (actionType === 'dialogue' && target) {
    const characterArc = saveState.characterArcs?.find(
      arc => arc.characterName === target
    );
    const trustLevel = characterArc?.trustLevel || 0;

    if (trustLevel < 0) {
      estimatedImpact = 'high';
      impactReason = `${target}와의 관계 개선이 필요하다`;
      recommendationScore = 70;
      riskLevel = 'moderate';
      riskReason = '대화가 역효과를 낼 수 있다';
    } else if (trustLevel >= 50 && characterArc?.currentMood === 'anxious') {
      estimatedImpact = 'high';
      impactReason = `${target}가 불안해하고 있다. 대화가 도움이 될 것이다`;
      recommendationScore = 75;
      riskLevel = 'safe';
    } else {
      impactReason = `${target}와 정보를 교환할 수 있다`;
    }
  }

  // === 탐색 가치 평가 ===
  if (actionType === 'exploration') {
    const exploredToday = recentActions.filter(
      a => a.actionType === 'exploration'
    ).length;

    if (exploredToday === 0) {
      estimatedImpact = 'high';
      impactReason = '아직 오늘 탐색하지 않았다. 새로운 발견이 있을 수 있다';
      recommendationScore = 70;
      riskLevel = 'safe';
    } else {
      impactReason = '추가 탐색으로 더 많은 것을 발견할 수 있다';
      recommendationScore = 40;
    }
  }

  // === 자유 입력 가치 평가 ===
  if (actionType === 'freeText') {
    estimatedImpact = 'medium';
    impactReason = '예상치 못한 행동으로 상황을 바꿀 수 있다';
    recommendationScore = 45;
    riskLevel = 'risky';
    riskReason = '결과를 예측하기 어렵다';

    // 클라이막스에서 자유 입력은 더 위험하지만 임팩트도 큼
    if (currentDay >= totalDays - 1) {
      estimatedImpact = 'high';
      recommendationScore = 60;
    }
  }

  return {
    actionType,
    target,
    estimatedImpact,
    impactReason,
    recommendationScore,
    synergyWithPrevious: synergyWithPrevious || undefined,
    riskLevel,
    riskReason,
  };
}

// =============================================================================
// 행동 추천 시스템
// =============================================================================

/**
 * 현재 상황에서 추천 행동 생성
 */
export function getRecommendedActions(
  saveState: SaveState,
  scenario: ScenarioData
): Array<{
  actionType: ActionType;
  target?: string;
  reason: string;
  priority: number;
}> {
  const recommendations: Array<{
    actionType: ActionType;
    target?: string;
    reason: string;
    priority: number;
  }> = [];

  const currentDay = saveState.context.currentDay || 1;
  const recentActions = saveState.context.actionsThisDay || [];
  const keyDecisions = saveState.keyDecisions || [];

  // 오늘 아무 행동도 안 했으면 탐색 추천
  if (recentActions.length === 0) {
    recommendations.push({
      actionType: 'exploration',
      reason: '하루를 시작하며 주변을 살펴보자',
      priority: 70,
    });
  }

  // 신뢰도가 낮은 캐릭터가 있으면 대화 추천
  const lowTrustCharacter = saveState.characterArcs?.find(
    arc => arc.trustLevel < 0 && arc.trustLevel > -50
  );
  if (lowTrustCharacter) {
    recommendations.push({
      actionType: 'dialogue',
      target: lowTrustCharacter.characterName,
      reason: `${lowTrustCharacter.characterName}와의 관계를 개선할 필요가 있다`,
      priority: 65,
    });
  }

  // 최근 중요한 결정 후 대화 추천
  const recentBigDecision = keyDecisions.find(
    d => d.day === currentDay && d.consequence.length > 50
  );
  if (recentBigDecision) {
    recommendations.push({
      actionType: 'dialogue',
      reason: '방금 일어난 일에 대해 다른 사람들의 의견을 들어보자',
      priority: 60,
    });
  }

  // 선택은 항상 기본 추천
  recommendations.push({
    actionType: 'choice',
    reason: '이야기를 진행시키는 핵심 행동',
    priority: 50,
  });

  // 우선순위로 정렬
  return recommendations.sort((a, b) => b.priority - a.priority);
}

// =============================================================================
// UI 표시용 헬퍼
// =============================================================================

/**
 * AP 비용 표시 텍스트
 */
export function formatAPCostDisplay(cost: DynamicAPCost): string {
  if (cost.adjustedCost < cost.baseCost) {
    return `${cost.adjustedCost} AP (할인: ${cost.reason})`;
  } else if (cost.adjustedCost > cost.baseCost) {
    return `${cost.adjustedCost} AP (증가: ${cost.reason})`;
  }
  return `${cost.baseCost} AP`;
}

/**
 * 행동 가치 표시 아이콘/색상
 */
export function getImpactDisplayConfig(impact: ActionValueAssessment['estimatedImpact']): {
  color: string;
  icon: string;
  label: string;
} {
  switch (impact) {
    case 'critical':
      return { color: 'text-red-400', icon: '⚡', label: '결정적' };
    case 'high':
      return { color: 'text-orange-400', icon: '🔥', label: '중요' };
    case 'medium':
      return { color: 'text-yellow-400', icon: '💡', label: '보통' };
    case 'low':
      return { color: 'text-zinc-400', icon: '•', label: '낮음' };
    default:
      return { color: 'text-zinc-400', icon: '•', label: '보통' };
  }
}

/**
 * 시너지 표시 텍스트
 */
export function formatSynergyDisplay(synergy: ActionSynergy): string {
  const typeLabels: Record<ActionSynergy['synergyType'], string> = {
    preparation: '🎯 준비',
    insight: '💡 통찰',
    momentum: '⚡ 모멘텀',
    caution: '🛡️ 신중',
  };

  return `${typeLabels[synergy.synergyType]}: ${synergy.bonus}`;
}
