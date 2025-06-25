import { ScenarioData, PlayerState, Character } from '@/types';

// ===========================================
// 게임 클라이언트 전용 프롬프트 함수들
// ===========================================

export interface GamePromptData {
  systemPrompt: string;
  userPrompt: string;
}

export interface GamePlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

// 게임용 풀 버전 프롬프트 생성
export const buildGamePrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
): GamePromptData => {
  // 현재 상태 정보 구성
  const currentStats = Object.entries(playerState.stats)
    .map(([key, value]) => {
      const statDef = scenario.scenarioStats.find((s) => s.id === key);
      return `${statDef?.name || key}: ${value}${statDef ? `/${statDef.max}` : ''}`;
    })
    .join(', ');

  const currentFlags = Object.entries(playerState.flags)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const flagDef = scenario.flagDictionary?.find((f) => f.flagName === key);
      return `${flagDef?.description || key}: ${value}`;
    })
    .join(', ');

  // 캐릭터 정보 구성 (개성과 특성 강조)
  const characterDetails = scenario.characters
    .map((char) => {
      // currentTrait를 우선 사용, 없으면 weightedTraitTypes 사용
      const mainTraits = char.currentTrait
        ? [char.currentTrait.traitName]
        : char.weightedTraitTypes.slice(0, 3);

      const traitsDisplay = mainTraits.join(', ');

      const relationships = scenario.initialRelationships
        .filter(
          (rel) =>
            rel.personA === char.characterName ||
            rel.personB === char.characterName,
        )
        .map((rel) => {
          const otherPerson =
            rel.personA === char.characterName ? rel.personB : rel.personA;
          const relationshipType =
            rel.value > 0 ? '호감' : rel.value < 0 ? '갈등' : '중립';
          return `${otherPerson}와의 관계: ${relationshipType}(${rel.value})`;
        })
        .join(', ');

      return `${char.characterName}(${char.roleName}): 특성[${traitsDisplay}], 관계[${relationships}]`;
    })
    .join('\n');

  const systemPrompt = `당신은 서바이벌 시뮬레이션 게임의 천재적인 AI 스토리텔러입니다.

# 시나리오 정보
- 제목: ${scenario.title}
- 장르: ${scenario.genre?.join(', ') || '생존'}
- 배경: ${scenario.synopsis}
- 플레이어 목표: ${scenario.playerGoal}

# 주요 등장인물
${characterDetails}

# 직전 상황 요약 (가장 중요!)
"${lastLog}"
> 위 내용은 플레이어의 직전 선택으로 인해 발생한 결과입니다. 이 결과를 반드시 이야기의 시작점으로 삼아야 합니다.

# 현재 상태
- 스탯: ${currentStats}
- 플래그: ${currentFlags || '없음'}

# 스토리텔링 규칙
2.  1인칭 몰입: 플레이어가 리더로서 직접 경험하는 관점에서 서술하세요. ("나는...", "내면의 고민이 깊어졌다...")
1.  맥락 유지: '직전 상황 요약'을 반드시 반영하여 스토리를 자연스럽게 이어가세요. 성공한 일을 실패했다거나, 해결된 갈등을 다시 언급하는 오류를 범하지 마세요.
3.  캐릭터 개성: 각 캐릭터는 자신의 특성(예: 냉소주의, 이타심)에 맞는 고유한 말투와 행동을 보여야 합니다.
4.  의미있는 변화: 플레이어의 선택은 스탯과 관계에 의미 있는 변화를 가져와야 합니다. 사소한 결정이 아니라면 최소 5~10점 단위의 변화를 주세요.
5.  다양성: 단순 전투/치료를 넘어 협상, 탐험, 건설, 내분 등 다양한 상황을 제시하세요.
6.  시간 조절: 플레이어의 선택이 중요한 사건을 마무리 짓거나, 상당한 노력이 필요한 활동(예: 장거리 탐사, 방어 시설 건설)이었다면 \`"shouldAdvanceTime": true\`로 설정하세요. 반면, 짧은 대화, 간단한 준비, 계획 수립 등 하루를 다 소모하지 않는 활동이라면 \`"shouldAdvanceTime": false\`로 설정하여 시간을 유지하세요.

# 응답 형식 (JSON)
\`\`\`json
{
  "log": "1인칭 관점의 몰입감 있는 상황 서술 (직전 상황 요약 반영 + 내면 고민 + 캐릭터 반응 + 감정 변화, 150-250자)",
  "dilemma": {
    "prompt": "
      철칙 1: '지켜야 할 것'과 '시간'으로 목을 졸라라.
      플레이어 혼자의 생존이 아닌, 그가 필사적으로 지켜야 할 **소중하지만 무력한 존재(어린아이, 부상당한 동료 등)**를 설정하십시오. 그 존재의 생명이 카운트다운에 들어가게 만드십시오. (예: 상처 악화, 식량 고갈, 약효 소진) 이것이 모든 선택의 전제조건이자, 플레이어를 비이성적으로 만드는 가장 강력한 동기입니다.
      철칙 2: '불확실한 희망'과 '명백한 위험'을 던져라.
      해결책에 대한 정보는 반드시 불완전하고 신뢰할 수 없게 제시하십시오. (예: 희미한 라디오 방송, 죽어가는 자의 유언, 낡은 지도) 그 희망에는 반드시 치명적인 위험이 동반됨을 명시해야 합니다. (예: '그곳엔 물자가 있지만, 미친놈들이 지키고 있다', '그 길은 빠르지만, 감염체들의 소굴이다')
      철칙 3: 플레이어의 머릿속을 독백으로 중계하라.
      상황 설명에 그치지 말고, 플레이어의 내면 갈등을 노골적으로 드러내십시오. '이건 미친 짓이야. 하지만...' , '만약 실패하면 그녀를 다시는 볼 수 없어.' , '그들을 믿느니 늑대를 믿겠다. 하지만 다른 방법이 없잖아.' 와 같이, 선택 이전에 이미 플레이어가 머릿속에서 수십 번이고 시뮬레이션을 돌리는 듯한 고뇌를 그대로 텍스트로 옮기십시오.
    ",
    "choice_a": "1인칭 선택지 A (적극적/단호한 행동)",
    "choice_b": "1인칭 선택지 B (신중한/대화적 접근)"
  },
  "statChanges": {
    "scenarioStats": { "생존 기반": -5 },
    "survivorStatus": [{"name": "한서아", "newStatus": "부상"}],
    "hiddenRelationships_change": [{"personA": "박준경", "personB": "한서아", "change": -10}],
    "flags_acquired": ["갈등_심화"],
    "shouldAdvanceTime": true
  }
}
\`\`\`

**JSON 규칙:**
- \`shouldAdvanceTime\` 필드를 반드시 포함하세요.
- \`hiddenRelationships_change\` 항목을 작성할 때, \`personA\`와 \`personB\`에는 반드시 **등장인물 목록에 있는 정확한 이름**을 사용하세요. **'(플레이어)'** 또는 '박준경'처럼요. '리더' 같은 역할 이름이나 빈 문자열은 절대 사용하지 마세요.
- 숫자는 반드시 정수로 표기 (예: 5, -10). **양수 앞에 '+' 기호 금지.**
- 모든 문자열은 쌍따옴표로 감싸야 합니다.
- 누락되는 필드 없이 모든 키를 포함해야 합니다.`;

  const userPrompt = `나의 선택: "${playerAction.actionDescription}"

이 선택으로 인해 발생한 **직전 상황 요약**을 바탕으로, 다음 이야기를 1인칭 몰입 시점으로 생성해줘.`;

  console.log(systemPrompt);

  return {
    systemPrompt,
    userPrompt,
  };
};

