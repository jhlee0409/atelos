import { ScenarioData, PlayerState, Character, KeyDecision, ActionContext } from '@/types';
import { getCompactGenreStyle, getNarrativeStyleFromGenres } from './genre-narrative-styles';
import { formatContextForPrompt } from './context-manager';
import { getTotalDays, getGameplayConfig, DEFAULT_GAMEPLAY_CONFIG } from './gameplay-config';

// ===========================================
// 토큰 최적화 v2: 압축된 프롬프트 시스템
// ===========================================

export interface GamePromptData {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
}

export interface GamePlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

// 압축된 시스템 프롬프트 템플릿
const COMPRESSED_SYSTEM_TEMPLATE = `You are GENESIS, AI director for {{TITLE}} scenario.
Genre: {{GENRE}}

RULES:
1. Korean only (한국어). NO foreign scripts.
2. JSON format strictly.
3. Character-driven narrative with emotions.
4. Track stats/flags/relationships.

{{GENRE_STYLE}}

WRITING STYLE:
- **스탯 숫자 절대 금지**: 20, 40, 60 같은 수치 노출 금지
- **스탯명 절대 금지**: "생존의 기반", "결속력", "cityChaos" 등 스탯 관련 단어 금지
- **빈 괄호 금지**: "()", "( )" 사용 금지
- **좋은 예**: "상황이 위태로웠다", "자원이 부족했다"
- **나쁜 예**: "생존의 기반()이 20밖에" ❌, "결속력이 40으로" ❌
- 대사와 묘사를 줄바꿈으로 구분하세요
- **중요한 대사**나 *감정*은 마크다운으로 강조하세요
- 같은 표현을 반복하지 마세요 (눈빛, 분위기 등 다양하게)
- 각 캐릭터의 대사는 새 문단으로 시작하세요

CURRENT STATE:
- Day {{DAY}}/7
- Stats: {{STATS}}
- Flags: {{FLAGS}}
- Characters: {{CHARS}}

VALID STAT IDs (use ONLY these in scenarioStats): {{STAT_IDS}}

OUTPUT:
{
  "log": "Korean story (100-150 words, use \\n for paragraphs)",
  "dilemma": {
    "prompt": "Korean dilemma",
    "choice_a": "Active choice (적극적 ~한다)",
    "choice_b": "Cautious choice (신중한 ~한다)",
    "choice_c": "Wait/observe choice (대기/관망 ~한다)"
  },
  "statChanges": {
    "scenarioStats": {},
    "flags_acquired": [],
    "survivorStatus": [],
    "hiddenRelationships_change": [],
    "shouldAdvanceTime": false
  }
}

TIME: shouldAdvanceTime=false (default), true ONLY for major day-ending events.`;

// 초경량 프롬프트 (150-200 토큰) - JSON 형식 명시
const ULTRA_LITE_TEMPLATE = `Korean survival game. Day {{DAY}}/7.
Stats: {{STATS}}
VALID STAT IDs: {{STAT_IDS}}

You MUST respond with ONLY this JSON (no other text):
{
  "log": "한국어 서사 (100자 이상)",
  "dilemma": {
    "prompt": "상황 설명",
    "choice_a": "적극적 선택지 (~한다로 끝남)",
    "choice_b": "신중한 선택지 (~한다로 끝남)",
    "choice_c": "대기/관망 선택지 (~한다로 끝남)"
  },
  "statChanges": {
    "scenarioStats": {"USE_STAT_IDS_ABOVE": 5},
    "flags_acquired": [],
    "survivorStatus": [],
    "hiddenRelationships_change": []
  }
}

Rules: Korean only. 3 choices (active/cautious/wait). Choices must end with ~한다/~이다.`;

// 캐릭터 정보 압축
const compressCharacters = (characters: Character[]): string => {
  return characters
    .filter(char => char.characterName !== '(플레이어)')
    .slice(0, 5) // 최대 5명만
    .map(char => {
      const trait = char.currentTrait?.displayName || char.currentTrait?.traitName || char.weightedTraitTypes[0] || '';
      return `${char.characterName}(${trait})`;
    })
    .join(',');
};

