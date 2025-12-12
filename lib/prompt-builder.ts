import { ScenarioData, PlayerState, Character, ActionContext } from '@/types';
import { UniversalMasterSystemPrompt } from '@/mocks/UniversalMasterSystemPrompt';
import {
  formatGenreStyleForPrompt,
  getNarrativeStyleFromGenres,
} from './genre-narrative-styles';
import { formatContextForPrompt } from './context-manager';
import {
  getTotalDays,
  getGameplayConfig,
  DEFAULT_GAMEPLAY_CONFIG,
} from './gameplay-config';
import {
  formatPersonaForPrompt,
  getCompactPersona,
  calculateRecommendedTension,
  DOKYUNG_PERSONA,
} from './story-writer-persona';

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

/**
 * 현재 일차에 따른 서사 단계 결정
 * @param currentDay 현재 Day
 * @param scenario 시나리오 데이터 (optional, 없으면 7일 기준 기본값 사용)
 */
export const getNarrativePhase = (currentDay: number, scenario?: ScenarioData | null): NarrativePhase => {
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  const ratios = config.narrativePhaseRatios ?? DEFAULT_GAMEPLAY_CONFIG.narrativePhaseRatios;

  const dayRatio = currentDay / totalDays;

  if (dayRatio <= ratios.setup) return 'setup';
  if (dayRatio <= ratios.rising_action) return 'rising_action';
  if (dayRatio <= ratios.midpoint) return 'midpoint';
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
- 중요한 행동 패턴 기록 기회 제공

서사 톤:
- 긴장감 고조, 갈등 심화
- 외부 위협이 가시화됨
- 내부 분열의 조짐

딜레마 스타일:
- 루트 결정에 영향을 미치는 중대한 선택
- 누군가를 희생하거나 포기해야 하는 상황
- 선택에 따라 특정 캐릭터와 갈등 or 신뢰 형성

루트 힌트 (행동 패턴 기반):
- 탈출 루트: 탈출, 이동, 차량 관련 행동
- 항전 루트: 방어, 강화, 보호 관련 행동
- 협상 루트: 협상, 대화, 동맹 관련 행동`,

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

이 시점의 주요 행동 패턴:
- 탈출 관련 행동 누적 → 탈출 루트 가능
- 방어 관련 행동 누적 → 항전 루트 가능
- 협상 관련 행동 누적 → 협상 루트 가능`,

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
- 탈출 관련 행동 충분 → "탈출자들" (성공적 탈출)
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
    actionContext?: ActionContext; // 맥락 연결 시스템
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
Rules: 1) Korean narrative 2) JSON format 3) 3 choices (active/cautious/wait)
JSON: {"log":"story","dilemma":{"prompt":"?","choice_a":"적극적","choice_b":"신중한","choice_c":"대기/관망"},"statChanges":{"scenarioStats":{}}}`;

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
  const totalDays = getTotalDays(scenario);
  const narrativePhase = getNarrativePhase(currentDay, scenario);
  const phaseGuideline = NARRATIVE_PHASE_GUIDELINES[narrativePhase];

  // 2025 Enhanced: 도경 페르소나의 긴장도 추천
  const recentEvents = options.keyDecisions?.slice(-3)?.map((d: KeyDecision) => d.consequence) || [];
  const tensionRecommendation = calculateRecommendedTension(currentDay, totalDays, recentEvents);

  // 장르별 서사 스타일 가져오기
  const genreStyle = getNarrativeStyleFromGenres(scenario.genre || []);
  const genreGuide = formatGenreStyleForPrompt(scenario.genre || [], {
    includeDialogue: true,
    includePacing: true,
    includeDilemmas: true,
    includeWritingTechniques: false, // 토큰 절약
  });

  // 2025 Enhanced: 압축된 페르소나 가이드
  const personaGuide = getCompactPersona();

  // 회상 시스템 - 주요 결정 포맷팅
  const keyDecisionsSection = formatKeyDecisionsForPrompt(
    options.keyDecisions,
    3, // 라이트 모드에서는 최근 3개만
  );

  const currentStats = Object.entries(playerState.stats)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // flags deprecated - using ActionHistory for tracking
  const activeFlags = '';

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
Day: ${options.currentDay || 1}/${totalDays}

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
10. **THREE CHOICES**: Always provide exactly 3 choices:
    - **choice_a**: Active/aggressive approach (적극적 행동)
    - **choice_b**: Cautious/defensive approach (신중한 접근)
    - **choice_c**: Wait/observe approach (대기/관망 - 낮은 위험, 시간 소모)
11. **LENGTH**: Each choice MUST be 15-50 Korean characters (not words)
12. **ENDING**: Each choice MUST end with "~한다" or "~이다" (e.g., "협상을 시도한다", "방어를 강화한다")
13. **CONTRAST**: Three choices MUST represent DIFFERENT strategies
14. **CHARACTER**: Include character name when the choice involves specific person
15. **NO SYSTEM IDS**: Never expose internal IDs like [ACTION_ID] in choices

CHOICE EXAMPLES (follow this format exactly):
- choice_a (적극적): "박준경과 함께 외부 그룹과의 협상을 시도한다" (32자)
- choice_b (신중한): "내부 방어 시설을 보강하며 경계를 강화한다" (22자)
- choice_c (대기): "일단 상황을 더 지켜보며 정보를 수집한다" (21자)
- BAD: "예" (too short, no context)
- BAD: "[NEGOTIATE] 협상한다" (exposes system ID)
- BAD: "동의함" (no verb ending, too vague)

Output JSON:
{
  "log": "Korean narrative (200-300 characters MINIMUM) with emotional depth and character interactions",
  "dilemma": {
    "prompt": "Emotional Korean dilemma with character involvement (80-150 characters)",
    "choice_a": "Active choice in Korean (15-50 characters, ends with ~한다/~이다)",
    "choice_b": "Cautious choice in Korean (15-50 characters, ends with ~한다/~이다)",
    "choice_c": "Wait/observe choice in Korean (15-50 characters, ends with ~한다/~이다)"
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

Focus: Character-driven narrative, emotional engagement, Korean immersion, consistent stat changes.

${personaGuide}

### TENSION RECOMMENDATION (Drama Manager) ###
- 현재 긴장도: ${tensionRecommendation.tensionLevel}/10
- 감정 포커스: ${tensionRecommendation.emotionalFocus.join(', ')}
- 권장사항: ${tensionRecommendation.recommendation}

${genreGuide}

${phaseGuideline}
${keyDecisionsSection}`;

  // 맥락 정보 추가 (Phase 5)
  const contextSection = options.actionContext
    ? `\n\n### 오늘의 맥락 (CONTEXT - 이전 행동과 연결할 것) ###\n${formatContextForPrompt(options.actionContext)}`
    : '';

  const userPrompt = `Previous situation: "${playerAction.playerFeedback || 'Game start'}"
Player chose: ${playerAction.actionDescription}
${contextSection}

Write the consequence in Korean (MINIMUM 200 characters). MUST include:
1. **Character Reactions**: How each character responds with dialogue
2. **EMOTIONAL EXPRESSIONS (REQUIRED)**: Use these phrases naturally:
   - "...라고 느꼈다" / "...라고 생각했다"
   - Emotions: 불안, 희망, 걱정, 기쁨, 분노, 두려움
   - "마음이...", "가슴이..."
3. **Vivid Scene Description**: Environment, atmosphere, tension
4. **Next Challenge**: New dilemma that emerges from this choice
5. **CONTEXT CONNECTION**: Reference today's explorations, dialogues, and discovered clues

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

  // flags deprecated - using ActionHistory for tracking
  const currentFlags = '';

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
  "choice_a": "Active/aggressive choice in Korean (적극적 행동)",
  "choice_b": "Cautious/defensive choice in Korean (신중한 접근)",
  "choice_c": "Wait/observe choice in Korean (대기/관망 - 낮은 위험)"
}

Critical Rules:
- NO text outside the JSON structure
- NO + symbols before numbers (use 5, -3 format only)
- ALL content in Korean for immersive experience
- NO exposure of system IDs, flags, stats numbers, or technical terms
- USE \\n for line breaks between paragraphs and dialogues`;
};

