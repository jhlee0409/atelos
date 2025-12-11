/**
 * 시나리오 데이터 일관성 검증 유틸리티
 * AI 생성 후 스탯/플래그/엔딩 조건 간 불일치를 감지합니다.
 */

import type { ScenarioData, EndingArchetype, SystemCondition } from '@/types';

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: 'ending' | 'stat' | 'flag' | 'character' | 'relationship';
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
  };
}

/**
 * 엔딩 조건에서 참조하는 스탯 ID가 실제 존재하는지 검증
 */
function validateEndingStatReferences(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validStatIds = new Set(scenario.scenarioStats.map((s) => s.id));

  scenario.endingArchetypes.forEach((ending) => {
    ending.systemConditions.forEach((condition) => {
      if (condition.type === 'required_stat') {
        if (!validStatIds.has(condition.statId)) {
          issues.push({
            type: 'error',
            category: 'ending',
            field: `${ending.endingId}.systemConditions`,
            message: `엔딩 "${ending.title}"의 스탯 조건 "${condition.statId}"이(가) 존재하지 않습니다.`,
            suggestion: `사용 가능한 스탯: ${Array.from(validStatIds).join(', ')}`,
          });
        }
      }
    });
  });

  return issues;
}

/**
 * 엔딩 조건에서 참조하는 플래그가 실제 존재하는지 검증
 */
function validateEndingFlagReferences(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validFlagNames = new Set(scenario.flagDictionary.map((f) => f.flagName));

  scenario.endingArchetypes.forEach((ending) => {
    ending.systemConditions.forEach((condition) => {
      if (condition.type === 'required_flag') {
        // FLAG_ 접두사 정규화
        const normalizedFlag = condition.flagName.startsWith('FLAG_')
          ? condition.flagName
          : `FLAG_${condition.flagName}`;

        if (!validFlagNames.has(condition.flagName) && !validFlagNames.has(normalizedFlag)) {
          issues.push({
            type: 'error',
            category: 'ending',
            field: `${ending.endingId}.systemConditions`,
            message: `엔딩 "${ending.title}"의 플래그 조건 "${condition.flagName}"이(가) 존재하지 않습니다.`,
            suggestion: `사용 가능한 플래그: ${Array.from(validFlagNames).slice(0, 5).join(', ')}...`,
          });
        }
      }
    });
  });

  return issues;
}

/**
 * 관계에서 참조하는 캐릭터가 실제 존재하는지 검증
 */
function validateRelationshipCharacters(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validCharacterNames = new Set(scenario.characters.map((c) => c.characterName));

  scenario.initialRelationships.forEach((rel) => {
    if (!validCharacterNames.has(rel.personA)) {
      issues.push({
        type: 'error',
        category: 'relationship',
        field: `relationship.${rel.id}`,
        message: `관계의 캐릭터 "${rel.personA}"이(가) 존재하지 않습니다.`,
      });
    }
    if (!validCharacterNames.has(rel.personB)) {
      issues.push({
        type: 'error',
        category: 'relationship',
        field: `relationship.${rel.id}`,
        message: `관계의 캐릭터 "${rel.personB}"이(가) 존재하지 않습니다.`,
      });
    }
  });

  return issues;
}

/**
 * 스토리 오프닝의 firstCharacterToMeet이 존재하는지 검증
 */
function validateStoryOpeningCharacters(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!scenario.storyOpening) return issues;

  const validCharacterNames = new Set(scenario.characters.map((c) => c.characterName));

  // firstCharacterToMeet 검증
  if (scenario.storyOpening.firstCharacterToMeet) {
    if (!validCharacterNames.has(scenario.storyOpening.firstCharacterToMeet)) {
      issues.push({
        type: 'error',
        category: 'character',
        field: 'storyOpening.firstCharacterToMeet',
        message: `첫 만남 캐릭터 "${scenario.storyOpening.firstCharacterToMeet}"이(가) 존재하지 않습니다.`,
        suggestion: `사용 가능한 캐릭터: ${Array.from(validCharacterNames).join(', ')}`,
      });
    }
  }

  // characterIntroductionSequence 검증
  if (scenario.storyOpening.characterIntroductionSequence) {
    scenario.storyOpening.characterIntroductionSequence.forEach((intro) => {
      if (!validCharacterNames.has(intro.characterName)) {
        issues.push({
          type: 'error',
          category: 'character',
          field: 'storyOpening.characterIntroductionSequence',
          message: `소개 시퀀스의 캐릭터 "${intro.characterName}"이(가) 존재하지 않습니다.`,
        });
      }
    });
  }

  // hiddenNPCRelationships 검증
  if (scenario.storyOpening.hiddenNPCRelationships) {
    scenario.storyOpening.hiddenNPCRelationships.forEach((rel) => {
      if (!validCharacterNames.has(rel.characterA)) {
        issues.push({
          type: 'error',
          category: 'character',
          field: 'storyOpening.hiddenNPCRelationships',
          message: `숨겨진 관계의 캐릭터 "${rel.characterA}"이(가) 존재하지 않습니다.`,
        });
      }
      if (!validCharacterNames.has(rel.characterB)) {
        issues.push({
          type: 'error',
          category: 'character',
          field: 'storyOpening.hiddenNPCRelationships',
          message: `숨겨진 관계의 캐릭터 "${rel.characterB}"이(가) 존재하지 않습니다.`,
        });
      }
    });
  }

  // characterRevelations 검증
  if (scenario.storyOpening.characterRevelations) {
    scenario.storyOpening.characterRevelations.forEach((rev) => {
      if (!validCharacterNames.has(rev.characterName)) {
        issues.push({
          type: 'error',
          category: 'character',
          field: 'storyOpening.characterRevelations',
          message: `캐릭터 공개 설정의 "${rev.characterName}"이(가) 존재하지 않습니다.`,
        });
      }
    });
  }

  return issues;
}

