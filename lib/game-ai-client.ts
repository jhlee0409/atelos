import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { buildOptimizedGamePrompt, PromptComplexity } from './prompt-builder';
import {
  buildOptimizedGamePromptV2,
  getDynamicComplexity,
} from './prompt-builder-optimized';
import { ChatHistoryManager } from './chat-history-manager';
import {
  getScenarioMappingCache,
  getGenericStatFilterPatterns,
  initScenarioMappingCache,
} from './scenario-mapping-utils';
import type { ScenarioData, PlayerState } from '@/types';

// 언어 혼용 감지 및 정리 함수
export const detectAndCleanLanguageMixing = (
  text: string,
): {
  cleanedText: string;
  hasIssues: boolean;
  issues: string[];
} => {
  // null/undefined 방어 처리
  if (!text || typeof text !== 'string') {
    return {
      cleanedText: text || '',
      hasIssues: false,
      issues: [],
    };
  }

  const issues: string[] = [];
  let cleanedText = text;
  let hasIssues = false;

  // 1. 아랍어 문자 감지 및 제거 (U+0600-U+06FF, U+0750-U+077F)
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/g;
  if (arabicPattern.test(text)) {
    hasIssues = true;
    issues.push('아랍어 문자 감지됨');
    cleanedText = cleanedText.replace(arabicPattern, '');
  }

  // 2. 태국어 문자 감지 및 제거 (U+0E00-U+0E7F)
  const thaiPattern = /[\u0E00-\u0E7F]/g;
  if (thaiPattern.test(text)) {
    hasIssues = true;
    issues.push('태국어 문자 감지됨');
    cleanedText = cleanedText.replace(thaiPattern, '');
  }

  // 3. 힌디어/데바나가리 문자 감지 및 제거 (U+0900-U+097F)
  const hindiPattern = /[\u0900-\u097F]/g;
  if (hindiPattern.test(text)) {
    hasIssues = true;
    issues.push('힌디어 문자 감지됨');
    cleanedText = cleanedText.replace(hindiPattern, '');
  }

  // 4. 러시아어/키릴 문자 감지 및 제거 (U+0400-U+04FF)
  const cyrillicPattern = /[\u0400-\u04FF]/g;
  if (cyrillicPattern.test(text)) {
    hasIssues = true;
    issues.push('키릴 문자 감지됨');
    cleanedText = cleanedText.replace(cyrillicPattern, '');
  }

  // 5. 이상한 유니코드 문자 감지 및 제거
  const weirdUnicodePattern = /[\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F]/g;
  if (weirdUnicodePattern.test(text)) {
    hasIssues = true;
    issues.push('이상한 유니코드 문자 감지됨');
    cleanedText = cleanedText.replace(weirdUnicodePattern, ' ');
  }

  // 6. 중국어 간체/번체 문자 과도한 사용 감지 (한자는 일부 허용)
  const chinesePattern = /[\u4E00-\u9FFF]/g;
  const chineseMatches = text.match(chinesePattern);
  if (chineseMatches && chineseMatches.length > text.length * 0.3) {
    hasIssues = true;
    issues.push('중국어 문자 과다 사용');
    // 중국어는 완전 제거하지 않고 경고만 (한자 일부는 한국어에서 사용)
  }

  // 7. 연속된 공백 정리
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  // 8. 빈 문장 제거
  cleanedText = cleanedText
    .split('.')
    .filter((sentence) => sentence.trim().length > 0)
    .join('.')
    .replace(/\.+/g, '.');

  return {
    cleanedText,
    hasIssues,
    issues,
  };
};

