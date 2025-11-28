import { ScenarioData, PlayerState, Character } from '@/types';
import { UniversalMasterSystemPrompt } from '@/mocks/UniversalMasterSystemPrompt';

// ===========================================
// 토큰 최적화를 위한 계층화된 프롬프트 시스템
// ===========================================

export interface GamePromptData {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number; // 예상 토큰 수
}

export interface GamePlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

// 프롬프트 복잡도 레벨 정의
export type PromptComplexity = 'minimal' | 'lite' | 'full' | 'detailed';

// 토큰 최적화된 프롬프트 빌더 (메인 함수)
export const buildOptimizedGamePrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
  complexity: PromptComplexity = 'full',
  options: {
    includeCharacterDetails?: boolean;
    includeRelationshipTracking?: boolean;
    includeDetailedStats?: boolean;
    currentDay?: number;
  } = {},
): GamePromptData => {
  const {
    includeCharacterDetails = true,
    includeRelationshipTracking = true,
    includeDetailedStats = true,
    currentDay = 1,
  } = options;

  switch (complexity) {
    case 'minimal':
      return buildMinimalPrompt(scenario, playerState, playerAction);
    case 'lite':
      return buildLitePrompt(scenario, playerState, playerAction, options);
    case 'full':
      return buildFullPrompt(
        scenario,
        playerState,
        playerAction,
        lastLog,
        options,
      );
    case 'detailed':
      return buildDetailedPrompt(
        scenario,
        playerState,
        playerAction,
        lastLog,
        options,
      );
    default:
      return buildFullPrompt(
        scenario,
        playerState,
        playerAction,
        lastLog,
        options,
      );
  }
};

// 1. 미니멀 프롬프트 (~300 토큰, 90% 절약)
const buildMinimalPrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
): GamePromptData => {
  const stats = Object.entries(playerState.stats)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');

  const systemPrompt = `Korean survival game AI. Scenario: ${scenario.title}
Stats: ${stats}
Rules: 1) Korean narrative 2) JSON format 3) 2 choices
JSON: {"log":"story","dilemma":{"prompt":"?","choice_a":"A","choice_b":"B"},"statChanges":{"scenarioStats":{}}}`;

  const userPrompt = `Action: ${playerAction.actionDescription}
Result in Korean (50 words max):`;

  return {
    systemPrompt,
    userPrompt,
    estimatedTokens: 300,
  };
};

