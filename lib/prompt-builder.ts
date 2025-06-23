import {
  ScenarioData,
  PlayerState,
  Dilemma,
  Character,
  ScenarioStat,
  ScenarioFlag,
  StoryState,
  Relationship,
  SystemCondition,
  EndingArchetype,
} from '@/types';

export interface PromptContext {
  scenario: ScenarioData;
  playerState: PlayerState;
  storyState: StoryState;
  characters: Character[];
  relationships: Relationship[];
  strategyHistory: string[];
}

export class PromptBuilder {
  static buildDilemmaGenerationPrompt(context: PromptContext): string {
    const {
      scenario,
      playerState,
      storyState,
      characters,
      relationships,
      strategyHistory,
    } = context;

    const previousLogs = this.formatHistory(storyState);
    const statsDescription = this.formatStats(
      playerState.stats,
      scenario.scenarioStats,
    );
    const flagsDescription = this.formatFlags(
      playerState.flags,
      scenario.flagDictionary || [],
    );
    const relationshipDescription = this.formatRelationships(relationships);
    const strategyHistoryText =
      strategyHistory.length > 0 ? strategyHistory.join(', ') : '없음';

    return `당신은 고도화된 내러티브 시뮬레이션 엔진입니다. 다음은 현재까지의 시뮬레이션 정보입니다.

[시나리오 시놉시스]
${scenario.synopsis}

[플레이어의 목표]
${scenario.playerGoal}

[엔딩 조건들]
${scenario.endingArchetypes.map((e) => e.title + ': ' + e.description).join('\n')}

[현재 상태]
- Day: ${storyState.currentDay}
[Stats]
${statsDescription}

[Flags]
${flagsDescription}

[Relationships]
${relationshipDescription}

[지금까지의 로그 히스토리]
${previousLogs}

[지금까지 등장한 전략/선택지 태그]
${strategyHistoryText}

[활성 캐릭터들]
${this.formatCharacters(characters)}

이제 이 시점에서 플레이어가 겪게 될 "새로운 딜레마"를 다음 조건에 따라 생성해주세요:

1. 기존 선택지 또는 전략을 중복하지 마세요.
2. 선택지는 반드시 감정선 또는 전략에서 명확히 다른 방향성을 가져야 합니다.
3. 현재 스탯 값을 고려하여 게임이 즉시 종료되지 않도록 조절하세요.
4. Day ${storyState.currentDay}에 적합하고 최근 사건들을 참조하세요.
5. 각 선택지는 1-3개의 스탯에 영향을 주어야 합니다.

결과는 반드시 다음 JSON 형식으로 출력하세요:
\`\`\`json
{
  "title": "Day ${storyState.currentDay}: [딜레마 제목]",
  "description": "[상황에 대한 상세한 설명]",
  "choices": [
    {
      "text": "[선택지 1 텍스트]",
      "strategy": "[전략 태그: 예시 - 협상적, 강압적, 이타적]",
      "statChanges": { "statId": 변화값 },
      "flagsToSet": ["flagId"],
      "result": "[이 선택의 즉각적인 결과 설명]"
    },
    {
      "text": "[선택지 2 텍스트]",
      "strategy": "[전략 태그]",
      "statChanges": { "statId": 변화값 },
      "flagsToSet": [],
      "result": "[이 선택의 즉각적인 결과 설명]"
    }
  ]
}
\`\`\`

스토리 톤은 시나리오와 캐릭터의 정서적 흐름을 반영해 주세요.`;
  }

  static buildNarrativeGenerationPrompt(
    scenario: ScenarioData,
    dilemma: Dilemma,
    choiceIndex: number,
    playerState: PlayerState,
    choiceResult: string,
  ): string {
    return `# 내러티브 생성 태스크

## 시나리오 정보
**제목**: ${scenario.title}
**장르**: ${scenario.genre?.join(', ') || '생존'}
**시놉시스**: ${scenario.synopsis}

## 현재 딜레마
**제목**: ${dilemma.title}
**상황**: ${dilemma.description}

## 플레이어 선택
**선택한 옵션**: Choice ${choiceIndex + 1}
**선택 결과**: ${choiceResult}

## 현재 게임 상태
${this.formatStats(playerState.stats, scenario.scenarioStats)}

## 출력 요구사항
다음 구조로 **정확히 3개 문단**의 내러티브를 작성하세요:

**1문단**: 선택의 즉각적인 결과와 주변 반응
**2문단**: 공동체/상황에 미치는 영향과 변화
**3문단**: 새로운 도전이나 기회의 암시

## 작성 가이드라인
- 톤: ${scenario.genre?.join(', ') || '생존'} 장르에 맞는 긴장감 있는 서술
- 길이: 각 문단 2-3문장
- 스타일: 드라마틱하지만 현실적
- 시점: 3인칭 관찰자 시점

내러티브만 출력하고 다른 설명은 포함하지 마세요.`;
  }