/**
 * 스탯 범위 및 초기값 검증
 */
function validateStatRanges(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  scenario.scenarioStats.forEach((stat) => {
    const initialValue = stat.initialValue ?? stat.current;

    if (initialValue < stat.min || initialValue > stat.max) {
      issues.push({
        type: 'warning',
        category: 'stat',
        field: `stat.${stat.id}`,
        message: `스탯 "${stat.name}"의 초기값(${initialValue})이 범위(${stat.min}-${stat.max}) 밖입니다.`,
      });
    }
  });

  return issues;
}

/**
 * 엔딩 조건의 논리적 충돌 검증 (동일 스탯에 상충 조건)
 */
function validateEndingConditionConflicts(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  scenario.endingArchetypes.forEach((ending) => {
    const statConditions = ending.systemConditions.filter(
      (c): c is Extract<SystemCondition, { type: 'required_stat' }> => c.type === 'required_stat'
    );

    // 같은 스탯에 대한 조건이 여러 개인 경우 충돌 가능성 체크
    const statGroups = new Map<string, typeof statConditions>();
    statConditions.forEach((cond) => {
      const existing = statGroups.get(cond.statId) || [];
      existing.push(cond);
      statGroups.set(cond.statId, existing);
    });

    statGroups.forEach((conditions, statId) => {
      if (conditions.length > 1) {
        // 같은 스탯에 >= 와 <= 조건이 동시에 있고 교차점이 없으면 경고
        const geConditions = conditions.filter((c) =>
          ['greater_equal', 'greater_than'].includes(c.comparison)
        );
        const leConditions = conditions.filter((c) =>
          ['less_equal', 'less_than'].includes(c.comparison)
        );

        if (geConditions.length > 0 && leConditions.length > 0) {
          const minGe = Math.min(...geConditions.map((c) => c.value));
          const maxLe = Math.max(...leConditions.map((c) => c.value));

          if (minGe > maxLe) {
            issues.push({
              type: 'warning',
              category: 'ending',
              field: `${ending.endingId}.systemConditions`,
              message: `엔딩 "${ending.title}"의 스탯 "${statId}" 조건이 충돌합니다 (>=${minGe} AND <=${maxLe}).`,
              suggestion: '이 엔딩은 달성 불가능할 수 있습니다.',
            });
          }
        }
      }
    });
  });

  return issues;
}

/**
 * 미사용 플래그 감지 (경고)
 */
function detectUnusedFlags(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const usedFlags = new Set<string>();

  // 엔딩 조건에서 사용된 플래그
  scenario.endingArchetypes.forEach((ending) => {
    ending.systemConditions.forEach((condition) => {
      if (condition.type === 'required_flag') {
        usedFlags.add(condition.flagName);
      }
    });
  });

  // 사용되지 않은 플래그 감지
  scenario.flagDictionary.forEach((flag) => {
    if (!usedFlags.has(flag.flagName)) {
      issues.push({
        type: 'warning',
        category: 'flag',
        field: `flag.${flag.flagName}`,
        message: `플래그 "${flag.flagName}"이(가) 어떤 엔딩 조건에서도 사용되지 않습니다.`,
        suggestion: '이 플래그를 엔딩 조건에 추가하거나 삭제를 고려하세요.',
      });
    }
  });

  return issues;
}

/**
 * 전체 시나리오 검증 실행
 */
export function validateScenario(scenario: ScenarioData): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateEndingStatReferences(scenario),
    ...validateEndingFlagReferences(scenario),
    ...validateRelationshipCharacters(scenario),
    ...validateStoryOpeningCharacters(scenario),
    ...validateStatRanges(scenario),
    ...validateEndingConditionConflicts(scenario),
    ...detectUnusedFlags(scenario),
  ];

  const errors = issues.filter((i) => i.type === 'error').length;
  const warnings = issues.filter((i) => i.type === 'warning').length;

  return {
    isValid: errors === 0,
    issues,
    summary: {
      errors,
      warnings,
    },
  };
}

/**
 * 특정 카테고리의 이슈만 필터링
 */
export function filterIssuesByCategory(
  result: ValidationResult,
  category: ValidationIssue['category']
): ValidationIssue[] {
  return result.issues.filter((issue) => issue.category === category);
}

/**
 * 빠른 검증 (에러만 체크)
 */
export function quickValidate(scenario: ScenarioData): { hasErrors: boolean; errorCount: number } {
  const result = validateScenario(scenario);
  return {
    hasErrors: result.summary.errors > 0,
    errorCount: result.summary.errors,
  };
}
