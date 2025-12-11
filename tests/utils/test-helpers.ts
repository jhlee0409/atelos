/**
 * 테스트 헬퍼 유틸리티
 * @description 테스트에서 공통으로 사용되는 헬퍼 함수들
 */

import type { AIResponse, PlayerState, ScenarioData, SaveState } from '@/types';
import { mockScenario, mockPlayerStateInitial } from '../fixtures/mock-scenario';

// =============================================================================
// AI Response Generators
// =============================================================================

/**
 * 유효한 AI 응답 생성
 */
export const generateValidAIResponse = (
  overrides?: Partial<AIResponse>
): AIResponse => {
  const baseResponse: AIResponse = {
    log: '박지현이 조심스럽게 문을 열었다. 그 안에는 예상치 못한 광경이 펼쳐져 있었다. 김서연이 옆에서 작은 탄식을 내뱉었다.',
    dilemma: {
      prompt: '중요한 결정의 순간이 다가왔다. 어떻게 하겠는가?',
      choice_a: '신중하게 상황을 살펴본다',
      choice_b: '즉시 행동에 나선다',
      choice_c: '잠시 후퇴하여 대책을 세운다',
    },
    statChanges: {
      scenarioStats: {
        cityChaos: -5,
        resourceLevel: 10,
      },
      survivorStatus: [],
      hiddenRelationships_change: [],
      flags_acquired: [],
    },
  };

  return { ...baseResponse, ...overrides };
};

/**
 * 특정 언어 오염이 있는 AI 응답 생성
 */
export const generateLanguageMixedResponse = (
  language: 'arabic' | 'thai' | 'hindi' | 'cyrillic'
): AIResponse => {
  const contaminations: Record<string, string> = {
    arabic: 'مرحبا العالم',
    thai: 'ภาษาไทย',
    hindi: 'हिंदी',
    cyrillic: 'Русский',
  };

  return {
    log: `박지현이 말했다. ${contaminations[language]} 이상한 소리가 들렸다.`,
    dilemma: {
      prompt: '무엇을 할 것인가?',
      choice_a: '탐색한다',
      choice_b: '대기한다',
    },
    statChanges: {
      scenarioStats: {},
      survivorStatus: [],
      hiddenRelationships_change: [],
      flags_acquired: [],
    },
  };
};

// =============================================================================
// Player State Generators
// =============================================================================

/**
 * 특정 조건의 플레이어 상태 생성
 */
export const generatePlayerState = (
  options: {
    statOverrides?: Partial<PlayerState['stats']>;
    flags?: Record<string, boolean | number>;
    relationships?: Record<string, number>;
  } = {}
): PlayerState => {
  return {
    stats: {
      ...mockPlayerStateInitial.stats,
      ...options.statOverrides,
    },
    flags: options.flags || {},
    traits: [],
    relationships: options.relationships || mockPlayerStateInitial.relationships,
  };
};

/**
 * 극단적 스탯 상태 생성 (엔딩 테스트용)
 */
export const generateExtremePlayerState = (
  type: 'low' | 'high' | 'chaos' | 'peaceful'
): PlayerState => {
  const presets: Record<string, Partial<PlayerState['stats']>> = {
    low: {
      cityChaos: 10,
      communityCohesion: 10,
      survivalFoundation: 10,
      citizenTrust: 10,
      resourceLevel: 10,
    },
    high: {
      cityChaos: 90,
      communityCohesion: 90,
      survivalFoundation: 90,
      citizenTrust: 90,
      resourceLevel: 90,
    },
    chaos: {
      cityChaos: 95,
      communityCohesion: 20,
      survivalFoundation: 30,
      citizenTrust: 15,
      resourceLevel: 15,
    },
    peaceful: {
      cityChaos: 20,
      communityCohesion: 80,
      survivalFoundation: 75,
      citizenTrust: 80,
      resourceLevel: 70,
    },
  };

  return generatePlayerState({ statOverrides: presets[type] });
};

// =============================================================================
// Save State Generators
// =============================================================================

/**
 * SaveState 생성
 */
export const generateSaveState = (
  options: {
    day?: number;
    playerState?: PlayerState;
    scenario?: ScenarioData;
    log?: string;
  } = {}
): SaveState => {
  const scenario = options.scenario || mockScenario;
  const playerState = options.playerState || mockPlayerStateInitial;

  return {
    context: {
      scenarioId: scenario.scenarioId,
      scenarioStats: playerState.stats,
      flags: playerState.flags,
      currentDay: options.day || 1,
      remainingHours: ((options.day || 1) - 1) * 24,
      turnsInCurrentDay: 0,
    },
    community: {
      survivors: scenario.characters.map((c) => ({
        name: c.characterName,
        role: c.roleId,
        traits: c.currentTrait ? [c.currentTrait.id] : [],
        status: 'healthy',
      })),
      hiddenRelationships: playerState.relationships,
    },
    log: options.log || '게임이 시작되었습니다.',
    dilemma: {
      prompt: '첫 번째 결정의 순간입니다.',
      choice_a: '행동한다',
      choice_b: '기다린다',
    },
  };
};

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * AI 응답 구조 검증
 */
export const isValidAIResponseStructure = (response: unknown): response is AIResponse => {
  if (!response || typeof response !== 'object') return false;

  const r = response as AIResponse;

  // 필수 필드 존재 확인
  if (typeof r.log !== 'string') return false;
  if (!r.dilemma || typeof r.dilemma !== 'object') return false;
  if (typeof r.dilemma.prompt !== 'string') return false;
  if (typeof r.dilemma.choice_a !== 'string') return false;
  if (typeof r.dilemma.choice_b !== 'string') return false;
  if (!r.statChanges || typeof r.statChanges !== 'object') return false;

  return true;
};

/**
 * 한국어 비율 계산
 */
export const calculateKoreanRatio = (text: string): number => {
  const koreanPattern = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
  const koreanMatches = text.match(koreanPattern) || [];
  const contentChars = text.replace(/[\s.,!?'"()\-:;]/g, '');

  return contentChars.length > 0 ? koreanMatches.length / contentChars.length : 0;
};

/**
 * 스탯 변화량 유효성 검증
 */
export const validateStatChangeRange = (
  changes: Record<string, number>,
  maxChange: number = 40
): { valid: boolean; violations: string[] } => {
  const violations: string[] = [];

  for (const [statId, change] of Object.entries(changes)) {
    if (Math.abs(change) > maxChange) {
      violations.push(`${statId}: ${change} (max: ±${maxChange})`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
};

// =============================================================================
// Test Result Types
// =============================================================================

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

/**
 * 테스트 스위트 요약 생성
 */
export const createTestSuiteSummary = (results: TestResult[]): TestSuite => {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    name: 'Test Suite',
    results,
    passed,
    failed,
    duration: 0,
  };
};
