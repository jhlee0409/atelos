import { ScenarioData, PlayerState, Character } from '@/types';

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

RULES:
1. Korean only (한국어). NO foreign scripts.
2. JSON format strictly.
3. Character-driven narrative with emotions.
4. Track stats/flags/relationships.

CURRENT STATE:
- Day {{DAY}}/7
- Stats: {{STATS}}
- Flags: {{FLAGS}}
- Characters: {{CHARS}}

OUTPUT:
{
  "log": "Korean story (100-150 words)",
  "dilemma": {
    "prompt": "Korean dilemma",
    "choice_a": "Choice A",
    "choice_b": "Choice B"
  },
  "statChanges": {
    "scenarioStats": {},
    "flags_acquired": [],
    "survivorStatus": [],
    "hiddenRelationships_change": []
  }
}`;

// 초경량 프롬프트 (150-200 토큰)
const ULTRA_LITE_TEMPLATE = `Korean survival game. Day {{DAY}}/7.
Stats: {{STATS}}
Write Korean story + 2 choices as JSON.`;

// 캐릭터 정보 압축
const compressCharacters = (characters: Character[]): string => {
  return characters
    .filter(char => char.characterName !== '(플레이어)')
    .slice(0, 5) // 최대 5명만
    .map(char => {
      const trait = char.currentTrait?.traitName || char.weightedTraitTypes[0] || '';
      return `${char.characterName}(${trait})`;
    })
    .join(',');
};

// 스탯 정보 압축
const compressStats = (stats: { [key: string]: number }): string => {
  // 주요 스탯만 포함
  const coreStats = ['cityChaos', 'communityCohesion', 'survivalFoundation'];
  return Object.entries(stats)
    .filter(([key]) => coreStats.includes(key))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
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

// 메인 프롬프트 빌더 (최적화 v2)
export const buildOptimizedGamePromptV2 = (
  scenario: ScenarioData,
  playerState: PlayerState,
  playerAction: GamePlayerAction,
  lastLog: string,
  options: {
    ultraLite?: boolean;
    currentDay?: number;
    includeRelationships?: boolean;
  } = {},
): GamePromptData => {
  const { 
    ultraLite = false, 
    currentDay = 1,
    includeRelationships = false 
  } = options;

  // 초경량 모드
  if (ultraLite) {
    const systemPrompt = ULTRA_LITE_TEMPLATE
      .replace('{{DAY}}', currentDay.toString())
      .replace('{{STATS}}', compressStats(playerState.stats));

    const userPrompt = `Action: ${playerAction.actionDescription}`;

    return {
      systemPrompt,
      userPrompt,
      estimatedTokens: 150,
    };
  }

  // 압축된 표준 모드
  const compressedChars = compressCharacters(scenario.characters);
  const compressedStats = compressStats(playerState.stats);
  const compressedFlags = compressFlags(playerState.flags);

  // 관계 정보 (선택적)
  const relationshipInfo = includeRelationships && scenario.initialRelationships
    ? scenario.initialRelationships
        .slice(0, 3)
        .map(rel => `${rel.personA}-${rel.personB}:${rel.value > 0 ? '+' : '-'}`)
        .join(',')
    : '';

  const systemPrompt = COMPRESSED_SYSTEM_TEMPLATE
    .replace('{{TITLE}}', scenario.title)
    .replace('{{DAY}}', currentDay.toString())
    .replace('{{STATS}}', compressedStats)
    .replace('{{FLAGS}}', compressedFlags)
    .replace('{{CHARS}}', compressedChars);

  // 사용자 프롬프트 압축
  const userPrompt = `Previous: "${lastLog.substring(0, 50)}..."
Choice: ${playerAction.actionDescription}
${relationshipInfo ? `Relations: ${relationshipInfo}` : ''}
Continue story with character reactions.`;

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

  // 게임 단계별 조절
  if (currentDay <= 2) {
    return {
      useUltraLite: false,
      includeRelationships: false,
      maxCharacters: 4,
    };
  } else if (currentDay >= 6) {
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
    promptCache.delete(firstKey);
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
  
  return `ATELOS ${scenario.title} - Day 1 start.
Characters: ${compressedChars}
Goal: ${scenario.playerGoal}

Generate Korean dilemma JSON:
{
  "prompt": "Urgent survival situation",
  "choice_a": "Option A", 
  "choice_b": "Option B"
}

Korean only. No foreign text.`;
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