  static buildEndingNarrativePrompt(
    scenario: ScenarioData,
    endingTitle: string,
    endingDescription: string,
    finalState: PlayerState,
    storyHighlights: string[],
  ): string {
    return `# 엔딩 내러티브 생성 태스크

## 시나리오 정보
**제목**: ${scenario.title}
**장르**: ${scenario.genre?.join(', ') || '생존'}
**플레이어 목표**: ${scenario.playerGoal}

## 달성한 엔딩
**엔딩명**: ${endingTitle}
**엔딩 설명**: ${endingDescription}

## 최종 게임 상태
${this.formatStats(finalState.stats, scenario.scenarioStats)}

## 스토리 하이라이트
${storyHighlights.length > 0 ? storyHighlights.map((highlight, i) => `${i + 1}. ${highlight}`).join('\n') : '특별한 사건 없음'}

## 출력 요구사항
다음 구조로 **정확히 4개 문단**의 엔딩 내러티브를 작성하세요:

**1문단**: 최종 순간의 긴장감과 결정적 장면
**2문단**: 엔딩 타입에 따른 결과와 최종 상태 반영
**3문단**: 주요 선택들이 어떻게 이 결과로 이어졌는지 회고
**4문단**: 미래에 대한 암시와 감정적 마무리

## 작성 가이드라인
- 톤: 감정적으로 몰입감 있고 기억에 남는 마무리
- 길이: 각 문단 3-4문장
- 스타일: 영화적이고 서사적
- 포함요소: 최종 상태, 주요 결정들, 미래 전망

엔딩 내러티브만 출력하고 다른 설명은 포함하지 마세요.`;
  }

  static formatHistory(storyState: StoryState): string {
    if (!storyState.recentEvents || storyState.recentEvents.length === 0) {
      return '아직 특별한 사건이 발생하지 않았습니다.';
    }

    return storyState.recentEvents
      .map((event, index) => `Day ${index + 1} - ${event}`)
      .join('\n');
  }

  static formatStats(
    currentStats: Record<string, number>,
    statDefinitions: ScenarioStat[],
  ): string {
    return statDefinitions
      .map((stat) => {
        const current = currentStats[stat.id] || stat.current;
        const { min: minValue, max: maxValue } = stat;
        const percentage = ((current - minValue) / (maxValue - minValue)) * 100;
        return `- ${stat.name}: ${current} (min: ${minValue}, max: ${maxValue}) [${percentage.toFixed(0)}%]`;
      })
      .join('\n');
  }

  static formatFlags(
    flags: Record<string, boolean | number>,
    flagDefinitions: ScenarioFlag[],
  ): string {
    const activeFlags = Object.entries(flags)
      .filter(([_, value]) => value)
      .map(([flagName, value]) => {
        const flagDef = flagDefinitions.find((f) => f.flagName === flagName);
        const description = flagDef?.description || flagName;
        return `- ${flagName}: ${value} (${description})`;
      });

    if (activeFlags.length === 0) {
      return '활성화된 특별 조건이 없습니다.';
    }

    return activeFlags.join('\n');
  }

  private static formatRelationships(relationships: Relationship[]): string {
    if (!relationships || relationships.length === 0) {
      return '특별한 인간관계 변화가 없습니다.';
    }

    return relationships
      .map(
        (rel) =>
          `- ${rel.personA} ↔ ${rel.personB}: ${rel.value} (${rel.reason})`,
      )
      .join('\n');
  }

  private static formatCharacters(characters: Character[]): string {
    return characters
      .map(
        (char) =>
          `- ${char.characterName} (${char.roleName}): ${char.weightedTraitTypes.join(', ')}\n  배경: ${char.backstory}`,
      )
      .join('\n');
  }

