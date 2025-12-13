/**
 * Stage 2: 스토리 오프닝 (Story Opening) 테스트
 *
 * 테스트 대상:
 * - 오프닝 완료 후 protagonistKnowledge 업데이트
 * - 오프닝 완료 후 characterArcs 첫 만남 moment 기록
 * - 오프닝 완료 후 actionContext 업데이트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  SaveState,
  ScenarioData,
  CharacterArc,
  CharacterMoment,
  ActionContext,
  StoryOpening,
} from '@/types';
import { mockScenario, mockCharacters } from '../fixtures/mock-scenario';

// =============================================================================
// 테스트용 헬퍼 함수 (실제 GameClient.tsx 로직 추출)
// =============================================================================

interface StoryOpeningResult {
  prologue?: string;
  incitingIncident?: string;
  firstEncounter?: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
    choice_c?: string;
  };
  fullLog: string;
}

/**
 * 오프닝에서 첫 만남 캐릭터 결정
 */
const getFirstMeetCharacter = (scenario: ScenarioData): string | undefined => {
  const introSequence = scenario.storyOpening?.characterIntroductionSequence;
  const firstInSequence = introSequence?.find((s) => s.order === 1);
  return firstInSequence?.characterName || scenario.storyOpening?.firstCharacterToMeet;
};

/**
 * [Stage 2 개선 #1] characterArcs에 첫 만남 moment 추가
 */
const addFirstEncounterMoment = (
  characterArcs: CharacterArc[],
  characterName: string
): CharacterArc[] => {
  return characterArcs.map((arc) => {
    if (arc.characterName === characterName) {
      const firstEncounterMoment: CharacterMoment = {
        day: 1,
        type: 'relationship',
        description: `${characterName}과(와) 처음 만났다.`,
        relatedCharacter: '(플레이어)',
        impact: 'positive',
      };
      return {
        ...arc,
        moments: [...arc.moments, firstEncounterMoment],
      };
    }
    return arc;
  });
};

/**
 * [Stage 2 개선 #2] actionContext 오프닝 반영
 */
const updateActionContextForOpening = (
  actionContext: ActionContext,
  storyOpening: StoryOpeningResult,
  firstCharacterName?: string
): ActionContext => {
  const updatedContext = {
    ...actionContext,
    // 현재 상황을 오프닝 상황으로 업데이트
    currentSituation: storyOpening.incitingIncident || actionContext.currentSituation,
  };

  // 첫 만남 캐릭터가 있으면 대화 기록 추가
  if (firstCharacterName) {
    updatedContext.todayActions = {
      ...actionContext.todayActions,
      dialogues: [
        ...(actionContext.todayActions?.dialogues || []),
        {
          characterName: firstCharacterName,
          topic: 'first_encounter',
        },
      ],
    };
  }

  return updatedContext;
};

/**
 * protagonistKnowledge 업데이트 (이미 구현됨 - 검증용)
 */
const updateProtagonistKnowledgeForOpening = (
  currentKnowledge: SaveState['context']['protagonistKnowledge'],
  characterName: string
): SaveState['context']['protagonistKnowledge'] => {
  const metCharacters = currentKnowledge?.metCharacters || [];
  const informationPieces = currentKnowledge?.informationPieces || [];

  // 이미 포함되어 있으면 스킵
  const updatedMetCharacters = metCharacters.includes(characterName)
    ? metCharacters
    : [...metCharacters, characterName];

  const newInfoPiece = {
    id: `opening_meet_${characterName}`,
    content: `${characterName}을(를) 처음 만났다.`,
    source: 'story_opening',
    acquiredDay: 1,
  };

  return {
    ...currentKnowledge,
    metCharacters: updatedMetCharacters,
    discoveredRelationships: currentKnowledge?.discoveredRelationships || [],
    hintedRelationships: currentKnowledge?.hintedRelationships || [],
    informationPieces: [...informationPieces, newInfoPiece],
  };
};

// =============================================================================
// 테스트용 시나리오/상태 빌더
// =============================================================================

const createScenarioWithStoryOpening = (
  storyOpeningOverrides?: Partial<StoryOpening>
): ScenarioData => {
  return {
    ...mockScenario,
    storyOpening: {
      firstCharacterToMeet: '박지현',
      ...storyOpeningOverrides,
    } as StoryOpening,
  };
};

const createMockStoryOpeningResult = (overrides?: Partial<StoryOpeningResult>): StoryOpeningResult => ({
  prologue: '평화로운 일상이 시작되었다.',
  incitingIncident: '갑자기 폭발음이 들렸다.',
  firstEncounter: '박지현이 다가왔다. "괜찮아요?"',
  dilemma: {
    prompt: '어떻게 할 것인가?',
    choice_a: '대화한다',
    choice_b: '경계한다',
    choice_c: '상황을 관찰한다',
  },
  fullLog: '평화로운 일상이 시작되었다. 갑자기 폭발음이 들렸다. 박지현이 다가왔다. "괜찮아요?"',
  ...overrides,
});

