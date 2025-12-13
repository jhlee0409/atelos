/**
 * Stage 1: 게임 초기화 (Game Initialization) 테스트
 *
 * 테스트 대상:
 * - createInitialSaveState() 함수의 초기화 로직
 * - getInitialMetCharacters() 함수의 캐릭터 소개 스타일 처리
 * - protagonistKnowledge 배열 병합 로직
 * - characterArcs.trustLevel 초기값 설정
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScenarioData, Character, StoryOpening, SaveState } from '@/types';
import { mockScenario, mockCharacters, mockScenarioStats } from '../fixtures/mock-scenario';

// =============================================================================
// 테스트용 시나리오 빌더 헬퍼
// =============================================================================

/**
 * mockScenario를 기반으로 storyOpening을 커스텀하는 헬퍼
 */
const createScenarioWithStoryOpening = (
  storyOpeningOverrides?: Partial<StoryOpening>
): ScenarioData => {
  return {
    ...mockScenario,
    storyOpening: storyOpeningOverrides
      ? {
          ...storyOpeningOverrides,
        } as StoryOpening
      : undefined,
  };
};

/**
 * 플레이어-캐릭터 관계를 포함하는 시나리오 생성
 */
const createScenarioWithPlayerRelationships = (
  playerRelationships: { characterName: string; value: number }[]
): ScenarioData => {
  // 플레이어 캐릭터 추가
  const playerCharacter: Character = {
    roleId: 'player',
    roleName: '플레이어',
    characterName: '(플레이어)',
    backstory: '플레이어 캐릭터',
    imageUrl: '',
    weightedTraitTypes: [],
    currentTrait: null,
  };

  // initialRelationships에 플레이어 관계 추가
  const relationships = [
    ...mockScenario.initialRelationships,
    ...playerRelationships.map((rel) => ({
      pair: ['(플레이어)', rel.characterName] as [string, string],
      value: rel.value,
    })),
  ];

  return {
    ...mockScenario,
    characters: [playerCharacter, ...mockCharacters],
    initialRelationships: relationships,
  };
};

// =============================================================================
// GameClient의 함수들을 테스트 가능하도록 추출
// (실제로는 GameClient.tsx에서 export해야 하지만, 테스트 우선 작성)
// =============================================================================

/**
 * 초기 만난 캐릭터 목록 생성 (테스트용 복제)
 * 실제 구현: app/game/[scenarioId]/GameClient.tsx:212-246
 */
const getInitialMetCharacters = (scenario: ScenarioData): string[] => {
  const storyOpening = scenario.storyOpening;
  const introStyle = storyOpening?.characterIntroductionStyle || 'contextual';
  const introSequence = storyOpening?.characterIntroductionSequence;
  const firstCharacter = storyOpening?.firstCharacterToMeet;

  // 1. 'immediate' 스타일: 모든 캐릭터를 즉시 만남
  if (introStyle === 'immediate') {
    if (introSequence && introSequence.length > 0) {
      return introSequence
        .sort((a, b) => a.order - b.order)
        .map((s) => s.characterName);
    }
    const npcs = scenario.characters.filter((c) => c.characterName !== '(플레이어)');
    return npcs.map((c) => c.characterName);
  }

  // 2. 'gradual' 스타일: 첫 번째 캐릭터만
  if (introStyle === 'gradual' && introSequence && introSequence.length > 0) {
    const firstInSequence = introSequence.find((s) => s.order === 1);
    if (firstInSequence) {
      return [firstInSequence.characterName];
    }
    // [Stage 1 개선] order=1이 없으면 경고 로그 + 첫 번째 항목 사용
    console.warn(
      `[getInitialMetCharacters] 'gradual' 스타일에서 order=1인 캐릭터가 없습니다. ` +
      `첫 번째 시퀀스 항목을 사용합니다: ${introSequence[0].characterName}`
    );
    return [introSequence[0].characterName];
  }

  // 3. 'contextual' 또는 기본: firstCharacterToMeet 사용
  if (firstCharacter) {
    return [firstCharacter];
  }

  // 4. 폴백: 첫 번째 NPC 캐릭터
  const npcs = scenario.characters.filter((c) => c.characterName !== '(플레이어)');
  return npcs.length > 0 ? [npcs[0].characterName] : [];
};