// 2. 라이트 프롬프트 (~800 토큰, 60% 절약, 품질 보장)
const buildLitePrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  options: any,
): GamePromptData => {
  const currentStats = Object.entries(playerState.stats)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  const activeFlags = Object.entries(playerState.flags)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  // 핵심 캐릭터 정보 포함 (품질 보장을 위해 모든 캐릭터 포함)
  const characterInfo = scenario.characters
    .map((char) => {
      const mainTrait =
        char.currentTrait?.traitName || char.weightedTraitTypes[0] || '일반';
      const backstory = char.backstory.substring(0, 30) + '...'; // 간략화
      return `${char.characterName}(${char.roleName}): ${mainTrait}, ${backstory}`;
    })
    .join(' | ');

  // 관계 정보 간략화
  const relationships = scenario.initialRelationships
    .map(
      (rel) =>
        `${rel.personA}-${rel.personB}:${rel.value > 0 ? '호감' : '갈등'}`,
    )
    .join(', ');

  const systemPrompt = `Korean survival simulation AI for "${scenario.title}".

Background: ${scenario.synopsis.substring(0, 300)}...

Characters: ${characterInfo}
Relationships: ${relationships || 'None'}
Current Stats: ${currentStats}
Active Flags: ${activeFlags || 'None'}
Day: ${options.currentDay || 1}/7

CRITICAL LANGUAGE REQUIREMENTS:
1. **ONLY KOREAN**: Write exclusively in Korean. Never mix with Arabic, Thai, Hindi, or other languages.
2. **KOREAN CHARACTERS**: Use only 한글 characters, basic punctuation, and minimal English for technical terms.
3. **KOREAN GRAMMAR**: Follow Korean sentence structure and natural expression patterns.
4. **NO FOREIGN SCRIPTS**: Absolutely no foreign language characters (아랍어, ภาษาไทย, हिन्दी, etc.)

STORY RULES:
5. Write in fluent Korean with character personality
6. Include character dialogue and reactions
7. Show emotional depth and story continuity
8. Create meaningful choices with consequences
9. Reference character relationships and traits

CHOICE FORMAT RULES (CRITICAL - MUST FOLLOW):
10. **LENGTH**: Each choice MUST be 15-50 Korean characters (not words)
11. **ENDING**: Each choice MUST end with "~한다" or "~이다" (e.g., "협상을 시도한다", "방어를 강화한다")
12. **CONTRAST**: Two choices MUST represent DIFFERENT strategies (e.g., aggressive vs defensive, solo vs cooperative)
13. **CHARACTER**: Include character name when the choice involves specific person
14. **NO SYSTEM IDS**: Never expose internal IDs like [ACTION_ID] in choices

CHOICE EXAMPLES (follow this format exactly):
- GOOD: "박준경과 함께 외부 그룹과의 협상을 시도한다" (32자, 협력적)
- GOOD: "내부 방어 시설을 보강하며 경계를 강화한다" (22자, 방어적)
- BAD: "예" (too short, no context)
- BAD: "[NEGOTIATE] 협상한다" (exposes system ID)
- BAD: "동의함" (no verb ending, too vague)

Output JSON:
{
  "log": "Korean narrative (100-150 characters) with character interactions",
  "dilemma": {
    "prompt": "Emotional Korean dilemma with character involvement (50-100 characters)",
    "choice_a": "First strategic choice in Korean (15-50 characters, ends with ~한다/~이다)",
    "choice_b": "Contrasting strategic choice in Korean (15-50 characters, ends with ~한다/~이다)"
  },
  "statChanges": {
    "scenarioStats": {"statId": change_amount},
    "survivorStatus": [{"name": "character", "newStatus": "status"}],
    "hiddenRelationships_change": [{"pair": "A-B", "change": number}],
    "flags_acquired": ["FLAG_NAME"],
    "shouldAdvanceTime": true
  }
}

STAT CHANGE GUIDELINES (CRITICAL):
- **NORMAL actions** (dialogue, minor exploration): ±5 to ±10
- **IMPORTANT actions** (key decisions, negotiations): ±10 to ±20
- **EXTREME actions** (sacrifices, major confrontations): ±20 to ±30
- **NEVER exceed ±40** for any single stat change
- Stats: cityChaos (↓ is good), communityCohesion (↑ is good), survivalFoundation (↑ is good)
- Example: Successful negotiation → {"cityChaos": -10, "communityCohesion": 15}
- Example: Internal conflict → {"communityCohesion": -15, "cityChaos": 5}

FLAG ACQUISITION RULES (grant flag when condition is met):
- **FLAG_ESCAPE_VEHICLE_SECURED**: Player secures transportation (truck, bus, etc.) for escape
- **FLAG_ALLY_NETWORK_FORMED**: Successfully forms alliance with another survivor group
- **FLAG_GOVERNMENT_CONTACT**: Establishes communication with military or government
- **FLAG_UNDERGROUND_HIDEOUT**: Discovers or builds underground shelter
- **FLAG_DEFENSES_COMPLETE**: Completes defensive fortifications
- **FLAG_LEADER_SACRIFICE**: Leader chooses self-sacrifice for others
- **FLAG_RESOURCE_MONOPOLY**: Secures control of critical resources
- **FLAG_IDEOLOGY_ESTABLISHED**: Community's ideology inspires other survivors
- **FLAG_MARTYR_LEGEND**: A hero's sacrifice becomes legendary
- Only grant 1-2 flags per response when truly earned through player actions

Focus: Character-driven narrative, emotional engagement, Korean immersion, consistent stat changes.`;

  const userPrompt = `Previous situation: "${playerAction.playerFeedback || 'Game start'}"
Player chose: ${playerAction.actionDescription}

Write the consequence in Korean. MUST include:
1. **Character Reactions**: How each character responds based on their personality
2. **Emotional Impact**: Inner thoughts and feelings of the community
3. **Situation Development**: Concrete changes in the environment/situation
4. **Next Challenge**: New dilemma that emerges from this choice

Keep it engaging but concise. Show character growth and relationships.`;

  return {
    systemPrompt,
    userPrompt,
    estimatedTokens: 800, // 품질 보장을 위해 토큰 증가
  };
};