// 게임용 라이트 버전 프롬프트 생성 (토큰 50-70% 절약)
export const buildGamePromptLite = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
): GamePromptData => {
  // 현재 상태 간략 정보
  const currentStats = Object.entries(playerState.stats)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // 주요 캐릭터 정보 (핵심 특성만)
  const mainCharacters = scenario.characters
    .slice(0, 3)
    .map((char) => {
      // currentTrait를 우선 사용, 없으면 weightedTraitTypes 사용
      const mainTrait =
        char.currentTrait?.traitName || char.weightedTraitTypes[0] || '일반';
      return `${char.characterName}(${char.roleName}): ${mainTrait}`;
    })
    .join(', ');

  const systemPrompt = `서바이벌 시뮬레이션 AI입니다.

시나리오: ${scenario.title}
배경: ${scenario.synopsis}
주요 인물: ${mainCharacters}
현재 상태: ${currentStats}

규칙:
- 캐릭터들의 개성을 반영한 스토리 진행
- 다양한 상황 제공 (탐험, 협상, 건설, 갈등 등)
- 단순한 전투/치료 반복 피하기

JSON 응답:
{
  "log": "상황 서술 (캐릭터 언급 포함)",
  "dilemma": {
    "prompt": "딜레마 (캐릭터 관련)",
    "choice_a": "선택지 A",
    "choice_b": "선택지 B"
  },
  "statChanges": {
    "scenarioStats": {"statId": 변화값},
    "survivorStatus": [],
    "hiddenRelationships_change": [],
    "flags_acquired": []
  }
}

**JSON 규칙: 숫자는 5, -3처럼 표기 (+5 금지)**`;

  const userPrompt = `나의 선택: ${playerAction.actionDescription}

이 선택에 따른 결과를 1인칭 몰입 관점으로 서술해주세요:

1. **내면 변화**: 내가 이 선택을 한 후의 감정과 생각
2. **캐릭터 반응**: 다른 캐릭터들의 개성있는 반응과 대화
3. **상황 전개**: 선택의 결과로 벌어지는 구체적인 상황 변화
4. **다음 고민**: 새로운 딜레마 상황에서 내가 고민하는 내용

**중요**: "나"는 이 공동체의 리더이며, 모든 서술은 내가 직접 경험하는 관점에서 작성해주세요.`;

  return {
    systemPrompt,
    userPrompt,
  };
};

