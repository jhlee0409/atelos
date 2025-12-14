/**
 * ending-checker.ts 유닛 테스트
 * @description 엔딩 조건 체크 로직 검증
 *
 * NOTE: checkStatCondition, checkSurvivorCountCondition은 내부 헬퍼 함수로 변경됨.
 * checkEndingConditions 통합 테스트를 통해 해당 기능이 검증됨.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkEndingConditions } from '@/lib/ending-checker';
import {
  mockEndingArchetypes,
  mockPlayerStateInitial,
  mockPlayerStateEndingSuccess,
  mockPlayerStateChaosEnding,
} from '../fixtures/mock-scenario';

// =============================================================================
// 엔딩 조건 체크 통합 테스트
// =============================================================================

describe('checkEndingConditions', () => {
  beforeEach(() => {
    // 콘솔 출력 모킹
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('모든 조건을 만족하는 엔딩을 반환함', () => {
    const result = checkEndingConditions(
      mockPlayerStateEndingSuccess,
      mockEndingArchetypes
    );

    expect(result).not.toBeNull();
    expect(result?.endingId).toBe('ENDING_SURVIVAL_SUCCESS');
    expect(result?.isGoalSuccess).toBe(true);
  });

  it('혼돈 엔딩 조건을 만족하면 해당 엔딩 반환', () => {
    const result = checkEndingConditions(
      mockPlayerStateChaosEnding,
      mockEndingArchetypes
    );

    expect(result).not.toBeNull();
    expect(result?.endingId).toBe('ENDING_CHAOS_COLLAPSE');
    expect(result?.isGoalSuccess).toBe(false);
  });

  it('어떤 조건도 만족하지 않으면 null 반환', () => {
    const result = checkEndingConditions(
      mockPlayerStateInitial,
      mockEndingArchetypes
    );

    expect(result).toBeNull();
  });

  it('TIME_UP 엔딩은 체크에서 제외됨', () => {
    // TIME_UP 엔딩만 있는 경우
    const timeUpOnly = mockEndingArchetypes.filter(e => e.endingId === 'ENDING_TIME_UP');
    const result = checkEndingConditions(
      mockPlayerStateInitial,
      timeUpOnly
    );

    expect(result).toBeNull();
  });

  it('탈출 엔딩 조건 체크 (스탯 기반)', () => {
    // ENDING_ESCAPE_SUCCESS는 스탯 조건으로 체크됨
    // survivalFoundation >= 60 AND cityChaos < 80
    const escapeState = {
      ...mockPlayerStateInitial,
      stats: {
        ...mockPlayerStateInitial.stats,
        survivalFoundation: 65, // >= 60
        cityChaos: 50, // < 80
      },
      flags: {},
    };

    const result = checkEndingConditions(escapeState, mockEndingArchetypes);

    expect(result).not.toBeNull();
    expect(result?.endingId).toBe('ENDING_ESCAPE_SUCCESS');
  });

  it('생존자 수 조건도 체크함', () => {
    const endingsWithSurvivorCondition = [
      {
        endingId: 'ENDING_FULL_SURVIVAL',
        title: '완전 생존',
        description: '모두가 살아남았다.',
        isGoalSuccess: true,
        systemConditions: [
          {
            type: 'survivor_count' as const,
            comparison: 'greater_equal' as const,
            value: 5,
          },
        ],
      },
    ];

    // 생존자 수를 전달하면 조건 체크
    const result = checkEndingConditions(
      mockPlayerStateInitial,
      endingsWithSurvivorCondition,
      5
    );

    expect(result).not.toBeNull();
    expect(result?.endingId).toBe('ENDING_FULL_SURVIVAL');

    // 생존자 수 미달
    const resultFail = checkEndingConditions(
      mockPlayerStateInitial,
      endingsWithSurvivorCondition,
      3
    );

    expect(resultFail).toBeNull();
  });

  it('survivorCount가 전달되지 않으면 survivor_count 조건 미충족', () => {
    const endingsWithSurvivorCondition = [
      {
        endingId: 'ENDING_FULL_SURVIVAL',
        title: '완전 생존',
        description: '모두가 살아남았다.',
        isGoalSuccess: true,
        systemConditions: [
          {
            type: 'survivor_count' as const,
            comparison: 'greater_equal' as const,
            value: 5,
          },
        ],
      },
    ];

    // survivorCount 미전달
    const result = checkEndingConditions(
      mockPlayerStateInitial,
      endingsWithSurvivorCondition
    );

    expect(result).toBeNull();
  });

  it('복합 스탯 조건을 모두 만족해야 엔딩 발동', () => {
    // 플래그 시스템 deprecated - 스탯만으로 복합 조건 테스트
    const complexEnding = [
      {
        endingId: 'ENDING_COMPLEX',
        title: '복합 조건',
        description: '복합 조건 엔딩',
        isGoalSuccess: true,
        systemConditions: [
          {
            type: 'required_stat' as const,
            statId: 'survivalFoundation',
            comparison: 'greater_equal' as const,
            value: 60,
          },
          {
            type: 'required_stat' as const,
            statId: 'communityCohesion',
            comparison: 'greater_equal' as const,
            value: 50,
          },
        ],
      },
    ];

    // 첫 번째 스탯만 만족
    const stat1OnlyState = {
      ...mockPlayerStateInitial,
      stats: { ...mockPlayerStateInitial.stats, survivalFoundation: 70, communityCohesion: 30 },
      flags: {},
    };
    expect(checkEndingConditions(stat1OnlyState, complexEnding)).toBeNull();

    // 두 번째 스탯만 만족
    const stat2OnlyState = {
      ...mockPlayerStateInitial,
      stats: { ...mockPlayerStateInitial.stats, survivalFoundation: 40, communityCohesion: 60 },
      flags: {},
    };
    expect(checkEndingConditions(stat2OnlyState, complexEnding)).toBeNull();

    // 둘 다 만족
    const bothState = {
      ...mockPlayerStateInitial,
      stats: { ...mockPlayerStateInitial.stats, survivalFoundation: 70, communityCohesion: 60 },
      flags: {},
    };
    const result = checkEndingConditions(bothState, complexEnding);
    expect(result).not.toBeNull();
    expect(result?.endingId).toBe('ENDING_COMPLEX');
  });
});