// =============================================================================
// Phase 7: 스토리 오프닝 시스템 (Story Opening System)
// =============================================================================

import type { StoryOpening, OpeningTone, CharacterIntroductionStyle } from '@/types';

/**
 * 오프닝 톤별 AI 지시사항
 */
const OPENING_TONE_GUIDELINES: Record<OpeningTone, string> = {
  mysterious: `
### 오프닝 톤: 신비로운 (Mysterious) ###
- 의문점을 남기며 시작하되, 핵심은 감춤
- 독자의 호기심을 자극하는 암시적 표현 사용
- 분위기: 안개 낀 듯한, 불확실한, 예감이 좋지 않은
- 예시 분위기: "무언가가 다가오고 있었다. 그것이 무엇인지는 아직 알 수 없었지만..."`,

  urgent: `
### 오프닝 톤: 긴박한 (Urgent) ###
- 위기 상황으로 바로 진입
- 빠른 호흡의 문장, 짧은 대화
- 분위기: 숨 가쁜, 긴장감 넘치는, 시간이 없는
- 예시 분위기: "심장이 터질 것 같았다. 생각할 시간 따위 없었다."`,

  calm: `
### 오프닝 톤: 차분한 (Calm) ###
- 일상적인 장면에서 시작하여 점진적으로 변화
- 주인공의 평범한 삶을 충분히 보여준 뒤 사건 발생
- 분위기: 평화로운, 일상적인, 익숙한 (그래서 변화가 더 충격적)
- 예시 분위기: "여느 때와 다름없는 아침이었다. 적어도 그때까지는."`,

  dramatic: `
### 오프닝 톤: 극적인 (Dramatic) ###
- 강렬한 사건이나 이미지로 시작
- 감각적 묘사와 감정적 임팩트 강조
- 분위기: 압도적인, 충격적인, 잊을 수 없는
- 예시 분위기: "세상이 뒤집어지는 순간, 모든 것이 변했다."`,

  introspective: `
### 오프닝 톤: 내성적 (Introspective) ###
- 주인공의 내면 묘사로 시작
- 생각, 감정, 고민을 중심으로 전개
- 분위기: 사색적인, 깊은, 개인적인
- 예시 분위기: "늘 같은 질문이 머릿속을 맴돌았다. '이게 정말 내가 원하던 삶인가?'"`,
};