// 한국어 품질 검증 함수 (gemini-2.5-flash-lite 최적화 - 개선된 계산 로직)
export const validateKoreanContent = (
  text: string,
): {
  isValid: boolean;
  koreanRatio: number;
  issues: string[];
} => {
  // null/undefined 방어 처리
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      koreanRatio: 0,
      issues: ['텍스트가 비어있거나 유효하지 않음'],
    };
  }

  const issues: string[] = [];

  // JSON 키와 시스템 용어를 제외한 실제 콘텐츠만 추출
  const cleanedText = extractKoreanContent(text);

  // 추출된 텍스트가 너무 짧으면 원본으로 검증
  const textToValidate = cleanedText.length >= 10 ? cleanedText : text;

  // 한국어 문자 비율 계산 (한글만 계산)
  const koreanPattern = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
  const allowedPattern = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s.,!?'"()\-:;]/g;

  const koreanMatches = textToValidate.match(koreanPattern) || [];
  const allowedMatches = textToValidate.match(allowedPattern) || [];

  // 공백과 문장부호를 제외한 실제 문자 수로 비율 계산
  const contentChars = textToValidate.replace(/[\s.,!?'"()\-:;]/g, '');
  const koreanRatio = contentChars.length > 0
    ? koreanMatches.length / contentChars.length
    : 0;
  const allowedRatio = textToValidate.length > 0
    ? allowedMatches.length / textToValidate.length
    : 0;

  // 한국어 비율 기준 완화 (실제 콘텐츠 기준 50% 이상이면 통과)
  // JSON 키와 영문 ID가 제외되었으므로 기준 완화
  if (koreanRatio < 0.5) {
    issues.push(`한국어 비율 낮음: ${Math.round(koreanRatio * 100)}% (50% 이상 필요)`);
  }

  // 허용되지 않는 문자가 너무 많으면 문제
  if (allowedRatio < 0.9) {
    issues.push(
      `허용되지 않는 문자 과다: ${Math.round((1 - allowedRatio) * 100)}%`,
    );
  }

  // 텍스트가 너무 짧으면 검증 어려움
  if (textToValidate.length < 10) {
    issues.push('텍스트 너무 짧음');
  }

  const isValid = issues.length === 0;

  return {
    isValid,
    koreanRatio,
    issues,
  };
};

// JSON 키와 시스템 용어를 제외하고 실제 한국어 콘텐츠만 추출
export const extractKoreanContent = (text: string): string => {
  // JSON 키 패턴 제거 (예: "log":, "dilemma":, "choice_a": 등)
  let cleaned = text
    .replace(/"(log|dilemma|prompt|choice_a|choice_b|statChanges|scenarioStats|survivorStatus|hiddenRelationships_change|flags_acquired|shouldAdvanceTime|name|newStatus|pair|change)":/gi, '')
    // 영문 stat ID 제거 (예: cityChaos, communityCohesion 등)
    .replace(/\b(cityChaos|communityCohesion|survivalFoundation|citizenTrust|resourceLevel|safetyLevel|defenseCapability|communityMorale)\b/gi, '')
    // FLAG_ 패턴 제거
    .replace(/FLAG_[A-Z_]+/g, '')
    // JSON 구조 문자 제거
    .replace(/[{}[\]]/g, '')
    // 따옴표 제거
    .replace(/"/g, '')
    // 연속 공백/콤마 정리
    .replace(/[,\s]+/g, ' ')
    .trim();

  return cleaned;
};

// 선택지 품질 검증 함수 (신규)
export const validateChoiceFormat = (
  choice: string,
): {
  isValid: boolean;
  issues: string[];
} => {
  // null/undefined 방어 처리
  if (!choice || typeof choice !== 'string') {
    return {
      isValid: false,
      issues: ['선택지가 비어있거나 유효하지 않음'],
    };
  }

  const issues: string[] = [];

  // 1. 길이 검증 (15-80자)
  if (choice.length < 15) {
    issues.push(`선택지 너무 짧음: ${choice.length}자 (최소 15자)`);
  }
  if (choice.length > 80) {
    issues.push(`선택지 너무 김: ${choice.length}자 (최대 80자)`);
  }

  // 2. 종결형 검증 (~한다, ~이다, ~는다, ~ㄴ다)
  const validEndings = /[한이된른]다\.?$|다\.?$/;
  if (!validEndings.test(choice)) {
    issues.push(`선택지 종결형 오류: "~한다/~이다"로 끝나야 함`);
  }

  // 3. 시스템 ID 노출 검증
  const systemIdPattern = /\[([A-Z_]+)\]/;
  if (systemIdPattern.test(choice)) {
    issues.push(`시스템 ID 노출됨: ${choice.match(systemIdPattern)?.[0]}`);
  }

  // 4. 한국어 콘텐츠 검증
  const koreanPattern = /[가-힣]/g;
  const koreanMatches = choice.match(koreanPattern) || [];
  if (koreanMatches.length < 5) {
    issues.push(`한국어 콘텐츠 부족: 한글 ${koreanMatches.length}자`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// 스탯 변화량 검증 함수 (신규)
export const validateStatChanges = (
  statChanges: { [key: string]: number },
): {
  isValid: boolean;
  issues: string[];
  correctedChanges: { [key: string]: number };
} => {
  const issues: string[] = [];
  const correctedChanges: { [key: string]: number } = {};
  const MAX_STAT_CHANGE = 40;

  for (const [statId, change] of Object.entries(statChanges)) {
    if (typeof change !== 'number') {
      issues.push(`${statId}: 숫자가 아님`);
      correctedChanges[statId] = 0;
      continue;
    }

    // ±40 범위 제한
    if (Math.abs(change) > MAX_STAT_CHANGE) {
      issues.push(`${statId}: 변화량 초과 (${change} → ${change > 0 ? MAX_STAT_CHANGE : -MAX_STAT_CHANGE})`);
      correctedChanges[statId] = change > 0 ? MAX_STAT_CHANGE : -MAX_STAT_CHANGE;
    } else {
      correctedChanges[statId] = change;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    correctedChanges,
  };
};

/**
 * 서사 포맷팅 정리 - 스탯 노출 제거 및 대화 줄바꿈 추가
 * 시나리오 데이터 기반 동적 필터링 지원
 */
export const cleanNarrativeFormatting = (text: string, scenario?: ScenarioData): string => {
  let cleaned = text;

  // 1. 시나리오 기반 동적 패턴 적용 (캐시 사용)
  const cache = getScenarioMappingCache();

  // 시나리오별 스탯 필터링 패턴
  const scenarioPatterns: RegExp[] = cache?.statFilterPatterns || [];

  // 일반 패턴 (시나리오 무관)
  const genericPatterns = getGenericStatFilterPatterns();

  // 추가 한국어 패턴 (공통)
  const koreanPatterns: RegExp[] = [
    // "생존의 기반()이 20밖에" → 제거
    /([가-힣]+의?\s*[가-힣]+)\s*\(\)\s*[이가]\s*\d+\s*(밖에|이상|이하|정도)?/gi,
    // "공동체의 결속력()도 40으로" → 제거
    /[가-힣]+의?\s*[가-힣]+\s*\(\)\s*[도이가]\s*\d+[으로에]?\s*[가-힣]*/gi,
    // "생존의 기반(20)이" → 제거
    /[가-힣]+의?\s*[가-힣]+\s*\(\d+\)\s*[이가도]/gi,
  ];

  // 모든 패턴 합치기 (시나리오 패턴 우선)
  const allPatterns = [...scenarioPatterns, ...genericPatterns, ...koreanPatterns];

  for (const pattern of allPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 빈 문장 정리 (연속된 마침표 제거)
  cleaned = cleaned.replace(/\.\s*\./g, '.').replace(/^\s*\./g, '');

  // 문장 시작 공백 정리
  cleaned = cleaned.replace(/^\s+/gm, '');

  // 2. 대화 전후 줄바꿈 추가
  // 주의: ." 나 !" 패턴은 닫는 따옴표이므로 분리하지 않음 (\s+ 필수)
  cleaned = cleaned
    // 문장 끝 + 공백 + 여는 따옴표 → 줄바꿈 (공백이 있어야 새 대사)
    .replace(/([.!?])\s+"/g, '$1\n\n"')
    .replace(/([.!?])\s+"/g, '$1\n\n"')
    .replace(/([.!?])\s+「/g, '$1\n\n「')
    // 닫는 따옴표 + 공백 + 한글 서술 → 줄바꿈
    .replace(/"\s+([가-힣])/g, '"\n\n$1')
    .replace(/"\s+([가-힣])/g, '"\n\n$1')
    .replace(/」\s+([가-힣])/g, '」\n\n$1');

  // 3. 연속 줄바꿈 정리 (3개 이상 → 2개)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. 앞뒤 공백 정리
  cleaned = cleaned.trim();

  return cleaned;
};

// AI 응답 언어 정리 및 검증 (gemini-2.5-flash-lite 최적화 - 강화된 검증)
export const cleanAndValidateAIResponse = (
  response: AIResponse,
): {
  cleanedResponse: AIResponse;
  hasLanguageIssues: boolean;
  languageIssues: string[];
  hasChoiceIssues: boolean;
  choiceIssues: string[];
  hasStatIssues: boolean;
  statIssues: string[];
} => {
  const languageIssues: string[] = [];
  const choiceIssues: string[] = [];
  const statIssues: string[] = [];
  let hasLanguageIssues = false;
  let hasChoiceIssues = false;
  let hasStatIssues = false;

  // 응답이 없거나 불완전한 경우 기본값 사용
  const safeResponse: AIResponse = {
    log: response?.log || '상황이 전개되고 있습니다...',
    dilemma: {
      prompt: response?.dilemma?.prompt || '다음 행동을 선택하세요.',
      choice_a: response?.dilemma?.choice_a || '신중하게 상황을 지켜본다',
      choice_b: response?.dilemma?.choice_b || '즉시 행동에 나선다',
    },
    statChanges: {
      scenarioStats: response?.statChanges?.scenarioStats || {},
      survivorStatus: response?.statChanges?.survivorStatus || [],
      hiddenRelationships_change: response?.statChanges?.hiddenRelationships_change || [],
      flags_acquired: response?.statChanges?.flags_acquired || [],
    },
  };

  // log 필드 정리
  const logCleaning = detectAndCleanLanguageMixing(safeResponse.log);
  if (logCleaning.hasIssues) {
    hasLanguageIssues = true;
    languageIssues.push(...logCleaning.issues.map((issue) => `log: ${issue}`));
  }

  // dilemma 필드들 정리
  const promptCleaning = detectAndCleanLanguageMixing(safeResponse.dilemma.prompt);
  const choiceACleaning = detectAndCleanLanguageMixing(
    safeResponse.dilemma.choice_a,
  );
  const choiceBCleaning = detectAndCleanLanguageMixing(
    safeResponse.dilemma.choice_b,
  );

  if (promptCleaning.hasIssues) {
    hasLanguageIssues = true;
    languageIssues.push(
      ...promptCleaning.issues.map((issue) => `prompt: ${issue}`),
    );
  }
  if (choiceACleaning.hasIssues) {
    hasLanguageIssues = true;
    languageIssues.push(
      ...choiceACleaning.issues.map((issue) => `choice_a: ${issue}`),
    );
  }
  if (choiceBCleaning.hasIssues) {
    hasLanguageIssues = true;
    languageIssues.push(
      ...choiceBCleaning.issues.map((issue) => `choice_b: ${issue}`),
    );
  }

  // 선택지 포맷 검증 (신규)
  const choiceAValidation = validateChoiceFormat(choiceACleaning.cleanedText);
  const choiceBValidation = validateChoiceFormat(choiceBCleaning.cleanedText);

  if (!choiceAValidation.isValid) {
    hasChoiceIssues = true;
    choiceIssues.push(...choiceAValidation.issues.map((issue) => `choice_a: ${issue}`));
  }
  if (!choiceBValidation.isValid) {
    hasChoiceIssues = true;
    choiceIssues.push(...choiceBValidation.issues.map((issue) => `choice_b: ${issue}`));
  }

  // 스탯 변화량 검증 및 보정 (신규)
  const statValidation = validateStatChanges(safeResponse.statChanges.scenarioStats);
  if (!statValidation.isValid) {
    hasStatIssues = true;
    statIssues.push(...statValidation.issues);
  }

  // 서사 포맷팅 정리 (스탯 노출 제거, 대화 줄바꿈 추가)
  const formattedLog = cleanNarrativeFormatting(logCleaning.cleanedText);
  const formattedPrompt = cleanNarrativeFormatting(promptCleaning.cleanedText);

  // 정리된 응답 생성 (스탯 변화 보정 포함)
  const cleanedResponse: AIResponse = {
    ...safeResponse,
    log: formattedLog,
    dilemma: {
      prompt: formattedPrompt,
      choice_a: choiceACleaning.cleanedText,
      choice_b: choiceBCleaning.cleanedText,
    },
    statChanges: {
      ...safeResponse.statChanges,
      scenarioStats: statValidation.correctedChanges,
    },
  };

  // 정리 후 한국어 품질 재검증 (더 관대한 기준 - 경고만)
  const logValidation = validateKoreanContent(cleanedResponse.log);
  const promptValidation = validateKoreanContent(
    cleanedResponse.dilemma.prompt,
  );

  if (!logValidation.isValid) {
    // 경고만 기록 (80% 미만이어도 게임 진행 가능)
    console.warn('⚠️ log 한국어 품질 경고:', logValidation.issues);
  }
  if (!promptValidation.isValid) {
    console.warn('⚠️ prompt 한국어 품질 경고:', promptValidation.issues);
  }

  if (hasLanguageIssues) {
    console.warn('🌐 언어 혼용 문제 감지 및 정리:', languageIssues);
  }
  if (hasChoiceIssues) {
    console.warn('📋 선택지 포맷 문제:', choiceIssues);
  }
  if (hasStatIssues) {
    console.warn('📊 스탯 변화 보정:', statIssues);
  }

  return {
    cleanedResponse,
    hasLanguageIssues,
    languageIssues,
    hasChoiceIssues,
    choiceIssues,
    hasStatIssues,
    statIssues,
  };
};

// 게임 클라이언트에서 사용하는 인터페이스들
export interface CharacterMoment {
  day: number;
  type: 'relationship' | 'status' | 'decision' | 'revelation';
  description: string;
  relatedCharacter?: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CharacterArc {
  characterName: string;
  moments: CharacterMoment[];
  currentMood: 'hopeful' | 'anxious' | 'angry' | 'resigned' | 'determined';
  trustLevel: number;
}

export interface KeyDecision {
  day: number;
  turn: number;
  choice: string;
  consequence: string;
  category: 'survival' | 'relationship' | 'moral' | 'strategic';
  flagsAcquired?: string[];
  impactedCharacters?: string[];
}

export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
    turnsInCurrentDay?: number; // 현재 하루 내 대화 턴 수
  };
  community: {
    survivors: {
      name: string;
      role: string;
      traits: string[];
      status: string;
    }[];
    hiddenRelationships: { [key: string]: number };
  };
  log: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
  characterArcs?: CharacterArc[];
  keyDecisions?: KeyDecision[];
}

export interface PlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

export interface AIResponse {
  log: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
  statChanges: {
    scenarioStats: { [key: string]: number };
    survivorStatus: { name: string; newStatus: string }[];
    hiddenRelationships_change: any[];
    flags_acquired: string[];
  };
}

// 제미나이 API를 통한 게임 AI 응답 생성 (최적화 v2)
export const generateGameResponse = async (
  saveState: SaveState,
  playerAction: PlayerAction,
  scenario: ScenarioData,
  useLiteVersion = false,
): Promise<AIResponse> => {
  try {
    const startTime = Date.now();
    console.log('🎮 게임 AI 응답 생성 시작...');
    console.log('🎯 액션:', playerAction.actionId);

    // 시나리오 매핑 캐시 초기화 (스탯 ID 필터링용)
    initScenarioMappingCache(scenario);

    // 현재 플레이어 상태 구성
    const currentPlayerState: PlayerState = {
      stats: saveState.context.scenarioStats,
      flags: saveState.context.flags,
      traits: [], // 현재 사용되지 않음
      relationships: saveState.community.hiddenRelationships,
    };

    // 채팅 히스토리에 추가
    chatHistoryManager.addMessage({
      role: 'user',
      content: playerAction.playerFeedback || playerAction.actionDescription,
      metadata: {
        day: saveState.context.currentDay,
        statChanges: {},
      },
    });

    // 토큰 예산 계산 (남은 토큰 기준)
    const remainingTokenBudget = 20000 - sessionStats.totalTokensUsed;

    // 동적 복잡도 조절
    const dynamicSettings = getDynamicComplexity(
      saveState.context.currentDay || 1,
      remainingTokenBudget,
      undefined,
    );

    // 최적화 v2 사용 여부 결정
    const useV2 =
      remainingTokenBudget < 10000 || sessionStats.totalApiCalls > 15;

    let promptData;

    if (useV2) {
      console.log('🚀 최적화 v2 프롬프트 사용');

      // 압축된 히스토리 가져오기
      const compressedHistory = chatHistoryManager.getCompressedHistory(500);

      promptData = buildOptimizedGamePromptV2(
        scenario,
        currentPlayerState,
        playerAction,
        compressedHistory || saveState.log,
        {
          ultraLite: dynamicSettings.useUltraLite,
          currentDay: saveState.context.currentDay || 1,
          includeRelationships: dynamicSettings.includeRelationships,
          keyDecisions: saveState.keyDecisions,
        },
      );
    } else {
      // 기존 프롬프트 시스템 사용
      const aiSettings = getOptimalAISettings(
        saveState.context.currentDay || 1,
        'medium',
        sessionStats.totalTokensUsed,
      );

      const promptComplexity: PromptComplexity = useLiteVersion
        ? 'lite'
        : aiSettings.promptComplexity;

      promptData = buildOptimizedGamePrompt(
        scenario,
        currentPlayerState,
        playerAction,
        saveState.log,
        promptComplexity,
        {
          includeCharacterDetails: aiSettings.includeCharacterDetails,
          includeRelationshipTracking: aiSettings.includeRelationshipTracking,
          includeDetailedStats: aiSettings.includeDetailedStats,
          currentDay: saveState.context.currentDay || 1,
          keyDecisions: saveState.keyDecisions,
        },
      );
    }

    console.log(
      `📊 예상 토큰: ${promptData.estimatedTokens}, 남은 예산: ${remainingTokenBudget}`,
    );

    // 제미나이 API 호출 (gemini-2.5-flash-lite 최적화)
    // - temperature 0.5: 일관된 응답을 위해 낮춤 (모델이 instruction following에 강함)
    // - maxTokens: 모델이 간결한 응답 생성에 최적화됨
    const geminiResponse = await callGeminiAPI({
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      model: 'gemini-2.5-flash-lite',
      temperature: 0.5,
      maxTokens: Math.min(
        dynamicSettings.useUltraLite ? 1200 : 2000,
        remainingTokenBudget,
      ),
    });

    // JSON 응답 파싱
    const parsedResponse = parseGeminiJsonResponse<AIResponse>(geminiResponse);

    // 언어 혼용 감지 및 정리 + 선택지/스탯 검증 (gemini-2.5-flash-lite 강화 검증)
    const {
      cleanedResponse,
      hasLanguageIssues,
      languageIssues,
      hasChoiceIssues,
      choiceIssues,
      hasStatIssues,
      statIssues,
    } = cleanAndValidateAIResponse(parsedResponse);

    if (hasLanguageIssues) {
      console.warn('🌐 언어 혼용 문제 감지 및 정리 완료:', languageIssues);
    }
    if (hasChoiceIssues) {
      console.warn('📋 선택지 포맷 문제 감지:', choiceIssues);
    }
    if (hasStatIssues) {
      console.warn('📊 스탯 변화 보정 완료:', statIssues);
    }

    // 응답을 히스토리에 추가
    chatHistoryManager.addMessage({
      role: 'assistant',
      content: cleanedResponse.log,
      metadata: {
        day: saveState.context.currentDay,
        statChanges: cleanedResponse.statChanges.scenarioStats,
        isKeyEvent: cleanedResponse.statChanges.flags_acquired.length > 0,
      },
    });

    // 세션 통계 업데이트
    const responseTime = Date.now() - startTime;
    updateSessionStats(
      promptData.estimatedTokens,
      responseTime,
      useV2 || dynamicSettings.useUltraLite,
      false,
    );

    console.log('✅ 게임 AI 응답 생성 완료');
    console.log(`⏱️ 응답 시간: ${responseTime}ms`);
    console.log(
      `💰 토큰 사용: ${promptData.estimatedTokens} (총 ${sessionStats.totalTokensUsed})`,
    );

    return cleanedResponse;
  } catch (error) {
    console.error('❌ 게임 AI 응답 생성 실패:', error);

    // 에러 통계 업데이트
    updateSessionStats(0, 0, false, true);

    // 에러 상황에서 기본 응답 반환
    const fallbackResponse: AIResponse = {
      log: '시스템 오류가 발생했습니다. 상황을 다시 평가하고 있습니다...',
      dilemma: {
        prompt: '예상치 못한 상황이 발생했습니다. 어떻게 대응하시겠습니까?',
        choice_a: '[WAIT_AND_OBSERVE] 상황을 지켜본다.',
        choice_b: '[TAKE_IMMEDIATE_ACTION] 즉시 행동한다.',
      },
      statChanges: {
        scenarioStats: {},
        survivorStatus: [],
        hiddenRelationships_change: [],
        flags_acquired: [],
      },
    };

    // 실제 에러는 상위로 전파하되, 게임은 계속 진행될 수 있도록 함
    if (error instanceof Error) {
      throw new Error(`게임 AI 오류: ${error.message}`);
    }

    return fallbackResponse;
  }
};

// 초기 딜레마 생성을 위한 함수
export const generateInitialDilemma = async (
  saveState: SaveState,
  scenario: ScenarioData,
  useLiteVersion = false,
): Promise<AIResponse> => {
  console.log('🤖 초기 딜레마 AI 생성 시작...');

  const initialPlayerAction: PlayerAction = {
    actionId: 'START_GAME',
    actionDescription: '게임 시작',
    playerFeedback: '플레이어가 게임을 시작했습니다.',
  };

  // generateGameResponse를 재사용하되, 초기 상황임을 명시하는 action을 전달
  return generateGameResponse(
    saveState,
    initialPlayerAction,
    scenario,
    useLiteVersion,
  );
};

// 품질 모니터링을 위한 응답 분석
export const analyzeResponseQuality = (
  response: AIResponse,
  scenario: ScenarioData,
  usedLiteVersion: boolean,
): {
  qualityScore: number;
  issues: string[];
  shouldUpgrade: boolean;
} => {
  const issues: string[] = [];
  let qualityScore = 100;

  // 1. 캐릭터 언급률 체크
  const characterNames = scenario.characters.map((c) => c.characterName);
  const mentionedCharacters = characterNames.filter((name) =>
    response.log.includes(name),
  );
  const characterMentionRate =
    mentionedCharacters.length / characterNames.length;

  if (characterMentionRate < 0.5) {
    qualityScore -= 20;
    issues.push(
      `캐릭터 언급률 낮음: ${Math.round(characterMentionRate * 100)}%`,
    );
  }

  // 2. 서술 길이 체크 (모든 모드에서 200자 이상 요구)
  const wordCount = response.log.length;
  if (wordCount < 150) {
    qualityScore -= 20;
    issues.push(`서술 너무 짧음: ${wordCount}자 (최소 150자)`);
  } else if (wordCount < 200) {
    qualityScore -= 10;
    issues.push(`서술 부족: ${wordCount}자 (권장 200자)`);
  }

  // 3. 감정 표현 체크 (확장된 감정 단어 목록)
  const emotionalWords = [
    // 내면 표현
    '느꼈다', '생각했다', '느낀다', '생각한다',
    // 감정 명사
    '마음', '감정', '불안', '희망', '걱정', '기쁨', '분노', '슬픔', '두려움', '안도',
    // 감정 표현 구
    '가슴이', '마음이', '눈물', '떨렸다', '떨린다',
    // 상태 표현
    '긴장', '초조', '답답', '후회', '결심', '다짐',
    // 관계/태도 감정
    '신뢰', '의심', '배신', '우정', '적의', '동정',
  ];
  const emotionalMatchCount = emotionalWords.filter((word) =>
    response.log.includes(word),
  ).length;

  if (emotionalMatchCount === 0) {
    qualityScore -= 20;
    issues.push('감정적 표현 전혀 없음');
  } else if (emotionalMatchCount < 2) {
    qualityScore -= 10;
    issues.push('감정적 표현 부족 (1개만 발견)');
  }

  // 4. 선택지 품질 체크
  const choiceALength = response.dilemma.choice_a.length;
  const choiceBLength = response.dilemma.choice_b.length;
  if (choiceALength < 10 || choiceBLength < 10) {
    qualityScore -= 10;
    issues.push('선택지 너무 단순함');
  }

  // 5. 스탯 변화 체크
  const statChanges = Object.keys(response.statChanges.scenarioStats).length;
  if (statChanges === 0) {
    qualityScore -= 10;
    issues.push('스탯 변화 없음');
  }

  // 라이트 버전에서 품질이 너무 낮으면 풀 버전으로 업그레이드 권장
  const shouldUpgrade = usedLiteVersion && qualityScore < 60;

  console.log(
    `📊 응답 품질 분석: 점수 ${qualityScore}/100, 이슈: ${issues.length}개`,
  );
  if (issues.length > 0) {
    console.warn('⚠️ 품질 이슈:', issues);
  }
  if (shouldUpgrade) {
    console.warn('🔄 풀 버전으로 업그레이드 권장');
  }

  return {
    qualityScore,
    issues,
    shouldUpgrade,
  };
};

// 게임 상태 검증 유틸리티 (품질 검증 강화)
export const validateGameResponse = (
  response: AIResponse,
  scenario?: ScenarioData,
  usedLiteVersion?: boolean,
): boolean => {
  try {
    // 기본 필드 검증
    if (!response.log || typeof response.log !== 'string') {
      console.warn('⚠️ 응답에 log 필드가 없거나 잘못되었습니다.');
      return false;
    }

    if (
      !response.dilemma ||
      !response.dilemma.prompt ||
      !response.dilemma.choice_a ||
      !response.dilemma.choice_b
    ) {
      console.warn('⚠️ 응답에 dilemma 필드가 완전하지 않습니다.');
      return false;
    }

    if (!response.statChanges) {
      console.warn('⚠️ 응답에 statChanges 필드가 없습니다.');
      return false;
    }

    // 스탯 변화 검증
    const { scenarioStats, survivorStatus, flags_acquired } =
      response.statChanges;

    if (scenarioStats && typeof scenarioStats !== 'object') {
      console.warn('⚠️ scenarioStats가 객체가 아닙니다.');
      return false;
    }

    if (survivorStatus && !Array.isArray(survivorStatus)) {
      console.warn('⚠️ survivorStatus가 배열이 아닙니다.');
      return false;
    }

    if (flags_acquired && !Array.isArray(flags_acquired)) {
      console.warn('⚠️ flags_acquired가 배열이 아닙니다.');
      return false;
    }

    // 언어 품질 검증
    const logValidation = validateKoreanContent(response.log);
    const promptValidation = validateKoreanContent(response.dilemma.prompt);

    if (!logValidation.isValid) {
      console.warn('⚠️ log 한국어 품질 문제:', logValidation.issues);
      // 심각한 문제가 아니면 경고만 하고 통과
      if (logValidation.koreanRatio < 0.1) {
        console.error(
          '❌ log 한국어 비율이 너무 낮습니다:',
          logValidation.koreanRatio,
        );
        return false;
      }
    }

    if (!promptValidation.isValid) {
      console.warn('⚠️ prompt 한국어 품질 문제:', promptValidation.issues);
      if (promptValidation.koreanRatio < 0.1) {
        console.error(
          '❌ prompt 한국어 비율이 너무 낮습니다:',
          promptValidation.koreanRatio,
        );
        return false;
      }
    }

    // 품질 분석 (선택적)
    if (scenario && usedLiteVersion !== undefined) {
      const qualityAnalysis = analyzeResponseQuality(
        response,
        scenario,
        usedLiteVersion,
      );
      if (qualityAnalysis.qualityScore < 40) {
        console.error('❌ 응답 품질이 너무 낮습니다:', qualityAnalysis.issues);
        return false;
      }
    }

    console.log('✅ 게임 응답 검증 통과');
    return true;
  } catch (error) {
    console.error('❌ 게임 응답 검증 중 오류:', error);
    return false;
  }
};

// 토큰 최적화를 위한 적응형 AI 설정 (품질 보장 개선)
export const getOptimalAISettings = (
  currentDay: number = 1,
  gameComplexity: 'low' | 'medium' | 'high' = 'medium',
  sessionTokenUsage: number = 0,
) => {
  // 게임 진행도에 따른 프롬프트 복잡도 조절
  const isEarlyGame = currentDay <= 2;
  const isMidGame = currentDay >= 3 && currentDay <= 5;
  const isEndGame = currentDay >= 6;

  // 세션 토큰 사용량에 따른 자동 최적화
  const shouldUseLite = sessionTokenUsage > 12000; // 12K로 낮춰서 더 빨리 라이트 모드 활성화

  // 게임 단계별 기본 설정 (gemini-2.5-flash-lite 최적화)
  // - temperature 0.5: 모델이 instruction following에 강해 낮은 temperature로도 충분
  // - maxTokens 2000: 모델이 간결한 응답 생성에 최적화됨
  let settings = {
    useLiteVersion: false,
    maxTokens: 2000,
    temperature: 0.5,
    promptComplexity: 'full' as 'minimal' | 'lite' | 'full' | 'detailed',
    includeCharacterDetails: true,
    includeRelationshipTracking: true,
    includeDetailedStats: true,
  };

  // 초기 게임: 라이트 모드 사용 (품질 보장된 라이트 모드)
  if (isEarlyGame) {
    settings = {
      ...settings,
      useLiteVersion: true, // gameComplexity 조건 제거
      maxTokens: 3000, // 품질 보장을 위해 토큰 증가
      promptComplexity: 'lite',
      includeCharacterDetails: true, // 캐릭터 정보 유지
      includeRelationshipTracking: true, // 관계 정보 유지
    };
  }

  // 중반 게임: 풀 버전 사용
  if (isMidGame) {
    settings = {
      ...settings,
      promptComplexity: 'full',
      maxTokens: shouldUseLite ? 3000 : 4000, // 라이트 모드에서도 품질 보장
      useLiteVersion: shouldUseLite,
    };
  }

  // 엔드게임: 최대 품질 (중요한 결말)
  // gemini-2.5-flash-lite는 낮은 temperature에서도 창의적 - 0.6으로 설정
  if (isEndGame) {
    settings = {
      ...settings,
      promptComplexity: 'detailed',
      maxTokens: 2500,
      temperature: 0.6, // 약간 높여 창의적 엔딩 유도
      useLiteVersion: false, // 엔딩은 항상 풀 버전
    };
  }

  // 강제 라이트 모드 (토큰 절약하되 품질 유지)
  if (shouldUseLite && !isEndGame) {
    settings.useLiteVersion = true;
    settings.promptComplexity = 'lite';
    settings.maxTokens = Math.max(settings.maxTokens * 0.75, 3000); // 최소 3000토큰 보장
    // 품질 보장을 위해 캐릭터 정보는 유지
    settings.includeCharacterDetails = true;
    settings.includeRelationshipTracking = true;
  }

  console.log(
    `🎛️ AI 설정 최적화: Day ${currentDay}, 복잡도: ${gameComplexity}, 라이트: ${settings.useLiteVersion}, 토큰: ${settings.maxTokens}`,
  );

  return settings;
};

// 토큰 사용량 추적을 위한 세션 통계
let sessionStats = {
  totalApiCalls: 0,
  totalTokensUsed: 0,
  averageResponseTime: 0,
  errorCount: 0,
  liteVersionUsage: 0,
  tokenSavings: 0, // 라이트 버전으로 절약한 토큰
};

// 채팅 히스토리 매니저 인스턴스
const chatHistoryManager = new ChatHistoryManager(30, 3000);

export interface GameSessionStats {
  totalApiCalls: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  errorCount: number;
  liteVersionUsage: number;
  tokenSavings: number;
}

// 세션 통계 업데이트
export const updateSessionStats = (
  tokensUsed: number,
  responseTime: number,
  wasLiteVersion: boolean,
  hadError: boolean = false,
) => {
  sessionStats.totalApiCalls++;
  sessionStats.totalTokensUsed += tokensUsed;
  sessionStats.averageResponseTime =
    (sessionStats.averageResponseTime * (sessionStats.totalApiCalls - 1) +
      responseTime) /
    sessionStats.totalApiCalls;

  if (hadError) sessionStats.errorCount++;
  if (wasLiteVersion) {
    sessionStats.liteVersionUsage++;
    // 라이트 버전으로 절약한 토큰 추정 (풀 버전 대비 70% 절약)
    sessionStats.tokenSavings += Math.floor(tokensUsed * 2.33); // 1/0.3 ≈ 3.33, 차이는 2.33
  }
};

export const getSessionStats = (): GameSessionStats => ({ ...sessionStats });

export const resetSessionStats = (): void => {
  sessionStats = {
    totalApiCalls: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
    errorCount: 0,
    liteVersionUsage: 0,
    tokenSavings: 0,
  };
  chatHistoryManager.clear();
};

// 채팅 히스토리 통계 가져오기
export const getChatHistoryStats = () => chatHistoryManager.getStats();

// 여정 요약 가져오기 (엔딩용)
export const getJourneySummary = () => chatHistoryManager.getJourneySummary();

// ========== 행동 분류 시스템 (P3-1) ==========

// 행동 카테고리 정의
export type ActionCategory =
  | 'combat'       // 전투/공격
  | 'diplomacy'    // 외교/협상
  | 'medical'      // 의료/치료
  | 'exploration'  // 탐험/수색
  | 'construction' // 건설/방어
  | 'resource'     // 자원/수집
  | 'social'       // 사회/관계
  | 'leadership'   // 리더십/결정
  | 'stealth'      // 은신/잠입
  | 'survival'     // 생존/휴식
  | 'general';     // 일반

// 각 카테고리별 정규표현식 패턴
const ACTION_PATTERNS: Record<ActionCategory, RegExp> = {
  combat: /(?:공격|싸[우운]|진압|무력|전투|격퇴|제압|물리[치친]|막[아는]|방어[하한]|대[치응]|저항)/,
  diplomacy: /(?:협상|대화|설득|타협|합의|중재|화해|동맹|교섭|약속|제안|논의)/,
  medical: /(?:치료|의료|부상|상처|간호|응급|수술|약|건강|회복|돌[보봄]|보살)/,
  exploration: /(?:탐[험색색사]|수색|찾[아는]|조사|정찰|발견|확인|살[펴피]|관찰|파악)/,
  construction: /(?:건설|방어|구축|설치|강화|수리|보강|개조|증축|바리케이드)/,
  resource: /(?:자원|물자|수집|확보|저장|배급|분배|비축|공급|식량|식수|연료)/,
  social: /(?:위로|격려|단결|화합|소통|이해|공감|신뢰|연대|모임|회의)/,
  leadership: /(?:결정|지시|명령|통솔|이끌|책임|판단|선택|지휘|조직)/,
  stealth: /(?:숨[어는기]|잠입|몰래|조용|피[하해]|회피|은폐|은신|도피|도망)/,
  survival: /(?:휴식|대기|기다|지켜[봄본]|버[티텨]|견[디뎌]|인내|안정|유지|보존)/,
  general: /.*/,  // 어떤 것이든 매칭 (폴백)
};

// 카테고리 우선순위 (먼저 매칭되는 것이 선택됨)
const CATEGORY_PRIORITY: ActionCategory[] = [
  'combat',
  'diplomacy',
  'medical',
  'exploration',
  'construction',
  'resource',
  'social',
  'leadership',
  'stealth',
  'survival',
  'general',
];

// 카테고리별 한글 설명 (AI 피드백용)
const CATEGORY_DESCRIPTIONS: Record<ActionCategory, string> = {
  combat: '전투적 행동',
  diplomacy: '외교적 접근',
  medical: '의료/치료 행동',
  exploration: '탐색/조사 행동',
  construction: '건설/방어 행동',
  resource: '자원 관리 행동',
  social: '사회적 상호작용',
  leadership: '리더십 발휘',
  stealth: '은밀한 행동',
  survival: '생존/대기 행동',
  general: '일반 행동',
};

/**
 * 선택지 텍스트를 분석하여 행동 카테고리를 분류
 * @param choiceText 선택지 텍스트
 * @returns 분류된 행동 정보
 */
export const classifyAction = (
  choiceText: string,
): {
  category: ActionCategory;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
} => {
  const matchedKeywords: string[] = [];
  let matchedCategory: ActionCategory = 'general';
  let highestMatchCount = 0;

  // 모든 카테고리에 대해 매칭 시도 (general 제외)
  for (const category of CATEGORY_PRIORITY.slice(0, -1)) {
    const pattern = ACTION_PATTERNS[category];
    const matches = choiceText.match(pattern);

    if (matches) {
      // 매칭된 키워드 수로 신뢰도 결정
      const matchCount = matches.length;
      if (matchCount > highestMatchCount) {
        highestMatchCount = matchCount;
        matchedCategory = category;
        matchedKeywords.push(...matches);
      }
    }
  }

  // 신뢰도 결정
  let confidence: 'high' | 'medium' | 'low';
  if (highestMatchCount >= 2) {
    confidence = 'high';
  } else if (highestMatchCount === 1) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  console.log(
    `🎯 행동 분류: "${choiceText.substring(0, 30)}..." → ${matchedCategory} (${confidence})`,
  );

  return {
    category: matchedCategory,
    description: CATEGORY_DESCRIPTIONS[matchedCategory],
    confidence,
    matchedKeywords: [...new Set(matchedKeywords)], // 중복 제거
  };
};

/**
 * PlayerAction 객체 생성을 위한 헬퍼 함수
 * @param choiceText 선택지 텍스트
 * @param choiceId 선택지 ID ('choice_a' | 'choice_b')
 * @returns PlayerAction 객체
 */
export const createPlayerAction = (
  choiceText: string,
  choiceId: 'choice_a' | 'choice_b',
): PlayerAction => {
  const classification = classifyAction(choiceText);

  return {
    actionId: `${classification.category}_${choiceId}`,
    actionDescription: choiceText,
    playerFeedback: `플레이어가 ${classification.description}을(를) 선택했습니다. (신뢰도: ${classification.confidence})`,
  };
};

/**
 * 두 선택지의 행동 유형을 비교하여 대조 여부 확인
 * 프롬프트에서 요구한 "대비되는 선택지" 검증에 사용
 */
export const compareActionTypes = (
  choiceA: string,
  choiceB: string,
): {
  areContrasting: boolean;
  categoryA: ActionCategory;
  categoryB: ActionCategory;
  suggestion?: string;
} => {
  const classificationA = classifyAction(choiceA);
  const classificationB = classifyAction(choiceB);

  // 다른 카테고리면 대조적
  const areContrasting = classificationA.category !== classificationB.category;

  let suggestion: string | undefined;
  if (!areContrasting && classificationA.category !== 'general') {
    suggestion = `두 선택지가 모두 "${CATEGORY_DESCRIPTIONS[classificationA.category]}" 유형입니다. 대비되는 선택지를 제안하세요.`;
  }

  return {
    areContrasting,
    categoryA: classificationA.category,
    categoryB: classificationB.category,
    suggestion,
  };
};

/**
 * 카테고리별 예상 스탯 영향 매핑
 * 각 행동 유형이 게임 스탯에 미칠 수 있는 예상 영향을 정의
 */
export type StatImpactDirection = 'up' | 'down' | 'neutral';

export interface PredictedImpact {
  statName: string;        // 한글 스탯 이름
  statId: string;          // 영문 스탯 ID
  direction: StatImpactDirection;
  intensity: 'low' | 'medium' | 'high';  // 영향 강도
}

export interface ChoiceHint {
  category: ActionCategory;
  categoryDescription: string;
  predictedImpacts: PredictedImpact[];
  riskLevel: 'low' | 'medium' | 'high';
  shortHint: string;  // 짧은 힌트 텍스트
}

// 카테고리별 예상 스탯 영향
const CATEGORY_STAT_IMPACTS: Record<ActionCategory, PredictedImpact[]> = {
  combat: [
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'up', intensity: 'high' },
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'down', intensity: 'medium' },
    { statName: '안전 수준', statId: 'safetyLevel', direction: 'neutral', intensity: 'medium' },
  ],
  diplomacy: [
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'down', intensity: 'medium' },
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'up', intensity: 'medium' },
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'up', intensity: 'low' },
  ],
  medical: [
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'up', intensity: 'high' },
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'up', intensity: 'medium' },
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'down', intensity: 'low' },
  ],
  exploration: [
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'up', intensity: 'medium' },
    { statName: '안전 수준', statId: 'safetyLevel', direction: 'down', intensity: 'low' },
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'neutral', intensity: 'low' },
  ],
  construction: [
    { statName: '방어 능력', statId: 'defenseCapability', direction: 'up', intensity: 'high' },
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'down', intensity: 'medium' },
    { statName: '안전 수준', statId: 'safetyLevel', direction: 'up', intensity: 'medium' },
  ],
  resource: [
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'up', intensity: 'high' },
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'up', intensity: 'low' },
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'up', intensity: 'low' },
  ],
  social: [
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'up', intensity: 'high' },
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'up', intensity: 'medium' },
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'down', intensity: 'low' },
  ],
  leadership: [
    { statName: '시민 신뢰도', statId: 'citizenTrust', direction: 'up', intensity: 'medium' },
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'up', intensity: 'medium' },
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'neutral', intensity: 'low' },
  ],
  stealth: [
    { statName: '안전 수준', statId: 'safetyLevel', direction: 'up', intensity: 'medium' },
    { statName: '도시 혼란도', statId: 'cityChaos', direction: 'neutral', intensity: 'low' },
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'neutral', intensity: 'low' },
  ],
  survival: [
    { statName: '안전 수준', statId: 'safetyLevel', direction: 'up', intensity: 'low' },
    { statName: '커뮤니티 사기', statId: 'communityMorale', direction: 'neutral', intensity: 'low' },
    { statName: '자원 수준', statId: 'resourceLevel', direction: 'down', intensity: 'low' },
  ],
  general: [
    { statName: '스탯 변화', statId: 'general', direction: 'neutral', intensity: 'low' },
  ],
};