// 기존 buildGamePrompt 함수 (호환성 유지)
export const buildGamePrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
): GamePromptData => {
  return buildFullPrompt(scenario, playerState, playerAction, lastLog, {});
};

// 3. 풀 프롬프트 (기존 로직, ~2000 토큰)
const buildFullPrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
  options: any,
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

  // 캐릭터 정보 구성 (Character Bible 형식)
  const characterBible = scenario.characters
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

      return `* ${char.characterName}(${char.roleName}): 배경설정[${char.backstory}], 특성[${traitsDisplay}], 관계[${relationships || '없음'}]`;
    })
    .join('\n');

  // 시나리오 스탯 설명 구성
  const scenarioStatsDesc = scenario.scenarioStats
    .map(
      (stat) =>
        `* ${stat.name}: ${stat.description} (현재: ${playerState.stats[stat.id] || 0}/${stat.max})`,
    )
    .join('\n');

  // UniversalMasterSystemPrompt 템플릿 활용 (완전한 영어 템플릿 변수)
  const systemPrompt = UniversalMasterSystemPrompt.prompt
    .replace('{{SCENARIO_TITLE}}', scenario.title)
    .replace('{{SCENARIO_DESCRIPTION}}', scenario.synopsis)
    .replace(
      '{{SCENARIO_GENRE}}',
      scenario.genre?.join(', ') || 'Survival Drama',
    )
    .replace('{{PLAYER_GOAL}}', scenario.playerGoal)
    .replace('{{CHARACTER_BIBLE}}', characterBible)
    .replace('{{SCENARIO_STATS_DESC}}', scenarioStatsDesc)
    .replace('{{CURRENT_DAY}}', '1') // 기본값, 실제 게임에서는 동적으로 설정
    .replace(
      '{{CITY_CHAOS}}',
      playerState.stats['cityChaos']?.toString() || '70',
    )
    .replace(
      '{{COMMUNITY_COHESION}}',
      playerState.stats['communityCohesion']?.toString() || '50',
    )
    .replace(
      '{{SURVIVAL_FOUNDATION}}',
      playerState.stats['survivalFoundation']?.toString() || '10',
    )
    .replace('{{ACTIVE_FLAGS}}', currentFlags || 'None')
    .replace('{{SURVIVOR_COUNT}}', scenario.characters.length.toString());

  const userPrompt = `
### 현재 상황 정보 ###
- 현재 스탯: ${currentStats}
- 획득 플래그: ${currentFlags || '없음'}
- 직전 상황 결과: "${lastLog}"

### 플레이어의 행동 ###
- 선택한 행동: ${playerAction.actionId}
- 행동 설명: ${playerAction.actionDescription}
- 플레이어 의도: ${playerAction.playerFeedback}

### 가능한 행동 목록 (availableActions) ###
다음 행동들 중에서 현재 상황에 가장 적합한 2개를 골라 'dilemma'의 선택지로 제시하세요:
[SEARCH_RESOURCES] 자원 탐색
[BUILD_DEFENSES] 방어 시설 구축
[NEGOTIATE_ALLIANCE] 다른 그룹과 협상
[CARE_FOR_WOUNDED] 부상자 치료
[GATHER_INTELLIGENCE] 정보 수집
[RESOLVE_CONFLICT] 내부 갈등 해결
[PLAN_ESCAPE] 탈출 계획 수립
[STRENGTHEN_MORALE] 사기 진작

위의 직전 상황 결과를 바탕으로, 다음 이야기를 전개해주세요.`;

  return {
    systemPrompt,
    userPrompt,
    estimatedTokens: 2000,
  };
};