const createInitialCharacterArcs = (): CharacterArc[] => [
  {
    characterName: '박지현',
    moments: [],
    currentMood: 'anxious',
    trustLevel: 0,
  },
  {
    characterName: '김서연',
    moments: [],
    currentMood: 'anxious',
    trustLevel: 0,
  },
  {
    characterName: '이동훈',
    moments: [],
    currentMood: 'anxious',
    trustLevel: 0,
  },
];

const createInitialActionContext = (): ActionContext => ({
  currentLocation: '본부',
  currentSituation: '게임이 시작되었다.',
  todayActions: {
    explorations: [],
    dialogues: [],
    choices: [],
  },
  discoveredClues: [],
  urgentMatters: [],
  characterPresences: [],
  availableLocations: [],
  lastUpdated: { day: 1, actionIndex: 0 },
});

// =============================================================================
// 테스트 케이스
// =============================================================================

describe('Stage 2: 스토리 오프닝 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 첫 만남 캐릭터 결정 테스트
  // ---------------------------------------------------------------------------
  describe('첫 만남 캐릭터 결정', () => {
    it('characterIntroductionSequence order=1 우선', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '김서연',
        characterIntroductionSequence: [
          { characterName: '박지현', order: 1, encounterContext: '복도에서' },
          { characterName: '김서연', order: 2, encounterContext: '의료실에서' },
        ],
      });

      const firstChar = getFirstMeetCharacter(scenario);
      expect(firstChar).toBe('박지현');
    });

    it('introSequence 없으면 firstCharacterToMeet 사용', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '김서연',
        // characterIntroductionSequence 없음
      });

      const firstChar = getFirstMeetCharacter(scenario);
      expect(firstChar).toBe('김서연');
    });

    it('둘 다 없으면 undefined 반환', () => {
      const scenario: ScenarioData = {
        ...mockScenario,
        storyOpening: {
          // firstCharacterToMeet 없음
          // characterIntroductionSequence 없음
        } as StoryOpening,
      };

      const firstChar = getFirstMeetCharacter(scenario);
      expect(firstChar).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // #1 characterArcs 첫 만남 moment 테스트
  // ---------------------------------------------------------------------------
  describe('#1 characterArcs 첫 만남 moment', () => {
    it('첫 만남 캐릭터에 relationship moment 추가', () => {
      const arcs = createInitialCharacterArcs();
      const updatedArcs = addFirstEncounterMoment(arcs, '박지현');

      const parkArc = updatedArcs.find((a) => a.characterName === '박지현');
      expect(parkArc?.moments).toHaveLength(1);
      expect(parkArc?.moments[0]).toEqual({
        day: 1,
        type: 'relationship',
        description: '박지현과(와) 처음 만났다.',
        relatedCharacter: '(플레이어)',
        impact: 'positive',
      });
    });

    it('다른 캐릭터 arc는 변경되지 않음', () => {
      const arcs = createInitialCharacterArcs();
      const updatedArcs = addFirstEncounterMoment(arcs, '박지현');

      const kimArc = updatedArcs.find((a) => a.characterName === '김서연');
      const leeArc = updatedArcs.find((a) => a.characterName === '이동훈');

      expect(kimArc?.moments).toHaveLength(0);
      expect(leeArc?.moments).toHaveLength(0);
    });

    it('존재하지 않는 캐릭터 이름은 무시됨', () => {
      const arcs = createInitialCharacterArcs();
      const updatedArcs = addFirstEncounterMoment(arcs, '없는캐릭터');

      // 모든 arc가 변경되지 않음
      expect(updatedArcs.every((a) => a.moments.length === 0)).toBe(true);
    });

    it('이미 moment가 있는 arc에 추가됨', () => {
      const arcs = createInitialCharacterArcs();
      // 기존 moment 추가
      arcs[0].moments.push({
        day: 1,
        type: 'status',
        description: '기존 이벤트',
        impact: 'neutral',
      });

      const updatedArcs = addFirstEncounterMoment(arcs, '박지현');

      const parkArc = updatedArcs.find((a) => a.characterName === '박지현');
      expect(parkArc?.moments).toHaveLength(2);
      expect(parkArc?.moments[1].type).toBe('relationship');
    });
  });

  // ---------------------------------------------------------------------------
  // #2 actionContext 오프닝 반영 테스트
  // ---------------------------------------------------------------------------
  describe('#2 actionContext 오프닝 반영', () => {
    it('currentSituation이 incitingIncident로 업데이트됨', () => {
      const context = createInitialActionContext();
      const storyOpening = createMockStoryOpeningResult({
        incitingIncident: '갑자기 사이렌이 울렸다.',
      });

      const updated = updateActionContextForOpening(context, storyOpening, '박지현');

      expect(updated.currentSituation).toBe('갑자기 사이렌이 울렸다.');
    });

    it('incitingIncident 없으면 기존 currentSituation 유지', () => {
      const context = createInitialActionContext();
      context.currentSituation = '기존 상황';
      const storyOpening = createMockStoryOpeningResult({
        incitingIncident: undefined,
      });

      const updated = updateActionContextForOpening(context, storyOpening, '박지현');

      expect(updated.currentSituation).toBe('기존 상황');
    });

    it('todayActions.dialogues에 첫 만남 기록 추가', () => {
      const context = createInitialActionContext();
      const storyOpening = createMockStoryOpeningResult();

      const updated = updateActionContextForOpening(context, storyOpening, '박지현');

      expect(updated.todayActions?.dialogues).toHaveLength(1);
      expect(updated.todayActions?.dialogues?.[0]).toEqual({
        characterName: '박지현',
        topic: 'first_encounter',
      });
    });

    it('firstCharacterName 없으면 dialogues 추가 안됨', () => {
      const context = createInitialActionContext();
      const storyOpening = createMockStoryOpeningResult();

      const updated = updateActionContextForOpening(context, storyOpening, undefined);

      expect(updated.todayActions?.dialogues).toHaveLength(0);
    });

    it('기존 dialogues가 있으면 추가됨', () => {
      const context = createInitialActionContext();
      context.todayActions = {
        ...context.todayActions,
        dialogues: [{ characterName: '기존캐릭터', topic: 'info' }],
      };
      const storyOpening = createMockStoryOpeningResult();

      const updated = updateActionContextForOpening(context, storyOpening, '박지현');

      expect(updated.todayActions?.dialogues).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // protagonistKnowledge 업데이트 테스트 (기존 구현 검증)
  // ---------------------------------------------------------------------------
  describe('protagonistKnowledge 업데이트 (기존 구현 검증)', () => {
    it('metCharacters에 새 캐릭터 추가', () => {
      const knowledge = {
        metCharacters: ['김서연'],
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [],
      };

      const updated = updateProtagonistKnowledgeForOpening(knowledge, '박지현');

      expect(updated.metCharacters).toContain('박지현');
      expect(updated.metCharacters).toContain('김서연');
      expect(updated.metCharacters).toHaveLength(2);
    });

    it('이미 있는 캐릭터는 중복 추가 안됨', () => {
      const knowledge = {
        metCharacters: ['박지현'],
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [],
      };

      const updated = updateProtagonistKnowledgeForOpening(knowledge, '박지현');

      expect(updated.metCharacters?.filter((c) => c === '박지현')).toHaveLength(1);
    });

    it('informationPieces에 첫 만남 정보 추가', () => {
      const knowledge = {
        metCharacters: [],
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [],
      };

      const updated = updateProtagonistKnowledgeForOpening(knowledge, '박지현');

      expect(updated.informationPieces).toHaveLength(1);
      expect(updated.informationPieces?.[0].id).toBe('opening_meet_박지현');
      expect(updated.informationPieces?.[0].source).toBe('story_opening');
    });

    it('기존 informationPieces 유지하면서 추가', () => {
      const knowledge = {
        metCharacters: [],
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [
          { id: 'existing', content: '기존 정보', source: 'test', acquiredDay: 1 },
        ],
      };

      const updated = updateProtagonistKnowledgeForOpening(knowledge, '박지현');

      expect(updated.informationPieces).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 통합 테스트
  // ---------------------------------------------------------------------------
  describe('통합 테스트', () => {
    it('전체 오프닝 완료 후 상태 업데이트 흐름', () => {
      const scenario = createScenarioWithStoryOpening({
        firstCharacterToMeet: '박지현',
        characterIntroductionSequence: [
          { characterName: '박지현', order: 1, encounterContext: '복도에서' },
        ],
      });
      const storyOpening = createMockStoryOpeningResult();
      const initialArcs = createInitialCharacterArcs();
      const initialContext = createInitialActionContext();
      const initialKnowledge = {
        metCharacters: [],
        discoveredRelationships: [],
        hintedRelationships: [],
        informationPieces: [],
      };

      // 1. 첫 만남 캐릭터 결정
      const firstChar = getFirstMeetCharacter(scenario);
      expect(firstChar).toBe('박지현');

      // 2. protagonistKnowledge 업데이트
      const updatedKnowledge = updateProtagonistKnowledgeForOpening(initialKnowledge, firstChar!);
      expect(updatedKnowledge.metCharacters).toContain('박지현');

      // 3. characterArcs 업데이트
      const updatedArcs = addFirstEncounterMoment(initialArcs, firstChar!);
      const parkArc = updatedArcs.find((a) => a.characterName === '박지현');
      expect(parkArc?.moments).toHaveLength(1);

      // 4. actionContext 업데이트
      const updatedContext = updateActionContextForOpening(initialContext, storyOpening, firstChar);
      expect(updatedContext.currentSituation).toBe(storyOpening.incitingIncident);
      expect(updatedContext.todayActions?.dialogues?.[0].characterName).toBe('박지현');
    });
  });
});