// 카테고리별 위험도
const CATEGORY_RISK_LEVELS: Record<ActionCategory, 'low' | 'medium' | 'high'> = {
  combat: 'high',
  diplomacy: 'low',
  medical: 'low',
  exploration: 'medium',
  construction: 'low',
  resource: 'medium',
  social: 'low',
  leadership: 'medium',
  stealth: 'medium',
  survival: 'low',
  general: 'low',
};

// 카테고리별 짧은 힌트
const CATEGORY_SHORT_HINTS: Record<ActionCategory, string> = {
  combat: '⚔️ 위험하지만 즉각적인 해결',
  diplomacy: '🤝 평화적 해결 시도',
  medical: '💊 생명 보호 우선',
  exploration: '🔍 위험과 기회 공존',
  construction: '🏗️ 장기적 안정 확보',
  resource: '📦 자원 확보 중심',
  social: '💬 커뮤니티 결속 강화',
  leadership: '👑 결단력 있는 지도',
  stealth: '🌙 신중한 접근',
  survival: '⏳ 안전한 대기',
  general: '📋 일반적 행동',
};

/**
 * 선택지의 예상 결과 힌트 생성
 * @param choiceText 선택지 텍스트
 * @returns 선택지 힌트 정보
 */
export const getChoiceHint = (choiceText: string): ChoiceHint => {
  const classification = classifyAction(choiceText);
  const category = classification.category;

  return {
    category,
    categoryDescription: classification.description,
    predictedImpacts: CATEGORY_STAT_IMPACTS[category],
    riskLevel: CATEGORY_RISK_LEVELS[category],
    shortHint: CATEGORY_SHORT_HINTS[category],
  };
};