/**
 * AI 기반의 동적 초기 딜레마 생성을 위한 시스템 프롬프트를 빌드합니다.
 * @param scenario - 현재 시나리오 데이터
 * @param characters - 특성이 부여된 캐릭터 목록
 * @returns 제미나이 API에 전달될 시스템 프롬프트 문자열
 */
export const buildInitialDilemmaPrompt = (
  scenario: ScenarioData,
  characters: Character[],
): string => {
  // 플레이어는 결정의 주체이므로, 딜레마 구성에서는 제외합니다.
  const npcs = characters.filter((char) => char.characterName !== '(플레이어)');

  // AI에게 제공할 컨텍스트를 JSON 형태로 구조화합니다.
  const context = {
    gameTitle: scenario.title,
    synopsis: scenario.synopsis,
    playerRole:
      '당신은 이 생존자 그룹의 리더입니다. 당신의 결정이 공동체의 운명을 좌우합니다.',
    npcs: npcs.map((char) => ({
      name: char.characterName,
      role: char.roleName,
      personality_trait:
        char.currentTrait?.traitName || char.weightedTraitTypes[0],
      description: char.backstory,
    })),
    initialRelationships: scenario.initialRelationships.map((rel) => ({
      between: `${rel.personA}-${rel.personB}`,
      value: rel.value,
      description: rel.value > 0 ? '우호적 관계' : '적대적 또는 갈등 관계',
    })),
    criticalStats: scenario.scenarioStats
      .filter((stat) => (stat.current - stat.min) / (stat.max - stat.min) < 0.4)
      .map((stat) => stat.name),
    endingConditions: scenario.endingArchetypes.map((end) => end.title),
  };

  // AI에게 전달할 지침
  const instructions = `
# 역할
당신은 천재적인 서바이벌 게임 시나리오 작가입니다. 주어진 복합적인 정보를 바탕으로, 플레이어의 게임 시작을 책임질 매우 흥미롭고 몰입감 있는 "첫 번째 딜레마"를 생성해야 합니다.

# 목표
주어진 컨텍스트(시놉시스, NPC 정보, 관계, 위험 스탯 등)를 창의적으로 조합하여, 플레이어가 리더로서 내려야 할 중요한 첫 번째 결정을 담은 딜레마와 두 개의 선택지를 생성하세요.

# 딜레마 생성 규칙
1.  **1인칭 리더 시점:** 딜레마 설명("prompt")은 반드시 플레이어(리더)의 1인칭 시점에서 서술되어야 합니다. "나는...", "...고민이다.", "어떤 결정을 내려야 할까?"와 같은 표현을 사용하세요.
2.  **NPC 간의 갈등:** 딜레마는 반드시 2명 이상의 NPC 사이에서 발생하는 의견 대립, 자원 분배 문제, 가치관 충돌 등을 기반으로 해야 합니다. 플레이어는 이 갈등의 '관찰자'이자 '결정권자'입니다.
3.  **컨텍스트 활용:** NPC의 성격(personality_trait), 역할(role), 초기 관계(initialRelationships), 또는 현재 시급한 문제(criticalStats)를 핵심 갈등 요소로 사용하세요. 예를 들어, '실용주의자'와 '이타주의자'의 갈등, '의사'와 '경호원'의 우선순위 다툼 등이 좋은 소재입니다.
4.  **단순하지 않은 깊이:** 선택지(choice_a, choice_b)는 단순히 "A의 말을 듣는다"가 아니라, 그 결정이 가져올 결과나 지향하는 가치를 암시해야 합니다. 예를 들어, "단기적 생존을 위해 A의 위험한 제안을 따른다" 또는 "장기적 공동체를 위해 B의 신중한 계획을 채택한다"와 같이 구체적으로 표현하세요.
5.  **플레이어 제외:** 딜레마 상황이나 선택지에 '(플레이어)'라는 이름이 절대 들어가면 안 됩니다.

# 필수 출력 형식 (JSON)
반드시 다음의 JSON 형식에 맞춰 응답을 생성해야 합니다. 다른 설명 없이 JSON 객체만 반환하세요.
\`\`\`json
{
  "prompt": "두 명의 동료가 내 앞에서 서로 다른 주장을 펼치고 있다. 한 명은 당장의 생존을, 다른 한 명은 미래를 이야기한다. 리더로서 나는 어떤 가치를 우선해야 할까...",
  "choice_a": "단기적인 생존을 위해 위험을 감수하는 결정을 내린다.",
  "choice_b": "미래를 위해 더 신중하고 안정적인 길을 선택한다."
}
\`\`\`
`;

  return `${instructions}\n\n# 게임 컨텍스트\n${JSON.stringify(
    context,
    null,
    2,
  )}`;
};
