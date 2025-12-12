/**
 * Action Engagement System v1.1
 *
 * 행동 게이지와 액션 풀을 개선하여 전략적 깊이와 몰입감을 높이는 시스템
 *
 * 핵심 기능:
 * 1. 동적 AP 비용 (상황/신뢰도 기반) - GameClient에서 사용
 * 2. 행동 시너지 시스템 (선행 행동이 후속 행동에 영향) - prompt-builder에서 AI에 전달
 * 3. 동적 대화 주제 (발견/신뢰도/맥락 기반 언락) - CharacterDialoguePanel에서 사용
 * 4. 콤보 시스템 (연속 행동 패턴 감지) - ChoiceButtons, prompt-builder에서 사용
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

/** 동적 대화 주제 */
export interface DynamicDialogueTopic extends DialogueTopic {
  unlockCondition?: string;
  impactHint?: string;
  trustRequired?: number;
  isSecret?: boolean; // 숨겨진 주제 (높은 신뢰도 필요)
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

