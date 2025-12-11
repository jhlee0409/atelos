/**
 * AI Judge Client - Gemini 기반 AI 품질 평가 시스템
 * @description Gemini 2.5 Pro/Flash를 사용하여 AI 응답 품질을 평가
 *
 * ## 평가 기준
 * 1. 서사 품질 (Narrative Quality)
 * 2. 한국어 자연스러움 (Korean Naturalness)
 * 3. 캐릭터 일관성 (Character Consistency)
 * 4. 선택지 품질 (Choice Quality)
 * 5. 스토리 몰입도 (Story Immersion)
 */

import type { AIResponse, ScenarioData, Character } from '@/types';

// =============================================================================
// Types
// =============================================================================

export interface QualityScore {
  category: string;
  score: number;         // 0-100
  weight: number;        // 가중치
  feedback: string;      // 평가 피드백
  issues?: string[];     // 발견된 문제점
}

export interface AIJudgeResult {
  overall: number;                   // 종합 점수 (0-100)
  passed: boolean;                   // 품질 기준 통과 여부
  scores: QualityScore[];           // 카테고리별 점수
  summary: string;                   // 요약 피드백
  recommendations: string[];         // 개선 권고사항
  evaluatedAt: Date;
  evaluationDuration: number;        // ms
}

export interface JudgePromptContext {
  response: AIResponse;
  scenario: ScenarioData;
  characters: Character[];
  currentDay: number;
  previousContext?: string;
}

// =============================================================================
// Constants
// =============================================================================

const QUALITY_THRESHOLDS = {
  PASS: 70,           // 통과 기준
  EXCELLENT: 85,      // 우수
  WARNING: 50,        // 경고
  FAIL: 30,           // 실패
};

const EVALUATION_WEIGHTS = {
  narrativeQuality: 0.25,
  koreanNaturalness: 0.25,
  characterConsistency: 0.20,
  choiceQuality: 0.15,
  storyImmersion: 0.15,
};

// =============================================================================
// Evaluation Prompt Templates
// =============================================================================

const buildJudgeSystemPrompt = (): string => `
당신은 한국어 인터랙티브 픽션의 품질을 평가하는 전문 평가자입니다.
주어진 AI 응답을 다음 기준에 따라 엄격하게 평가해주세요.

## 평가 기준

### 1. 서사 품질 (Narrative Quality) - 25%
- 문장의 완성도와 흐름
- 묘사의 구체성과 생동감
- 긴장감과 감정적 몰입도
- 시나리오 맥락과의 부합성

### 2. 한국어 자연스러움 (Korean Naturalness) - 25%
- 문법적 정확성
- 어색하지 않은 표현
- 외래어/다른 언어 혼용 없음
- 적절한 어조와 문체

### 3. 캐릭터 일관성 (Character Consistency) - 20%
- 캐릭터 이름 정확한 사용
- 캐릭터 성격/역할에 맞는 행동
- 대화체의 개성 반영
- 관계 동학의 자연스러움

### 4. 선택지 품질 (Choice Quality) - 15%
- 선택지의 명확성과 구체성
- 선택지 간의 의미 있는 대비
- 적절한 길이 (15-80자)
- "~한다" 종결어미 사용

### 5. 스토리 몰입도 (Story Immersion) - 15%
- 상황의 긴박함 전달
- 플레이어의 능동적 역할 유도
- 다음 전개에 대한 기대감
- 스탯 노출 없는 자연스러운 서술

## 응답 형식

반드시 JSON 형식으로 응답하세요:
{
  "scores": {
    "narrativeQuality": { "score": 0-100, "feedback": "평가 내용", "issues": ["문제점1", "문제점2"] },
    "koreanNaturalness": { "score": 0-100, "feedback": "평가 내용", "issues": [] },
    "characterConsistency": { "score": 0-100, "feedback": "평가 내용", "issues": [] },
    "choiceQuality": { "score": 0-100, "feedback": "평가 내용", "issues": [] },
    "storyImmersion": { "score": 0-100, "feedback": "평가 내용", "issues": [] }
  },
  "summary": "전체 평가 요약 (2-3문장)",
  "recommendations": ["개선 권고1", "개선 권고2"]
}
`;