/**
 * 예상 영향을 UI용 텍스트로 변환
 * @param impacts 예상 영향 배열
 * @returns UI 표시용 문자열 배열
 */
export const formatImpactsForUI = (impacts: PredictedImpact[]): string[] => {
  return impacts
    .filter((impact) => impact.direction !== 'neutral')
    .slice(0, 2)  // 최대 2개만 표시
    .map((impact) => {
      const arrow = impact.direction === 'up' ? '↑' : '↓';
      const intensity = impact.intensity === 'high' ? '!' : '';
      return `${arrow}${impact.statName}${intensity}`;
    });
};

// ============================================================
// P3-4: 스탯 증폭 로직 투명화
// ============================================================

/**
 * 스탯 증폭 계산 결과
 */
export interface AmplificationResult {
  statId: string;
  statName: string;
  originalChange: number;
  amplificationFactor: number;
  amplifiedChange: number;
  finalChange: number;  // 클램핑 후 실제 적용된 변화량
  currentValue: number;
  newValue: number;
  percentage: number;   // 변경 전 스탯 위치 (0-100%)
  zone: 'extreme_low' | 'mid_range' | 'extreme_high';  // 스탯 구간
  explanation: string;  // 사용자 친화적 설명
}

/**
 * 스탯 변화 요약 (턴 종료 시 표시용)
 */