/**
 * protagonistKnowledge 초기화 with 깊은 배열 병합
 * [Stage 1 개선] 스프레드 연산자 대신 배열 concat 사용
 */
const initializeProtagonistKnowledge = (
  scenario: ScenarioData
): {
  metCharacters: string[];
  discoveredRelationships: string[];
  hintedRelationships: string[];
  informationPieces: { id: string; content: string; source: string; acquiredDay: number }[];
} => {
  const baseMetCharacters = getInitialMetCharacters(scenario);
  const initialKnowledge = scenario.storyOpening?.initialProtagonistKnowledge;

  return {
    // 배열 필드: concat으로 병합 (중복 제거)
    metCharacters: [
      ...new Set([
        ...baseMetCharacters,
        ...(initialKnowledge?.metCharacters || []),
      ]),
    ],
    discoveredRelationships: [
      ...(initialKnowledge?.discoveredRelationships || []),
    ],
    hintedRelationships: [
      ...(initialKnowledge?.hintedRelationships || []),
    ],
    informationPieces: [
      ...(initialKnowledge?.informationPieces || []),
    ],
  };
};

/**
 * characterArcs.trustLevel 초기화
 * [Stage 1 개선] initialRelationships에서 플레이어-캐릭터 관계값 반영
 */
const getInitialTrustLevel = (
  characterName: string,
  scenario: ScenarioData
): number => {
  // initialRelationships에서 플레이어-캐릭터 관계 찾기
  const playerRelation = scenario.initialRelationships.find(
    (rel) =>
      (rel.pair[0] === '(플레이어)' && rel.pair[1] === characterName) ||
      (rel.pair[1] === '(플레이어)' && rel.pair[0] === characterName)
  );

  return playerRelation?.value ?? 0;
};

/**
 * storyOpening 기본값 헬퍼
 * [Stage 1 개선] undefined 케이스 통합 처리
 */
const getStoryOpeningWithDefaults = (
  scenario: ScenarioData
): StoryOpening => {
  const defaults: StoryOpening = {
    characterIntroductionStyle: 'contextual',
    npcRelationshipExposure: 'hidden',
  };

  if (!scenario.storyOpening) {
    return defaults;
  }

  return {
    ...defaults,
    ...scenario.storyOpening,
  };
};

// =============================================================================
// 테스트 케이스
// =============================================================================

