import { ScenarioData, Character } from '@/types';
import {
  getKoreanTraitName,
  getKoreanStatName,
  getKoreanRoleName,
} from '@/constants/korean-english-mapping';

// Helper to create the initial state from scenario data
// 기존의 동기 방식 함수 이름을 변경하여 폴백으로 사용
export const generateFallbackInitialChoices = (
  scenario: ScenarioData,
  characters: Character[],
) => {
  let prompt = '';
  let choice_a = '';
  let choice_b = '';

  const criticalStats = scenario.scenarioStats.filter((stat) => {
    const percentage = (stat.current - stat.min) / (stat.max - stat.min);
    return percentage < 0.4;
  });

  const charactersByRole = characters.reduce(
    (acc, char) => {
      if (!acc[char.roleName]) acc[char.roleName] = [];
      acc[char.roleName].push(char);
      return acc;
    },
    {} as Record<string, Character[]>,
  );

  // 플레이어를 제외한 NPC들만으로 딜레마를 구성
  const npcs = characters.filter((char) => char.characterName !== '(플레이어)');

  // 2. 캐릭터 기반 초기 딜레마 생성 (NPC들 간의 갈등)
  // 2-1. NPC가 2명 이상일 때: 특성을 기반으로 한 갈등
  if (npcs.length >= 2) {
    const char1 = npcs[0];
    const char2 = npcs[1];

    // 영어 특성명을 한글로 변환
    const char1TraitId =
      char1.currentTrait?.traitName ||
      char1.weightedTraitTypes[0] ||
      'cautious';
    const char2TraitId =
      char2.currentTrait?.traitName ||
      char2.weightedTraitTypes[0] ||
      'pragmatic';

    const char1MainTrait = getKoreanTraitName(char1TraitId);
    const char2MainTrait = getKoreanTraitName(char2TraitId);

    prompt = `${char1.characterName}은(는) "${char1MainTrait}" 특성을 바탕으로 한 해결책을, ${char2.characterName}은(는) "${char2MainTrait}"적인 관점에서 다른 방법을 제안했다. 두 의견이 팽팽하다. 리더인 나는 어떤 결정을 내려야 할까?`;
    choice_a = `${char1.characterName}의 제안을 받아들여, "${char1MainTrait}"을 우선으로 고려한다.`;
    choice_b = `${char2.characterName}의 손을 들어주어, "${char2MainTrait}"적인 가능성에 기대를 건다.`;
  }
  // 2-2. 위험한 스탯이 있을 때: 전문가의 과감한 제안 vs 안전
  else if (criticalStats.length > 0) {
    const criticalStat = criticalStats[0];
    const criticalStatKoreanName = getKoreanStatName(criticalStat.id);

    const expertCharacter =
      npcs.find(
        (char) =>
          char.currentTrait?.traitName.includes('survival') ||
          char.currentTrait?.traitName.includes('technician') ||
          char.currentTrait?.traitName.includes('resource') ||
          char.weightedTraitTypes.some(
            (trait) =>
              trait.includes('survival_skills') ||
              trait.includes('leadership') ||
              trait.includes('pragmatic'),
          ),
      ) || npcs[0];

    prompt = `${criticalStatKoreanName} 수치가 위험 수준이다. ${expertCharacter.characterName}이(가) 자신의 전문성을 믿고 과감한 해결책을 제시했지만, 실패할 경우의 위험도 크다. 나는 어떤 결단을 내려야 할까?`;
    choice_a = `위험을 감수하고 ${expertCharacter.characterName}의 방식을 시도한다.`;
    choice_b = `안전을 우선하여, 더 신중한 방법을 찾아본다.`;
  }
  // 2-3. 역할 기반 갈등
  else if (Object.keys(charactersByRole).length > 1) {
    const roles = Object.keys(charactersByRole);
    const role1Characters = charactersByRole[roles[0]].filter(
      (c: Character) => c.characterName !== '(플레이어)',
    );
    const role2Characters = charactersByRole[roles[1]].filter(
      (c: Character) => c.characterName !== '(플레이어)',
    );

    if (role1Characters.length > 0 && role2Characters.length > 0) {
      const char1 = role1Characters[0];
      const char2 = role2Characters[0];

      const char1RoleKorean = getKoreanRoleName(char1.roleName);
      const char2RoleKorean = getKoreanRoleName(char2.roleName);

      prompt = `${char1RoleKorean}인 ${char1.characterName}과(와) ${char2RoleKorean}인 ${char2.characterName}이(가) 공동체의 다음 목표를 두고 다른 의견을 내고 있다. 둘 다 공동체를 위한 마음이지만, 방향이 다르다. 리더로서 나는 어느 길을 택해야 할까?`;
      choice_a = `${char1.characterName}의 의견에 따라, ${char1RoleKorean}의 역할을 우선시한다.`;
      choice_b = `${char2.characterName}의 말에 따라, ${char2RoleKorean}의 관점을 존중한다.`;
    } else {
      // 이 조건에 맞는 NPC가 없으면 기본 폴백으로
      prompt = `새로운 환경에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?`;
      choice_a = '내가 직접 안전한 거주지부터 확보한다';
      choice_b = '내가 직접 식량과 물자 수집을 시작한다';
    }
  }
  // 3. 기본 폴백: 직접 행동 결정
  else {
    prompt = `새로운 환경에서 첫 번째 중요한 결정을 내려야 한다. 동료들이 나의 결정을 기다리고 있다. 무엇부터 시작할까?`;
    choice_a = '내가 직접 안전한 거주지부터 확보한다';
    choice_b = '내가 직접 식량과 물자 수집을 시작한다';
  }

  return { prompt, choice_a, choice_b };
};

// 위험도 감지 함수
export const detectUrgency = (choice_a: string, choice_b: string): boolean => {
  const urgencyKeywords = [
    '공격',
    '싸운',
    '위험',
    '생명',
    '죽음',
    '파괴',
    '절망',
    '최후',
    '마지막',
  ];
  const text = (choice_a + ' ' + choice_b).toLowerCase();
  return urgencyKeywords.some((keyword) => text.includes(keyword));
};