export interface StatChangeSummary {
  timestamp: number;
  changes: AmplificationResult[];
  totalAmplification: string;  // 전체 증폭 설명
}

/**
 * 스탯의 현재 구간 결정
 * @param percentage 스탯의 현재 퍼센티지 (0-100)
 * @returns 스탯 구간
 */
export const getStatZone = (
  percentage: number
): 'extreme_low' | 'mid_range' | 'extreme_high' => {
  if (percentage <= 25) return 'extreme_low';
  if (percentage >= 75) return 'extreme_high';
  return 'mid_range';
};

/**
 * 구간별 증폭 배수 반환
 * @param zone 스탯 구간
 * @returns 증폭 배수
 */
export const getAmplificationFactor = (
  zone: 'extreme_low' | 'mid_range' | 'extreme_high'
): number => {
  if (zone === 'mid_range') {
    return 3.0;  // 중간 구간: 긴장감을 위해 큰 증폭
  }
  return 1.5;  // 극단 구간: 부드러운 증폭
};

/**
 * 구간별 한글 설명
 */
const ZONE_DESCRIPTIONS: Record<'extreme_low' | 'mid_range' | 'extreme_high', string> = {
  extreme_low: '위험 구간 (0-25%)',
  mid_range: '안정 구간 (25-75%)',
  extreme_high: '과열 구간 (75-100%)',
};

