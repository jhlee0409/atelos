import { ScenarioData, PlayerState, Character } from '@/types';
import { UniversalMasterSystemPrompt } from '@/mocks/UniversalMasterSystemPrompt';
import {
  formatGenreStyleForPrompt,
  getNarrativeStyleFromGenres,
} from './genre-narrative-styles';

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

// 3막 구조 서사 단계 정의
export type NarrativePhase = 'setup' | 'rising_action' | 'midpoint' | 'climax';

// 현재 일차에 따른 서사 단계 결정
export const getNarrativePhase = (currentDay: number): NarrativePhase => {
  if (currentDay <= 2) return 'setup';
  if (currentDay <= 4) return 'rising_action';
  if (currentDay === 5) return 'midpoint';
  return 'climax';
};

// 서사 단계별 AI 가이드라인
const NARRATIVE_PHASE_GUIDELINES: Record<NarrativePhase, string> = {
  setup: `
### 📖 서사 단계: 1막 - 설정 (Day 1-2) ###
NARRATIVE PHASE: ACT 1 - SETUP (Common Route)

목표: 세계관 확립, 캐릭터 소개, 초기 위기 제시
- 모든 생존자 캐릭터를 자연스럽게 등장시켜 성격을 보여줄 것
- 공동체의 현재 상황과 외부 위협을 명확히 설정할 것
- 플레이어가 각 캐릭터와 관계를 쌓을 기회를 제공할 것
- 아직 루트 분기가 되지 않음 - 다양한 가능성을 열어둘 것

서사 톤:
- 긴박하지만 아직 희망이 있는 분위기
- 캐릭터 간 갈등의 씨앗을 심을 것
- 플레이어의 리더십을 시험하는 상황 제시

딜레마 스타일:
- 캐릭터 관계 형성 중심
- 자원 확보 vs 안전 유지 같은 기본적 선택
- 어느 쪽을 선택해도 극단적 결과는 없음`,

  rising_action: `
### 📖 서사 단계: 2막 전반 - 상승 (Day 3-4) ###
NARRATIVE PHASE: ACT 2A - RISING ACTION (Route Branching)

목표: 긴장 고조, 루트 분기 시작, 핵심 갈등 심화
- 이전 선택들의 결과가 드러나기 시작할 것
- 탈출/항전/협상 중 하나의 방향으로 기울어지는 선택 제시
- 캐릭터 간 대립이 표면화될 것
- 중요한 플래그 획득 기회 제공

서사 톤:
- 긴장감 고조, 갈등 심화
- 외부 위협이 가시화됨
- 내부 분열의 조짐

딜레마 스타일:
- 루트 결정에 영향을 미치는 중대한 선택
- 누군가를 희생하거나 포기해야 하는 상황
- 선택에 따라 특정 캐릭터와 갈등 or 신뢰 형성

루트 힌트 (플래그 기반):
- 탈출 루트: 이동 수단 확보, 외부 연락처 확인
- 항전 루트: 방어 시설 강화, 무기 확보
- 협상 루트: 외부 세력과 접촉, 동맹 형성`,

  midpoint: `
### 📖 서사 단계: 2막 후반 - 전환점 (Day 5) ###
NARRATIVE PHASE: ACT 2B - MIDPOINT (Route Lock-in)

목표: 루트 확정, 돌이킬 수 없는 결정, 위기의 정점
- 지금까지의 선택에 따라 루트가 확정됨
- 극적인 반전 또는 중대한 사건 발생
- 희생이나 배신 등 감정적 클라이맥스
- 엔딩을 향한 방향이 명확해짐

서사 톤:
- 절정의 긴장감
- "돌아올 수 없는 다리를 건넌다"는 느낌
- 감정적 무게감이 큰 장면

딜레마 스타일:
- 공동체의 운명을 결정하는 선택
- 명확한 득실이 있는 무거운 결정
- 선택 후 특정 엔딩 루트로 고정됨

이 시점의 주요 플래그:
- FLAG_ESCAPE_VEHICLE_SECURED → 탈출 루트 가능
- FLAG_DEFENSES_COMPLETE → 항전 루트 가능
- FLAG_ALLY_NETWORK_FORMED → 협상 루트 가능`,

  climax: `
### 📖 서사 단계: 3막 - 결말 (Day 6-7) ###
NARRATIVE PHASE: ACT 3 - CLIMAX & RESOLUTION

목표: 최종 대결, 감정적 해소, 엔딩 도달
- 확정된 루트에 맞는 클라이맥스 전개
- 모든 캐릭터 아크 마무리
- 플레이어 선택의 최종 결과 보여주기
- 감동적이거나 충격적인 결말로 이끌 것

서사 톤:
- 최고조의 긴장과 감정
- 희생, 구원, 또는 비극적 결말
- 서사적 정의 (narrative justice)

딜레마 스타일:
- 마지막 선택은 "어떻게 끝낼 것인가"
- 개인 vs 공동체의 최종 결정
- 감정적 임팩트 극대화

엔딩 힌트 (현재 상태 기반):
- cityChaos ≤40 & communityCohesion ≥70 → "우리들의 법칙" (공동체 승리)
- survivalFoundation ≥50 & communityCohesion ≥50 → "새로운 보안관" (질서 확립)
- FLAG_ESCAPE_VEHICLE_SECURED → "탈출자들" (성공적 탈출)
- 조건 미달 시 → "결단의 시간" (기본 엔딩)`
};

