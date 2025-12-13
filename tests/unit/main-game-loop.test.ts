/**
 * Stage 3: 메인 게임 루프 (Main Game Loop) 테스트
 *
 * 테스트 대상:
 * - handleDialogueSelect에서 metCharacters 자동 추가
 * - keyDecisions 대화 기록 (infoGained 있을 때)
 * - keyDecisions 탐색 기록 (발견물 있을 때)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  SaveState,
  ScenarioData,
  KeyDecision,
  ProtagonistKnowledge,
  ConcreteDiscovery,
} from '@/types';
import { mockScenario, mockCharacters } from '../fixtures/mock-scenario';

// =============================================================================
// 테스트용 헬퍼 함수 (실제 GameClient.tsx 로직 추출)
// =============================================================================

/**
 * [Stage 3 개선 #1] 대화 후 metCharacters 자동 추가
 * 대화한 캐릭터가 metCharacters에 없으면 추가
 */
const addToMetCharactersAfterDialogue = (
  protagonistKnowledge: ProtagonistKnowledge,
  characterName: string
): ProtagonistKnowledge => {
  const currentMetCharacters = protagonistKnowledge.metCharacters || [];

  // 이미 포함되어 있으면 변경 없음
  if (currentMetCharacters.includes(characterName)) {
    return protagonistKnowledge;
  }

  // 새 캐릭터 추가
  return {
    ...protagonistKnowledge,
    metCharacters: [...currentMetCharacters, characterName],
  };
};

/**
 * [Stage 3 개선 #2] 대화에서 중요 정보 획득 시 keyDecision 생성
 */
const createDialogueKeyDecision = (
  characterName: string,
  topicLabel: string,
  infoGained: string,
  currentDay: number,
  turn: number
): KeyDecision => {
  return {
    day: currentDay,
    turn,
    choice: `[${characterName}와 대화] ${topicLabel}`,
    consequence: infoGained.slice(0, 50),
    category: 'relationship',
    impactedCharacters: [characterName],
  };
};

/**
 * [Stage 3 개선 #2] 탐색에서 발견물이 있을 때 keyDecision 생성
 */
const createExplorationKeyDecision = (
  locationName: string,
  discoveries: ConcreteDiscovery[],
  currentDay: number,
  turn: number
): KeyDecision => {
  const discoveryNames = discoveries.map((d) => d.name).join(', ');
  return {
    day: currentDay,
    turn,
    choice: `[${locationName} 탐색]`,
    consequence: `발견: ${discoveryNames}`.slice(0, 50),
    category: 'strategic',
    impactedCharacters: [],
  };
};

/**
 * keyDecisions에 새 결정 추가 (최대 20개 유지)
 */
const addKeyDecision = (
  keyDecisions: KeyDecision[],
  newDecision: KeyDecision
): KeyDecision[] => {
  const updated = [...keyDecisions, newDecision];
  // 최대 20개 유지
  if (updated.length > 20) {
    updated.shift();
  }
  return updated;
};

// =============================================================================
// 테스트용 헬퍼 - SaveState 생성
// =============================================================================

const createBaseSaveState = (overrides?: Partial<SaveState>): SaveState => ({
  context: {
    scenarioStats: {},
    flags: {},
    currentDay: 1,
    remainingHours: 24,
    actionPoints: 3,
    maxActionPoints: 3,
    turnsInCurrentDay: 0,
    actionsThisDay: [],
    protagonistKnowledge: {
      metCharacters: ['박지현'],
      informationPieces: [],
      hintedRelationships: [],
    },
    actionContext: {
      currentSituation: '초기 상황',
      todayActions: { choices: [], dialogues: [], explorations: [] },
    },
  },
  community: {
    survivors: [],
    hiddenRelationships: {},
    survivors_alive: 0,
  },
  characterArcs: [
    {
      characterName: '박지현',
      currentMood: 'determined',
      trustLevel: 0,
      moments: [],
    },
    {
      characterName: '김태호',
      currentMood: 'anxious',
      trustLevel: 0,
      moments: [],
    },
  ],
  chatHistory: [],
  keyDecisions: [],
  dilemma: {
    prompt: '테스트 상황',
    choice_a: '선택 A',
    choice_b: '선택 B',
  },
  ...overrides,
});