/**
 * 캐릭터 소개 방식별 AI 지시사항
 */
const CHARACTER_INTRO_GUIDELINES: Record<CharacterIntroductionStyle, string> = {
  gradual: `
### 캐릭터 소개 방식: 점진적 (Gradual) ###
- 오프닝에서는 첫 번째 핵심 캐릭터만 등장시킴
- 다른 캐릭터들은 이름이나 암시만 언급
- 캐릭터의 중요한 특성을 대화와 행동으로 자연스럽게 보여줌
- 예시: "그녀는 항상 남들보다 한 발 앞서 움직였다. 그것이 최지혜의 방식이었다."`,

  immediate: `
### 캐릭터 소개 방식: 즉시 전체 (Immediate) ###
- 첫 장면에 주요 캐릭터들을 함께 등장시킴
- 그룹 상황에서 각자의 개성을 보여줌
- 캐릭터 간 관계와 역학이 드러나도록 대화 구성
- 예시: 회의 장면, 함께 있는 일상, 그룹 활동 등`,

  contextual: `
### 캐릭터 소개 방식: 맥락적 (Contextual) ###
- 상황에 따라 자연스럽게 캐릭터 등장
- 촉발 사건과 연관된 캐릭터를 우선 등장
- 주인공과의 관계가 자연스럽게 드러나도록 배치
- 예시: 사건의 목격자, 도움을 주는 사람, 또는 의심의 눈초리를 보내는 사람`,
};

/**
 * 스토리 오프닝 생성을 위한 프롬프트 빌더 (2025 Enhanced)
 * 3단계 구조: 프롤로그 → 촉발 사건 → 첫 캐릭터 만남 → 첫 딜레마
 * + 1:1 캐릭터 소개 시퀀스
 * + 숨겨진 NPC 관계 인식 (AI가 숨겨진 관계를 노출하지 않도록)
 * + 점진적 캐릭터 공개 가이드라인
 */
