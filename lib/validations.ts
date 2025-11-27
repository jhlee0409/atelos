import { ScenarioData } from '@/types';
import {
  MAX_CORE_KEYWORDS,
  MIN_CORE_KEYWORDS,
  MIN_GENRE,
  MIN_CHARACTERS,
  MIN_STATS,
  MIN_ENDINGS,
  VALIDATION_IDS,
} from '@/constants/scenario';

// 검증 결과 상세 정보를 담는 타입
export type ValidationResult = {
  errors: string[];
  warnings: string[];
  details: Record<string, string>;
};

// 기본 필드 검증
const validateBasicFields = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];

  if (!scenario.scenarioId) errors.push(VALIDATION_IDS.SCENARIO_ID);
  if (!scenario.title) errors.push(VALIDATION_IDS.TITLE);
  if (scenario.genre.length < MIN_GENRE) errors.push(VALIDATION_IDS.GENRE);
  if (
    scenario.coreKeywords.length < MIN_CORE_KEYWORDS ||
    scenario.coreKeywords.length > MAX_CORE_KEYWORDS
  ) {
    errors.push(VALIDATION_IDS.CORE_KEYWORDS);
  }
  if (!scenario.posterImageUrl) errors.push(VALIDATION_IDS.POSTER_IMAGE_URL);
  if (!scenario.synopsis) errors.push(VALIDATION_IDS.SYNOPSIS);
  if (!scenario.playerGoal) errors.push(VALIDATION_IDS.PLAYER_GOAL);

  return errors;
};

// 캐릭터 검증
const validateCharacters = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];

  // 최소 캐릭터 수 검증
  if (scenario.characters.length < MIN_CHARACTERS) {
    errors.push(VALIDATION_IDS.CHARACTERS_MIN);
  }

  // 각 캐릭터 필드 검증
  scenario.characters.forEach((char, index) => {
    if (!char.roleId) {
      errors.push(`${VALIDATION_IDS.CHARACTER_ROLE_ID}_${index}`);
    }
    if (!char.roleName) {
      errors.push(`${VALIDATION_IDS.CHARACTER_ROLE_NAME}_${index}`);
    }
    if (!char.characterName) {
      errors.push(`${VALIDATION_IDS.CHARACTER_NAME}_${index}`);
    }
  });

  return errors;
};

// 스탯 검증
const validateStats = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];

  // 최소 스탯 수 검증
  if (scenario.scenarioStats.length < MIN_STATS) {
    errors.push(VALIDATION_IDS.STATS_MIN);
  }

  // 각 스탯 검증
  const statIds = new Set<string>();
  scenario.scenarioStats.forEach((stat, index) => {
    if (!stat.id) {
      errors.push(`${VALIDATION_IDS.STAT_ID}_${index}`);
    } else {
      // 중복 ID 검증
      if (statIds.has(stat.id)) {
        errors.push(`${VALIDATION_IDS.STAT_ID}_duplicate_${index}`);
      }
      statIds.add(stat.id);
    }

    if (!stat.name) {
      errors.push(`${VALIDATION_IDS.STAT_NAME}_${index}`);
    }

    // min/max 범위 검증
    if (stat.min >= stat.max) {
      errors.push(`${VALIDATION_IDS.STAT_RANGE}_${index}`);
    }

    // 초기값이 범위 내에 있는지 검증
    if (stat.current < stat.min || stat.current > stat.max) {
      errors.push(`${VALIDATION_IDS.STAT_RANGE}_initial_${index}`);
    }
  });

  return errors;
};

// 엔딩 검증
const validateEndings = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];

  // 최소 엔딩 수 검증
  if (scenario.endingArchetypes.length < MIN_ENDINGS) {
    errors.push(VALIDATION_IDS.ENDINGS_MIN);
  }

  // 각 엔딩 검증
  const endingIds = new Set<string>();
  scenario.endingArchetypes.forEach((ending, index) => {
    if (!ending.endingId) {
      errors.push(`${VALIDATION_IDS.ENDING_ID}_${index}`);
    } else {
      // 중복 ID 검증
      if (endingIds.has(ending.endingId)) {
        errors.push(`${VALIDATION_IDS.ENDING_ID}_duplicate_${index}`);
      }
      endingIds.add(ending.endingId);
    }

    if (!ending.title) {
      errors.push(`${VALIDATION_IDS.ENDING_TITLE}_${index}`);
    }
  });

  return errors;
};

// 관계 검증
const validateRelationships = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];
  const characterNames = new Set(scenario.characters.map((c) => c.characterName));

  scenario.initialRelationships.forEach((rel, index) => {
    // 같은 인물 간 관계 검증
    if (rel.personA === rel.personB) {
      errors.push(`${VALIDATION_IDS.RELATIONSHIP_INVALID}_same_${index}`);
    }

    // 존재하지 않는 캐릭터 참조 검증
    if (rel.personA && !characterNames.has(rel.personA)) {
      errors.push(`${VALIDATION_IDS.RELATIONSHIP_INVALID}_personA_${index}`);
    }
    if (rel.personB && !characterNames.has(rel.personB)) {
      errors.push(`${VALIDATION_IDS.RELATIONSHIP_INVALID}_personB_${index}`);
    }
  });

  return errors;
};