  static buildCharacterDialoguePrompt(
    character: Character,
    situation: string,
    playerState: PlayerState,
    relationshipValue?: number,
  ): string {
    const relationshipContext =
      relationshipValue !== undefined
        ? `\n**관계도**: ${relationshipValue > 0 ? '호의적' : relationshipValue < 0 ? '적대적' : '중립적'} (${relationshipValue})`
        : '';

    return `# 캐릭터 대사 생성 태스크

## 캐릭터 정보
**이름**: ${character.characterName}
**역할**: ${character.roleName}
**성격 특성**: ${character.weightedTraitTypes.join(', ')}
**배경**: ${character.backstory}${relationshipContext}

## 현재 상황
${situation}

## 출력 요구사항
다음 기준에 맞는 **1-2문장**의 대사를 생성하세요:

### 필수 포함 요소
1. 캐릭터의 성격 특성 반영
2. 현재 상황에 대한 구체적인 조언 또는 관점
3. 캐릭터의 배경과 역할에 맞는 어투

### 작성 가이드라인
- 길이: 최대 2문장
- 어투: 캐릭터의 성격과 배경에 맞는 자연스러운 말투
- 내용: 실용적이고 상황에 직접적으로 도움이 되는 조언
- 스타일: 간결하고 임팩트 있게

**형식**: "대사 내용" (따옴표 포함)
대사만 출력하고 다른 설명은 포함하지 마세요.`;
  }

  static buildUniversalMasterSystemPrompt(
    scenario: ScenarioData,
    playerState: PlayerState,
    storyState: StoryState,
  ): string {
    return `# AI 게임 마스터 시스템

## 시나리오: "${scenario.title}"

### 현재 게임 상태
${this.formatStats(playerState.stats, scenario.scenarioStats)}

### 활성 조건
${this.formatFlags(playerState.flags, scenario.flagDictionary || [])}

## 태스크: 극적 선택지 큐레이션

### 목표
현재 상황에서 가장 **극적이고 의미 있는 2가지 선택지**를 제시하고, 각각을 플레이어가 이해하기 쉬운 **내러티브 문장**으로 재작성하세요.

### 요구사항
1. **대비성**: 두 선택지는 서로 상반되는 방향성을 가져야 함
2. **극적 긴장감**: ${scenario.genre?.join(', ')} 장르에 맞는 긴장감 조성
3. **명확성**: 플레이어가 결과를 예상할 수 있을 정도로 구체적
4. **게임 균형**: 현재 스탯을 고려하여 게임이 즉시 종료되지 않도록 조절

### 출력 형식
\`\`\`
**선택지 A**: [내러티브 설명 - 한 방향의 접근법]
**선택지 B**: [내러티브 설명 - 반대 방향의 접근법]
\`\`\`

### 작성 가이드라인
- 각 선택지: 1-2문장으로 간결하게
- 어투: 몰입감 있는 2인칭 서술 ("당신은...")
- 내용: 행동의 동기와 예상 결과를 암시

선택지만 출력하고 다른 설명은 포함하지 마세요.`;
  }

  // ===========================================
  // 비용 최적화 버전 (토큰 수 50-70% 절약)
  // ===========================================

  static buildDilemmaGenerationPromptLite(context: PromptContext): string {
    const { scenario, playerState, storyState, strategyHistory } = context;

    return `시나리오: ${scenario.title}
목표: ${scenario.playerGoal}
Day ${storyState.currentDay}

현재 상태:
${this.formatStatsLite(playerState.stats, scenario.scenarioStats)}
${this.formatFlagsLite(playerState.flags, scenario.flagDictionary || [])}

히스토리: ${storyState.recentEvents?.slice(-2).join(', ') || '없음'}
사용된 전략: ${strategyHistory.slice(-3).join(', ') || '없음'}

새 딜레마 생성 (기존 전략 중복 금지):

JSON 출력:
{
  "title": "Day ${storyState.currentDay}: [제목]",
  "description": "[상황설명]",
  "choices": [
    {
      "text": "[선택지1]",
      "strategy": "[전략태그]",
      "statChanges": {"statId": 값},
      "result": "[결과]"
    },
    {
      "text": "[선택지2]",
      "strategy": "[전략태그]",
      "statChanges": {"statId": 값},
      "result": "[결과]"
    }
  ]
}`;
  }