const buildJudgeUserPrompt = (context: JudgePromptContext): string => {
  const { response, scenario, characters, currentDay, previousContext } = context;

  const characterInfo = characters.slice(0, 5).map(c =>
    `- ${c.characterName} (${c.roleName}): ${c.backstory.substring(0, 50)}...`
  ).join('\n');

  return `
## 시나리오 정보
- 제목: ${scenario.title}
- 장르: ${scenario.genre}
- 현재 날짜: Day ${currentDay}

## 등장인물
${characterInfo}

## 평가 대상 AI 응답

### 서술 (log)
${response.log}

### 딜레마 프롬프트
${response.dilemma.prompt}

### 선택지
A: ${response.dilemma.choice_a}
B: ${response.dilemma.choice_b}
${response.dilemma.choice_c ? `C: ${response.dilemma.choice_c}` : ''}

### 스탯 변화
${JSON.stringify(response.statChanges.scenarioStats, null, 2)}

### 획득 플래그
${response.statChanges.flags_acquired?.length > 0
  ? response.statChanges.flags_acquired.join(', ')
  : '없음'}

${previousContext ? `### 이전 맥락\n${previousContext}` : ''}

---
위 AI 응답을 평가 기준에 따라 엄격하게 평가해주세요.
반드시 JSON 형식으로 응답하세요.
`;
};

// =============================================================================
// AI Judge Implementation
// =============================================================================

/**
 * Gemini API를 통해 AI 응답 품질 평가
 * 실제 Gemini API 호출 (테스트 환경에서는 모킹 가능)
 */
export const evaluateWithGemini = async (
  context: JudgePromptContext,
  options: {
    apiKey?: string;
    model?: string;
    mockMode?: boolean;
  } = {}
): Promise<AIJudgeResult> => {
  const startTime = Date.now();
  const { apiKey, model = 'gemini-2.5-flash', mockMode = false } = options;

  // 테스트 모드에서는 모킹된 결과 반환
  if (mockMode || !apiKey) {
    return evaluateLocally(context);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });

    const result = await generativeModel.generateContent({
      systemInstruction: buildJudgeSystemPrompt(),
      contents: [{ role: 'user', parts: [{ text: buildJudgeUserPrompt(context) }] }],
    });

    const responseText = result.response.text();
    const parsedResult = parseJudgeResponse(responseText);

    const duration = Date.now() - startTime;
    return {
      ...parsedResult,
      evaluatedAt: new Date(),
      evaluationDuration: duration,
    };
  } catch (error) {
    console.error('AI Judge 평가 오류:', error);
    // 에러 시 로컬 평가로 폴백
    return evaluateLocally(context);
  }
};

/**
 * 로컬 규칙 기반 평가 (폴백 또는 빠른 테스트용)
 */
export const evaluateLocally = (
  context: JudgePromptContext
): AIJudgeResult => {
  const startTime = Date.now();
  const { response, characters } = context;

  const scores: QualityScore[] = [];

  // 1. 서사 품질 평가
  const narrativeScore = evaluateNarrativeQuality(response.log);
  scores.push({
    category: 'narrativeQuality',
    score: narrativeScore.score,
    weight: EVALUATION_WEIGHTS.narrativeQuality,
    feedback: narrativeScore.feedback,
    issues: narrativeScore.issues,
  });

  // 2. 한국어 자연스러움 평가
  const koreanScore = evaluateKoreanNaturalness(response);
  scores.push({
    category: 'koreanNaturalness',
    score: koreanScore.score,
    weight: EVALUATION_WEIGHTS.koreanNaturalness,
    feedback: koreanScore.feedback,
    issues: koreanScore.issues,
  });

  // 3. 캐릭터 일관성 평가
  const characterScore = evaluateCharacterConsistency(response.log, characters);
  scores.push({
    category: 'characterConsistency',
    score: characterScore.score,
    weight: EVALUATION_WEIGHTS.characterConsistency,
    feedback: characterScore.feedback,
    issues: characterScore.issues,
  });

  // 4. 선택지 품질 평가
  const choiceScore = evaluateChoiceQuality(response.dilemma);
  scores.push({
    category: 'choiceQuality',
    score: choiceScore.score,
    weight: EVALUATION_WEIGHTS.choiceQuality,
    feedback: choiceScore.feedback,
    issues: choiceScore.issues,
  });

  // 5. 스토리 몰입도 평가
  const immersionScore = evaluateStoryImmersion(response);
  scores.push({
    category: 'storyImmersion',
    score: immersionScore.score,
    weight: EVALUATION_WEIGHTS.storyImmersion,
    feedback: immersionScore.feedback,
    issues: immersionScore.issues,
  });

  // 종합 점수 계산
  const overall = Math.round(
    scores.reduce((sum, s) => sum + s.score * s.weight, 0)
  );

  const allIssues = scores.flatMap(s => s.issues || []);
  const recommendations = generateRecommendations(scores);

  return {
    overall,
    passed: overall >= QUALITY_THRESHOLDS.PASS,
    scores,
    summary: generateSummary(overall, scores),
    recommendations,
    evaluatedAt: new Date(),
    evaluationDuration: Date.now() - startTime,
  };
};

// =============================================================================
// Individual Evaluators
// =============================================================================

interface LocalEvalResult {
  score: number;
  feedback: string;
  issues: string[];
}

const evaluateNarrativeQuality = (log: string): LocalEvalResult => {
  const issues: string[] = [];
  let score = 100;

  // 길이 검증
  if (log.length < 100) {
    score -= 30;
    issues.push('서술이 너무 짧음 (100자 미만)');
  } else if (log.length < 200) {
    score -= 15;
    issues.push('서술이 짧음 (200자 미만)');
  }

  // 감정 표현 체크
  const emotionalWords = [
    '느꼈다', '마음', '불안', '희망', '걱정', '두려움', '안도',
    '긴장', '가슴', '눈물', '떨렸다', '떨린다',
  ];
  const emotionCount = emotionalWords.filter(w => log.includes(w)).length;
  if (emotionCount === 0) {
    score -= 20;
    issues.push('감정 표현 부족');
  }

  // 대화 체크
  const hasDialogue = /"[^"]+"|"[^"]+"|「[^」]+」/.test(log);
  if (!hasDialogue) {
    score -= 10;
    issues.push('대화 부재');
  }

  // 스탯 노출 체크
  const statPatterns = [
    /\d+%/,
    /수치|스탯|포인트/,
    /\(\d+\)/,
    /cityChaos|communityCohesion|survivalFoundation/i,
  ];
  for (const pattern of statPatterns) {
    if (pattern.test(log)) {
      score -= 15;
      issues.push('게임 수치 노출');
      break;
    }
  }

  return {
    score: Math.max(0, score),
    feedback: score >= 70 ? '서사 품질이 양호합니다.' : '서사 품질 개선이 필요합니다.',
    issues,
  };
};

const evaluateKoreanNaturalness = (response: AIResponse): LocalEvalResult => {
  const issues: string[] = [];
  let score = 100;

  const fullText = `${response.log} ${response.dilemma.prompt} ${response.dilemma.choice_a} ${response.dilemma.choice_b}`;

  // 외래어 감지
  const foreignPatterns: [RegExp, string][] = [
    [/[\u0600-\u06FF\u0750-\u077F]/g, '아랍어'],
    [/[\u0E00-\u0E7F]/g, '태국어'],
    [/[\u0900-\u097F]/g, '힌디어'],
    [/[\u0400-\u04FF]/g, '키릴 문자'],
  ];

  for (const [pattern, language] of foreignPatterns) {
    if (pattern.test(fullText)) {
      score -= 25;
      issues.push(`${language} 문자 감지됨`);
    }
  }

  // 한국어 비율 체크
  const koreanPattern = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
  const koreanMatches = fullText.match(koreanPattern) || [];
  const contentChars = fullText.replace(/[\s.,!?'"()\-:;{}[\]]/g, '');
  const koreanRatio = contentChars.length > 0
    ? koreanMatches.length / contentChars.length
    : 0;

  if (koreanRatio < 0.5) {
    score -= 30;
    issues.push(`한국어 비율 낮음: ${Math.round(koreanRatio * 100)}%`);
  } else if (koreanRatio < 0.7) {
    score -= 15;
    issues.push(`한국어 비율 부족: ${Math.round(koreanRatio * 100)}%`);
  }

  // 어색한 표현 감지
  const awkwardPatterns = [
    /그리고 그리고/,
    /하였습니다.*하였습니다/,
    /\.\.\.\.\./,
  ];
  for (const pattern of awkwardPatterns) {
    if (pattern.test(fullText)) {
      score -= 10;
      issues.push('어색한 반복 표현');
    }
  }

  return {
    score: Math.max(0, score),
    feedback: score >= 70 ? '한국어 자연스러움이 양호합니다.' : '한국어 표현 개선이 필요합니다.',
    issues,
  };
};

const evaluateCharacterConsistency = (
  log: string,
  characters: Character[]
): LocalEvalResult => {
  const issues: string[] = [];
  let score = 100;

  // 캐릭터 언급 체크
  const characterNames = characters.map(c => c.characterName);
  const mentionedChars = characterNames.filter(name => log.includes(name));

  if (mentionedChars.length === 0 && characters.length > 0) {
    score -= 25;
    issues.push('캐릭터 언급 없음');
  }

  // 캐릭터명 오류 체크 (유사하지만 다른 이름)
  const nameParts = characterNames.flatMap(name => name.split(''));
  const suspiciousPatterns = characterNames.map(name => {
    const first = name.charAt(0);
    return new RegExp(`${first}[가-힣]{1,2}(?![가-힣])`, 'g');
  });

  // 추가 평가 가능 (캐릭터별 역할에 맞는 행동 체크 등)

  return {
    score: Math.max(0, score),
    feedback: score >= 70 ? '캐릭터 일관성이 양호합니다.' : '캐릭터 관련 개선이 필요합니다.',
    issues,
  };
};

const evaluateChoiceQuality = (
  dilemma: AIResponse['dilemma']
): LocalEvalResult => {
  const issues: string[] = [];
  let score = 100;

  const choices = [dilemma.choice_a, dilemma.choice_b];
  if (dilemma.choice_c) choices.push(dilemma.choice_c);

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const label = String.fromCharCode(65 + i); // A, B, C

    // 길이 체크
    if (choice.length < 15) {
      score -= 10;
      issues.push(`선택지 ${label} 너무 짧음 (${choice.length}자)`);
    } else if (choice.length > 80) {
      score -= 10;
      issues.push(`선택지 ${label} 너무 김 (${choice.length}자)`);
    }

    // 종결형 체크
    const validEndings = /[한이된른]다\.?$/;
    if (!validEndings.test(choice)) {
      score -= 10;
      issues.push(`선택지 ${label} 종결형 오류`);
    }

    // 시스템 ID 노출 체크
    if (/\[[A-Z_]+\]/.test(choice)) {
      score -= 15;
      issues.push(`선택지 ${label} 시스템 ID 노출`);
    }
  }

  // 선택지 간 차별성 체크
  if (dilemma.choice_a.substring(0, 5) === dilemma.choice_b.substring(0, 5)) {
    score -= 15;
    issues.push('선택지 간 차별성 부족');
  }

  return {
    score: Math.max(0, score),
    feedback: score >= 70 ? '선택지 품질이 양호합니다.' : '선택지 개선이 필요합니다.',
    issues,
  };
};

const evaluateStoryImmersion = (response: AIResponse): LocalEvalResult => {
  const issues: string[] = [];
  let score = 100;

  const log = response.log;

  // 긴박감 단어 체크
  const tensionWords = [
    '갑자기', '순간', '긴급', '위험', '급히', '서둘러',
    '조심', '경계', '신속', '즉시',
  ];
  const tensionCount = tensionWords.filter(w => log.includes(w)).length;
  if (tensionCount === 0) {
    score -= 15;
    issues.push('긴박감 표현 부족');
  }

  // 감각적 묘사 체크
  const sensoryWords = [
    '소리', '냄새', '보였다', '들렸다', '느껴졌다',
    '어둠', '빛', '차가운', '뜨거운',
  ];
  const sensoryCount = sensoryWords.filter(w => log.includes(w)).length;
  if (sensoryCount === 0) {
    score -= 10;
    issues.push('감각적 묘사 부족');
  }

  // 딜레마 프롬프트의 유인력 체크
  const prompt = response.dilemma.prompt;
  if (prompt.length < 20) {
    score -= 10;
    issues.push('딜레마 설명 부족');
  }

  // 스탯 관련 직접 언급 체크
  const statMentions = /자원이?|혼란도?|결속력?|신뢰도?/.test(log);
  if (statMentions) {
    score -= 10;
    issues.push('게임 메커닉 직접 언급');
  }

  return {
    score: Math.max(0, score),
    feedback: score >= 70 ? '몰입도가 양호합니다.' : '몰입도 개선이 필요합니다.',
    issues,
  };
};

// =============================================================================
// Helper Functions
// =============================================================================

const parseJudgeResponse = (responseText: string): Omit<AIJudgeResult, 'evaluatedAt' | 'evaluationDuration'> => {
  try {
    // JSON 추출 (코드 블록 안에 있을 수 있음)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found');

    const parsed = JSON.parse(jsonMatch[0]);

    const scores: QualityScore[] = Object.entries(parsed.scores || {}).map(
      ([category, data]: [string, any]) => ({
        category,
        score: data.score || 0,
        weight: EVALUATION_WEIGHTS[category as keyof typeof EVALUATION_WEIGHTS] || 0.2,
        feedback: data.feedback || '',
        issues: data.issues || [],
      })
    );

    const overall = Math.round(
      scores.reduce((sum, s) => sum + s.score * s.weight, 0)
    );

    return {
      overall,
      passed: overall >= QUALITY_THRESHOLDS.PASS,
      scores,
      summary: parsed.summary || '',
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('Judge 응답 파싱 오류:', error);
    return {
      overall: 0,
      passed: false,
      scores: [],
      summary: '평가 결과 파싱 실패',
      recommendations: ['평가 재시도 필요'],
    };
  }
};

const generateSummary = (overall: number, scores: QualityScore[]): string => {
  if (overall >= QUALITY_THRESHOLDS.EXCELLENT) {
    return '우수한 품질의 AI 응답입니다. 모든 기준을 충족합니다.';
  } else if (overall >= QUALITY_THRESHOLDS.PASS) {
    const weakest = scores.reduce((min, s) => s.score < min.score ? s : min);
    return `품질 기준을 통과했습니다. ${weakest.category} 영역에서 개선 여지가 있습니다.`;
  } else if (overall >= QUALITY_THRESHOLDS.WARNING) {
    return '품질 기준에 미달합니다. 여러 영역에서 개선이 필요합니다.';
  } else {
    return '품질이 매우 낮습니다. 전반적인 재검토가 필요합니다.';
  }
};

const generateRecommendations = (scores: QualityScore[]): string[] => {
  const recommendations: string[] = [];

  for (const score of scores) {
    if (score.score < QUALITY_THRESHOLDS.PASS && score.issues) {
      for (const issue of score.issues.slice(0, 2)) {
        recommendations.push(`[${score.category}] ${issue} 개선 필요`);
      }
    }
  }

  return recommendations.slice(0, 5); // 최대 5개 권고사항
};

// =============================================================================
// Batch Evaluation
// =============================================================================

export interface BatchEvaluationResult {
  totalResponses: number;
  passRate: number;
  averageScore: number;
  categoryAverages: Record<string, number>;
  commonIssues: { issue: string; count: number }[];
  results: AIJudgeResult[];
}

/**
 * 여러 AI 응답을 일괄 평가
 */
export const evaluateBatch = async (
  contexts: JudgePromptContext[],
  options: { apiKey?: string; mockMode?: boolean } = {}
): Promise<BatchEvaluationResult> => {
  const results: AIJudgeResult[] = [];

  for (const context of contexts) {
    const result = await evaluateWithGemini(context, options);
    results.push(result);
  }

  const passedCount = results.filter(r => r.passed).length;
  const totalScore = results.reduce((sum, r) => sum + r.overall, 0);

  // 카테고리별 평균 계산
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  for (const result of results) {
    for (const score of result.scores) {
      if (!categoryTotals[score.category]) {
        categoryTotals[score.category] = { total: 0, count: 0 };
      }
      categoryTotals[score.category].total += score.score;
      categoryTotals[score.category].count += 1;
    }
  }

  const categoryAverages: Record<string, number> = {};
  for (const [cat, { total, count }] of Object.entries(categoryTotals)) {
    categoryAverages[cat] = Math.round(total / count);
  }

  // 공통 이슈 집계
  const issueCounts: Record<string, number> = {};
  for (const result of results) {
    for (const score of result.scores) {
      for (const issue of score.issues || []) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    }
  }

  const commonIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalResponses: contexts.length,
    passRate: Math.round((passedCount / contexts.length) * 100),
    averageScore: Math.round(totalScore / contexts.length),
    categoryAverages,
    commonIssues,
    results,
  };
};
