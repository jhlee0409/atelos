/**
 * ending-checker.ts 유닛 테스트
 * @description 엔딩 조건 체크 로직 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkStatCondition,
  checkFlagCondition,
  checkSurvivorCountCondition,
  checkEndingConditions,
} from '@/lib/ending-checker';
import {
  mockEndingArchetypes,
  mockPlayerStateInitial,
  mockPlayerStateEndingSuccess,
  mockPlayerStateChaosEnding,
} from '../fixtures/mock-scenario';

// =============================================================================
// 스탯 조건 체크 테스트
// =============================================================================

describe('checkStatCondition', () => {
  const stats = {
    cityChaos: 50,
    communityCohesion: 60,
    survivalFoundation: 70,
    citizenTrust: 40,
    resourceLevel: 30,
  };

  describe('greater_equal 비교', () => {
    it('값이 조건보다 크거나 같으면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'survivalFoundation',
        comparison: 'greater_equal' as const,
        value: 70,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건보다 작으면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'resourceLevel',
        comparison: 'greater_equal' as const,
        value: 50,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  describe('less_equal 비교', () => {
    it('값이 조건보다 작거나 같으면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'citizenTrust',
        comparison: 'less_equal' as const,
        value: 40,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건보다 크면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'cityChaos',
        comparison: 'less_equal' as const,
        value: 30,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  describe('equal 비교', () => {
    it('값이 조건과 같으면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'cityChaos',
        comparison: 'equal' as const,
        value: 50,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건과 다르면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'cityChaos',
        comparison: 'equal' as const,
        value: 51,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  describe('greater_than 비교', () => {
    it('값이 조건보다 크면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'communityCohesion',
        comparison: 'greater_than' as const,
        value: 55,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건과 같으면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'communityCohesion',
        comparison: 'greater_than' as const,
        value: 60,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  describe('less_than 비교', () => {
    it('값이 조건보다 작으면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'resourceLevel',
        comparison: 'less_than' as const,
        value: 40,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건과 같으면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'resourceLevel',
        comparison: 'less_than' as const,
        value: 30,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  describe('not_equal 비교', () => {
    it('값이 조건과 다르면 true', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'cityChaos',
        comparison: 'not_equal' as const,
        value: 60,
      };
      expect(checkStatCondition(condition, stats)).toBe(true);
    });

    it('값이 조건과 같으면 false', () => {
      const condition = {
        type: 'required_stat' as const,
        statId: 'cityChaos',
        comparison: 'not_equal' as const,
        value: 50,
      };
      expect(checkStatCondition(condition, stats)).toBe(false);
    });
  });

  it('존재하지 않는 스탯은 false 반환', () => {
    const condition = {
      type: 'required_stat' as const,
      statId: 'nonExistentStat',
      comparison: 'greater_equal' as const,
      value: 50,
    };
    expect(checkStatCondition(condition, stats)).toBe(false);
  });
});

// =============================================================================
// 플래그 조건 체크 테스트 (DEPRECATED - ActionHistory로 대체)
// =============================================================================

describe('checkFlagCondition (deprecated)', () => {
  // 플래그 시스템은 ActionHistory로 대체됨
  // 이 테스트는 하위 호환성을 위해 유지되지만, 새로운 시나리오에서는 사용하지 않음
  const flags = {
    FLAG_FIRST_CONTACT: true,
    FLAG_RESOURCE_CACHE_FOUND: false,
    FLAG_ALLIANCE_FORMED: 3,
    FLAG_EMPTY_COUNT: 0,
  };

  it('boolean true 플래그는 true 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_FIRST_CONTACT',
    };
    expect(checkFlagCondition(condition, flags)).toBe(true);
  });

  it('boolean false 플래그는 false 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_RESOURCE_CACHE_FOUND',
    };
    expect(checkFlagCondition(condition, flags)).toBe(false);
  });

  it('count > 0인 플래그는 true 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_ALLIANCE_FORMED',
    };
    expect(checkFlagCondition(condition, flags)).toBe(true);
  });

  it('count가 0인 플래그는 false 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_EMPTY_COUNT',
    };
    expect(checkFlagCondition(condition, flags)).toBe(false);
  });

  it('존재하지 않는 플래그는 false 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_NON_EXISTENT',
    };
    expect(checkFlagCondition(condition, flags)).toBe(false);
  });

  it('빈 flags 객체면 false 반환', () => {
    const condition = {
      type: 'required_flag' as const,
      flagName: 'FLAG_ANY',
    };
    expect(checkFlagCondition(condition, {})).toBe(false);
    expect(checkFlagCondition(condition, undefined as any)).toBe(false);
  });
});

// =============================================================================
// 생존자 수 조건 체크 테스트
// =============================================================================

describe('checkSurvivorCountCondition', () => {
  it('greater_equal: 생존자 수가 조건 이상이면 true', () => {
    const condition = {
      type: 'survivor_count' as const,
      comparison: 'greater_equal' as const,
      value: 5,
    };
    expect(checkSurvivorCountCondition(condition, 5)).toBe(true);
    expect(checkSurvivorCountCondition(condition, 6)).toBe(true);
    expect(checkSurvivorCountCondition(condition, 4)).toBe(false);
  });

  it('less_equal: 생존자 수가 조건 이하면 true', () => {
    const condition = {
      type: 'survivor_count' as const,
      comparison: 'less_equal' as const,
      value: 3,
    };
    expect(checkSurvivorCountCondition(condition, 3)).toBe(true);
    expect(checkSurvivorCountCondition(condition, 2)).toBe(true);
    expect(checkSurvivorCountCondition(condition, 4)).toBe(false);
  });

  it('equal: 생존자 수가 조건과 같으면 true', () => {
    const condition = {
      type: 'survivor_count' as const,
      comparison: 'equal' as const,
      value: 4,
    };
    expect(checkSurvivorCountCondition(condition, 4)).toBe(true);
    expect(checkSurvivorCountCondition(condition, 5)).toBe(false);
  });
});

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
