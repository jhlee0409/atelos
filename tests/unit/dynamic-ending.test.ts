/**
 * Stage 5: 동적 엔딩 시스템 (Dynamic Ending System) 테스트
 *
 * 테스트 대상:
 * - characterArcs 데이터 추출
 * - API 요청에 characterArcs 포함
 * - 프롬프트에 character_arcs 섹션 생성
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CharacterArc, CharacterMoment } from '@/types';

// =============================================================================
// 테스트용 헬퍼 함수 (실제 route.ts 로직 추출)
// =============================================================================

/**
 * [Stage 5 개선 #1] characterArcs 요약 데이터 생성
 * 엔딩 프롬프트에 포함할 캐릭터 아크 정보 추출
 */
const extractCharacterArcsSummary = (
  characterArcs: CharacterArc[]
): {
  name: string;
  trustLevel: number;
  currentMood: string;
  keyMoments: string[];
}[] => {
  return characterArcs.map((arc) => ({
    name: arc.characterName,
    trustLevel: arc.trustLevel,
    currentMood: arc.currentMood,
    keyMoments: arc.moments
      .slice(-5) // 최근 5개 모먼트만
      .map((m) => `Day${m.day}: ${m.description}`),
  }));
};

/**
 * [Stage 5 개선 #1] character_arcs 프롬프트 섹션 생성
 */
const buildCharacterArcsSection = (
  characterArcsSummary: {
    name: string;
    trustLevel: number;
    currentMood: string;
    keyMoments: string[];
  }[]
): string => {
  if (!characterArcsSummary || characterArcsSummary.length === 0) {
    return '';
  }

  const arcsContent = characterArcsSummary
    .map((arc) => {
      const trustDescription =
        arc.trustLevel >= 50
          ? '높은 신뢰'
          : arc.trustLevel >= 0
            ? '보통'
            : arc.trustLevel >= -50
              ? '낮은 신뢰'
              : '적대적';

      return `### ${arc.name}
- 신뢰도: ${arc.trustLevel} (${trustDescription})
- 현재 감정: ${arc.currentMood}
- 주요 순간:
${arc.keyMoments.length > 0 ? arc.keyMoments.map((m) => `  - ${m}`).join('\n') : '  - 없음'}`;
    })
    .join('\n\n');

  return `<character_arcs>
## [Stage 5] 캐릭터별 발전 기록

${arcsContent}

**참고**: 위 정보는 게임 중 축적된 캐릭터와의 관계 여정입니다.
결말에서 각 캐릭터의 운명(characterFates)을 결정할 때 이 정보를 반영해주세요.
</character_arcs>`;
};

// =============================================================================
// 테스트용 데이터
// =============================================================================

const createCharacterMoments = (count: number = 3): CharacterMoment[] => {
  return Array.from({ length: count }, (_, i) => ({
    day: i + 1,
    description: `Day ${i + 1}의 중요한 순간`,
    emotionalImpact: 'positive' as const,
  }));
};

const createCharacterArcs = (
  overrides?: Partial<CharacterArc>[]
): CharacterArc[] => [
  {
    characterName: '박준경',
    moments: createCharacterMoments(3),
    currentMood: 'hopeful',
    trustLevel: 60,
    ...overrides?.[0],
  },
  {
    characterName: '한서아',
    moments: createCharacterMoments(2),
    currentMood: 'anxious',
    trustLevel: -20,
    ...overrides?.[1],
  },
  {
    characterName: '이재현',
    moments: [],
    currentMood: 'determined',
    trustLevel: 0,
    ...overrides?.[2],
  },
];

// =============================================================================
// 테스트
// =============================================================================

