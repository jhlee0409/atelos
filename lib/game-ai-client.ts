import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { buildOptimizedGamePrompt, PromptComplexity } from './prompt-builder';
import {
  buildOptimizedGamePromptV2,
  getDynamicComplexity,
} from './prompt-builder-optimized';
import { ChatHistoryManager } from './chat-history-manager';
import type { ScenarioData, PlayerState } from '@/types';

// 언어 혼용 감지 및 정리 함수
export const detectAndCleanLanguageMixing = (
  text: string,
): {
  cleanedText: string;
  hasIssues: boolean;
  issues: string[];
} => {
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

// 한국어 품질 검증 함수
export const validateKoreanContent = (
  text: string,
): {
  isValid: boolean;
  koreanRatio: number;
  issues: string[];
} => {
  const issues: string[] = [];

  // 한국어 문자 비율 계산 (한글, 한자, 영어, 숫자, 기본 문장부호 허용)
  const koreanPattern = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
  const allowedPattern = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s.,!?'"()\-:;]/g;

  const koreanMatches = text.match(koreanPattern) || [];
  const allowedMatches = text.match(allowedPattern) || [];

  const koreanRatio = koreanMatches.length / text.length;
  const allowedRatio = allowedMatches.length / text.length;

  // 한국어 비율이 너무 낮으면 문제
  if (koreanRatio < 0.3) {
    issues.push(`한국어 비율 낮음: ${Math.round(koreanRatio * 100)}%`);
  }

  // 허용되지 않는 문자가 너무 많으면 문제
  if (allowedRatio < 0.8) {
    issues.push(
      `허용되지 않는 문자 과다: ${Math.round((1 - allowedRatio) * 100)}%`,
    );
  }

  // 텍스트가 너무 짧으면 검증 어려움
  if (text.length < 10) {
    issues.push('텍스트 너무 짧음');
  }

  const isValid = issues.length === 0;

  return {
    isValid,
    koreanRatio,
    issues,
  };
};

// AI 응답 언어 정리 및 검증
export const cleanAndValidateAIResponse = (
  response: AIResponse,
): {
  cleanedResponse: AIResponse;
  hasLanguageIssues: boolean;
  languageIssues: string[];
} => {
  const languageIssues: string[] = [];
  let hasLanguageIssues = false;

  // log 필드 정리
  const logCleaning = detectAndCleanLanguageMixing(response.log);
  if (logCleaning.hasIssues) {
    hasLanguageIssues = true;
    languageIssues.push(...logCleaning.issues.map((issue) => `log: ${issue}`));
  }

  // dilemma 필드들 정리
  const promptCleaning = detectAndCleanLanguageMixing(response.dilemma.prompt);
  const choiceACleaning = detectAndCleanLanguageMixing(
    response.dilemma.choice_a,
  );
  const choiceBCleaning = detectAndCleanLanguageMixing(
    response.dilemma.choice_b,
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

  // 정리된 응답 생성
  const cleanedResponse: AIResponse = {
    ...response,
    log: logCleaning.cleanedText,
    dilemma: {
      prompt: promptCleaning.cleanedText,
      choice_a: choiceACleaning.cleanedText,
      choice_b: choiceBCleaning.cleanedText,
    },
  };

  // 정리 후 한국어 품질 재검증
  const logValidation = validateKoreanContent(cleanedResponse.log);
  const promptValidation = validateKoreanContent(
    cleanedResponse.dilemma.prompt,
  );

  if (!logValidation.isValid) {
    hasLanguageIssues = true;
    languageIssues.push(
      ...logValidation.issues.map((issue) => `log 품질: ${issue}`),
    );
  }
  if (!promptValidation.isValid) {
    hasLanguageIssues = true;
    languageIssues.push(
      ...promptValidation.issues.map((issue) => `prompt 품질: ${issue}`),
    );
  }

  if (hasLanguageIssues) {
    console.warn('🌐 언어 혼용 문제 감지 및 정리:', languageIssues);
  }

  return {
    cleanedResponse,
    hasLanguageIssues,
    languageIssues,
  };
};

// 게임 클라이언트에서 사용하는 인터페이스들
export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
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
        },
      );
    }

    console.log(
      `📊 예상 토큰: ${promptData.estimatedTokens}, 남은 예산: ${remainingTokenBudget}`,
    );

    // 제미나이 API 호출
    const geminiResponse = await callGeminiAPI({
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      model: 'gemini-2.0-flash',
      temperature: 0.8,
      maxTokens: Math.min(
        dynamicSettings.useUltraLite ? 1500 : 3000,
        remainingTokenBudget,
      ),
    });

    // JSON 응답 파싱
    const parsedResponse = parseGeminiJsonResponse<AIResponse>(geminiResponse);

    // 언어 혼용 감지 및 정리
    const { cleanedResponse, hasLanguageIssues, languageIssues } =
      cleanAndValidateAIResponse(parsedResponse);

    if (hasLanguageIssues) {
      console.warn('🌐 언어 혼용 문제 감지 및 정리 완료:', languageIssues);
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

  // 2. 서술 길이 체크
  const wordCount = response.log.length;
  if (usedLiteVersion && wordCount < 100) {
    qualityScore -= 15;
    issues.push(`서술 너무 짧음: ${wordCount}자`);
  } else if (!usedLiteVersion && wordCount < 200) {
    qualityScore -= 10;
    issues.push(`서술 부족: ${wordCount}자`);
  }

  // 3. 감정 표현 체크
  const emotionalWords = [
    '느꼈다',
    '생각했다',
    '마음',
    '감정',
    '불안',
    '희망',
    '걱정',
    '기쁨',
  ];
  const hasEmotionalContent = emotionalWords.some((word) =>
    response.log.includes(word),
  );
  if (!hasEmotionalContent) {
    qualityScore -= 15;
    issues.push('감정적 표현 부족');
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

  // 게임 단계별 기본 설정 (품질 우선)
  let settings = {
    useLiteVersion: false,
    maxTokens: 4000,
    temperature: 0.8,
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
  if (isEndGame) {
    settings = {
      ...settings,
      promptComplexity: 'detailed',
      maxTokens: 5000,
      temperature: 0.9, // 더 창의적인 엔딩
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