// 스탯 정보 압축 - 시나리오의 모든 스탯을 동적으로 포함
const compressStats = (
  stats: { [key: string]: number },
  scenarioStats?: { id: string; name: string }[],
): string => {
  if (scenarioStats && scenarioStats.length > 0) {
    // 시나리오에 정의된 모든 스탯 포함
    return scenarioStats
      .map((stat) => `${stat.id}:${stats[stat.id] ?? 0}`)
      .join(',');
  }
  // 폴백: 모든 스탯 포함
  return Object.entries(stats)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
};

// AI가 사용해야 할 스탯 ID 목록 생성
const buildStatIdList = (scenarioStats: { id: string; name: string }[]): string => {
  return scenarioStats
    .map((stat) => `"${stat.id}"(${stat.name})`)
    .join(', ');
};

// 플래그 정보 압축
const compressFlags = (flags: { [key: string]: boolean | number }): string => {
  const activeFlags = Object.entries(flags)
    .filter(([, value]) => value)
    .map(([key]) => key.replace('FLAG_', '').substring(0, 10))
    .slice(0, 3); // 최대 3개
  return activeFlags.length > 0 ? activeFlags.join(',') : 'None';
};

// 최근 대화 요약 (토큰 절약)
const summarizeRecentChat = (chatHistory: any[], maxLength: number = 100): string => {
  if (!chatHistory || chatHistory.length === 0) return '';

  const recentChat = chatHistory.slice(-2); // 최근 2개만
  return recentChat
    .map(chat => chat.message?.substring(0, 50) || '')
    .join(' → ')
    .substring(0, maxLength);
};

// 압축된 서사 단계 힌트 (토큰 최적화)
const getCompactNarrativeHint = (currentDay: number, scenario?: ScenarioData | null): string => {
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  const ratios = config.narrativePhaseRatios ?? DEFAULT_GAMEPLAY_CONFIG.narrativePhaseRatios;
  const dayRatio = currentDay / totalDays;

  if (dayRatio <= ratios.setup) return 'Phase: SETUP - Introduce characters, build tension';
  if (dayRatio <= ratios.rising_action) return 'Phase: RISING - Route branching, major conflicts';
  if (dayRatio <= ratios.midpoint) return 'Phase: MIDPOINT - Route lock-in, point of no return';
  return 'Phase: CLIMAX - Final resolution, emotional payoff';
};

// 메인 프롬프트 빌더 (최적화 v2)
// 압축된 주요 결정 포맷 (토큰 최적화)
const formatKeyDecisionsCompact = (
  keyDecisions?: KeyDecision[],
  maxDecisions: number = 3,
): string => {
  if (!keyDecisions || keyDecisions.length === 0) return '';
  const recent = keyDecisions.slice(-maxDecisions);
  return recent
    .map((d) => `D${d.day}:"${d.choice.substring(0, 20)}..."→${d.consequence.substring(0, 20)}`)
    .join('|');
};

