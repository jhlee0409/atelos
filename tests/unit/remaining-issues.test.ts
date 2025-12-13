/**
 * 남은 이슈 해결 테스트
 *
 * #1 worldState 커스텀 위치 - 이미 구현됨 (문서만 업데이트)
 * #2 actionContext.urgentMatters 활용
 * #3 informationPieces 중복 제거
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// #2 urgentMatters 활용 테스트
// =============================================================================

/**
 * 스탯 위험 수준 체크 및 urgentMatters 업데이트
 */
const updateUrgentMatters = (
  stats: Record<string, number>,
  statRanges: Record<string, { min: number; max: number }>,
  currentUrgentMatters: string[] = []
): string[] => {
  const urgentMatters: string[] = [];
  const CRITICAL_THRESHOLD = 0.4; // 40% 이하면 위험

  for (const [statId, value] of Object.entries(stats)) {
    const range = statRanges[statId];
    if (!range) continue;

    const percentage = (value - range.min) / (range.max - range.min);

    if (percentage <= CRITICAL_THRESHOLD) {
      const statName = statId; // 실제로는 한글 매핑 사용
      urgentMatters.push(`${statName} 위험 수준 (${Math.round(percentage * 100)}%)`);
    }
  }

  return urgentMatters;
};

describe('#2 urgentMatters 활용', () => {
  const mockStatRanges = {
    cityStability: { min: 0, max: 100 },
    supplies: { min: 0, max: 100 },
    morale: { min: 0, max: 100 },
  };

  it('스탯이 40% 이하면 urgentMatters에 추가한다', () => {
    const stats = {
      cityStability: 30, // 30% - 위험
      supplies: 60, // 60% - 정상
      morale: 20, // 20% - 위험
    };

    const result = updateUrgentMatters(stats, mockStatRanges);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(expect.stringContaining('cityStability'));
    expect(result).toContainEqual(expect.stringContaining('morale'));
  });

  it('모든 스탯이 정상이면 빈 배열을 반환한다', () => {
    const stats = {
      cityStability: 80,
      supplies: 60,
      morale: 50,
    };

    const result = updateUrgentMatters(stats, mockStatRanges);

    expect(result).toHaveLength(0);
  });

  it('경계값(40%)은 위험으로 간주한다', () => {
    const stats = {
      cityStability: 40, // 정확히 40%
      supplies: 41, // 41% - 정상
    };

    const result = updateUrgentMatters(stats, mockStatRanges);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('cityStability');
  });

  it('알 수 없는 스탯은 무시한다', () => {
    const stats = {
      unknownStat: 10,
      cityStability: 30,
    };

    const result = updateUrgentMatters(stats, mockStatRanges);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('cityStability');
  });
});

// =============================================================================
// #3 informationPieces 중복 제거 테스트
// =============================================================================

interface InformationPiece {
  id: string;
  content: string;
  source: string;
  discoveredAt: { day: number; action: string };
}

/**
 * 중복 체크 후 informationPiece 추가
 * @returns 추가 성공 여부
 */
const addInformationPiece = (
  pieces: InformationPiece[],
  newPiece: InformationPiece
): { added: boolean; pieces: InformationPiece[] } => {
  // ID 기반 중복 체크
  const exists = pieces.some((p) => p.id === newPiece.id);

  if (exists) {
    console.log(`📝 중복 정보 무시: ${newPiece.id}`);
    return { added: false, pieces };
  }

  return { added: true, pieces: [...pieces, newPiece] };
};

describe('#3 informationPieces 중복 제거', () => {
  const createPiece = (id: string, content: string): InformationPiece => ({
    id,
    content,
    source: 'test',
    discoveredAt: { day: 1, action: 'test' },
  });

  it('새로운 정보는 추가된다', () => {
    const pieces: InformationPiece[] = [];
    const newPiece = createPiece('info_1', '새로운 정보');

    const result = addInformationPiece(pieces, newPiece);

    expect(result.added).toBe(true);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].id).toBe('info_1');
  });

  it('같은 ID의 정보는 추가되지 않는다', () => {
    const pieces = [createPiece('info_1', '기존 정보')];
    const newPiece = createPiece('info_1', '중복 정보');

    const result = addInformationPiece(pieces, newPiece);

    expect(result.added).toBe(false);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].content).toBe('기존 정보');
  });

  it('다른 ID의 정보는 추가된다', () => {
    const pieces = [createPiece('info_1', '정보 1')];
    const newPiece = createPiece('info_2', '정보 2');

    const result = addInformationPiece(pieces, newPiece);

    expect(result.added).toBe(true);
    expect(result.pieces).toHaveLength(2);
  });

  it('여러 정보 연속 추가 시 중복 제거', () => {
    let pieces: InformationPiece[] = [];

    const piece1 = createPiece('info_1', '정보 1');
    const piece2 = createPiece('info_2', '정보 2');
    const piece1Dup = createPiece('info_1', '정보 1 중복');
    const piece3 = createPiece('info_3', '정보 3');

    let result = addInformationPiece(pieces, piece1);
    pieces = result.pieces;
    expect(result.added).toBe(true);

    result = addInformationPiece(pieces, piece2);
    pieces = result.pieces;
    expect(result.added).toBe(true);

    result = addInformationPiece(pieces, piece1Dup);
    pieces = result.pieces;
    expect(result.added).toBe(false);

    result = addInformationPiece(pieces, piece3);
    pieces = result.pieces;
    expect(result.added).toBe(true);

    expect(pieces).toHaveLength(3);
    expect(pieces.map((p) => p.id)).toEqual(['info_1', 'info_2', 'info_3']);
  });

  it('빈 배열에 첫 정보 추가', () => {
    const result = addInformationPiece([], createPiece('first', '첫 번째'));

    expect(result.added).toBe(true);
    expect(result.pieces).toHaveLength(1);
  });
});

// =============================================================================
// 통합 테스트
// =============================================================================

describe('통합 테스트', () => {
  it('urgentMatters와 informationPieces가 함께 작동한다', () => {
    // urgentMatters 업데이트
    const stats = { health: 25, morale: 80 };
    const ranges = { health: { min: 0, max: 100 }, morale: { min: 0, max: 100 } };
    const urgentMatters = updateUrgentMatters(stats, ranges);

    expect(urgentMatters).toHaveLength(1);
    expect(urgentMatters[0]).toContain('health');

    // informationPieces 중복 제거
    let pieces: InformationPiece[] = [];
    const { pieces: newPieces } = addInformationPiece(pieces, {
      id: 'urgent_health',
      content: '체력이 위험 수준입니다',
      source: 'system',
      discoveredAt: { day: 1, action: 'check' },
    });

    expect(newPieces).toHaveLength(1);
  });
});