describe('Stage 5: 동적 엔딩 시스템 - characterArcs 반영', () => {
  describe('#1 characterArcs 데이터 추출', () => {
    it('characterArcs에서 요약 데이터를 추출한다', () => {
      const arcs = createCharacterArcs();

      const summary = extractCharacterArcsSummary(arcs);

      expect(summary).toHaveLength(3);
      expect(summary[0].name).toBe('박준경');
      expect(summary[0].trustLevel).toBe(60);
      expect(summary[0].currentMood).toBe('hopeful');
      expect(summary[0].keyMoments).toHaveLength(3);
    });

    it('최근 5개 모먼트만 추출한다', () => {
      const arcs = createCharacterArcs([
        {
          characterName: '박준경',
          moments: createCharacterMoments(10),
          currentMood: 'hopeful',
          trustLevel: 60,
        },
      ]);

      const summary = extractCharacterArcsSummary(arcs);

      expect(summary[0].keyMoments).toHaveLength(5);
      // 최근 5개 (Day 6~10)
      expect(summary[0].keyMoments[0]).toContain('Day6');
      expect(summary[0].keyMoments[4]).toContain('Day10');
    });

    it('모먼트가 없는 캐릭터도 처리한다', () => {
      const arcs = createCharacterArcs([
        {
          characterName: '박준경',
          moments: [],
          currentMood: 'determined',
          trustLevel: 0,
        },
      ]);

      const summary = extractCharacterArcsSummary(arcs);

      expect(summary[0].keyMoments).toHaveLength(0);
    });

    it('빈 배열이면 빈 배열을 반환한다', () => {
      const summary = extractCharacterArcsSummary([]);

      expect(summary).toEqual([]);
    });
  });

  describe('#1 character_arcs 프롬프트 섹션 생성', () => {
    it('characterArcs 요약으로 프롬프트 섹션을 생성한다', () => {
      const arcs = createCharacterArcs();
      const summary = extractCharacterArcsSummary(arcs);

      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('<character_arcs>');
      expect(section).toContain('</character_arcs>');
      expect(section).toContain('박준경');
      expect(section).toContain('한서아');
      expect(section).toContain('이재현');
    });

    it('신뢰도에 따른 설명을 포함한다', () => {
      const arcs = createCharacterArcs([
        { trustLevel: 80 }, // 높은 신뢰
        { trustLevel: -60 }, // 적대적
        { trustLevel: 20 }, // 보통
      ]);
      const summary = extractCharacterArcsSummary(arcs);

      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('높은 신뢰');
      expect(section).toContain('적대적');
      expect(section).toContain('보통');
    });

    it('현재 감정 상태를 포함한다', () => {
      const arcs = createCharacterArcs([
        { currentMood: 'hopeful' },
        { currentMood: 'angry' },
        { currentMood: 'resigned' },
      ]);
      const summary = extractCharacterArcsSummary(arcs);

      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('hopeful');
      expect(section).toContain('angry');
      expect(section).toContain('resigned');
    });

    it('주요 순간을 포함한다', () => {
      const arcs = createCharacterArcs();
      const summary = extractCharacterArcsSummary(arcs);

      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('Day1');
      expect(section).toContain('중요한 순간');
    });

    it('빈 배열이면 빈 문자열을 반환한다', () => {
      const section = buildCharacterArcsSection([]);

      expect(section).toBe('');
    });

    it('모먼트가 없는 캐릭터는 "없음"으로 표시한다', () => {
      const arcs = createCharacterArcs([
        {
          characterName: '박준경',
          moments: [],
          currentMood: 'determined',
          trustLevel: 0,
        },
      ]);
      const summary = extractCharacterArcsSummary(arcs);

      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('- 없음');
    });
  });

  describe('통합 테스트', () => {
    it('전체 흐름: characterArcs → 요약 → 프롬프트 섹션', () => {
      // Step 1: 게임 중 축적된 characterArcs
      const arcs: CharacterArc[] = [
        {
          characterName: '박준경',
          moments: [
            { day: 1, description: '첫 만남', emotionalImpact: 'neutral' },
            { day: 3, description: '갈등 발생', emotionalImpact: 'negative' },
            { day: 5, description: '화해', emotionalImpact: 'positive' },
          ],
          currentMood: 'hopeful',
          trustLevel: 75,
        },
        {
          characterName: '한서아',
          moments: [
            { day: 2, description: '비밀 공유', emotionalImpact: 'positive' },
          ],
          currentMood: 'anxious',
          trustLevel: 40,
        },
      ];

      // Step 2: 요약 데이터 추출
      const summary = extractCharacterArcsSummary(arcs);

      expect(summary).toHaveLength(2);
      expect(summary[0].name).toBe('박준경');
      expect(summary[0].trustLevel).toBe(75);
      expect(summary[0].keyMoments).toContain('Day1: 첫 만남');
      expect(summary[0].keyMoments).toContain('Day5: 화해');

      // Step 3: 프롬프트 섹션 생성
      const section = buildCharacterArcsSection(summary);

      expect(section).toContain('<character_arcs>');
      expect(section).toContain('박준경');
      expect(section).toContain('75 (높은 신뢰)');
      expect(section).toContain('hopeful');
      expect(section).toContain('첫 만남');
      expect(section).toContain('화해');
      expect(section).toContain('한서아');
      expect(section).toContain('40 (보통)');
      expect(section).toContain('anxious');
      expect(section).toContain('비밀 공유');
      expect(section).toContain('</character_arcs>');
    });
  });
});