// =============================================================================
// 테스트
// =============================================================================

describe('Stage 3: 메인 게임 루프 개선', () => {
  describe('#1 handleDialogueSelect metCharacters 자동 추가', () => {
    it('대화한 캐릭터가 metCharacters에 없으면 자동으로 추가된다', () => {
      const protagonistKnowledge: ProtagonistKnowledge = {
        metCharacters: ['박지현'],
        informationPieces: [],
        hintedRelationships: [],
      };

      const updated = addToMetCharactersAfterDialogue(
        protagonistKnowledge,
        '김태호'
      );

      expect(updated.metCharacters).toContain('김태호');
      expect(updated.metCharacters).toContain('박지현');
      expect(updated.metCharacters).toHaveLength(2);
    });

    it('이미 metCharacters에 있는 캐릭터는 중복 추가되지 않는다', () => {
      const protagonistKnowledge: ProtagonistKnowledge = {
        metCharacters: ['박지현', '김태호'],
        informationPieces: [],
        hintedRelationships: [],
      };

      const updated = addToMetCharactersAfterDialogue(
        protagonistKnowledge,
        '김태호'
      );

      expect(updated.metCharacters).toHaveLength(2);
      expect(updated).toBe(protagonistKnowledge); // 객체 동일성 (변경 없음)
    });

    it('metCharacters가 빈 배열일 때도 정상 동작한다', () => {
      const protagonistKnowledge: ProtagonistKnowledge = {
        metCharacters: [],
        informationPieces: [],
        hintedRelationships: [],
      };

      const updated = addToMetCharactersAfterDialogue(
        protagonistKnowledge,
        '김태호'
      );

      expect(updated.metCharacters).toEqual(['김태호']);
    });

    it('metCharacters가 undefined일 때도 정상 동작한다', () => {
      const protagonistKnowledge: ProtagonistKnowledge = {
        metCharacters: undefined as unknown as string[],
        informationPieces: [],
        hintedRelationships: [],
      };

      const updated = addToMetCharactersAfterDialogue(
        protagonistKnowledge,
        '김태호'
      );

      expect(updated.metCharacters).toEqual(['김태호']);
    });
  });

  describe('#2 keyDecisions 대화 기록', () => {
    it('infoGained가 있으면 keyDecision이 생성된다', () => {
      const decision = createDialogueKeyDecision(
        '김태호',
        '상황 정보 요청',
        '감염자들이 북쪽 출입구를 완전히 점령했다는 것을 알게 되었다.',
        2,
        3
      );

      expect(decision).toEqual({
        day: 2,
        turn: 3,
        choice: '[김태호와 대화] 상황 정보 요청',
        consequence: '감염자들이 북쪽 출입구를 완전히 점령했다는 것을 알게 되었다.'.slice(0, 50),
        category: 'relationship',
        impactedCharacters: ['김태호'],
      });
    });

    it('consequence는 50자로 제한된다', () => {
      const longInfo = '이것은 매우 긴 정보입니다. '.repeat(10);
      const decision = createDialogueKeyDecision(
        '박지현',
        '조언 구하기',
        longInfo,
        1,
        1
      );

      expect(decision.consequence.length).toBeLessThanOrEqual(50);
    });

    it('keyDecisions 배열에 새 결정이 추가된다', () => {
      const keyDecisions: KeyDecision[] = [];
      const newDecision = createDialogueKeyDecision(
        '김태호',
        '정보 요청',
        '중요한 정보',
        1,
        1
      );

      const updated = addKeyDecision(keyDecisions, newDecision);

      expect(updated).toHaveLength(1);
      expect(updated[0]).toBe(newDecision);
    });
  });

  describe('#2 keyDecisions 탐색 기록', () => {
    it('발견물이 있으면 keyDecision이 생성된다', () => {
      const discoveries: ConcreteDiscovery[] = [
        {
          id: 'item_1',
          type: 'item',
          name: '손전등',
          description: '밝은 손전등',
          isObtained: true,
        },
        {
          id: 'clue_1',
          type: 'clue',
          name: '혈흔',
          description: '바닥의 혈흔',
          isObtained: false,
        },
      ];

      const decision = createExplorationKeyDecision(
        '창고',
        discoveries,
        3,
        2
      );

      expect(decision).toEqual({
        day: 3,
        turn: 2,
        choice: '[창고 탐색]',
        consequence: '발견: 손전등, 혈흔',
        category: 'strategic',
        impactedCharacters: [],
      });
    });

    it('발견물 이름이 길면 consequence가 50자로 제한된다', () => {
      const discoveries: ConcreteDiscovery[] = [
        {
          id: 'item_1',
          type: 'item',
          name: '매우 긴 이름의 아이템 번호 1',
          description: '',
          isObtained: true,
        },
        {
          id: 'item_2',
          type: 'item',
          name: '매우 긴 이름의 아이템 번호 2',
          description: '',
          isObtained: true,
        },
        {
          id: 'item_3',
          type: 'item',
          name: '매우 긴 이름의 아이템 번호 3',
          description: '',
          isObtained: true,
        },
      ];

      const decision = createExplorationKeyDecision(
        '지하실',
        discoveries,
        1,
        1
      );

      expect(decision.consequence.length).toBeLessThanOrEqual(50);
    });

    it('빈 발견물 배열이면 빈 발견 문자열이 된다', () => {
      const decision = createExplorationKeyDecision('옥상', [], 5, 1);

      expect(decision.consequence).toBe('발견: ');
    });
  });

  describe('keyDecisions 최대 개수 유지', () => {
    it('20개 초과 시 가장 오래된 결정이 제거된다', () => {
      const keyDecisions: KeyDecision[] = Array.from({ length: 20 }, (_, i) => ({
        day: 1,
        turn: i,
        choice: `선택 ${i}`,
        consequence: `결과 ${i}`,
        category: 'survival' as const,
        impactedCharacters: [],
      }));

      const newDecision: KeyDecision = {
        day: 2,
        turn: 0,
        choice: '새로운 선택',
        consequence: '새로운 결과',
        category: 'strategic',
        impactedCharacters: [],
      };

      const updated = addKeyDecision(keyDecisions, newDecision);

      expect(updated).toHaveLength(20);
      expect(updated[0].choice).toBe('선택 1'); // 가장 오래된 '선택 0'이 제거됨
      expect(updated[19].choice).toBe('새로운 선택');
    });
  });

  describe('통합 테스트: 대화 후 상태 업데이트', () => {
    it('대화 후 metCharacters와 keyDecisions가 모두 업데이트된다', () => {
      const saveState = createBaseSaveState();
      const characterName = '김태호';
      const topicLabel = '상황 정보';
      const infoGained = '북쪽 출입구가 막혔다는 정보';
      const currentDay = 1;
      const turn = 1;

      // metCharacters 업데이트
      const updatedKnowledge = addToMetCharactersAfterDialogue(
        saveState.context.protagonistKnowledge!,
        characterName
      );

      // keyDecisions 업데이트
      const newDecision = createDialogueKeyDecision(
        characterName,
        topicLabel,
        infoGained,
        currentDay,
        turn
      );
      const updatedKeyDecisions = addKeyDecision(
        saveState.keyDecisions || [],
        newDecision
      );

      // 검증
      expect(updatedKnowledge.metCharacters).toContain(characterName);
      expect(updatedKeyDecisions).toHaveLength(1);
      expect(updatedKeyDecisions[0].choice).toContain(characterName);
      expect(updatedKeyDecisions[0].consequence).toBe(infoGained.slice(0, 50));
    });
  });
});