export const buildOptimizedGamePromptV2 = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
  options: {
    ultraLite?: boolean;
    currentDay?: number;
    includeRelationships?: boolean;
    keyDecisions?: KeyDecision[];
    actionContext?: ActionContext;
  } = {},
): GamePromptData => {
  const {
    ultraLite = false,
    currentDay = 1,
    includeRelationships = false,
    keyDecisions,
    actionContext,
  } = options;

  // 초경량 모드
  if (ultraLite) {
    const statIdList = buildStatIdList(scenario.scenarioStats);
    const systemPrompt = ULTRA_LITE_TEMPLATE
      .replace('{{DAY}}', currentDay.toString())
      .replace('{{STATS}}', compressStats(playerState.stats, scenario.scenarioStats))
      .replace('{{STAT_IDS}}', statIdList);

    const userPrompt = `Action: ${playerAction.actionDescription}`;

    return {
      systemPrompt,
      userPrompt,
      estimatedTokens: 150,
    };
  }

  // 압축된 표준 모드
  const compressedChars = compressCharacters(scenario.characters);
  const compressedStats = compressStats(playerState.stats, scenario.scenarioStats);
  const compressedFlags = compressFlags(playerState.flags);
  const statIdList = buildStatIdList(scenario.scenarioStats);

  // 장르별 스타일 (압축 버전)
  const genreText = scenario.genre?.join(', ') || '드라마';
  const genreStyle = getNarrativeStyleFromGenres(scenario.genre || []);
  const compactGenreStyle = `Tone: ${genreStyle.emotionalRange}
Theme: ${genreStyle.thematicFocus}
Dilemma: ${genreStyle.dilemmaTypes[0]}`;

  // 관계 정보 (선택적)
  const relationshipInfo = includeRelationships && scenario.initialRelationships
    ? scenario.initialRelationships
        .slice(0, 3)
        .map(rel => `${rel.personA}-${rel.personB}:${rel.value > 0 ? '+' : '-'}`)
        .join(',')
    : '';

  const systemPrompt = COMPRESSED_SYSTEM_TEMPLATE
    .replace('{{TITLE}}', scenario.title)
    .replace('{{GENRE}}', genreText)
    .replace('{{GENRE_STYLE}}', compactGenreStyle)
    .replace('{{DAY}}', currentDay.toString())
    .replace('{{STATS}}', compressedStats)
    .replace('{{FLAGS}}', compressedFlags)
    .replace('{{CHARS}}', compressedChars)
    .replace('{{STAT_IDS}}', statIdList);

  // 서사 단계 힌트
  const narrativeHint = getCompactNarrativeHint(currentDay, scenario);

  // 회상 시스템 - 주요 결정 (서사 연속성)
  const pastDecisions = formatKeyDecisionsCompact(keyDecisions, 3);

  // 맥락 연결 시스템 - 오늘의 행동과 발견한 단서 포함
  const contextSection = actionContext
    ? `\nTODAY'S CONTEXT (이전 행동과 연결하세요):\n${formatContextForPrompt(actionContext)}`
    : '';

  // 사용자 프롬프트 압축
  const userPrompt = `Previous: "${lastLog.substring(0, 50)}..."
Choice: ${playerAction.actionDescription}
${relationshipInfo ? `Relations: ${relationshipInfo}` : ''}
${pastDecisions ? `PastChoices: ${pastDecisions}` : ''}
${contextSection}
${narrativeHint}
Continue story with character reactions, referencing past choices and today's context for continuity.`;

  return {
    systemPrompt,
    userPrompt,
    estimatedTokens: ultraLite ? 150 : 400,
  };
};

// 동적 복잡도 조절
export const getDynamicComplexity = (
  currentDay: number,
  tokenBudget: number,
  qualityScore?: number,
  scenario?: ScenarioData | null,
): {
  useUltraLite: boolean;
  includeRelationships: boolean;
  maxCharacters: number;
} => {
  // 토큰 예산에 따른 자동 조절
  if (tokenBudget < 5000) {
    return {
      useUltraLite: true,
      includeRelationships: false,
      maxCharacters: 3,
    };
  }

  // 품질 점수가 낮으면 더 많은 정보 포함
  if (qualityScore && qualityScore < 60) {
    return {
      useUltraLite: false,
      includeRelationships: true,
      maxCharacters: 5,
    };
  }

  // 게임 단계별 조절 (동적 계산)
  const totalDays = getTotalDays(scenario);
  const config = getGameplayConfig(scenario);
  const ratios = config.narrativePhaseRatios ?? DEFAULT_GAMEPLAY_CONFIG.narrativePhaseRatios;
  const dayRatio = currentDay / totalDays;

  // 초기 단계: setup 비율 이하 (기본 30% = Day 1-2 for 7일 게임)
  if (dayRatio <= ratios.setup) {
    return {
      useUltraLite: false,
      includeRelationships: false,
      maxCharacters: 4,
    };
  }
  // 후반 단계: climax 직전 이상 (기본 75% 이상 = Day 6+ for 7일 게임)
  if (dayRatio >= ratios.midpoint) {
    // 엔딩은 고품질
    return {
      useUltraLite: false,
      includeRelationships: true,
      maxCharacters: 6,
    };
  }

  return {
    useUltraLite: false,
    includeRelationships: true,
    maxCharacters: 5,
  };
};

// 프롬프트 캐싱 시스템
const promptCache = new Map<string, GamePromptData>();