describe('Stage 1: 게임 초기화 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // #1 characterArcs.trustLevel 초기값 테스트
  // ---------------------------------------------------------------------------
  describe('#1 characterArcs.trustLevel 초기값', () => {
    it('플레이어-캐릭터 관계가 없으면 trustLevel은 0이어야 함', () => {
      const scenario = mockScenario; // 플레이어 관계 없음
      const trustLevel = getInitialTrustLevel('박지현', scenario);
      expect(trustLevel).toBe(0);
    });

    it('플레이어-캐릭터 관계가 있으면 해당 값을 trustLevel로 사용', () => {
      const scenario = createScenarioWithPlayerRelationships([
        { characterName: '박지현', value: 30 },
        { characterName: '김서연', value: -20 },
      ]);

      expect(getInitialTrustLevel('박지현', scenario)).toBe(30);
      expect(getInitialTrustLevel('김서연', scenario)).toBe(-20);
      expect(getInitialTrustLevel('이동훈', scenario)).toBe(0); // 관계 없음
    });

    it('관계 배열 순서에 관계없이 정확히 찾아야 함', () => {
      // pair가 [캐릭터, 플레이어] 순서인 경우도 처리
      const scenario: ScenarioData = {
        ...mockScenario,
        initialRelationships: [
          ...mockScenario.initialRelationships,
          { pair: ['박지현', '(플레이어)'], value: 45 }, // 역순
        ],
      };

      expect(getInitialTrustLevel('박지현', scenario)).toBe(45);
    });
  });

  // ---------------------------------------------------------------------------
  // #2 initialProtagonistKnowledge 배열 깊은 병합 테스트
  // ---------------------------------------------------------------------------
  describe('#2 initialProtagonistKnowledge 배열 병합', () => {
    it('시나리오에 initialProtagonistKnowledge가 없으면 기본값 사용', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
      });

      const knowledge = initializeProtagonistKnowledge(scenario);

      expect(knowledge.metCharacters).toContain('박지현');
      expect(knowledge.discoveredRelationships).toEqual([]);
      expect(knowledge.hintedRelationships).toEqual([]);
      expect(knowledge.informationPieces).toEqual([]);
    });

    it('metCharacters는 기본값과 시나리오 값을 concat 병합', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        initialProtagonistKnowledge: {
          metCharacters: ['김서연', '이동훈'], // 추가 캐릭터
        },
      });

      const knowledge = initializeProtagonistKnowledge(scenario);

      // 기본(박지현) + 시나리오(김서연, 이동훈) = 3명
      expect(knowledge.metCharacters).toHaveLength(3);
      expect(knowledge.metCharacters).toContain('박지현');
      expect(knowledge.metCharacters).toContain('김서연');
      expect(knowledge.metCharacters).toContain('이동훈');
    });

    it('metCharacters 중복은 제거되어야 함', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        initialProtagonistKnowledge: {
          metCharacters: ['박지현', '김서연'], // 박지현 중복
        },
      });

      const knowledge = initializeProtagonistKnowledge(scenario);

      // 중복 제거로 2명만
      expect(knowledge.metCharacters).toHaveLength(2);
      expect(knowledge.metCharacters.filter((c) => c === '박지현')).toHaveLength(1);
    });

    it('informationPieces는 시나리오 값을 그대로 사용', () => {
      const initialInfoPieces = [
        { id: 'info-1', content: '초기 정보 1', source: 'prologue', acquiredDay: 1 },
        { id: 'info-2', content: '초기 정보 2', source: 'prologue', acquiredDay: 1 },
      ];

      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        initialProtagonistKnowledge: {
          informationPieces: initialInfoPieces,
        },
      });

      const knowledge = initializeProtagonistKnowledge(scenario);

      expect(knowledge.informationPieces).toHaveLength(2);
      expect(knowledge.informationPieces[0].content).toBe('초기 정보 1');
    });

    it('hintedRelationships는 시나리오 값을 그대로 사용', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        initialProtagonistKnowledge: {
          hintedRelationships: ['rel-1', 'rel-2'],
        },
      });

      const knowledge = initializeProtagonistKnowledge(scenario);

      expect(knowledge.hintedRelationships).toEqual(['rel-1', 'rel-2']);
    });
  });

  // ---------------------------------------------------------------------------
  // #3 'gradual' 스타일 fallback 로직 테스트
  // ---------------------------------------------------------------------------
  describe('#3 gradual 스타일 fallback 로직', () => {
    it('order=1인 캐릭터가 있으면 해당 캐릭터 반환', () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'gradual',
        characterIntroductionSequence: [
          { characterName: '김서연', order: 2, encounterContext: '의료실에서' },
          { characterName: '박지현', order: 1, encounterContext: '복도에서' },
        ],
      });

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['박지현']);
    });

    it('order=1이 없으면 첫 번째 시퀀스 항목 반환 + 경고 로그', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'gradual',
        characterIntroductionSequence: [
          { characterName: '김서연', order: 2, encounterContext: '의료실에서' },
          { characterName: '이동훈', order: 3, encounterContext: '옥상에서' },
        ],
      });

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['김서연']); // 첫 번째 항목
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("'gradual' 스타일에서 order=1인 캐릭터가 없습니다")
      );

      warnSpy.mockRestore();
    });

    it('introSequence가 빈 배열이면 firstCharacterToMeet fallback', () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'gradual',
        characterIntroductionSequence: [],
        firstCharacterToMeet: '박지현',
      });

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['박지현']);
    });

    it('introSequence도 없고 firstCharacterToMeet도 없으면 첫 NPC 사용', () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'gradual',
        // characterIntroductionSequence 없음
        // firstCharacterToMeet 없음
      });

      const met = getInitialMetCharacters(scenario);

      // mockScenario.characters의 첫 번째 NPC
      expect(met).toEqual(['박지현']);
    });
  });

  // ---------------------------------------------------------------------------
  // #4 storyOpening undefined 통합 폴백 테스트
  // ---------------------------------------------------------------------------
  describe('#4 storyOpening undefined 통합 폴백', () => {
    it('storyOpening이 undefined면 기본값 반환', () => {
      const scenario: ScenarioData = {
        ...mockScenario,
        storyOpening: undefined,
      };

      const opening = getStoryOpeningWithDefaults(scenario);

      expect(opening.characterIntroductionStyle).toBe('contextual');
      expect(opening.npcRelationshipExposure).toBe('hidden');
    });

    it('storyOpening이 부분적으로 정의되면 나머지는 기본값으로 채움', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        // characterIntroductionStyle 미정의
      });

      const opening = getStoryOpeningWithDefaults(scenario);

      expect(opening.firstCharacterToMeet).toBe('박지현');
      expect(opening.characterIntroductionStyle).toBe('contextual'); // 기본값
    });

    it('storyOpening이 완전히 정의되면 그대로 사용', () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'immediate',
        npcRelationshipExposure: 'visible',
        firstCharacterToMeet: '김서연',
      });

      const opening = getStoryOpeningWithDefaults(scenario);

      expect(opening.characterIntroductionStyle).toBe('immediate');
      expect(opening.npcRelationshipExposure).toBe('visible');
      expect(opening.firstCharacterToMeet).toBe('김서연');
    });
  });

  // ---------------------------------------------------------------------------
  // characterIntroductionStyle 전체 분기 테스트
  // ---------------------------------------------------------------------------
  describe('characterIntroductionStyle 전체 분기', () => {
    it("'immediate' - introSequence 있으면 전체 반환 (순서대로)", () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'immediate',
        characterIntroductionSequence: [
          { characterName: '이동훈', order: 3, encounterContext: '옥상' },
          { characterName: '박지현', order: 1, encounterContext: '복도' },
          { characterName: '김서연', order: 2, encounterContext: '의료실' },
        ],
      });

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['박지현', '김서연', '이동훈']); // order 순서
    });

    it("'immediate' - introSequence 없으면 모든 NPC 반환", () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'immediate',
        // characterIntroductionSequence 없음
      });

      const met = getInitialMetCharacters(scenario);

      // mockCharacters의 모든 캐릭터 (플레이어 제외)
      expect(met).toHaveLength(3);
      expect(met).toContain('박지현');
      expect(met).toContain('김서연');
      expect(met).toContain('이동훈');
    });

    it("'contextual' - firstCharacterToMeet 사용", () => {
      const scenario = createScenarioWithStoryOpening({
        characterIntroductionStyle: 'contextual',
        firstCharacterToMeet: '김서연',
      });

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['김서연']);
    });

    it('기본값 (storyOpening 없음) - 첫 NPC 사용', () => {
      const scenario: ScenarioData = {
        ...mockScenario,
        storyOpening: undefined,
      };

      const met = getInitialMetCharacters(scenario);

      expect(met).toEqual(['박지현']); // 첫 NPC
    });
  });
});