// 플래그 검증
const validateFlags = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];
  const flagNames = new Set<string>();

  scenario.flagDictionary.forEach((flag, index) => {
    if (!flag.flagName) {
      errors.push(`${VALIDATION_IDS.FLAG_NAME}_${index}`);
    } else {
      // 중복 플래그 이름 검증
      if (flagNames.has(flag.flagName)) {
        errors.push(`${VALIDATION_IDS.FLAG_NAME}_duplicate_${index}`);
      }
      flagNames.add(flag.flagName);
    }
  });

  return errors;
};

// 기본 검증 (하위 호환성 유지)
export const validateScenario = (scenario: ScenarioData): string[] => {
  return validateBasicFields(scenario);
};

// 상세 검증 (모든 항목 검증)
export const validateScenarioFull = (scenario: ScenarioData): ValidationResult => {
  const errors: string[] = [
    ...validateBasicFields(scenario),
    ...validateCharacters(scenario),
    ...validateStats(scenario),
    ...validateEndings(scenario),
    ...validateRelationships(scenario),
    ...validateFlags(scenario),
  ];

  const warnings: string[] = [];
  const details: Record<string, string> = {};

  // 경고 생성 (에러는 아니지만 주의가 필요한 항목)
  if (scenario.characters.length < 3) {
    warnings.push('characters_recommended');
    details['characters_recommended'] = '최소 3명 이상의 캐릭터를 권장합니다.';
  }

  if (scenario.scenarioStats.length < 3) {
    warnings.push('stats_recommended');
    details['stats_recommended'] = '최소 3개 이상의 스탯을 권장합니다.';
  }

  if (scenario.endingArchetypes.length < 3) {
    warnings.push('endings_recommended');
    details['endings_recommended'] = '최소 3개 이상의 엔딩을 권장합니다.';
  }

  // 엔딩에 조건이 없는 경우 경고
  scenario.endingArchetypes.forEach((ending, index) => {
    if (ending.systemConditions.length === 0) {
      warnings.push(`ending_no_conditions_${index}`);
      details[`ending_no_conditions_${index}`] =
        `"${ending.title || `엔딩 ${index + 1}`}"에 시스템 조건이 없습니다.`;
    }
  });

  // 에러 상세 설명 추가
  errors.forEach((error) => {
    if (error === VALIDATION_IDS.SCENARIO_ID) {
      details[error] = '시나리오 ID는 필수입니다.';
    } else if (error === VALIDATION_IDS.TITLE) {
      details[error] = '시나리오 제목은 필수입니다.';
    } else if (error === VALIDATION_IDS.CHARACTERS_MIN) {
      details[error] = `최소 ${MIN_CHARACTERS}명의 캐릭터가 필요합니다.`;
    } else if (error === VALIDATION_IDS.STATS_MIN) {
      details[error] = `최소 ${MIN_STATS}개의 스탯이 필요합니다.`;
    } else if (error === VALIDATION_IDS.ENDINGS_MIN) {
      details[error] = `최소 ${MIN_ENDINGS}개의 엔딩이 필요합니다.`;
    }
  });

  return { errors, warnings, details };
};

// 검증 에러 메시지 생성 유틸리티
export const getValidationMessage = (errorId: string): string => {
  const baseMessages: Record<string, string> = {
    [VALIDATION_IDS.SCENARIO_ID]: '시나리오 ID를 입력해주세요.',
    [VALIDATION_IDS.TITLE]: '시나리오 제목을 입력해주세요.',
    [VALIDATION_IDS.GENRE]: '최소 1개 이상의 장르를 추가해주세요.',
    [VALIDATION_IDS.CORE_KEYWORDS]: `핵심 키워드를 ${MIN_CORE_KEYWORDS}~${MAX_CORE_KEYWORDS}개 추가해주세요.`,
    [VALIDATION_IDS.POSTER_IMAGE_URL]: '포스터 이미지를 설정해주세요.',
    [VALIDATION_IDS.SYNOPSIS]: '시놉시스를 입력해주세요.',
    [VALIDATION_IDS.PLAYER_GOAL]: '플레이어 목표를 입력해주세요.',
    [VALIDATION_IDS.CHARACTERS_MIN]: `최소 ${MIN_CHARACTERS}명의 캐릭터가 필요합니다.`,
    [VALIDATION_IDS.STATS_MIN]: `최소 ${MIN_STATS}개의 스탯이 필요합니다.`,
    [VALIDATION_IDS.ENDINGS_MIN]: `최소 ${MIN_ENDINGS}개의 엔딩이 필요합니다.`,
  };

  return baseMessages[errorId] || `검증 오류: ${errorId}`;
};
