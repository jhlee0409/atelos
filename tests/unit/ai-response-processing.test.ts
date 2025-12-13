/**
 * Stage 4: AI 응답 처리 (AI Response Processing) 테스트
 *
 * 테스트 대상:
 * - NPC 관계 힌트 감지 (hidden → hinted)
 * - 힌트 → 공개 전환 (hinted → revealed)
 * - discoveredRelationships 업데이트
 * - 명시적 관계 키워드 감지
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  NPCRelationshipState,
  HiddenNPCRelationship,
  ProtagonistKnowledge,
} from '@/types';

// =============================================================================
// 테스트용 헬퍼 함수 (실제 GameClient.tsx 로직 추출)
// =============================================================================

// 명시적 관계 키워드 목록
const RELATIONSHIP_KEYWORDS = [
  '사이',
  '관계',
  '실은',
  '알고 보니',
  '형제',
  '자매',
  '부모',
  '연인',
  '친구였',
  '적이었',
  '동료였',
  '원수',
  '가족',
  '부부',
];

/**
 * 서사에서 명시적 관계 키워드 감지
 */
const hasExplicitRelationshipKeyword = (narrative: string): boolean => {
  return RELATIONSHIP_KEYWORDS.some((keyword) => narrative.includes(keyword));
};

/**
 * [Stage 4 개선 #1, #2] NPC 관계 상태 업데이트
 * - hidden → hinted: 두 캐릭터 동시 언급
 * - hinted → revealed: 재언급 또는 명시적 키워드
 * - revealed 시 discoveredRelationships 추가
 */
const updateNPCRelationshipVisibility = (
  npcRelationshipStates: NPCRelationshipState[],
  hiddenRelationships: HiddenNPCRelationship[],
  protagonistKnowledge: ProtagonistKnowledge,
  narrative: string
): {
  updatedStates: NPCRelationshipState[];
  updatedKnowledge: ProtagonistKnowledge;
} => {
  const updatedStates = [...npcRelationshipStates];
  const updatedKnowledge = {
    ...protagonistKnowledge,
    hintedRelationships: [...(protagonistKnowledge.hintedRelationships || [])],
    discoveredRelationships: [...(protagonistKnowledge.discoveredRelationships || [])],
  };

  const hasExplicitKeyword = hasExplicitRelationshipKeyword(narrative);

  hiddenRelationships.forEach((rel) => {
    const relStateIndex = updatedStates.findIndex(
      (r) => r.relationId === rel.relationId
    );
    if (relStateIndex === -1) return;

    const relState = updatedStates[relStateIndex];
    const relatedChars = rel.relationId.split('-');
    const bothMentioned =
      relatedChars.length >= 2 &&
      relatedChars.every((charName) => narrative.includes(charName));

    if (!bothMentioned) return;

    if (relState.visibility === 'hidden') {
      // hidden → hinted (또는 명시적 키워드 시 바로 revealed)
      if (hasExplicitKeyword) {
        updatedStates[relStateIndex] = {
          ...relState,
          visibility: 'revealed',
        };
        // discoveredRelationships에 추가
        if (!updatedKnowledge.discoveredRelationships.includes(rel.relationId)) {
          updatedKnowledge.discoveredRelationships.push(rel.relationId);
        }
      } else {
        updatedStates[relStateIndex] = {
          ...relState,
          visibility: 'hinted',
        };
        // hintedRelationships에 추가
        if (!updatedKnowledge.hintedRelationships.includes(rel.relationId)) {
          updatedKnowledge.hintedRelationships.push(rel.relationId);
        }
      }
    } else if (relState.visibility === 'hinted') {
      // hinted → revealed (재언급 또는 명시적 키워드)
      updatedStates[relStateIndex] = {
        ...relState,
        visibility: 'revealed',
      };
      // hintedRelationships에서 제거, discoveredRelationships에 추가
      updatedKnowledge.hintedRelationships = updatedKnowledge.hintedRelationships.filter(
        (id) => id !== rel.relationId
      );
      if (!updatedKnowledge.discoveredRelationships.includes(rel.relationId)) {
        updatedKnowledge.discoveredRelationships.push(rel.relationId);
      }
    }
    // revealed 상태면 변경 없음
  });

  return { updatedStates, updatedKnowledge };
};