// 회상 시스템 - 주요 결정 요약 (토큰 효율적)
interface KeyDecision {
  day: number;
  choice: string;
  consequence: string;
  category: string;
}

const formatKeyDecisionsForPrompt = (
  keyDecisions?: KeyDecision[],
  maxDecisions: number = 5,
): string => {
  if (!keyDecisions || keyDecisions.length === 0) {
    return '';
  }

  // 최근 결정들만 포함 (토큰 절약)
  const recentDecisions = keyDecisions.slice(-maxDecisions);

  const formattedDecisions = recentDecisions
    .map(
      (d) =>
        `Day${d.day}: "${d.choice.substring(0, 30)}..." → ${d.consequence}`,
    )
    .join('\n');

  return `
PLAYER'S PAST DECISIONS (회상 - 참조하여 서사 연속성 유지):
${formattedDecisions}

IMPORTANT: Reference these past decisions naturally in the narrative when relevant.
- Mention consequences of earlier choices
- Show how characters remember player's actions
- Create callbacks to meaningful moments`;
};

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
    keyDecisions?: KeyDecision[];
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
  const currentDay = options.currentDay || 1;
  const narrativePhase = getNarrativePhase(currentDay);
  const phaseGuideline = NARRATIVE_PHASE_GUIDELINES[narrativePhase];

  // 장르별 서사 스타일 가져오기
  const genreStyle = getNarrativeStyleFromGenres(scenario.genre || []);
  const genreGuide = formatGenreStyleForPrompt(scenario.genre || [], {
    includeDialogue: true,
    includePacing: true,
    includeDilemmas: true,
    includeWritingTechniques: false, // 토큰 절약
  });

  // 회상 시스템 - 주요 결정 포맷팅
  const keyDecisionsSection = formatKeyDecisionsForPrompt(
    options.keyDecisions,
    3, // 라이트 모드에서는 최근 3개만
  );

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
        char.currentTrait?.displayName || char.currentTrait?.traitName || char.weightedTraitTypes[0] || '일반';
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
7. **EMOTIONAL DEPTH IS CRITICAL**: Every response MUST include:
   - Inner thoughts: "...라고 느꼈다", "...라고 생각했다"
   - Emotional words: 불안, 희망, 걱정, 기쁨, 분노, 슬픔, 두려움, 안도
   - Character feelings: "마음이 무거웠다", "가슴이 조여왔다", "희망을 품었다"
