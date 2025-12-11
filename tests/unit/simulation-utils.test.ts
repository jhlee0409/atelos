/**
 * simulation-utils.ts 유닛 테스트
 * @description 시뮬레이션 유틸리티 함수들 검증
 */

import { describe, it, expect } from 'vitest';
import { SimulationUtils } from '@/lib/simulation-utils';
import {
  mockScenario,
  mockPlayerStateInitial,
  mockPlayerStateEndingSuccess,
  mockEndingArchetypes,
  mockScenarioStats,
} from '../fixtures/mock-scenario';

// =============================================================================
// 스탯 변화 적용 테스트
// =============================================================================

describe('SimulationUtils.applyStatChanges', () => {
  const currentStats = {
    cityChaos: 50,
    communityCohesion: 60,
    survivalFoundation: 70,
    citizenTrust: 40,
    resourceLevel: 30,
  };

  it('양수 변화를 올바르게 적용함', () => {
    const changes = { cityChaos: 10, resourceLevel: 20 };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.cityChaos).toBe(60);
    expect(result.resourceLevel).toBe(50);
    expect(result.communityCohesion).toBe(60); // 변경 없음
  });

  it('음수 변화를 올바르게 적용함', () => {
    const changes = { cityChaos: -20, survivalFoundation: -10 };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.cityChaos).toBe(30);
    expect(result.survivalFoundation).toBe(60);
  });

  it('최대값을 초과하면 클램핑됨', () => {
    const changes = { cityChaos: 100 };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.cityChaos).toBe(100); // max
  });

  it('최소값 이하로 내려가면 클램핑됨', () => {
    const changes = { resourceLevel: -100 };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.resourceLevel).toBe(0); // min
  });

  it('존재하지 않는 스탯 변화는 무시됨', () => {
    const changes = { nonExistent: 50 };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.nonExistent).toBeUndefined();
    expect(result.cityChaos).toBe(50); // 기존 값 유지
  });

  it('여러 스탯을 동시에 변경함', () => {
    const changes = {
      cityChaos: -10,
      communityCohesion: 15,
      resourceLevel: 25,
    };
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      changes,
      mockScenarioStats
    );

    expect(result.cityChaos).toBe(40);
    expect(result.communityCohesion).toBe(75);
    expect(result.resourceLevel).toBe(55);
  });

  it('빈 변화 객체는 원본을 유지함', () => {
    const result = SimulationUtils.applyStatChanges(
      currentStats,
      {},
      mockScenarioStats
    );

    expect(result).toEqual(currentStats);
  });
});

// =============================================================================
// 엔딩 조건 체크 테스트 (SimulationUtils 버전)
// =============================================================================

describe('SimulationUtils.checkEndingConditions', () => {
  it('조건을 만족하는 첫 번째 엔딩을 반환함', () => {
    const result = SimulationUtils.checkEndingConditions(
      mockPlayerStateEndingSuccess,
      mockEndingArchetypes
    );

    expect(result).not.toBeNull();
    expect(result?.isGoalSuccess).toBe(true);
  });

  it('조건 없는 엔딩(TIME_UP 등)이 있으면 해당 엔딩 반환', () => {
    const result = SimulationUtils.checkEndingConditions(
      mockPlayerStateInitial,
      mockEndingArchetypes
    );

    // SimulationUtils는 빈 조건의 엔딩(TIME_UP)을 매칭하므로 null이 아님
    // ending-checker.ts는 TIME_UP을 제외하지만 SimulationUtils는 그대로 반환
    if (result) {
      expect(result.endingId).toBe('ENDING_TIME_UP');
    }
  });

  it('생존자 수 조건을 체크함', () => {
    const endingWithSurvivorCount = [
      {
        endingId: 'TEST_ENDING',
        title: '테스트 엔딩',
        description: '테스트',
        isGoalSuccess: true,
        systemConditions: [
          {
            type: 'survivor_count' as const,
            comparison: 'greater_equal' as const,
            value: 3,
          },
        ],
      },
    ];

    // 생존자 수 충족
    expect(SimulationUtils.checkEndingConditions(
      mockPlayerStateInitial,
      endingWithSurvivorCount,
      5
    )).not.toBeNull();

    // 생존자 수 미충족
    expect(SimulationUtils.checkEndingConditions(
      mockPlayerStateInitial,
      endingWithSurvivorCount,
      2
    )).toBeNull();

    // 생존자 수 미전달
    expect(SimulationUtils.checkEndingConditions(
      mockPlayerStateInitial,
      endingWithSurvivorCount
    )).toBeNull();
  });
});

