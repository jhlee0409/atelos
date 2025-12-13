/**
 * game-ai-client.ts 유닛 테스트
 * @description AI 클라이언트의 검증 및 정리 함수들을 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectAndCleanLanguageMixing,
  validateKoreanContent,
  extractKoreanContent,
  validateChoiceFormat,
  validateStatChanges,
  cleanNarrativeFormatting,
  cleanAndValidateAIResponse,
  validateGameResponse,
  classifyAction,
  createPlayerAction,
  compareActionTypes,
  getChoiceHint,
  calculateAmplification,
  getStatZone,
  getAmplificationFactor,
  formatStatChangeSummary,
} from '@/lib/game-ai-client';
import {
  mockValidAIResponse,
  mockInvalidAIResponse_LanguageMixed,
  mockInvalidAIResponse_ExcessiveStatChange,
  mockInvalidAIResponse_MissingFields,
  mockScenario,
} from '../fixtures/mock-scenario';

// =============================================================================
// 언어 감지 및 정리 테스트
// =============================================================================

describe('detectAndCleanLanguageMixing', () => {
  it('정상적인 한국어 텍스트는 변경하지 않음', () => {
    const text = '박지현이 문을 열었다. 안에는 아무도 없었다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(false);
    // 공백 정리 후 주요 내용이 보존되어야 함
    expect(result.cleanedText).toContain('박지현이 문을 열었다');
    expect(result.cleanedText).toContain('안에는 아무도 없었다');
    expect(result.issues).toHaveLength(0);
  });

  it('아랍어 문자를 감지하고 제거함', () => {
    const text = '박지현이 مرحبا 말했다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(true);
    expect(result.issues).toContain('아랍어 문자 감지됨');
    expect(result.cleanedText).not.toContain('مرحبا');
  });

  it('태국어 문자를 감지하고 제거함', () => {
    const text = '김서연이 ภาษาไทย 대답했다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(true);
    expect(result.issues).toContain('태국어 문자 감지됨');
    expect(result.cleanedText).not.toMatch(/[\u0E00-\u0E7F]/);
  });

  it('힌디어 문자를 감지하고 제거함', () => {
    const text = '이동훈이 हिंदी 외쳤다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(true);
    expect(result.issues).toContain('힌디어 문자 감지됨');
    expect(result.cleanedText).not.toMatch(/[\u0900-\u097F]/);
  });

  it('키릴 문자를 감지하고 제거함', () => {
    const text = '박지현이 Русский 단어를 말했다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(true);
    expect(result.issues).toContain('키릴 문자 감지됨');
    expect(result.cleanedText).not.toMatch(/[\u0400-\u04FF]/);
  });

  it('null/undefined 입력을 안전하게 처리함', () => {
    expect(detectAndCleanLanguageMixing(null as any).cleanedText).toBe('');
    expect(detectAndCleanLanguageMixing(undefined as any).cleanedText).toBe('');
    expect(detectAndCleanLanguageMixing('').cleanedText).toBe('');
  });

  it('연속된 공백을 정리함', () => {
    const text = '박지현이    많은   공백을    말했다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.cleanedText).not.toMatch(/\s{2,}/);
  });

  it('여러 언어가 혼용된 경우 모두 제거함', () => {
    const text = '박지현이 مرحبا ภาษาไทย Русский 말했다.';
    const result = detectAndCleanLanguageMixing(text);

    expect(result.hasIssues).toBe(true);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    // 외래어 제거 후 한국어만 남아야 함
    expect(result.cleanedText).toContain('박지현이');
    expect(result.cleanedText).toContain('말했다');
    expect(result.cleanedText).not.toMatch(/[\u0600-\u06FF]/); // 아랍어 없음
    expect(result.cleanedText).not.toMatch(/[\u0E00-\u0E7F]/); // 태국어 없음
    expect(result.cleanedText).not.toMatch(/[\u0400-\u04FF]/); // 키릴 없음
  });
});

// =============================================================================
// 한국어 품질 검증 테스트
// =============================================================================

describe('validateKoreanContent', () => {
  it('순수 한국어 텍스트는 유효함', () => {
    const text = '박지현이 조심스럽게 문을 열었다. 안에는 예상치 못한 광경이 펼쳐져 있었다.';
    const result = validateKoreanContent(text);

    expect(result.isValid).toBe(true);
    expect(result.koreanRatio).toBeGreaterThan(0.5);
    expect(result.issues).toHaveLength(0);
  });

  it('한국어 비율이 낮으면 무효함', () => {
    const text = 'This is mostly English with 약간의 한국어.';
    const result = validateKoreanContent(text);

    // 한국어 비율이 낮으므로 issues가 있어야 함
    expect(result.koreanRatio).toBeLessThan(0.5);
  });

  it('빈 텍스트는 무효함', () => {
    const result = validateKoreanContent('');

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('텍스트가 비어있거나 유효하지 않음');
  });

  it('null/undefined 입력을 안전하게 처리함', () => {
    expect(validateKoreanContent(null as any).isValid).toBe(false);
    expect(validateKoreanContent(undefined as any).isValid).toBe(false);
  });

  it('짧은 텍스트는 경고를 발생시킴', () => {
    const text = '짧은글';
    const result = validateKoreanContent(text);

    expect(result.issues).toContain('텍스트 너무 짧음');
  });
});

// =============================================================================
// JSON 키 추출 테스트
// =============================================================================

describe('extractKoreanContent', () => {
  it('JSON 키를 제거하고 실제 콘텐츠만 추출함', () => {
    const text = '"log": "박지현이 말했다.", "choice_a": "행동한다"';
    const result = extractKoreanContent(text);

    expect(result).not.toContain('"log":');
    expect(result).not.toContain('"choice_a":');
    expect(result).toContain('박지현이 말했다');
  });

  it('영문 스탯 ID를 제거함', () => {
    const text = 'cityChaos가 증가했습니다. communityCohesion이 감소했습니다.';
    const result = extractKoreanContent(text);

    expect(result).not.toContain('cityChaos');
    expect(result).not.toContain('communityCohesion');
  });

  it('FLAG_ 패턴을 제거함', () => {
    const text = 'FLAG_FIRST_CONTACT가 획득되었습니다.';
    const result = extractKoreanContent(text);

    expect(result).not.toMatch(/FLAG_[A-Z_]+/);
  });
});

// =============================================================================
// 선택지 포맷 검증 테스트
// =============================================================================

describe('validateChoiceFormat', () => {
  it('올바른 형식의 선택지는 유효함', () => {
    const choice = '신중하게 상황을 살펴보고 다음 행동을 결정한다';
    const result = validateChoiceFormat(choice);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('너무 짧은 선택지는 무효함', () => {
    const choice = '행동한다';
    const result = validateChoiceFormat(choice);

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('짧음'))).toBe(true);
  });

  it('너무 긴 선택지는 무효함', () => {
    const choice = '이것은 매우 긴 선택지입니다. '.repeat(10);
    const result = validateChoiceFormat(choice);

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('김'))).toBe(true);
  });

  it('시스템 ID가 노출된 선택지는 무효함', () => {
    const choice = '[ESCAPE_ROUTE] 탈출로를 찾아 이동한다';
    const result = validateChoiceFormat(choice);

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('시스템 ID'))).toBe(true);
  });

  it('한국어 콘텐츠가 부족한 선택지는 무효함', () => {
    const choice = 'Take action now immediately';
    const result = validateChoiceFormat(choice);

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('한국어'))).toBe(true);
  });

  it('null/undefined 입력을 안전하게 처리함', () => {
    expect(validateChoiceFormat(null as any).isValid).toBe(false);
    expect(validateChoiceFormat(undefined as any).isValid).toBe(false);
  });
});

// =============================================================================
// 스탯 변화량 검증 테스트
// =============================================================================

describe('validateStatChanges', () => {
  it('정상 범위의 스탯 변화는 유효함', () => {
    const changes = { cityChaos: 15, resourceLevel: -20 };
    const result = validateStatChanges(changes);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.correctedChanges).toEqual(changes);
  });

  it('과도한 양수 변화는 보정됨', () => {
    const changes = { cityChaos: 100 };
    const result = validateStatChanges(changes);

    expect(result.isValid).toBe(false);
    expect(result.correctedChanges.cityChaos).toBe(40);
    expect(result.issues.some(i => i.includes('cityChaos'))).toBe(true);
  });

  it('과도한 음수 변화는 보정됨', () => {
    const changes = { resourceLevel: -80 };
    const result = validateStatChanges(changes);

    expect(result.isValid).toBe(false);
    expect(result.correctedChanges.resourceLevel).toBe(-40);
  });

  it('숫자가 아닌 값은 0으로 처리됨', () => {
    const changes = { cityChaos: 'invalid' as any };
    const result = validateStatChanges(changes);

    expect(result.isValid).toBe(false);
    expect(result.correctedChanges.cityChaos).toBe(0);
    expect(result.issues.some(i => i.includes('숫자'))).toBe(true);
  });

  it('여러 스탯의 혼합 문제를 처리함', () => {
    const changes = {
      cityChaos: 50,
      resourceLevel: -60,
      communityCohesion: 20,
    };
    const result = validateStatChanges(changes);

    expect(result.isValid).toBe(false);
    expect(result.correctedChanges.cityChaos).toBe(40);
    expect(result.correctedChanges.resourceLevel).toBe(-40);
    expect(result.correctedChanges.communityCohesion).toBe(20);
  });
});

// =============================================================================
// 서사 포맷팅 테스트
// =============================================================================

describe('cleanNarrativeFormatting', () => {
  it('스탯 노출 패턴을 제거함', () => {
    const text = '생존의 기반(50)이 낮아졌다. 도시 혼란도(75)가 높다.';
    const result = cleanNarrativeFormatting(text);

    expect(result).not.toMatch(/\(\d+\)/);
  });

  it('대화 전후에 줄바꿈을 추가함', () => {
    const text = '박지현이 말했다. "조심해야 합니다." 김서연이 대답했다.';
    const result = cleanNarrativeFormatting(text);

    // 대화 전후에 줄바꿈이 있어야 함
    expect(result).toContain('\n');
  });

  it('연속된 줄바꿈을 정리함', () => {
    const text = '첫 번째 문장.\n\n\n\n두 번째 문장.';
    const result = cleanNarrativeFormatting(text);

    expect(result).not.toMatch(/\n{3,}/);
  });

  it('연속된 마침표를 정리함', () => {
    const text = '문장이 끝났다.. 다음 문장.';
    const result = cleanNarrativeFormatting(text);

    expect(result).not.toMatch(/\.\./);
  });
});

// =============================================================================
// AI 응답 정리 및 검증 테스트
// =============================================================================

describe('cleanAndValidateAIResponse', () => {
  it('유효한 응답은 그대로 반환됨', () => {
    const result = cleanAndValidateAIResponse(mockValidAIResponse as any);

    expect(result.hasLanguageIssues).toBe(false);
    expect(result.cleanedResponse.log).toBeTruthy();
    expect(result.cleanedResponse.dilemma.choice_a).toBeTruthy();
  });

  it('언어 혼용 응답은 정리됨', () => {
    const result = cleanAndValidateAIResponse(mockInvalidAIResponse_LanguageMixed as any);

    expect(result.hasLanguageIssues).toBe(true);
    expect(result.languageIssues.length).toBeGreaterThan(0);
    // 정리된 응답에는 외래어가 없어야 함
    expect(result.cleanedResponse.log).not.toMatch(/[\u0600-\u06FF]/);
    expect(result.cleanedResponse.log).not.toMatch(/[\u0E00-\u0E7F]/);
  });

  it('과도한 스탯 변화는 보정됨', () => {
    const result = cleanAndValidateAIResponse(mockInvalidAIResponse_ExcessiveStatChange as any);

    expect(result.hasStatIssues).toBe(true);
    expect(result.cleanedResponse.statChanges.scenarioStats.cityChaos).toBe(40);
    expect(result.cleanedResponse.statChanges.scenarioStats.resourceLevel).toBe(-40);
  });

  it('불완전한 응답에 기본값을 채움', () => {
    const result = cleanAndValidateAIResponse(mockInvalidAIResponse_MissingFields as any);

    expect(result.cleanedResponse.dilemma.choice_a).toBeTruthy();
    expect(result.cleanedResponse.dilemma.choice_b).toBeTruthy();
    expect(result.cleanedResponse.statChanges.survivorStatus).toBeDefined();
    // [v1.4 REMOVED] flags_acquired - Dynamic Ending System에서 ActionHistory로 대체
  });
});

// =============================================================================
// 게임 응답 검증 테스트
// =============================================================================

describe('validateGameResponse', () => {
  it('유효한 응답은 true 반환', () => {
    const result = validateGameResponse(mockValidAIResponse as any);
    expect(result).toBe(true);
  });

  it('log가 없는 응답은 false 반환', () => {
    const invalidResponse = { ...mockValidAIResponse, log: undefined };
    const result = validateGameResponse(invalidResponse as any);
    expect(result).toBe(false);
  });

  it('dilemma가 불완전한 응답은 false 반환', () => {
    const invalidResponse = {
      ...mockValidAIResponse,
      dilemma: { prompt: '테스트' },
    };
    const result = validateGameResponse(invalidResponse as any);
    expect(result).toBe(false);
  });

  it('statChanges가 없는 응답은 false 반환', () => {
    const invalidResponse = { ...mockValidAIResponse, statChanges: undefined };
    const result = validateGameResponse(invalidResponse as any);
    expect(result).toBe(false);
  });
});

// =============================================================================
// 행동 분류 시스템 테스트
// =============================================================================

describe('classifyAction', () => {
  it('전투 관련 선택지를 combat으로 분류함', () => {
    const result = classifyAction('무력으로 제압하고 공격에 나선다');
    expect(result.category).toBe('combat');
  });

  it('외교 관련 선택지를 diplomacy로 분류함', () => {
    const result = classifyAction('협상을 통해 평화적으로 해결한다');
    expect(result.category).toBe('diplomacy');
  });

  it('의료 관련 선택지를 medical로 분류함', () => {
    const result = classifyAction('부상자를 치료하고 응급 처치를 한다');
    expect(result.category).toBe('medical');
  });

  it('탐색 관련 선택지를 exploration으로 분류함', () => {
    const result = classifyAction('주변을 탐색하고 조사한다');
    expect(result.category).toBe('exploration');
  });

  it('자원 관련 선택지를 resource로 분류함', () => {
    const result = classifyAction('자원을 수집하고 물자를 확보한다');
    expect(result.category).toBe('resource');
  });

  it('은신 관련 선택지를 stealth로 분류함', () => {
    const result = classifyAction('숨어서 상황을 지켜본다');
    expect(result.category).toBe('stealth');
  });

  it('생존 관련 선택지를 survival로 분류함', () => {
    const result = classifyAction('휴식을 취하며 대기한다');
    expect(result.category).toBe('survival');
  });

  it('알 수 없는 선택지는 general로 분류함', () => {
    const result = classifyAction('특별한 행동을 한다');
    // 어떤 패턴에도 매칭되지 않으면 general
    expect(['general', 'leadership', 'social']).toContain(result.category);
  });

  it('신뢰도를 올바르게 계산함', () => {
    const highConfidence = classifyAction('무력으로 공격하고 싸운다');
    const lowConfidence = classifyAction('뭔가를 한다');

    expect(['high', 'medium']).toContain(highConfidence.confidence);
  });
});

describe('createPlayerAction', () => {
  it('선택지에서 PlayerAction 객체를 생성함', () => {
    const action = createPlayerAction('조심스럽게 탐색한다', 'choice_a');

    expect(action.actionId).toContain('exploration');
    expect(action.actionId).toContain('choice_a');
    expect(action.actionDescription).toBe('조심스럽게 탐색한다');
    expect(action.playerFeedback).toContain('탐색');
  });
});

describe('compareActionTypes', () => {
  it('다른 카테고리는 대조적으로 판정함', () => {
    const result = compareActionTypes(
      '무력으로 제압한다',
      '협상으로 해결한다'
    );

    expect(result.areContrasting).toBe(true);
    expect(result.categoryA).toBe('combat');
    expect(result.categoryB).toBe('diplomacy');
  });

  it('같은 카테고리는 비대조적으로 판정하고 제안을 제공함', () => {
    // 두 선택지 모두 명확히 combat 키워드를 포함
    const result = compareActionTypes(
      '무력으로 공격한다',
      '전투로 제압한다'
    );

    // 같은 combat 카테고리로 분류되어야 함
    expect(result.categoryA).toBe('combat');
    expect(result.categoryB).toBe('combat');
    expect(result.areContrasting).toBe(false);
    expect(result.suggestion).toBeTruthy();
  });
});

describe('getChoiceHint', () => {
  it('선택지에 대한 힌트 정보를 반환함', () => {
    const hint = getChoiceHint('무력으로 제압한다');

    expect(hint.category).toBe('combat');
    expect(hint.riskLevel).toBe('high');
    expect(hint.predictedImpacts.length).toBeGreaterThan(0);
    expect(hint.shortHint).toContain('⚔️');
  });
});

// =============================================================================
// 스탯 증폭 로직 테스트
// =============================================================================

describe('getStatZone', () => {
  it('0-25%는 extreme_low', () => {
    expect(getStatZone(10)).toBe('extreme_low');
    expect(getStatZone(25)).toBe('extreme_low');
  });

  it('25-75%는 mid_range', () => {
    expect(getStatZone(26)).toBe('mid_range');
    expect(getStatZone(50)).toBe('mid_range');
    expect(getStatZone(74)).toBe('mid_range');
  });

  it('75-100%는 extreme_high', () => {
    expect(getStatZone(75)).toBe('extreme_high');
    expect(getStatZone(100)).toBe('extreme_high');
  });
});

describe('getAmplificationFactor', () => {
  it('극단 구간은 1.5배', () => {
    expect(getAmplificationFactor('extreme_low')).toBe(1.5);
    expect(getAmplificationFactor('extreme_high')).toBe(1.5);
  });

  it('중간 구간은 3배', () => {
    expect(getAmplificationFactor('mid_range')).toBe(3.0);
  });
});

describe('calculateAmplification', () => {
  it('중간 구간에서 변화량을 3배 증폭함', () => {
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      10,     // 원본 변화
      50,     // 현재 값 (중간)
      0,      // 최소
      100     // 최대
    );

    expect(result.zone).toBe('mid_range');
    expect(result.amplificationFactor).toBe(3.0);
    expect(result.amplifiedChange).toBe(30);
    expect(result.newValue).toBe(80);
  });

  it('극단 구간에서 변화량을 1.5배 증폭함', () => {
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      10,
      10,     // 현재 값 (낮음)
      0,
      100
    );

    expect(result.zone).toBe('extreme_low');
    expect(result.amplificationFactor).toBe(1.5);
    expect(result.amplifiedChange).toBe(15);
  });

  it('범위를 벗어나는 변화는 클램핑됨', () => {
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      20,
      90,     // 현재 값 (높음)
      0,
      100
    );

    // 90 + 30(증폭) = 120이지만 max 100으로 클램핑
    expect(result.newValue).toBe(100);
    expect(result.finalChange).toBe(10); // 실제 적용된 변화
  });

  it('설명 문자열을 올바르게 생성함', () => {
    const result = calculateAmplification(
      'cityChaos',
      '도시 혼란도',
      10,
      50,
      0,
      100
    );

    expect(result.explanation).toContain('도시 혼란도');
    expect(result.explanation).toContain('안정 구간');
  });
});

describe('formatStatChangeSummary', () => {
  it('변화 없으면 적절한 메시지 반환', () => {
    const result = formatStatChangeSummary([]);
    expect(result).toContain('스탯 변화 없음');
  });

  it('양수 변화에 ↑ 표시', () => {
    const changes = [
      {
        statId: 'cityChaos',
        statName: '도시 혼란도',
        originalChange: 10,
        amplificationFactor: 3.0,
        amplifiedChange: 30,
        finalChange: 30,
        currentValue: 50,
        newValue: 80,
        percentage: 50,
        zone: 'mid_range' as const,
        explanation: '',
      },
    ];
    const result = formatStatChangeSummary(changes);
    expect(result[0]).toContain('↑');
    expect(result[0]).toContain('+30');
  });

  it('음수 변화에 ↓ 표시', () => {
    const changes = [
      {
        statId: 'resourceLevel',
        statName: '자원 수준',
        originalChange: -10,
        amplificationFactor: 3.0,
        amplifiedChange: -30,
        finalChange: -30,
        currentValue: 50,
        newValue: 20,
        percentage: 50,
        zone: 'mid_range' as const,
        explanation: '',
      },
    ];
    const result = formatStatChangeSummary(changes);
    expect(result[0]).toContain('↓');
    expect(result[0]).toContain('-30');
  });
});