8. Create meaningful choices with consequences
9. Reference character relationships and traits
10. Minimum 200 characters for the log field - describe scene vividly

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
  "log": "Korean narrative (200-300 characters MINIMUM) with emotional depth and character interactions",
  "dilemma": {
    "prompt": "Emotional Korean dilemma with character involvement (80-150 characters)",
    "choice_a": "First strategic choice in Korean (15-50 characters, ends with ~한다/~이다)",
    "choice_b": "Contrasting strategic choice in Korean (15-50 characters, ends with ~한다/~이다)"
  },
  "statChanges": {
    "scenarioStats": {"statId": change_amount},
    "survivorStatus": [{"name": "character", "newStatus": "status"}],
    "hiddenRelationships_change": [{"pair": "A-B", "change": number}],
    "flags_acquired": ["FLAG_NAME"],
    "shouldAdvanceTime": false
  }
}

TIME PROGRESSION GUIDELINES (IMPORTANT):
- **shouldAdvanceTime: false** (default): For regular dialogue, discussions, minor interactions
- **shouldAdvanceTime: true**: ONLY for major events that conclude the day:
  * Major battle or confrontation resolved
  * Important negotiation completed
  * Critical resource secured
  * Significant journey/travel completed
  * Major construction/project finished
- Multiple conversations happen within a single day - don't rush time!
- Let players make 2-4 decisions before a day passes

STAT CHANGE GUIDELINES (CRITICAL):
- **NORMAL actions** (dialogue, minor exploration): ±5 to ±10
- **IMPORTANT actions** (key decisions, negotiations): ±10 to ±20
- **EXTREME actions** (sacrifices, major confrontations): ±20 to ±30
- **NEVER exceed ±40** for any single stat change
- Stats: cityChaos (↓ is good), communityCohesion (↑ is good), survivalFoundation (↑ is good)
- Example: Successful negotiation → {"cityChaos": -10, "communityCohesion": 15}
- Example: Internal conflict → {"communityCohesion": -15, "cityChaos": 5}

FLAG ACQUISITION RULES (IMPORTANT - grant flags when conditions are met):
${scenario.flagDictionary && scenario.flagDictionary.length > 0
  ? scenario.flagDictionary.map(flag => `- **${flag.flagName}**: ${flag.triggerCondition || flag.description}`).join('\n')
  : '- No flags defined for this scenario'}
- Grant 1-2 flags per response when conditions are clearly met by player actions
- flags_acquired array must contain the exact flag name (e.g., "FLAG_POWER_AWAKENED")

Focus: Character-driven narrative, emotional engagement, Korean immersion, consistent stat changes.

${genreGuide}

${phaseGuideline}
${keyDecisionsSection}`;

  const userPrompt = `Previous situation: "${playerAction.playerFeedback || 'Game start'}"
Player chose: ${playerAction.actionDescription}

Write the consequence in Korean (MINIMUM 200 characters). MUST include:
1. **Character Reactions**: How each character responds with dialogue
2. **EMOTIONAL EXPRESSIONS (REQUIRED)**: Use these phrases naturally:
   - "...라고 느꼈다" / "...라고 생각했다"
   - Emotions: 불안, 희망, 걱정, 기쁨, 분노, 두려움
   - "마음이...", "가슴이..."
3. **Vivid Scene Description**: Environment, atmosphere, tension
4. **Next Challenge**: New dilemma that emerges from this choice