// =============================================================================
// 테스트용 데이터
// =============================================================================

const createNPCRelationshipStates = (
  overrides?: Partial<NPCRelationshipState>[]
): NPCRelationshipState[] => [
  { relationId: '박지현-김태호', visibility: 'hidden', ...overrides?.[0] },
  { relationId: '이수진-최민수', visibility: 'hidden', ...overrides?.[1] },
];

const createHiddenRelationships = (): HiddenNPCRelationship[] => [
  {
    relationId: '박지현-김태호',
    type: 'ally' as const,
    description: '오랜 동료 관계',
    revealCondition: '둘이 함께 있을 때',
  },
  {
    relationId: '이수진-최민수',
    type: 'rival' as const,
    description: '숨겨진 라이벌',
    revealCondition: '갈등 상황',
  },
];

const createProtagonistKnowledge = (
  overrides?: Partial<ProtagonistKnowledge>
): ProtagonistKnowledge => ({
  metCharacters: ['박지현', '김태호', '이수진', '최민수'],
  informationPieces: [],
  hintedRelationships: [],
  discoveredRelationships: [],
  ...overrides,
});

// =============================================================================
// 테스트
// =============================================================================

describe('Stage 4: AI 응답 처리 - NPC 관계 시스템 개선', () => {
  describe('기존 로직: hidden → hinted 전환', () => {
    it('두 캐릭터가 함께 언급되면 hidden → hinted로 전환된다', () => {
      const states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge();
      const narrative = '박지현이 김태호에게 다가갔다.';

      const { updatedStates, updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
      expect(relState?.visibility).toBe('hinted');
      expect(updatedKnowledge.hintedRelationships).toContain('박지현-김태호');
    });

    it('한 캐릭터만 언급되면 상태가 변경되지 않는다', () => {
      const states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge();
      const narrative = '박지현이 창고로 향했다.';

      const { updatedStates } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
      expect(relState?.visibility).toBe('hidden');
    });

    it('여러 관계가 동시에 힌트될 수 있다', () => {
      const states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge();
      const narrative =
        '박지현과 김태호가 대화하는 동안 이수진이 최민수를 노려보았다.';

      const { updatedStates, updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedStates.find((r) => r.relationId === '박지현-김태호')?.visibility).toBe(
        'hinted'
      );
      expect(updatedStates.find((r) => r.relationId === '이수진-최민수')?.visibility).toBe(
        'hinted'
      );
      expect(updatedKnowledge.hintedRelationships).toHaveLength(2);
    });
  });

  describe('#1 힌트 → 공개 전환 (hinted → revealed)', () => {
    it('hinted 상태에서 다시 언급되면 revealed로 전환된다', () => {
      const states = createNPCRelationshipStates([{ visibility: 'hinted' }]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        hintedRelationships: ['박지현-김태호'],
      });
      const narrative = '박지현이 김태호에게 무언가 속삭였다.';

      const { updatedStates, updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
      expect(relState?.visibility).toBe('revealed');
      expect(updatedKnowledge.discoveredRelationships).toContain('박지현-김태호');
    });

    it('revealed 전환 시 hintedRelationships에서 제거된다', () => {
      const states = createNPCRelationshipStates([{ visibility: 'hinted' }]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        hintedRelationships: ['박지현-김태호'],
      });
      const narrative = '박지현과 김태호의 대화.';

      const { updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedKnowledge.hintedRelationships).not.toContain('박지현-김태호');
      expect(updatedKnowledge.discoveredRelationships).toContain('박지현-김태호');
    });

    it('이미 revealed 상태면 변경되지 않는다', () => {
      const states = createNPCRelationshipStates([{ visibility: 'revealed' }]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        discoveredRelationships: ['박지현-김태호'],
      });
      const narrative = '박지현이 김태호에게 또 다가갔다.';

      const { updatedStates, updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
      expect(relState?.visibility).toBe('revealed');
      expect(updatedKnowledge.discoveredRelationships).toHaveLength(1);
    });
  });

  describe('#2 명시적 관계 키워드 감지', () => {
    it('명시적 키워드가 있으면 hidden에서 바로 revealed로 전환된다', () => {
      const states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge();
      const narrative = '알고 보니 박지현과 김태호는 오래전부터 동료였다.';

      const { updatedStates, updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
      expect(relState?.visibility).toBe('revealed');
      expect(updatedKnowledge.discoveredRelationships).toContain('박지현-김태호');
      expect(updatedKnowledge.hintedRelationships).not.toContain('박지현-김태호');
    });

    it('관계 키워드만 있고 캐릭터 언급이 없으면 변경되지 않는다', () => {
      const states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge();
      const narrative = '알고 보니 그들의 관계는 복잡했다.';

      const { updatedStates } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedStates.every((r) => r.visibility === 'hidden')).toBe(true);
    });

    it('다양한 관계 키워드를 감지한다', () => {
      const keywords = ['사이', '형제', '연인', '적이었'];
      keywords.forEach((keyword) => {
        const states = createNPCRelationshipStates();
        const hidden = createHiddenRelationships();
        const knowledge = createProtagonistKnowledge();
        const narrative = `박지현과 김태호의 ${keyword}는 특별했다.`;

        const { updatedStates } = updateNPCRelationshipVisibility(
          states,
          hidden,
          knowledge,
          narrative
        );

        const relState = updatedStates.find((r) => r.relationId === '박지현-김태호');
        expect(relState?.visibility).toBe('revealed');
      });
    });
  });

  describe('#2 discoveredRelationships 업데이트', () => {
    it('revealed 상태가 되면 discoveredRelationships에 추가된다', () => {
      const states = createNPCRelationshipStates([{ visibility: 'hinted' }]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        hintedRelationships: ['박지현-김태호'],
        discoveredRelationships: [],
      });
      const narrative = '박지현과 김태호의 대화.';

      const { updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedKnowledge.discoveredRelationships).toContain('박지현-김태호');
    });

    it('중복으로 추가되지 않는다', () => {
      const states = createNPCRelationshipStates([{ visibility: 'revealed' }]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        discoveredRelationships: ['박지현-김태호'],
      });
      const narrative = '박지현과 김태호가 다시 만났다.';

      const { updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedKnowledge.discoveredRelationships).toHaveLength(1);
    });

    it('여러 관계가 동시에 revealed될 수 있다', () => {
      const states = createNPCRelationshipStates([
        { visibility: 'hinted' },
        { visibility: 'hinted' },
      ]);
      const hidden = createHiddenRelationships();
      const knowledge = createProtagonistKnowledge({
        hintedRelationships: ['박지현-김태호', '이수진-최민수'],
      });
      const narrative =
        '박지현과 김태호, 그리고 이수진과 최민수 모두 긴장된 표정이었다.';

      const { updatedKnowledge } = updateNPCRelationshipVisibility(
        states,
        hidden,
        knowledge,
        narrative
      );

      expect(updatedKnowledge.discoveredRelationships).toHaveLength(2);
      expect(updatedKnowledge.hintedRelationships).toHaveLength(0);
    });
  });

  describe('통합 테스트', () => {
    it('전체 상태 전환 흐름 (hidden → hinted → revealed)', () => {
      // Step 1: hidden → hinted
      let states = createNPCRelationshipStates();
      const hidden = createHiddenRelationships();
      let knowledge = createProtagonistKnowledge();
      let narrative = '박지현이 김태호에게 다가갔다.';

      let result = updateNPCRelationshipVisibility(states, hidden, knowledge, narrative);
      expect(result.updatedStates.find((r) => r.relationId === '박지현-김태호')?.visibility).toBe(
        'hinted'
      );
      expect(result.updatedKnowledge.hintedRelationships).toContain('박지현-김태호');

      // Step 2: hinted → revealed (재언급)
      states = result.updatedStates;
      knowledge = result.updatedKnowledge;
      narrative = '박지현과 김태호가 함께 계획을 세웠다.';

      result = updateNPCRelationshipVisibility(states, hidden, knowledge, narrative);
      expect(result.updatedStates.find((r) => r.relationId === '박지현-김태호')?.visibility).toBe(
        'revealed'
      );
      expect(result.updatedKnowledge.discoveredRelationships).toContain('박지현-김태호');
      expect(result.updatedKnowledge.hintedRelationships).not.toContain('박지현-김태호');
    });
  });
});
