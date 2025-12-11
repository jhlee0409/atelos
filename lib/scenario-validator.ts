/**
 * 시나리오 데이터 일관성 검증 유틸리티
 * AI 생성 후 스탯/플래그/엔딩 조건 간 불일치를 감지합니다.
 */

import type { ScenarioData, EndingArchetype, SystemCondition } from '@/types';

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: 'ending' | 'stat' | 'flag' | 'character' | 'relationship' | 'trait' | 'duplicate';
  field: string;
  message: string;
  suggestion?: string;
  // 클릭하여 이동할 탭 정보
  targetTab?: 'basic' | 'characters' | 'system' | 'story';
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
            targetTab: 'system',
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
            targetTab: 'system',
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
        targetTab: 'characters',
      });
    }
    if (!validCharacterNames.has(rel.personB)) {
      issues.push({
        type: 'error',
        category: 'relationship',
        field: `relationship.${rel.id}`,
        message: `관계의 캐릭터 "${rel.personB}"이(가) 존재하지 않습니다.`,
        targetTab: 'characters',
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
        targetTab: 'story',
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
          targetTab: 'story',
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
          targetTab: 'story',
        });
      }
      if (!validCharacterNames.has(rel.characterB)) {
        issues.push({
          type: 'error',
          category: 'character',
          field: 'storyOpening.hiddenNPCRelationships',
          message: `숨겨진 관계의 캐릭터 "${rel.characterB}"이(가) 존재하지 않습니다.`,
          targetTab: 'story',
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
          targetTab: 'story',
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
        targetTab: 'system',
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
              targetTab: 'system',
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
        targetTab: 'system',
      });
    }
  });

  return issues;
}

/**
 * 중복 ID 검증 (스탯, 플래그, 엔딩)
 */
function validateDuplicateIds(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 스탯 ID 중복 체크
  const statIds = scenario.scenarioStats.map((s) => s.id);
  const duplicateStatIds = statIds.filter((id, index) => statIds.indexOf(id) !== index);
  duplicateStatIds.forEach((id) => {
    issues.push({
      type: 'error',
      category: 'duplicate',
      field: `stat.${id}`,
      message: `스탯 ID "${id}"이(가) 중복됩니다.`,
      suggestion: '각 스탯은 고유한 ID를 가져야 합니다.',
      targetTab: 'system',
    });
  });

  // 플래그 이름 중복 체크
  const flagNames = scenario.flagDictionary.map((f) => f.flagName);
  const duplicateFlagNames = flagNames.filter((name, index) => flagNames.indexOf(name) !== index);
  duplicateFlagNames.forEach((name) => {
    issues.push({
      type: 'error',
      category: 'duplicate',
      field: `flag.${name}`,
      message: `플래그 "${name}"이(가) 중복됩니다.`,
      suggestion: '각 플래그는 고유한 이름을 가져야 합니다.',
      targetTab: 'system',
    });
  });

  // 엔딩 ID 중복 체크
  const endingIds = scenario.endingArchetypes.map((e) => e.endingId);
  const duplicateEndingIds = endingIds.filter((id, index) => endingIds.indexOf(id) !== index);
  duplicateEndingIds.forEach((id) => {
    issues.push({
      type: 'error',
      category: 'duplicate',
      field: `ending.${id}`,
      message: `엔딩 ID "${id}"이(가) 중복됩니다.`,
      suggestion: '각 엔딩은 고유한 ID를 가져야 합니다.',
      targetTab: 'system',
    });
  });

  // 캐릭터 이름 중복 체크
  const characterNames = scenario.characters.map((c) => c.characterName);
  const duplicateCharacterNames = characterNames.filter(
    (name, index) => characterNames.indexOf(name) !== index
  );
  duplicateCharacterNames.forEach((name) => {
    issues.push({
      type: 'error',
      category: 'duplicate',
      field: `character.${name}`,
      message: `캐릭터 이름 "${name}"이(가) 중복됩니다.`,
      suggestion: '각 캐릭터는 고유한 이름을 가져야 합니다.',
      targetTab: 'characters',
    });
  });

  return issues;
}

/**
 * 캐릭터의 suggestedTraits가 traitPool에 존재하는지 검증
 */
function validateTraitPoolReferences(scenario: ScenarioData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // traitPool에서 유효한 trait ID 수집
  const validTraitIds = new Set<string>();
  if (scenario.traitPool) {
    scenario.traitPool.buffs?.forEach((buff) => {
      validTraitIds.add(buff.traitId);
      validTraitIds.add(buff.traitName);
    });
    scenario.traitPool.debuffs?.forEach((debuff) => {
      validTraitIds.add(debuff.traitId);
      validTraitIds.add(debuff.traitName);
    });
  }

  // traitPool이 비어있으면 검증 스킵
  if (validTraitIds.size === 0) return issues;

  // 각 캐릭터의 suggestedTraits 검증
  scenario.characters.forEach((character) => {
    if (character.suggestedTraits && character.suggestedTraits.length > 0) {
      character.suggestedTraits.forEach((traitId) => {
        if (!validTraitIds.has(traitId)) {
          issues.push({
            type: 'warning',
            category: 'trait',
            field: `character.${character.characterName}.suggestedTraits`,
            message: `캐릭터 "${character.characterName}"의 특성 "${traitId}"이(가) 특성 풀에 없습니다.`,
            suggestion: `사용 가능한 특성: ${Array.from(validTraitIds).slice(0, 5).join(', ')}...`,
            targetTab: 'characters',
          });
        }
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
    ...validateDuplicateIds(scenario),
    ...validateEndingStatReferences(scenario),
    ...validateEndingFlagReferences(scenario),
    ...validateRelationshipCharacters(scenario),
    ...validateStoryOpeningCharacters(scenario),
    ...validateStatRanges(scenario),
    ...validateEndingConditionConflicts(scenario),
    ...detectUnusedFlags(scenario),
    ...validateTraitPoolReferences(scenario),
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

/**
 * 탭별 이슈 카운트 반환
 */
export function getIssueCountByTab(
  result: ValidationResult
): Record<'basic' | 'characters' | 'system' | 'story', { errors: number; warnings: number }> {
  const counts = {
    basic: { errors: 0, warnings: 0 },
    characters: { errors: 0, warnings: 0 },
    system: { errors: 0, warnings: 0 },
    story: { errors: 0, warnings: 0 },
  };

  result.issues.forEach((issue) => {
    const tab = issue.targetTab || 'basic';
    if (issue.type === 'error') {
      counts[tab].errors += 1;
    } else {
      counts[tab].warnings += 1;
    }
  });

  return counts;
}