Write vividly with emotional depth. Character feelings are essential.`;

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
  const currentDay = options.currentDay || 1;
  const narrativePhase = getNarrativePhase(currentDay);
  const phaseGuideline = NARRATIVE_PHASE_GUIDELINES[narrativePhase];

  // 장르별 서사 스타일 (전체 포함)
  const genreGuide = formatGenreStyleForPrompt(scenario.genre || [], {
    includeDialogue: true,
    includePacing: true,
    includeDilemmas: true,
    includeWritingTechniques: true,
  });

  // 회상 시스템 - 주요 결정 포맷팅 (풀 모드에서는 5개까지)
  const keyDecisionsSection = formatKeyDecisionsForPrompt(
    options.keyDecisions,
    5,
  );

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
        ? [char.currentTrait.displayName || char.currentTrait.traitName]
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

  // AI가 사용해야 할 정확한 스탯 ID 목록 생성
  const statIdList = scenario.scenarioStats
    .map((stat) => `- "${stat.id}": ${stat.name}`)
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
    .replace('{{CURRENT_DAY}}', currentDay.toString())
    .replace('{{CURRENT_STATS}}', currentStats)
    .replace('{{STAT_ID_LIST}}', statIdList)
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

위의 직전 상황 결과를 바탕으로, 다음 이야기를 전개해주세요.

${genreGuide}

${phaseGuideline}
${keyDecisionsSection}`;

  return {
    systemPrompt,
    userPrompt,
    estimatedTokens: 2500,
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

  // 장르별 서사 스타일
  const genreGuide = formatGenreStyleForPrompt(scenario.genre || [], {
    includeDialogue: true,
    includePacing: true,
    includeDilemmas: true,
    includeWritingTechniques: true,
  });

  // 캐릭터 정보 구성 (Character Bible 형식)
  const characterBible = npcs
    .map((char) => {
      const mainTraits = char.currentTrait
        ? [char.currentTrait.displayName || char.currentTrait.traitName]
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

${genreGuide}

### INITIAL DILEMMA GENERATION TASK ###
Generate the very first dilemma for Day 1 of this scenario. This should establish the immediate crisis and force the player to make their first critical decision.

Requirements:
1. Set the scene immediately after the digital infrastructure collapse
2. Present an urgent survival decision that cannot be delayed
3. Include character reactions and conflicting opinions
4. Write in immersive Korean narrative (no system terminology exposed)
5. Create two meaningful choices with clear consequences

CRITICAL FORMATTING RULES:
- **스탯 숫자 절대 금지**: 20, 40, 60, 75 같은 구체적 수치를 서사에 절대 쓰지 마세요
- **스탯명 절대 금지**: "생존의 기반", "결속력", "혼란도", "cityChaos" 등 스탯 이름 금지
- **빈 괄호 금지**: "()", "( )" 같은 빈 괄호 사용 금지
- **좋은 예**: "상황이 위태로웠다", "자원이 턱없이 부족했다", "공동체가 흔들렸다"
- **나쁜 예**: "생존의 기반()이 20밖에" ❌, "결속력이 40으로" ❌, "도시 혼란도가 75" ❌
- **줄바꿈 필수**: 각 캐릭터 대사 전후에 \\n 줄바꿈을 넣으세요
- **마크다운 사용**: 중요한 대사는 **굵게**, 감정은 *기울임*으로 강조
- **대화 구분**: 장면 묘사와 캐릭터 대사를 줄바꿈으로 명확히 구분하세요

예시 형식:
"혼란스러운 도시의 아침이었다.\\n\\n**\\"우리가 여기서 버틸 수 있을까?\\"** 강철민이 냉소적으로 말했다.\\n\\n한서아가 고개를 저었다. *그녀의 눈빛에는 희망이 서려 있었다.*"

Output ONLY this JSON structure:
{
  "prompt": "Korean narrative with proper line breaks (use \\\\n)",
  "choice_a": "First choice option in Korean",
  "choice_b": "Second choice option in Korean"
}

Critical Rules:
- NO text outside the JSON structure
- NO + symbols before numbers (use 5, -3 format only)
- ALL content in Korean for immersive experience
- NO exposure of system IDs, flags, stats numbers, or technical terms
- USE \\n for line breaks between paragraphs and dialogues`;
};