/**
 * 증폭 배수별 설명
 */
const AMPLIFICATION_DESCRIPTIONS: Record<number, string> = {
  1.5: '완만한 변화 (1.5배)',
  3.0: '급격한 변화 (3배)',
  2.0: '기본 증폭 (2배)',
};

/**
 * 스탯 변화량의 증폭을 계산하고 상세 결과 반환
 * @param statId 스탯 영문 ID
 * @param statName 스탯 한글 이름
 * @param originalChange 원본 변화량
 * @param currentValue 현재 스탯 값
 * @param min 스탯 최소값
 * @param max 스탯 최대값
 * @returns 증폭 계산 결과
 */
export const calculateAmplification = (
  statId: string,
  statName: string,
  originalChange: number,
  currentValue: number,
  min: number,
  max: number
): AmplificationResult => {
  const range = max - min;
  const percentage = ((currentValue - min) / range) * 100;
  const zone = getStatZone(percentage);
  const amplificationFactor = getAmplificationFactor(zone);

  const amplifiedChange = Math.round(originalChange * amplificationFactor);

  // 클램핑: 스탯이 범위를 벗어나지 않도록
  const finalChange = Math.max(
    min - currentValue,
    Math.min(max - currentValue, amplifiedChange)
  );

  const newValue = currentValue + finalChange;

  // 사용자 친화적 설명 생성
  const direction = originalChange > 0 ? '증가' : originalChange < 0 ? '감소' : '유지';
  const zoneDesc = ZONE_DESCRIPTIONS[zone];
  const ampDesc = AMPLIFICATION_DESCRIPTIONS[amplificationFactor] || `${amplificationFactor}배`;

  let explanation: string;
  if (finalChange === amplifiedChange) {
    explanation = `${statName} ${Math.abs(originalChange)} → ${Math.abs(finalChange)} (${zoneDesc}에서 ${ampDesc})`;
  } else {
    explanation = `${statName} ${Math.abs(originalChange)} → ${Math.abs(finalChange)} (${zoneDesc}, 범위 제한 적용)`;
  }

  return {
    statId,
    statName,
    originalChange,
    amplificationFactor,
    amplifiedChange,
    finalChange,
    currentValue,
    newValue,
    percentage,
    zone,
    explanation,
  };
};