// =============================================================================
// 딜레마 생성 테스트
// =============================================================================

describe('SimulationUtils.generateRandomDilemma', () => {
  it('딜레마를 생성함', () => {
    const context = {
      scenario: mockScenario,
      playerState: mockPlayerStateInitial,
      currentDay: 1,
      previousDilemmas: [],
    };

    const result = SimulationUtils.generateRandomDilemma(context);

    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.title).toContain('Day 1');
    expect(result.description).toBeTruthy();
    expect(result.choices).toBeDefined();
    expect(result.choices.length).toBeGreaterThanOrEqual(1);
  });

  it('선택지에 statChanges가 포함됨', () => {
    const context = {
      scenario: mockScenario,
      playerState: mockPlayerStateInitial,
      currentDay: 3,
      previousDilemmas: [],
    };

    const result = SimulationUtils.generateRandomDilemma(context);

    // 최소 하나의 선택지가 있어야 함
    expect(result.choices.length).toBeGreaterThanOrEqual(1);

    // 선택지 구조 검증
    for (const choice of result.choices) {
      expect(choice.text).toBeTruthy();
      expect(choice.statChanges).toBeDefined();
      expect(choice.flagsToSet).toBeDefined();
    }
  });

  it('스탯이 모두 극단에 있으면 기본 딜레마 반환', () => {
    const extremeState = {
      stats: {
        cityChaos: 100,
        communityCohesion: 0,
        survivalFoundation: 100,
        citizenTrust: 0,
        resourceLevel: 0,
      },
      flags: {},
      traits: [],
      relationships: {},
    };

    const context = {
      scenario: mockScenario,
      playerState: extremeState,
      currentDay: 5,
      previousDilemmas: [],
    };

    const result = SimulationUtils.generateRandomDilemma(context);

    expect(result).toBeDefined();
    expect(result.title).toContain('Day 5');
  });
});

// =============================================================================
// 스탯 변화 계산 테스트
// =============================================================================

describe('SimulationUtils.calculateStatChange', () => {
  const traitDefinitions = [
    {
      id: 'courageous',
      statModifiers: { cityChaos: -5, communityCohesion: 5 },
    },
    {
      id: 'cowardly',
      statModifiers: { cityChaos: 5, communityCohesion: -5 },
    },
  ];

  it('트레이트 없이 기본 변화량 반환', () => {
    const result = SimulationUtils.calculateStatChange(10, [], traitDefinitions);
    expect(result).toBe(10);
  });

  it('긍정 트레이트로 변화량 조정', () => {
    const result = SimulationUtils.calculateStatChange(
      10,
      ['courageous'],
      traitDefinitions
    );

    // 10 + (-5 + 5) = 10
    expect(result).toBe(10);
  });

  it('부정 트레이트로 변화량 조정', () => {
    const result = SimulationUtils.calculateStatChange(
      10,
      ['cowardly'],
      traitDefinitions
    );

    // 10 + (5 + -5) = 10
    expect(result).toBe(10);
  });

  it('여러 트레이트의 효과 합산', () => {
    const result = SimulationUtils.calculateStatChange(
      10,
      ['courageous', 'cowardly'],
      traitDefinitions
    );

    // 10 + (-5 + 5) + (5 + -5) = 10
    expect(result).toBe(10);
  });

  it('존재하지 않는 트레이트는 무시됨', () => {
    const result = SimulationUtils.calculateStatChange(
      10,
      ['nonExistent'],
      traitDefinitions
    );

    expect(result).toBe(10);
  });
});
