import { callGeminiAPI, parseGeminiJsonResponse } from './gemini-client';
import { buildGamePrompt, buildGamePromptLite } from './prompt-builder';
import type { ScenarioData, PlayerState } from '@/types';

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

// 제미나이 API를 통한 게임 AI 응답 생성
export const generateGameResponse = async (
  saveState: SaveState,
  playerAction: PlayerAction,
  scenario: ScenarioData,
  useLiteVersion = false,
): Promise<AIResponse> => {
  try {
    console.log('🎮 게임 AI 응답 생성 시작...');
    console.log('🎯 액션:', playerAction.actionId);
    console.log('💡 Lite 버전 사용:', useLiteVersion);

    // 현재 플레이어 상태 구성
    const currentPlayerState: PlayerState = {
      stats: saveState.context.scenarioStats,
      flags: saveState.context.flags,
      traits: [], // 현재 사용되지 않음
      relationships: saveState.community.hiddenRelationships,
    };

    // 프롬프트 생성 (Lite 버전 또는 풀 버전)
    const promptData = useLiteVersion
      ? buildGamePromptLite(scenario, currentPlayerState, playerAction)
      : buildGamePrompt(
          scenario,
          currentPlayerState,
          playerAction,
          saveState.log,
        );

    // 제미나이 API 호출
    const geminiResponse = await callGeminiAPI({
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      model: 'gemini-2.0-flash',
      temperature: 0.8, // 창의적 스토리텔링을 위해 약간 높게 설정
      maxTokens: useLiteVersion ? 2000 : 4000,
    });

    // JSON 응답 파싱
    const parsedResponse = parseGeminiJsonResponse<AIResponse>(geminiResponse);

    console.log('✅ 게임 AI 응답 생성 완료');
    console.log(
      '📊 스탯 변화:',
      Object.keys(parsedResponse.statChanges.scenarioStats).length,
    );
    console.log(
      '🏴 획득 플래그:',
      parsedResponse.statChanges.flags_acquired.length,
    );

    return parsedResponse;
  } catch (error) {
    console.error('❌ 게임 AI 응답 생성 실패:', error);

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

// 게임 상태 검증 유틸리티
export const validateGameResponse = (response: AIResponse): boolean => {
  try {
    // 필수 필드 검증
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

    console.log('✅ 게임 응답 검증 통과');
    return true;
  } catch (error) {
    console.error('❌ 게임 응답 검증 중 오류:', error);
    return false;
  }
};

// 비용 효율적인 AI 호출을 위한 설정
export const getOptimalAISettings = (currentTokenUsage: number = 0) => {
  // 토큰 사용량에 따라 Lite 버전 사용 결정
  const shouldUseLite = currentTokenUsage > 50000; // 50K 토큰 이상 사용 시 Lite 버전

  return {
    useLiteVersion: shouldUseLite,
    maxTokens: shouldUseLite ? 2000 : 4000,
    temperature: shouldUseLite ? 0.7 : 0.8,
    model: 'gemini-2.0-flash', // 현재는 고정, 향후 다른 모델 지원 시 변경 가능
  };
};

// 게임 세션 통계 추적
export interface GameSessionStats {
  totalApiCalls: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  errorCount: number;
  liteVersionUsage: number;
}

let sessionStats: GameSessionStats = {
  totalApiCalls: 0,
  totalTokensUsed: 0,
  averageResponseTime: 0,
  errorCount: 0,
  liteVersionUsage: 0,
};

export const getSessionStats = (): GameSessionStats => ({ ...sessionStats });

export const resetSessionStats = (): void => {
  sessionStats = {
    totalApiCalls: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
    errorCount: 0,
    liteVersionUsage: 0,
  };
};