/**
 * 여러 스탯 변화의 요약 생성
 * @param changes 증폭 결과 배열
 * @returns 사용자 친화적 요약
 */
export const formatStatChangeSummary = (
  changes: AmplificationResult[]
): string[] => {
  if (changes.length === 0) return ['스탯 변화 없음'];

  return changes.map((change) => {
    const arrow = change.finalChange > 0 ? '↑' : change.finalChange < 0 ? '↓' : '→';
    const absChange = Math.abs(change.finalChange);
    const factorText = change.amplificationFactor === 3.0 ? '⚡' : '';  // 급격한 변화 표시

    return `${arrow} ${change.statName} ${change.finalChange > 0 ? '+' : ''}${change.finalChange} ${factorText}`;
  });
};

/**
 * 증폭 로직 시각화용 데이터 생성
 * @param percentage 현재 스탯 퍼센티지
 * @returns 시각화용 데이터
 */
export interface AmplificationVisualData {
  zoneStart: number;
  zoneEnd: number;
  zoneName: string;
  zoneColor: string;
  factor: number;
  factorLabel: string;
}

export const getAmplificationVisualData = (
  percentage: number
): AmplificationVisualData => {
  const zone = getStatZone(percentage);

  const zoneConfig = {
    extreme_low: {
      zoneStart: 0,
      zoneEnd: 25,
      zoneName: '위험',
      zoneColor: 'text-red-400',
      factor: 1.5,
      factorLabel: '×1.5',
    },
    mid_range: {
      zoneStart: 25,
      zoneEnd: 75,
      zoneName: '안정',
      zoneColor: 'text-yellow-400',
      factor: 3.0,
      factorLabel: '×3.0',
    },
    extreme_high: {
      zoneStart: 75,
      zoneEnd: 100,
      zoneName: '과열',
      zoneColor: 'text-orange-400',
      factor: 1.5,
      factorLabel: '×1.5',
    },
  };

  return zoneConfig[zone];
};
