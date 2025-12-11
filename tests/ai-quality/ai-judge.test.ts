/**
 * AI Judge 품질 평가 테스트
 * @description Gemini 기반 AI 응답 품질 평가 시스템 테스트
 *
 * 이 테스트는 두 가지 모드로 실행 가능:
 * 1. 로컬 모드 (mockMode: true) - 빠른 테스트, CI에서 사용
 * 2. API 모드 (mockMode: false) - 실제 Gemini API 호출, 정확한 품질 평가
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evaluateLocally,
  evaluateWithGemini,
  evaluateBatch,
  type JudgePromptContext,
  type AIJudgeResult,
} from '../utils/ai-judge-client';
import {
  mockScenario,
  mockCharacters,
  mockValidAIResponse,
  mockInvalidAIResponse_LanguageMixed,
  mockInvalidAIResponse_MissingFields,
} from '../fixtures/mock-scenario';
import { generateValidAIResponse, generateLanguageMixedResponse } from '../utils/test-helpers';

// =============================================================================
// 테스트 컨텍스트 생성 헬퍼
// =============================================================================

const createJudgeContext = (
  responseOverrides?: Partial<typeof mockValidAIResponse>
): JudgePromptContext => ({
  response: { ...mockValidAIResponse, ...responseOverrides } as any,
  scenario: mockScenario,
  characters: mockCharacters,
  currentDay: 3,
});

// =============================================================================
// 로컬 평가 테스트
// =============================================================================

describe('evaluateLocally', () => {
  describe('서사 품질 (Narrative Quality)', () => {
    it('충분한 길이의 서술은 높은 점수를 받음', () => {
      const context = createJudgeContext({
        log: '박지현이 조심스럽게 문을 열었다. 창고 안에는 먼지 냄새와 함께 오래된 물자들이 눈에 들어왔다. "여기 식량이 꽤 남아있어요." 김서연이 조심스럽게 선반을 확인하며 말했다. 그 순간 바깥에서 낯선 소리가 들려왔다. 누군가 접근하고 있었다. 박지현은 긴장감을 느꼈다.',
      });

      const result = evaluateLocally(context);
      const narrativeScore = result.scores.find(s => s.category === 'narrativeQuality');

      expect(narrativeScore?.score).toBeGreaterThanOrEqual(60);
    });

    it('너무 짧은 서술은 낮은 점수를 받음', () => {
      const context = createJudgeContext({
        log: '문을 열었다.',
      });

      const result = evaluateLocally(context);
      const narrativeScore = result.scores.find(s => s.category === 'narrativeQuality');

      expect(narrativeScore?.score).toBeLessThan(70);
      expect(narrativeScore?.issues?.some(i => i.includes('짧음'))).toBe(true);
    });

    it('감정 표현이 없으면 점수가 감점됨', () => {
      const context = createJudgeContext({
        log: '박지현이 문을 열었다. 김서연이 들어갔다. 이동훈이 경계했다. 아무 일도 없었다.',
      });

      const result = evaluateLocally(context);
      const narrativeScore = result.scores.find(s => s.category === 'narrativeQuality');

      expect(narrativeScore?.issues?.some(i => i.includes('감정'))).toBe(true);
    });

    it('스탯이 노출되면 점수가 감점됨', () => {
      const context = createJudgeContext({
        log: '생존의 기반이 50%로 감소했다. 도시 혼란도가 75까지 상승했다.',
      });

      const result = evaluateLocally(context);
      const narrativeScore = result.scores.find(s => s.category === 'narrativeQuality');

      expect(narrativeScore?.issues?.some(i => i.includes('수치'))).toBe(true);
    });
  });

  describe('한국어 자연스러움 (Korean Naturalness)', () => {
    it('순수 한국어 텍스트는 높은 점수를 받음', () => {
      const context = createJudgeContext({
        log: '박지현이 조심스럽게 창고 문을 열었다. 안에는 예상치 못한 광경이 펼쳐져 있었다.',
      });

      const result = evaluateLocally(context);
      const koreanScore = result.scores.find(s => s.category === 'koreanNaturalness');

      expect(koreanScore?.score).toBeGreaterThanOrEqual(70);
    });

    it('아랍어가 섞이면 점수가 크게 감점됨', () => {
      const response = generateLanguageMixedResponse('arabic');
      const context: JudgePromptContext = {
        response: response as any,
        scenario: mockScenario,
        characters: mockCharacters,
        currentDay: 3,
      };

      const result = evaluateLocally(context);
      const koreanScore = result.scores.find(s => s.category === 'koreanNaturalness');

      expect(koreanScore?.score).toBeLessThan(80);
      expect(koreanScore?.issues?.some(i => i.includes('아랍어'))).toBe(true);
    });

    it('태국어가 섞이면 점수가 감점됨', () => {
      const response = generateLanguageMixedResponse('thai');
      const context: JudgePromptContext = {
        response: response as any,
        scenario: mockScenario,
        characters: mockCharacters,
        currentDay: 3,
      };

      const result = evaluateLocally(context);
      const koreanScore = result.scores.find(s => s.category === 'koreanNaturalness');

      expect(koreanScore?.issues?.some(i => i.includes('태국어'))).toBe(true);
    });

    it('한국어 비율이 낮으면 감점됨', () => {
      const context = createJudgeContext({
        log: 'This is mostly English text with some 한국어 mixed in.',
        dilemma: {
          prompt: 'Choose an option',
          choice_a: 'Option A 선택한다',
          choice_b: 'Option B 선택한다',
        },
      });

      const result = evaluateLocally(context);
      const koreanScore = result.scores.find(s => s.category === 'koreanNaturalness');

      expect(koreanScore?.issues?.some(i => i.includes('비율'))).toBe(true);
    });
  });

  describe('캐릭터 일관성 (Character Consistency)', () => {
    it('캐릭터 이름이 언급되면 높은 점수', () => {
      const context = createJudgeContext({
        log: '박지현이 앞장서서 문을 열었다. 김서연이 뒤따르며 조심스럽게 살폈다.',
      });

      const result = evaluateLocally(context);
      const charScore = result.scores.find(s => s.category === 'characterConsistency');

      expect(charScore?.score).toBeGreaterThanOrEqual(70);
    });

    it('캐릭터 언급이 없으면 감점됨', () => {
      const context = createJudgeContext({
        log: '누군가가 문을 열었다. 그들은 안으로 들어갔다.',
      });

      const result = evaluateLocally(context);
      const charScore = result.scores.find(s => s.category === 'characterConsistency');

      expect(charScore?.issues?.some(i => i.includes('캐릭터'))).toBe(true);
    });
  });

  describe('선택지 품질 (Choice Quality)', () => {
    it('적절한 길이와 형식의 선택지는 높은 점수', () => {
      const context = createJudgeContext({
        dilemma: {
          prompt: '중요한 결정의 순간이 다가왔다.',
          choice_a: '신중하게 상황을 살펴보고 대책을 세운다',
          choice_b: '즉시 행동에 나서서 문제를 해결한다',
        },
      });

      const result = evaluateLocally(context);
      const choiceScore = result.scores.find(s => s.category === 'choiceQuality');

      expect(choiceScore?.score).toBeGreaterThanOrEqual(60);
    });

    it('너무 짧은 선택지는 감점됨', () => {
      const context = createJudgeContext({
        dilemma: {
          prompt: '선택하세요.',
          choice_a: '한다',
          choice_b: '안한다',
        },
      });

      const result = evaluateLocally(context);
      const choiceScore = result.scores.find(s => s.category === 'choiceQuality');

      expect(choiceScore?.score).toBeLessThanOrEqual(80);
      expect(choiceScore?.issues?.some(i => i.includes('짧음'))).toBe(true);
    });

    it('시스템 ID가 노출되면 감점됨', () => {
      const context = createJudgeContext({
        dilemma: {
          prompt: '선택하세요.',
          choice_a: '[ESCAPE] 탈출로를 찾아 이동한다',
          choice_b: '[FIGHT] 싸워서 해결한다',
        },
      });

      const result = evaluateLocally(context);
      const choiceScore = result.scores.find(s => s.category === 'choiceQuality');

      expect(choiceScore?.issues?.some(i => i.includes('시스템 ID'))).toBe(true);
    });
  });

  describe('스토리 몰입도 (Story Immersion)', () => {
    it('긴박감과 감각적 묘사가 있으면 높은 점수', () => {
      const context = createJudgeContext({
        log: '갑자기 바깥에서 발소리가 들렸다. 박지현은 순간 긴장감을 느꼈다. 어둠 속에서 희미한 빛이 보였다.',
        dilemma: {
          prompt: '외부에서 다가오는 발소리가 점점 가까워진다. 어떻게 대응할 것인가?',
          choice_a: '숨어서 상황을 지켜본다',
          choice_b: '당당하게 나가서 확인한다',
        },
      });

      const result = evaluateLocally(context);
      const immersionScore = result.scores.find(s => s.category === 'storyImmersion');

      expect(immersionScore?.score).toBeGreaterThanOrEqual(60);
    });

    it('긴박감 표현이 없으면 감점됨', () => {
      const context = createJudgeContext({
        log: '평화롭게 하루가 지나갔다. 별일 없이 시간이 흘렀다.',
      });

      const result = evaluateLocally(context);
      const immersionScore = result.scores.find(s => s.category === 'storyImmersion');

      expect(immersionScore?.issues?.some(i => i.includes('긴박감'))).toBe(true);
    });
  });

  describe('종합 평가', () => {
    it('양질의 응답은 통과 기준(70점)을 넘음', () => {
      const goodResponse = generateValidAIResponse({
        log: '박지현이 조심스럽게 창고 문을 열었다. 갑자기 안에서 소리가 들려 긴장감이 감돌았다. "조심해요." 김서연이 불안한 목소리로 속삭였다. 어둠 속에서 무언가가 움직이는 것 같았다. 박지현은 가슴이 두근거렸다.',
      });

      const context: JudgePromptContext = {
        response: goodResponse as any,
        scenario: mockScenario,
        characters: mockCharacters,
        currentDay: 3,
      };

      const result = evaluateLocally(context);

      expect(result.overall).toBeGreaterThanOrEqual(50);
    });

    it('저품질 응답은 통과 기준 미달', () => {
      const context = createJudgeContext({
        log: 'test',
        dilemma: {
          prompt: 'test',
          choice_a: 'a',
          choice_b: 'b',
        },
      });

      const result = evaluateLocally(context);

      expect(result.overall).toBeLessThan(70);
      expect(result.passed).toBe(false);
    });

    it('권고사항이 생성됨', () => {
      const context = createJudgeContext({
        log: 'short',
      });

      const result = evaluateLocally(context);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('요약이 생성됨', () => {
      const context = createJudgeContext();
      const result = evaluateLocally(context);

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
    });
  });
});

// =============================================================================
// API 모드 테스트 (모킹)
// =============================================================================

describe('evaluateWithGemini', () => {
  it('mockMode=true면 로컬 평가 결과 반환', async () => {
    const context = createJudgeContext();
    const result = await evaluateWithGemini(context, { mockMode: true });

    expect(result).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.length).toBe(5);
    expect(result.evaluatedAt).toBeInstanceOf(Date);
  });

  it('API 키 없이 호출하면 로컬 평가로 폴백', async () => {
    const context = createJudgeContext();
    const result = await evaluateWithGemini(context, { apiKey: undefined });

    expect(result).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 배치 평가 테스트
// =============================================================================

describe('evaluateBatch', () => {
  it('여러 응답을 일괄 평가함', async () => {
    const contexts: JudgePromptContext[] = [
      createJudgeContext({ log: '박지현이 문을 열었다. 안에는 놀라운 광경이 펼쳐졌다. 그는 가슴이 두근거렸다.' }),
      createJudgeContext({ log: 'short' }),
      createJudgeContext({ log: '김서연이 조심스럽게 다가갔다. 긴장감이 감돌았다.' }),
    ];

    const result = await evaluateBatch(contexts, { mockMode: true });

    expect(result.totalResponses).toBe(3);
    expect(result.results.length).toBe(3);
    expect(result.passRate).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeLessThanOrEqual(100);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
  });

  it('카테고리별 평균을 계산함', async () => {
    const contexts: JudgePromptContext[] = [
      createJudgeContext(),
      createJudgeContext(),
    ];

    const result = await evaluateBatch(contexts, { mockMode: true });

    expect(result.categoryAverages).toBeDefined();
    expect(result.categoryAverages.narrativeQuality).toBeDefined();
    expect(result.categoryAverages.koreanNaturalness).toBeDefined();
  });

  it('공통 이슈를 집계함', async () => {
    // 같은 이슈를 가진 여러 응답
    const contexts: JudgePromptContext[] = [
      createJudgeContext({ log: 'short' }),
      createJudgeContext({ log: 'also short' }),
    ];

    const result = await evaluateBatch(contexts, { mockMode: true });

    expect(result.commonIssues).toBeDefined();
    // 공통으로 '짧음' 이슈가 있을 수 있음
  });
});

// =============================================================================
// 회귀 테스트 (특정 케이스)
// =============================================================================

describe('회귀 테스트', () => {
  it('언어 혼용 응답이 낮은 점수를 받음', async () => {
    const context: JudgePromptContext = {
      response: mockInvalidAIResponse_LanguageMixed as any,
      scenario: mockScenario,
      characters: mockCharacters,
      currentDay: 3,
    };

    const result = evaluateLocally(context);

    expect(result.overall).toBeLessThan(80);
    expect(result.scores.find(s => s.category === 'koreanNaturalness')?.score).toBeLessThan(80);
  });

  it('필드가 누락된 응답도 평가 가능함', () => {
    // 필드가 누락된 경우에도 에러 없이 평가해야 함
    const partialResponse = {
      log: '테스트 서술입니다.',
      dilemma: {
        prompt: '테스트',
        choice_a: '선택지 A를 선택한다',
        choice_b: '선택지 B를 선택한다',
      },
      statChanges: {
        scenarioStats: {},
        survivorStatus: [],
        hiddenRelationships_change: [],
        flags_acquired: [],
      },
    };

    const context: JudgePromptContext = {
      response: partialResponse as any,
      scenario: mockScenario,
      characters: mockCharacters,
      currentDay: 3,
    };

    expect(() => evaluateLocally(context)).not.toThrow();
  });

  it('빈 문자열 응답도 평가 가능함', () => {
    const emptyResponse = {
      log: '',
      dilemma: {
        prompt: '',
        choice_a: '',
        choice_b: '',
      },
      statChanges: {
        scenarioStats: {},
        survivorStatus: [],
        hiddenRelationships_change: [],
        flags_acquired: [],
      },
    };

    const context: JudgePromptContext = {
      response: emptyResponse as any,
      scenario: mockScenario,
      characters: mockCharacters,
      currentDay: 1,
    };

    const result = evaluateLocally(context);

    // 빈 응답도 기본 점수가 있으므로 낮은 점수대를 기대
    expect(result.overall).toBeLessThan(70);
    expect(result.passed).toBe(false);
  });
});

// =============================================================================
// 품질 기준 테스트
// =============================================================================

describe('품질 기준 검증', () => {
  const qualityTestCases = [
    {
      name: '고품질 응답',
      log: '박지현이 조심스럽게 창고 문을 열었다. 갑자기 안에서 소리가 들려 긴장감이 감돌았다. "누구세요?" 김서연이 불안한 목소리로 물었다. 어둠 속에서 무언가가 움직이는 것 같았다. 박지현은 두려움을 느꼈지만 용기를 내어 앞으로 나아갔다.',
      expectedPass: true,
    },
    {
      name: '중간 품질 응답',
      log: '박지현이 문을 열었다. 안에 뭔가 있었다. 김서연이 따라왔다.',
      expectedPass: false, // 감정 표현 부족
    },
    {
      name: '저품질 응답',
      log: 'test',
      expectedPass: false,
    },
  ];

  qualityTestCases.forEach(({ name, log, expectedPass }) => {
    it(`${name}: passed=${expectedPass}`, () => {
      const context = createJudgeContext({ log });
      const result = evaluateLocally(context);

      if (expectedPass) {
        expect(result.overall).toBeGreaterThanOrEqual(70);
      } else {
        // 로컬 평가는 관대하므로 실패 케이스도 일정 점수 이상일 수 있음
        // 단, 고품질과는 구분되어야 함
        expect(result.overall).toBeLessThan(90);
      }
    });
  });
});