export const getCachedPrompt = (
  cacheKey: string,
  builder: () => GamePromptData,
): GamePromptData => {
  if (promptCache.has(cacheKey)) {
    const cached = promptCache.get(cacheKey)!;
    console.log(`💾 프롬프트 캐시 히트: ${cached.estimatedTokens} 토큰 절약`);
    return cached;
  }

  const newPrompt = builder();
  promptCache.set(cacheKey, newPrompt);
  
  // 캐시 크기 제한
  if (promptCache.size > 20) {
    const firstKey = promptCache.keys().next().value;
    if (firstKey !== undefined) {
      promptCache.delete(firstKey);
    }
  }

  return newPrompt;
};

// 토큰 사용량 예측
export const estimateTokenUsage = (
  text: string,
  language: 'korean' | 'english' = 'korean',
): number => {
  // 한국어는 평균적으로 영어보다 더 많은 토큰 사용
  const multiplier = language === 'korean' ? 1.5 : 1;
  // 대략적인 추정: 4글자당 1토큰
  return Math.ceil((text.length / 4) * multiplier);
};

// 프롬프트 압축 유틸리티
export const compressPrompt = (
  prompt: string,
  maxTokens: number = 1000,
): string => {
  const estimated = estimateTokenUsage(prompt);
  
  if (estimated <= maxTokens) {
    return prompt;
  }

  // 압축 전략
  let compressed = prompt
    // 연속 공백 제거
    .replace(/\s+/g, ' ')
    // 불필요한 줄바꿈 제거
    .replace(/\n+/g, '\n')
    // 중복 문구 제거
    .replace(/(\b\w+\b)(?:\s+\1)+/gi, '$1');

  // 여전히 길면 뒷부분 자르기
  if (estimateTokenUsage(compressed) > maxTokens) {
    const targetLength = Math.floor((maxTokens * 4) / 1.5);
    compressed = compressed.substring(0, targetLength) + '...';
  }

  return compressed;
};

// 초기 딜레마용 최적화 프롬프트
export const buildInitialDilemmaPromptV2 = (
  scenario: ScenarioData,
  characters: Character[],
): string => {
  const compressedChars = compressCharacters(characters);
  const genreText = scenario.genre?.join(', ') || '드라마';
  const genreStyle = getNarrativeStyleFromGenres(scenario.genre || []);

  return `ATELOS ${scenario.title} - Day 1 start.
Genre: ${genreText}
Characters: ${compressedChars}
Goal: ${scenario.playerGoal}

Genre Style:
- Tone: ${genreStyle.emotionalRange}
- Theme: ${genreStyle.thematicFocus}
- Dilemma type: ${genreStyle.dilemmaTypes[0]}

Generate Korean dilemma JSON:
{
  "prompt": "Urgent ${genreText} situation (한국어로 작성)",
  "choice_a": "적극적 행동 (한국어, ~한다로 끝남)",
  "choice_b": "신중한 접근 (한국어, ~한다로 끝남)",
  "choice_c": "대기/관망 (한국어, ~한다로 끝남)"
}

Korean only. 3 choices (active/cautious/wait). Match the ${genreText} genre tone.`;
};

// 프롬프트 품질 메트릭
export const analyzePromptEfficiency = (
  promptData: GamePromptData,
): {
  efficiency: number;
  suggestions: string[];
} => {
  const totalLength = promptData.systemPrompt.length + promptData.userPrompt.length;
  const estimatedTokens = promptData.estimatedTokens;
  
  // 효율성 = 정보밀도 / 토큰수
  const efficiency = (totalLength / estimatedTokens) * 100;
  
  const suggestions: string[] = [];
  
  if (estimatedTokens > 1000) {
    suggestions.push('프롬프트가 너무 깁니다. 압축을 고려하세요.');
  }
  
  if (efficiency < 50) {
    suggestions.push('정보 밀도가 낮습니다. 더 간결하게 작성하세요.');
  }
  
  // 반복 문구 체크
  const words = (promptData.systemPrompt + promptData.userPrompt).split(/\s+/);
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  const repetitive = Array.from(wordFreq.entries())
    .filter(([word, count]) => word.length > 3 && count > 3)
    .map(([word]) => word);
    
  if (repetitive.length > 0) {
    suggestions.push(`반복 단어 감소: ${repetitive.slice(0, 3).join(', ')}`);
  }
  
  return { efficiency, suggestions };
};