// 4. 상세 프롬프트 (~3000 토큰, 엔딩용)
const buildDetailedPrompt = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
  options: any,
): GamePromptData => {
  const fullPrompt = buildFullPrompt(
    scenario,
    playerState,
    playerAction,
    lastLog,
    options,
  );

  // 엔딩 단계용 추가 지시사항
  const endingInstructions = `

### ENDING PHASE INSTRUCTIONS ###
- This is near the final day. Focus on emotional climax and resolution.
- Reference previous choices and their consequences.
- Build toward one of the defined ending archetypes.
- Make each choice feel weighty and final.
- Include character farewell moments or final bonding.
- Emphasize the approaching military deadline.

### ENHANCED NARRATIVE QUALITY ###
- Use cinematic descriptions and emotional depth.
- Show character growth through the 7-day journey.
- Create memorable final moments between characters.
- Build tension toward the ultimate resolution.`;

  return {
    systemPrompt: fullPrompt.systemPrompt + endingInstructions,
    userPrompt: fullPrompt.userPrompt,
    estimatedTokens: 3000,
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

  // 캐릭터 정보 구성 (Character Bible 형식)
  const characterBible = npcs
    .map((char) => {
      const mainTraits = char.currentTrait
        ? [char.currentTrait.traitName]
        : char.weightedTraitTypes.slice(0, 3);
      const traitsDisplay = mainTraits.join(', ');
      return `* ${char.characterName}(${char.roleName}): Background[${char.backstory}], Traits[${traitsDisplay}]`;
    })
    .join('\n');

  // UniversalMasterSystemPrompt를 초기 딜레마 생성에도 활용
  const initialPrompt = UniversalMasterSystemPrompt.prompt
    .replace('{{SCENARIO_TITLE}}', scenario.title)
    .replace('{{SCENARIO_DESCRIPTION}}', scenario.synopsis)
    .replace(
      '{{SCENARIO_GENRE}}',
      scenario.genre?.join(', ') || 'Survival Drama',
    )
    .replace('{{PLAYER_GOAL}}', scenario.playerGoal)
    .replace('{{CHARACTER_BIBLE}}', characterBible)
    .replace('{{CURRENT_DAY}}', '1')
    .replace('{{CITY_CHAOS}}', '70')
    .replace('{{COMMUNITY_COHESION}}', '50')
    .replace('{{SURVIVAL_FOUNDATION}}', '10')
    .replace('{{ACTIVE_FLAGS}}', 'None')
    .replace('{{SURVIVOR_COUNT}}', scenario.characters.length.toString());

  return `${initialPrompt}

### INITIAL DILEMMA GENERATION TASK ###
Generate the very first dilemma for Day 1 of this scenario. This should establish the immediate crisis and force the player to make their first critical decision.

Requirements:
1. Set the scene immediately after the digital infrastructure collapse
2. Present an urgent survival decision that cannot be delayed
3. Include character reactions and conflicting opinions
4. Write in immersive Korean narrative (no system terminology exposed)
5. Create two meaningful choices with clear consequences

Output ONLY this JSON structure:
{
  "prompt": "Korean narrative describing the situation and dilemma",
  "choice_a": "First choice option in Korean",
  "choice_b": "Second choice option in Korean"
}

Critical Rules:
- NO text outside the JSON structure
- NO + symbols before numbers (use 5, -3 format only)
- ALL content in Korean for immersive experience
- NO exposure of system IDs, flags, or technical terms`;
};