export const buildStoryOpeningPrompt = (
  scenario: ScenarioData,
  characters: Character[],
): string => {
  const storyOpening = scenario.storyOpening || {};
  const npcs = characters.filter((char) => char.characterName !== '(플레이어)');

  // 기본값 설정
  const openingTone = storyOpening.openingTone || 'calm';
  const introStyle = storyOpening.characterIntroductionStyle || 'contextual';
  const timeOfDay = storyOpening.timeOfDay || 'morning';
  const protagonist = storyOpening.protagonistSetup || {};
  const npcRelationshipExposure = storyOpening.npcRelationshipExposure || 'hidden';

  // NPC 이름 목록 (프롬프트에서 참조용)
  const npcNames = npcs.map(c => c.characterName);

  // [2025 Enhanced] 주인공-NPC 이름 충돌 경고 (1인칭 서술이므로 이름 충돌 영향 최소화)
  if (protagonist.name && npcNames.includes(protagonist.name)) {
    console.warn(`⚠️ 주인공 이름 "${protagonist.name}"이(가) NPC 이름과 충돌합니다! 1인칭 서술로 자동 처리됩니다.`);
  }

  // [2025 Enhanced] 1:1 캐릭터 소개 시퀀스 처리
  const introSequence = storyOpening.characterIntroductionSequence;
  let firstCharacter;
  let introSequenceInfo = '';

  if (introSequence && introSequence.length > 0) {
    // 시퀀스가 있으면 order=1인 캐릭터를 첫 캐릭터로 설정
    const firstInSequence = introSequence.find(s => s.order === 1);
    if (firstInSequence) {
      firstCharacter = npcs.find(c => c.characterName === firstInSequence.characterName);

      // 1:1 소개 시퀀스 정보 생성
      introSequenceInfo = `
### [2025 Enhanced] 1:1 캐릭터 소개 시퀀스 ###
**중요**: 캐릭터들은 개별적으로, 1:1로 주인공과 만나야 합니다.
- 여러 캐릭터가 동시에 등장하는 장면은 피하세요.
- 오프닝에서는 첫 번째 캐릭터만 직접 등장합니다.
- 다른 캐릭터들은 언급이나 암시만 가능합니다.

첫 번째 만남:
- 캐릭터: ${firstInSequence.characterName}
- 상황: ${firstInSequence.encounterContext}
${firstInSequence.firstImpressionKeywords ? `- 첫인상 키워드: ${firstInSequence.firstImpressionKeywords.join(', ')}` : ''}

향후 만남 예정 (오프닝에서는 암시만):
${introSequence.filter(s => s.order > 1).slice(0, 3).map(s =>
  `- ${s.order}번째: ${s.characterName} (${s.expectedTiming || 'event-driven'})`
).join('\n') || '없음'}
`;
    }
  }

  // 첫 캐릭터 결정 (시퀀스가 없는 경우 기존 로직)
  if (!firstCharacter) {
    firstCharacter = storyOpening.firstCharacterToMeet
      ? npcs.find((c) => c.characterName === storyOpening.firstCharacterToMeet) || npcs[0]
      : npcs[0];
  }

  // [2025 Enhanced] 숨겨진 NPC 관계 가이드라인
  let hiddenRelationshipGuideline = '';
  if (npcRelationshipExposure === 'hidden' || storyOpening.hiddenNPCRelationships) {
    hiddenRelationshipGuideline = `
### [2025 Enhanced] 숨겨진 NPC 관계 시스템 ###
**매우 중요 - 반드시 준수**:
1. NPC들 간의 관계는 주인공(플레이어)이 아직 모릅니다.
2. 캐릭터들 사이의 관계를 직접적으로 언급하거나 암시하지 마세요.
3. 각 캐릭터는 주인공에게 "처음 만나는 사람"처럼 소개되어야 합니다.
4. NPC끼리 서로를 아는 듯한 대화나 눈짓을 묘사하지 마세요.
5. 관계 발견은 플레이어의 행동(대화, 탐색)을 통해 점진적으로 이루어집니다.

허용되는 것:
- 각 캐릭터의 개인적인 성격, 외모, 첫인상 묘사
- 주인공과 캐릭터 사이의 상호작용
- 캐릭터가 자신에 대해 말하는 것

금지되는 것:
- "A와 B는 서로 알고 있는 것 같았다" ❌
- "C의 눈빛이 D를 향해 흔들렸다" ❌
- "E는 F와 무언가 비밀을 공유하는 듯했다" ❌
`;
  }

  // [2025 Enhanced] 점진적 캐릭터 공개 가이드라인
  let revelationGuideline = '';
  if (storyOpening.characterRevelations && storyOpening.characterRevelations.length > 0) {
    const firstCharRevelation = storyOpening.characterRevelations.find(
      r => r.characterName === firstCharacter?.characterName
    );
    if (firstCharRevelation) {
      // 가장 낮은 신뢰도 단계의 정보만 공개 가능
      const lowestLayer = firstCharRevelation.revelationLayers
        .sort((a, b) => a.trustThreshold - b.trustThreshold)[0];

      revelationGuideline = `
### [2025 Enhanced] 점진적 캐릭터 공개 ###
${firstCharacter?.characterName}에 대해 공개 가능한 정보 (첫 만남):
- 유형: ${lowestLayer?.revelationType || 'personality'}
- 내용: ${lowestLayer?.content || '기본적인 성격만 드러남'}
- 공개 방식: ${lowestLayer?.revelationStyle || 'subtle'}

아직 숨겨야 할 정보:
- 깊은 배경 스토리
- 비밀이나 숨겨진 동기
- 다른 캐릭터와의 관계

첫 만남에서는 표면적인 인상만 주고, 깊은 정보는 신뢰도가 쌓인 후에 공개됩니다.
`;
    }
  }

  // [2025 Enhanced] 이머전트 내러티브 힌트
  let emergentNarrativeHint = '';
  if (storyOpening.emergentNarrative?.enabled) {
    emergentNarrativeHint = `
### [2025 Enhanced] 이머전트 내러티브 시스템 ###
이 스토리는 플레이어의 행동에 따라 동적으로 전개됩니다.
- 캐릭터 조합, 발견한 정보, 선택의 연쇄에 따라 새로운 이벤트가 발생합니다.
- 오프닝에서는 향후 동적 이벤트의 씨앗을 심어두세요.
- 미묘한 복선, 의미심장한 소품, 해결되지 않은 질문 등을 배치하세요.

${storyOpening.emergentNarrative.dynamicEventGuidelines || ''}
`;
  }

  // 장르별 서사 스타일
  const genreGuide = formatGenreStyleForPrompt(scenario.genre || [], {
    includeDialogue: true,
    includePacing: true,
    includeDilemmas: true,
    includeWritingTechniques: true,
  });

  // 톤 가이드라인
  const toneGuideline = OPENING_TONE_GUIDELINES[openingTone];
  // 시퀀스가 있으면 시퀀스 정보 사용, 없으면 기존 introStyle 사용
  const introGuideline = introSequence?.length
    ? introSequenceInfo
    : CHARACTER_INTRO_GUIDELINES[introStyle];

  // 캐릭터 정보 (첫 등장 캐릭터 상세 정보)
  const firstCharacterInfo = firstCharacter
    ? `
### 첫 번째 등장 캐릭터 ###
- 이름: ${firstCharacter.characterName}
- 역할: ${firstCharacter.roleName}
- 배경: ${firstCharacter.backstory}
- 특성: ${firstCharacter.currentTrait?.displayName || firstCharacter.weightedTraitTypes[0] || '일반'}
${storyOpening.firstEncounterContext ? `- 만남 상황: ${storyOpening.firstEncounterContext}` : ''}
`
    : '';

  // 주인공 정보 (1인칭 서술 - 이름은 참고용)
  const protagonistInfo = protagonist.occupation
    ? `
### 주인공 정보 (1인칭 서술용 참고) ###
- **서술 관점**: 반드시 1인칭("나는", "내가", "나의")으로 서술. 주인공 이름을 직접 부르지 말 것.
${protagonist.occupation ? `- 직업/역할: ${protagonist.occupation}` : ''}
${protagonist.personality ? `- 성격: ${protagonist.personality}` : ''}
${protagonist.dailyRoutine ? `- 일상: ${protagonist.dailyRoutine}` : ''}
${protagonist.weakness ? `- 약점/고민: ${protagonist.weakness}` : ''}
`
    : `
### 주인공 정보 ###
- **서술 관점**: 반드시 1인칭("나는", "내가", "나의")으로 서술할 것.
`;

  // 기존 캐릭터들 간략 정보 (관계는 숨김 - 2025 Enhanced)
  const otherCharactersInfo = npcs
    .filter((c) => c !== firstCharacter)
    .slice(0, 3) // 최대 3명만
    .map((c) => `- ${c.characterName}(${c.roleName}): ${c.backstory.substring(0, 50)}...`)
    .join('\n');

  // 시간대별 분위기 설명
  const timeOfDayDescriptions: Record<string, string> = {
    dawn: '새벽녘, 희미한 빛이 밝아오는 시간',
    morning: '아침, 하루가 시작되는 시간',
    afternoon: '오후, 일상이 한창인 시간',
    evening: '저녁, 하루가 저물어가는 시간',
    night: '밤, 어둠이 내린 시간',
  };

  return `You are a master Korean storyteller creating the opening scene for an interactive narrative game.

### 시나리오 정보 ###
- 제목: ${scenario.title}
- 장르: ${scenario.genre?.join(', ') || '드라마'}
- 배경: ${scenario.synopsis}
- 플레이어 목표: ${scenario.playerGoal}
- 키워드: ${scenario.coreKeywords?.join(', ') || ''}

${protagonistInfo}

### NPC 이름 목록 (주인공 이름과 겹치면 안 됨) ###
${npcNames.join(', ')}

${firstCharacterInfo}

### 다른 주요 캐릭터들 (이번 오프닝에서는 암시만, 직접 등장 금지) ###
${otherCharactersInfo || '없음'}

### 오프닝 설정 ###
- 시간대: ${timeOfDayDescriptions[timeOfDay]}
- 장소: ${storyOpening.openingLocation || '시나리오 배경에 맞는 장소'}
- 테마: ${storyOpening.thematicElements?.join(', ') || scenario.coreKeywords?.join(', ') || '변화, 선택, 운명'}

${toneGuideline}

${introGuideline}
${hiddenRelationshipGuideline}
${revelationGuideline}
${emergentNarrativeHint}

${genreGuide}

### 스토리 오프닝 3단계 구조 (반드시 따를 것) ###

**1단계: 프롤로그 (100-150자)**
${storyOpening.prologue
  ? `제공된 프롤로그를 바탕으로 확장:
"${storyOpening.prologue}"`
  : `주인공의 평범한 일상을 묘사:
- 어제까지의 삶이 어떠했는지
- 주인공이 어떤 사람인지
- 일상적인 환경과 분위기`}

**2단계: 촉발 사건 (80-120자)**
${storyOpening.incitingIncident
  ? `제공된 촉발 사건을 바탕으로 확장:
"${storyOpening.incitingIncident}"`
  : `일상을 깨뜨리는 결정적 순간:
- 갑자기 발생한 변화
- 주인공의 즉각적인 반응
- "이제 돌아갈 수 없다"는 느낌`}

**3단계: 첫 캐릭터 만남 및 첫 딜레마 (100-150자)**
- ${firstCharacter?.characterName || '첫 캐릭터'}의 등장 (1:1 만남)
- 주인공과의 첫 대화 또는 상호작용
- 이 만남으로 인해 발생하는 첫 번째 선택의 순간
- **중요**: 이 장면에서는 오직 이 캐릭터만 직접 등장합니다

### CRITICAL KOREAN QUALITY REQUIREMENTS ###
1. **순수 한국어**: 한글만 사용, 다른 언어 문자 절대 금지
2. **1인칭 서술 필수**: 반드시 1인칭("나는", "내가", "나의", "내")으로 서술할 것. 주인공을 3인칭 이름으로 부르지 말 것.
3. **감정 표현 필수**: "...라고 느꼈다", "마음이...", "가슴이..." 등 내면 묘사
4. **대화와 묘사의 균형**: 대화문과 서술문을 번갈아 배치
5. **줄바꿈으로 가독성**: 문단과 대화 사이에 \\n 사용
6. **마크다운 강조**: **중요한 대사**, *감정 표현*

### [2025 Enhanced] 몰입감 향상 규칙 ###
6. **1:1 캐릭터 만남**: 첫 만남 장면에서는 오직 한 명의 캐릭터만 직접 등장
7. **관계 비공개**: NPC들 간의 관계는 절대 언급하거나 암시하지 않음
8. **미스터리 유지**: 캐릭터의 모든 정보를 한 번에 공개하지 않음
9. **플레이어 에이전시**: 주인공이 알게 되는 정보는 플레이어 행동의 결과여야 함
10. **복선 배치**: 향후 발견될 관계나 비밀의 미묘한 힌트만 배치

### OUTPUT FORMAT (JSON) ###
{
  "prologue": "프롤로그 텍스트 (주인공의 일상, 100-150자, 줄바꿈 \\n 포함)",
  "incitingIncident": "촉발 사건 텍스트 (변화의 순간, 80-120자)",
  "firstEncounter": "첫 캐릭터와의 1:1 만남 (100-150자, 대화 포함, 다른 캐릭터 등장 금지)",
  "dilemma": {
    "prompt": "첫 번째 딜레마 상황 설명 (80-150자)",
    "choice_a": "적극적 선택 (15-50자, ~한다로 끝남)",
    "choice_b": "신중한 선택 (15-50자, ~한다로 끝남)",
    "choice_c": "대기/관망 선택 (15-50자, ~한다로 끝남)"
  }
}

### CRITICAL FORMATTING RULES ###
- **1인칭 서술 필수**: 주인공은 반드시 "나", "내가", "나의"로만 지칭. 주인공에게 이름을 부여하거나 3인칭으로 서술하지 말 것.
- **스탯 숫자 절대 금지**: 20, 40, 60 같은 수치 노출 금지
- **스탯명 절대 금지**: "생존의 기반", "결속력" 등 게임 용어 금지
- **빈 괄호 금지**: "()", "( )" 사용 금지
- **JSON 외 텍스트 금지**: JSON 구조 외에 아무것도 출력하지 않음
- **줄바꿈 표기**: 실제 줄바꿈은 \\n으로 표기
- **NPC 관계 노출 금지**: A와 B의 관계를 암시하는 표현 금지

### EXAMPLE OUTPUT (2025 Enhanced - 1인칭 필수) ###
{
  "prologue": "나는 평범한 도시의 평범한 회사원이었다.\\n\\n내 삶은 어제까지 반복되는 서류 작업과 야근의 연속이었다. 매일 같은 지하철, 같은 커피, 같은 책상. *지루했지만 안정적이었다.*",
  "incitingIncident": "하지만 오늘, 모든 것이 변했다.\\n\\n내 손끝에서 푸른빛이 터져 나왔을 때, 나는 내 눈을 의심했다. **이게 대체 뭐지?** 억누를 수 없는 힘이 온몸을 휘감았다.",
  "firstEncounter": "**\\"괜찮으세요?\\"**\\n\\n낯선 여성이 조용히 다가왔다. 처음 보는 얼굴이었다. 그녀의 눈빛에서 복잡한 감정을 읽을 수 있었다. 걱정인지, 아니면... 호기심인지. *왜 이렇게 차분하지?* 나는 의문을 품었다.",
  "dilemma": {
    "prompt": "처음 보는 사람이 다가왔다. 방금 일어난 이상한 일에 대해 어떻게 반응해야 할까?",
    "choice_a": "솔직하게 방금 일어난 일에 대해 털어놓는다",
    "choice_b": "아무 일 없는 척하며 대화를 피한다",
    "choice_c": "일단 그녀의 의도를 파악하며 경계한다"
  }
}

Generate the opening scene following the 3-phase structure above. Make it emotionally engaging while respecting the 1:1 character introduction and hidden relationship rules.`;
};

/**
 * 스토리 오프닝 응답 타입
 */
export interface StoryOpeningResponse {
  prologue: string;
  incitingIncident: string;
  firstEncounter: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
    choice_c?: string;
  };
}