  static buildNarrativeGenerationPromptLite(
    scenario: ScenarioData,
    choiceResult: string,
    playerState: PlayerState,
  ): string {
    return `${scenario.title} 내러티브 생성

선택 결과: ${choiceResult}
현재 상태: ${this.formatStatsLite(playerState.stats, scenario.scenarioStats)}

3문단 작성:
1. 즉각적 결과
2. 공동체 영향
3. 새로운 도전

${scenario.genre?.join(',') || '생존'} 톤, 각 문단 2-3문장.`;
  }

  static buildEndingNarrativePromptLite(
    scenario: ScenarioData,
    endingTitle: string,
    finalState: PlayerState,
    keyMoments: string[],
  ): string {
    return `${scenario.title} 엔딩: ${endingTitle}

최종 상태: ${this.formatStatsLite(finalState.stats, scenario.scenarioStats)}
주요 순간: ${keyMoments.slice(-3).join(', ')}

4문단 엔딩:
1. 최종 장면
2. 결과 반영
3. 선택 회고
4. 미래 암시

각 문단 3-4문장, 감정적 마무리.`;
  }

  static buildCharacterDialoguePromptLite(
    character: Character,
    situation: string,
  ): string {
    return `${character.characterName} (${character.roleName})
특성: ${character.weightedTraitTypes.slice(0, 2).join(', ')}

상황: ${situation}

캐릭터 대사 1-2문장, 따옴표 포함:`;
  }

  static buildUniversalMasterSystemPromptLite(
    scenario: ScenarioData,
    playerState: PlayerState,
  ): string {
    return `${scenario.title} AI 마스터

상태: ${this.formatStatsLite(playerState.stats, scenario.scenarioStats)}

극적 대비 선택지 2개, 내러티브 문장으로:

**선택지 A**: [접근법1]
**선택지 B**: [접근법2]`;
  }

  // 간소화된 포맷터들
  static formatStatsLite(
    currentStats: Record<string, number>,
    statDefinitions: ScenarioStat[],
  ): string {
    return statDefinitions
      .map((stat) => {
        const current = currentStats[stat.id] || stat.current;
        return `${stat.name}: ${current}`;
      })
      .join(', ');
  }

  static formatFlagsLite(
    flags: Record<string, boolean | number>,
    flagDefinitions: ScenarioFlag[],
  ): string {
    const activeFlags = Object.entries(flags)
      .filter(([_, value]) => value)
      .map(([flagName]) => flagName);

    return activeFlags.length > 0 ? `플래그: ${activeFlags.join(', ')}` : '';
  }
}

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
1.  **맥락 유지**: **'직전 상황 요약'을 반드시 반영**하여 스토리를 자연스럽게 이어가세요. 성공한 일을 실패했다거나, 해결된 갈등을 다시 언급하는 오류를 범하지 마세요.
2.  **1인칭 몰입**: 플레이어가 리더로서 직접 경험하는 관점에서 서술하세요. ("나는...", "내면의 고민이 깊어졌다...")
3.  **캐릭터 개성**: 각 캐릭터는 자신의 특성(예: 냉소주의, 이타심)에 맞는 고유한 말투와 행동을 보여야 합니다.
4.  **의미있는 변화**: 플레이어의 선택은 스탯과 관계에 **의미 있는 변화**를 가져와야 합니다. 사소한 결정이 아니라면 최소 5~10점 단위의 변화를 주세요.
5.  **다양성**: 단순 전투/치료를 넘어 협상, 탐험, 건설, 내분 등 다양한 상황을 제시하세요.
6.  **시간 조절**: 플레이어의 선택이 중요한 사건을 마무리 짓거나, 상당한 노력이 필요한 활동(예: 장거리 탐사, 방어 시설 건설)이었다면 \`"shouldAdvanceTime": true\`로 설정하세요. 반면, 짧은 대화, 간단한 준비, 계획 수립 등 하루를 다 소모하지 않는 활동이라면 \`"shouldAdvanceTime": false\`로 설정하여 시간을 유지하세요.

# 응답 형식 (JSON)
\`\`\`json
{
  "log": "1인칭 관점의 몰입감 있는 상황 서술 (직전 상황 요약 반영 + 내면 고민 + 캐릭터 반응 + 감정 변화, 250-350자)",
  "dilemma": {
    "prompt": "플레이어의 내면적 고민과 딜레마를 생생하게 표현 (머릿속에서 고민하는 듯한 느낌)",
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
