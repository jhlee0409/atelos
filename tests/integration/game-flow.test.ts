/**
 * 게임 플로우 통합 테스트
 * @description 전체 게임 흐름의 통합 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSaveState,
  generatePlayerState,
  generateValidAIResponse,
  generateExtremePlayerState,
  isValidAIResponseStructure,
  validateStatChangeRange,
} from '../utils/test-helpers';
import {
  mockScenario,
  mockCharacters,
  mockEndingArchetypes,
  mockScenarioStats,
} from '../fixtures/mock-scenario';
import {
  cleanAndValidateAIResponse,
  validateGameResponse,
  createPlayerAction,
  classifyAction,
  calculateAmplification,
} from '@/lib/game-ai-client';
import { checkEndingConditions } from '@/lib/ending-checker';
import { SimulationUtils } from '@/lib/simulation-utils';

// =============================================================================
// 게임 초기화 테스트
// =============================================================================

describe('게임 초기화', () => {
  it('SaveState가 올바르게 생성됨', () => {
    const saveState = generateSaveState({
      day: 1,
      scenario: mockScenario,
    });

    expect(saveState.context.scenarioId).toBe(mockScenario.scenarioId);
    expect(saveState.context.currentDay).toBe(1);
    expect(saveState.community.survivors.length).toBe(mockCharacters.length);
    expect(Object.keys(saveState.context.scenarioStats).length).toBeGreaterThan(0);
  });

  it('초기 스탯이 시나리오 정의와 일치함', () => {
    const saveState = generateSaveState({
      scenario: mockScenario,
    });

    for (const stat of mockScenarioStats) {
      expect(saveState.context.scenarioStats[stat.id]).toBe(stat.initialValue);
    }
  });

  it('초기 플래그가 비어있음', () => {
    const saveState = generateSaveState({
      scenario: mockScenario,
    });

    expect(Object.keys(saveState.context.flags).length).toBe(0);
  });
});

// =============================================================================
// 플레이어 선택 처리 테스트
// =============================================================================

describe('플레이어 선택 처리', () => {
  it('선택지에서 PlayerAction이 생성됨', () => {
    const choiceText = '신중하게 상황을 탐색한다';
    const action = createPlayerAction(choiceText, 'choice_a');

    expect(action.actionId).toContain('exploration');
    expect(action.actionDescription).toBe(choiceText);
    expect(action.playerFeedback).toBeTruthy();
  });

  it('다양한 선택지가 올바르게 분류됨', () => {
    const testCases = [
      { text: '무력으로 제압한다', expected: 'combat' },
      { text: '협상을 시도한다', expected: 'diplomacy' },
      { text: '부상자를 치료한다', expected: 'medical' },
      { text: '숨어서 기다린다', expected: 'stealth' },
    ];

    for (const { text, expected } of testCases) {
      const classification = classifyAction(text);
      expect(classification.category).toBe(expected);
    }
  });
});

// =============================================================================
// AI 응답 처리 파이프라인 테스트
// =============================================================================

describe('AI 응답 처리 파이프라인', () => {
  it('유효한 응답이 파이프라인을 통과함', () => {
    const response = generateValidAIResponse();

    // 1. 구조 검증
    expect(isValidAIResponseStructure(response)).toBe(true);

    // 2. 정리 및 검증
    const { cleanedResponse, hasLanguageIssues } = cleanAndValidateAIResponse(response);
    expect(hasLanguageIssues).toBe(false);

    // 3. 게임 응답 검증
    expect(validateGameResponse(cleanedResponse)).toBe(true);
  });

  it('언어 혼용 응답이 정리됨', () => {
    const dirtyResponse = generateValidAIResponse({
      log: '박지현이 مرحبا 말했다. 김서연이 ภาษาไทย 대답했다.',
    });

    const { cleanedResponse, hasLanguageIssues } = cleanAndValidateAIResponse(dirtyResponse);

    expect(hasLanguageIssues).toBe(true);
    expect(cleanedResponse.log).not.toMatch(/[\u0600-\u06FF]/); // 아랍어 제거됨
    expect(cleanedResponse.log).not.toMatch(/[\u0E00-\u0E7F]/); // 태국어 제거됨
  });

  it('과도한 스탯 변화가 보정됨', () => {
    const response = generateValidAIResponse({
      statChanges: {
        scenarioStats: { cityChaos: 100, resourceLevel: -80 },
        survivorStatus: [],
        hiddenRelationships_change: [],
        flags_acquired: [],
      },
    });

    const { cleanedResponse, hasStatIssues } = cleanAndValidateAIResponse(response);

    expect(hasStatIssues).toBe(true);
    expect(cleanedResponse.statChanges.scenarioStats.cityChaos).toBe(40);
    expect(cleanedResponse.statChanges.scenarioStats.resourceLevel).toBe(-40);
  });
});

// =============================================================================
// 스탯 변화 적용 테스트
// =============================================================================

describe('스탯 변화 적용', () => {
  it('기본 스탯 변화가 적용됨', () => {
    const currentStats = { cityChaos: 50, resourceLevel: 40 };
    const changes = { cityChaos: 10, resourceLevel: -15 };

    const newStats = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(newStats.cityChaos).toBe(60);
    expect(newStats.resourceLevel).toBe(25);
  });

  it('스탯 증폭 로직이 적용됨', () => {
    // 중간 구간(25-75%)에서는 3배 증폭
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      10,     // 원본 변화
      50,     // 현재 값 (50%)
      0,
      100
    );

    expect(result.amplificationFactor).toBe(3.0);
    expect(result.amplifiedChange).toBe(30);
  });

  it('극단 구간에서는 완만한 증폭', () => {
    // 극단 구간(0-25% 또는 75-100%)에서는 1.5배 증폭
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      10,
      10,     // 현재 값 (10%)
      0,
      100
    );

    expect(result.amplificationFactor).toBe(1.5);
    expect(result.amplifiedChange).toBe(15);
  });

  it('스탯이 범위를 벗어나면 클램핑됨', () => {
    const currentStats = { cityChaos: 95 };
    const changes = { cityChaos: 20 };

    const newStats = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(newStats.cityChaos).toBe(100); // max로 클램핑
  });
});

// =============================================================================
// 엔딩 체크 통합 테스트
// =============================================================================

describe('엔딩 체크', () => {
  it('성공 엔딩 조건 충족', () => {
    const successState = generatePlayerState({
      statOverrides: {
        survivalFoundation: 80,
        communityCohesion: 75,
        cityChaos: 30,
      },
    });

    const ending = checkEndingConditions(successState, mockEndingArchetypes);

    expect(ending).not.toBeNull();
    expect(ending?.isGoalSuccess).toBe(true);
  });

  it('실패 엔딩 조건 충족', () => {
    const chaosState = generateExtremePlayerState('chaos');

    const ending = checkEndingConditions(chaosState, mockEndingArchetypes);

    expect(ending).not.toBeNull();
    expect(ending?.endingId).toBe('ENDING_CHAOS_COLLAPSE');
    expect(ending?.isGoalSuccess).toBe(false);
  });

  it('조건 미충족시 null 반환', () => {
    const midState = generatePlayerState({
      statOverrides: {
        cityChaos: 50,
        survivalFoundation: 50,
        communityCohesion: 50,
      },
    });

    const ending = checkEndingConditions(midState, mockEndingArchetypes);

    expect(ending).toBeNull();
  });

  it('탈출 엔딩 조건 체크 (스탯 기반)', () => {
    // 플래그 시스템 deprecated - 스탯 기반으로 엔딩 체크
    const escapeState = generatePlayerState({
      statOverrides: {
        survivalFoundation: 65, // >= 60
        cityChaos: 50, // < 80
      },
    });

    const ending = checkEndingConditions(escapeState, mockEndingArchetypes);

    expect(ending).not.toBeNull();
    expect(ending?.endingId).toBe('ENDING_ESCAPE_SUCCESS');
  });
});

// =============================================================================
// 전체 게임 턴 시뮬레이션
// =============================================================================

describe('게임 턴 시뮬레이션', () => {
  it('단일 턴 처리 흐름', () => {
    // 1. 초기 상태 생성
    const saveState = generateSaveState({ day: 1 });

    // 2. 플레이어 선택
    const action = createPlayerAction('주변을 탐색한다', 'choice_a');

    // 3. AI 응답 생성 (모킹)
    const aiResponse = generateValidAIResponse({
      statChanges: {
        scenarioStats: { resourceLevel: 10, cityChaos: -5 },
        survivorStatus: [],
        hiddenRelationships_change: [],
        flags_acquired: ['FLAG_RESOURCE_CACHE_FOUND'],
      },
    });

    // 4. 응답 검증
    expect(validateGameResponse(aiResponse)).toBe(true);

    // 5. 상태 업데이트
    const newStats = SimulationUtils.applyStatChanges(
      saveState.context.scenarioStats,
      aiResponse.statChanges.scenarioStats,
      mockScenarioStats
    );

    expect(newStats.resourceLevel).toBeGreaterThan(saveState.context.scenarioStats.resourceLevel);

    // 6. 엔딩 체크 (Day 5 이후에만)
    // 여기서는 Day 1이므로 체크하지 않음
  });

  it('다중 턴 누적 효과', () => {
    let stats = {
      cityChaos: 50,
      communityCohesion: 50,
      resourceLevel: 40,
      citizenTrust: 50,
      survivalFoundation: 50,
    };

    // 여러 턴의 변화 시뮬레이션
    const turns = [
      { cityChaos: -10, resourceLevel: 15 },
      { cityChaos: 5, communityCohesion: 10 },
      { resourceLevel: -20, citizenTrust: 5 },
    ];

    for (const changes of turns) {
      stats = SimulationUtils.applyStatChanges(stats, changes, mockScenarioStats);
    }

    // 누적 결과 검증
    expect(stats.cityChaos).toBe(45);  // 50 - 10 + 5
    expect(stats.resourceLevel).toBe(35);  // 40 + 15 - 20
    expect(stats.communityCohesion).toBe(60);  // 50 + 10
  });
});

// =============================================================================
// 데이터 일관성 테스트
// =============================================================================

describe('데이터 일관성', () => {
  it('스탯 ID가 시나리오와 일치함', () => {
    const saveState = generateSaveState({ scenario: mockScenario });
    const statIds = Object.keys(saveState.context.scenarioStats);
    const scenarioStatIds = mockScenarioStats.map(s => s.id);

    for (const id of statIds) {
      expect(scenarioStatIds).toContain(id);
    }
  });

  it('캐릭터 정보가 일관됨', () => {
    const saveState = generateSaveState({ scenario: mockScenario });
    const survivorNames = saveState.community.survivors.map(s => s.name);
    const characterNames = mockCharacters.map(c => c.characterName);

    for (const name of characterNames) {
      expect(survivorNames).toContain(name);
    }
  });

  it('관계 데이터 구조가 올바름', () => {
    const saveState = generateSaveState({ scenario: mockScenario });
    const relationships = saveState.community.hiddenRelationships;

    for (const [key, value] of Object.entries(relationships)) {
      // 키 형식: "이름A-이름B"
      expect(key).toMatch(/^.+-.+$/);
      // 값은 숫자
      expect(typeof value).toBe('number');
    }
  });
});

// =============================================================================
// 에지 케이스 테스트
// =============================================================================

describe('에지 케이스', () => {
  it('모든 스탯이 최대값일 때', () => {
    const maxState = generateExtremePlayerState('high');
    const changes = { cityChaos: 50 };

    const newStats = SimulationUtils.applyStatChanges(
      maxState.stats,
      changes,
      mockScenarioStats
    );

    expect(newStats.cityChaos).toBe(100); // 이미 90, +50해도 100으로 클램핑
  });

  it('모든 스탯이 최소값일 때', () => {
    const minState = generateExtremePlayerState('low');
    const changes = { cityChaos: -50 };

    const newStats = SimulationUtils.applyStatChanges(
      minState.stats,
      changes,
      mockScenarioStats
    );

    expect(newStats.cityChaos).toBe(0); // 이미 10, -50해도 0으로 클램핑
  });

  it('빈 스탯 변화', () => {
    const state = generatePlayerState();
    const originalStats = { ...state.stats };

    const newStats = SimulationUtils.applyStatChanges(
      state.stats,
      {},
      mockScenarioStats
    );

    expect(newStats).toEqual(originalStats);
  });

  it('존재하지 않는 스탯 변화 시도', () => {
    const state = generatePlayerState();
    const changes = { nonExistentStat: 50 };

    const newStats = SimulationUtils.applyStatChanges(
      state.stats,
      changes,
      mockScenarioStats
    );

    expect(newStats.nonExistentStat).toBeUndefined();
  });
});
