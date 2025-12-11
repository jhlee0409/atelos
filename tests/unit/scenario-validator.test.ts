/**
 * 시나리오 검증 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  validateScenario,
  filterIssuesByCategory,
  quickValidate,
  type ValidationResult,
} from '@/lib/scenario-validator';
import { mockScenario, mockCharacters, mockScenarioStats, mockFlagDictionary, mockEndingArchetypes } from '../fixtures/mock-scenario';
import type { ScenarioData } from '@/types';

// 테스트용 시나리오 생성 헬퍼
function createTestScenario(overrides: Partial<ScenarioData> = {}): ScenarioData {
  return {
    ...mockScenario,
    initialRelationships: mockScenario.initialRelationships.map((rel, idx) => ({
      id: `rel-${idx}`,
      personA: rel.pair[0],
      personB: rel.pair[1],
      value: rel.value,
    })),
    ...overrides,
  } as ScenarioData;
}

describe('validateScenario', () => {
  describe('valid scenarios', () => {
    it('should return no errors for a valid scenario', () => {
      const scenario = createTestScenario();
      const result = validateScenario(scenario);

      expect(result.isValid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });
  });

  describe('ending stat reference validation', () => {
    it('should detect invalid stat reference in ending conditions', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_TEST',
            title: '테스트 엔딩',
            description: '테스트',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_stat',
                statId: 'nonExistentStat', // 존재하지 않는 스탯
                comparison: 'greater_equal',
                value: 50,
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);

      expect(result.isValid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);

      const endingIssues = filterIssuesByCategory(result, 'ending');
      expect(endingIssues.some((i) => i.message.includes('nonExistentStat'))).toBe(true);
    });

    it('should pass for valid stat references', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_TEST',
            title: '테스트 엔딩',
            description: '테스트',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_stat',
                statId: 'cityChaos', // 존재하는 스탯
                comparison: 'greater_equal',
                value: 50,
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);
      const statErrors = result.issues.filter(
        (i) => i.category === 'ending' && i.type === 'error' && i.message.includes('스탯')
      );

      expect(statErrors.length).toBe(0);
    });
  });

  describe('ending flag reference validation', () => {
    it('should detect invalid flag reference in ending conditions', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_TEST',
            title: '테스트 엔딩',
            description: '테스트',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_flag',
                flagName: 'FLAG_NONEXISTENT', // 존재하지 않는 플래그
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);

      expect(result.isValid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);

      const endingIssues = filterIssuesByCategory(result, 'ending');
      expect(endingIssues.some((i) => i.message.includes('FLAG_NONEXISTENT'))).toBe(true);
    });

    it('should pass for valid flag references', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_TEST',
            title: '테스트 엔딩',
            description: '테스트',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_flag',
                flagName: 'FLAG_ESCAPE_VEHICLE_SECURED', // 존재하는 플래그
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);
      const flagErrors = result.issues.filter(
        (i) => i.category === 'ending' && i.type === 'error' && i.message.includes('플래그')
      );

      expect(flagErrors.length).toBe(0);
    });
  });

  describe('relationship character validation', () => {
    it('should detect invalid character in relationships', () => {
      const scenario = createTestScenario({
        initialRelationships: [
          {
            id: 'rel-1',
            personA: '존재하지않는캐릭터',
            personB: '박지현',
            value: 50,
          },
        ],
      });

      const result = validateScenario(scenario);

      expect(result.isValid).toBe(false);
      const relIssues = filterIssuesByCategory(result, 'relationship');
      expect(relIssues.some((i) => i.message.includes('존재하지않는캐릭터'))).toBe(true);
    });

    it('should detect both invalid characters in relationship', () => {
      const scenario = createTestScenario({
        initialRelationships: [
          {
            id: 'rel-1',
            personA: '가상인물A',
            personB: '가상인물B',
            value: 50,
          },
        ],
      });

      const result = validateScenario(scenario);
      const relIssues = filterIssuesByCategory(result, 'relationship');

      expect(relIssues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('story opening character validation', () => {
    it('should detect invalid firstCharacterToMeet', () => {
      const scenario = createTestScenario({
        storyOpening: {
          prologue: '테스트 프롤로그',
          incitingIncident: '테스트 촉발 사건',
          firstCharacterToMeet: '없는캐릭터',
          firstEncounterContext: '테스트 상황',
          openingTone: 'calm',
          thematicElements: ['생존'],
        },
      });

      const result = validateScenario(scenario);

      expect(result.isValid).toBe(false);
      const charIssues = filterIssuesByCategory(result, 'character');
      expect(charIssues.some((i) => i.message.includes('없는캐릭터'))).toBe(true);
    });

    it('should detect invalid character in characterIntroductionSequence', () => {
      const scenario = createTestScenario({
        storyOpening: {
          prologue: '테스트',
          incitingIncident: '테스트',
          firstCharacterToMeet: '박지현',
          firstEncounterContext: '테스트',
          openingTone: 'calm',
          thematicElements: ['생존'],
          characterIntroductionSequence: [
            {
              characterName: '유령캐릭터',
              order: 1,
              encounterContext: '테스트',
              firstImpressionKeywords: ['테스트'],
              expectedTiming: 'opening',
            },
          ],
        },
      });

      const result = validateScenario(scenario);
      const charIssues = filterIssuesByCategory(result, 'character');
      expect(charIssues.some((i) => i.message.includes('유령캐릭터'))).toBe(true);
    });

    it('should detect invalid characters in hiddenNPCRelationships', () => {
      const scenario = createTestScenario({
        storyOpening: {
          prologue: '테스트',
          incitingIncident: '테스트',
          firstCharacterToMeet: '박지현',
          firstEncounterContext: '테스트',
          openingTone: 'calm',
          thematicElements: ['생존'],
          hiddenNPCRelationships: [
            {
              relationId: 'REL_001',
              characterA: '유령A',
              characterB: '유령B',
              actualValue: 50,
              relationshipType: '과거 연인',
              backstory: '테스트',
              visibility: 'hidden',
              discoveryHint: '테스트',
              discoveryMethod: 'dialogue',
            },
          ],
        },
      });

      const result = validateScenario(scenario);
      const charIssues = filterIssuesByCategory(result, 'character');
      expect(charIssues.filter((i) => i.field === 'storyOpening.hiddenNPCRelationships').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('stat range validation', () => {
    it('should warn when initial value is out of range', () => {
      const scenario = createTestScenario({
        scenarioStats: [
          {
            id: 'testStat',
            name: '테스트 스탯',
            description: '테스트',
            current: 150, // 범위 밖
            initialValue: 150, // 범위 밖
            min: 0,
            max: 100,
            range: [0, 100],
          },
        ],
      });

      const result = validateScenario(scenario);
      const statIssues = filterIssuesByCategory(result, 'stat');

      expect(statIssues.some((i) => i.type === 'warning' && i.message.includes('범위'))).toBe(true);
    });

    it('should not warn when initial value is in range', () => {
      const scenario = createTestScenario({
        scenarioStats: [
          {
            id: 'testStat',
            name: '테스트 스탯',
            description: '테스트',
            current: 50,
            initialValue: 50,
            min: 0,
            max: 100,
            range: [0, 100],
          },
        ],
      });

      const result = validateScenario(scenario);
      const statWarnings = result.issues.filter(
        (i) => i.category === 'stat' && i.type === 'warning'
      );

      expect(statWarnings.length).toBe(0);
    });
  });

  describe('ending condition conflict validation', () => {
    it('should warn about conflicting stat conditions', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_IMPOSSIBLE',
            title: '불가능한 엔딩',
            description: '절대 달성 불가',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_stat',
                statId: 'cityChaos',
                comparison: 'greater_equal',
                value: 80, // >= 80
              },
              {
                type: 'required_stat',
                statId: 'cityChaos',
                comparison: 'less_equal',
                value: 20, // <= 20 (충돌!)
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);
      const endingWarnings = result.issues.filter(
        (i) => i.category === 'ending' && i.type === 'warning' && i.message.includes('충돌')
      );

      expect(endingWarnings.length).toBeGreaterThan(0);
    });

    it('should not warn for non-conflicting conditions', () => {
      const scenario = createTestScenario({
        endingArchetypes: [
          {
            endingId: 'ENDING_POSSIBLE',
            title: '가능한 엔딩',
            description: '달성 가능',
            isGoalSuccess: true,
            systemConditions: [
              {
                type: 'required_stat',
                statId: 'cityChaos',
                comparison: 'greater_equal',
                value: 30,
              },
              {
                type: 'required_stat',
                statId: 'cityChaos',
                comparison: 'less_equal',
                value: 70, // 30-70 사이면 가능
              },
            ],
          },
        ],
      });

      const result = validateScenario(scenario);
      const conflictWarnings = result.issues.filter(
        (i) => i.category === 'ending' && i.message.includes('충돌')
      );

      expect(conflictWarnings.length).toBe(0);
    });
  });

  describe('unused flag detection', () => {
    it('should warn about unused flags', () => {
      const scenario = createTestScenario({
        flagDictionary: [
          ...mockFlagDictionary,
          {
            flagName: 'FLAG_NEVER_USED',
            description: '사용되지 않는 플래그',
            type: 'boolean',
            initial: false,
          },
        ],
      });

      const result = validateScenario(scenario);
      const flagWarnings = filterIssuesByCategory(result, 'flag');

      expect(flagWarnings.some((i) => i.message.includes('FLAG_NEVER_USED'))).toBe(true);
    });
  });
});

describe('filterIssuesByCategory', () => {
  it('should filter issues by category', () => {
    const scenario = createTestScenario({
      initialRelationships: [
        {
          id: 'rel-1',
          personA: '없는캐릭터',
          personB: '박지현',
          value: 50,
        },
      ],
      endingArchetypes: [
        {
          endingId: 'ENDING_TEST',
          title: '테스트',
          description: '테스트',
          isGoalSuccess: true,
          systemConditions: [
            {
              type: 'required_stat',
              statId: 'invalidStat',
              comparison: 'greater_equal',
              value: 50,
            },
          ],
        },
      ],
    });

    const result = validateScenario(scenario);

    const relationshipIssues = filterIssuesByCategory(result, 'relationship');
    const endingIssues = filterIssuesByCategory(result, 'ending');

    expect(relationshipIssues.every((i) => i.category === 'relationship')).toBe(true);
    expect(endingIssues.every((i) => i.category === 'ending')).toBe(true);
  });
});

describe('quickValidate', () => {
  it('should return hasErrors: false for valid scenario', () => {
    const scenario = createTestScenario();
    const result = quickValidate(scenario);

    expect(result.hasErrors).toBe(false);
    expect(result.errorCount).toBe(0);
  });

  it('should return hasErrors: true for invalid scenario', () => {
    const scenario = createTestScenario({
      endingArchetypes: [
        {
          endingId: 'ENDING_TEST',
          title: '테스트',
          description: '테스트',
          isGoalSuccess: true,
          systemConditions: [
            {
              type: 'required_stat',
              statId: 'invalidStat',
              comparison: 'greater_equal',
              value: 50,
            },
          ],
        },
      ],
    });

    const result = quickValidate(scenario);

    expect(result.hasErrors).toBe(true);
    expect(result.errorCount).toBeGreaterThan(0);
  });
});
