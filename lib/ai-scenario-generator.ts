// AI 시나리오 생성 클라이언트 함수

// v1.4: deprecated 카테고리 제거 (Dynamic Ending System 채택)
export type GenerationCategory =
  | 'scenario_overview'
  | 'characters'
  | 'relationships'
  | 'stats'
  | 'endings'
  | 'traits'
  | 'keywords'
  | 'genre'
  | 'idea_suggestions'
  | 'story_opening'
  | 'gameplay_config';

export interface GenerationContext {
  genre?: string[];
  title?: string;
  synopsis?: string;
  existingCharacters?: string[];
  existingStats?: string[];
  totalDays?: number;
}

// 카테고리별 응답 타입
export interface ScenarioOverviewResult {
  title: string;
  synopsis: string;
  playerGoal: string;
  genre: string[];
  coreKeywords: string[];
  scenarioId: string;
}

export interface CharacterResult {
  roleId: string;
  roleName: string;
  characterName: string;
  backstory: string;
  suggestedTraits: string[];
}

export interface StatResult {
  id: string;
  name: string;
  description: string;
  min: number;
  max: number;
  initialValue: number;
  polarity: 'positive' | 'negative';
}

export interface RelationshipResult {
  personA: string;
  personB: string;
  value: number;
  reason: string;
}

export interface EndingResult {
  endingId: string;
  title: string;
  description: string;
  isGoalSuccess: boolean;
  suggestedConditions: {
    stats: { statId: string; comparison: string; value: number }[];
    // [v1.4 REMOVED] flags - Dynamic Ending System에서 ActionHistory로 대체
  };
}

export interface TraitResult {
  traitId: string;
  traitName: string;
  displayName: string; // 한글 표시명
  description: string;
  effect: string;
}

export interface TraitsResult {
  buffs: TraitResult[];
  debuffs: TraitResult[];
}

export type ToneType = 'dark' | 'hopeful' | 'thriller' | 'dramatic' | 'comedic' | 'mysterious' | 'romantic' | 'action' | 'melancholic' | 'satirical' | 'epic' | 'intimate';

export interface IdeaSuggestion {
  idea: string;
  genre: string;
  hook: string;
  tone: ToneType;
  targetLength: 'short' | 'medium' | 'long';
  setting: string;
}

export interface IdeaSuggestionsResult {
  ideas: IdeaSuggestion[];
}

// =============================================================================
// 스토리 오프닝 시스템 (Phase 7)
// =============================================================================

export interface ProtagonistSetupResult {
  name?: string;
  occupation: string;
  personality: string;
  dailyRoutine?: string;
  weakness?: string;
}

export type OpeningTone = 'calm' | 'mysterious' | 'urgent' | 'dramatic' | 'introspective';
export type CharacterIntroductionStyle = 'gradual' | 'immediate' | 'contextual';
export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface StoryOpeningResult {
  prologue: string;
  incitingIncident: string;
  firstCharacterToMeet: string;
  firstEncounterContext: string;
  protagonistSetup: ProtagonistSetupResult;
  openingTone: OpeningTone;
  characterIntroductionStyle?: CharacterIntroductionStyle;
  timeOfDay?: TimeOfDay;
  openingLocation?: string;
  thematicElements: string[];
  npcRelationshipExposure?: 'hidden' | 'partial' | 'visible';
}

// =============================================================================
// 게임플레이 설정 (GameplayConfig Generation)
// v1.4: 실제 게임에서 사용되는 필드만 유지
// =============================================================================

export interface GameplayConfigResult {
  routeActivationRatio: number;
  endingCheckRatio: number;
  narrativePhaseRatios: {
    setup: number;
    rising_action: number;
    midpoint: number;
    climax: number;
  };
  actionPointsPerDay: number;
  criticalStatThreshold: number;
  warningStatThreshold: number;
  reasoning: string; // AI가 왜 이렇게 설정했는지 설명
}

// =============================================================================
// AI 응답 타입
// =============================================================================

export interface AIGenerationResponse<T> {
  success: boolean;
  category: GenerationCategory;
  data: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// AI 생성 API 호출 함수
export async function generateWithAI<T>(
  category: GenerationCategory,
  input: string,
  context?: GenerationContext,
): Promise<AIGenerationResponse<T>> {
  const response = await fetch('/api/admin/ai-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category,
      input,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI 생성에 실패했습니다.');
  }

  return response.json();
}

// 카테고리별 라벨 및 설명
export const CATEGORY_INFO: Record<
  GenerationCategory,
  { label: string; description: string; placeholder: string }
> = {
  scenario_overview: {
    label: '시나리오 개요',
    description: '제목, 장르, 시놉시스, 목표를 한번에 생성합니다.',
    placeholder:
      '예: 좀비 아포칼립스에서 생존자 그룹을 이끌고 안전 지대를 찾아 떠나는 이야기',
  },
  characters: {
    label: '캐릭터',
    description: '시나리오에 등장할 캐릭터들을 생성합니다.',
    placeholder:
      '예: 전직 군인 리더, 의사 출신 힐러, 기술자, 그리고 어린 생존자가 필요해',
  },
  relationships: {
    label: '관계',
    description: '캐릭터들 간의 초기 관계를 생성합니다.',
    placeholder:
      '예: 리더와 의사는 오래된 동료, 기술자는 리더를 불신함',
  },
  stats: {
    label: '스탯',
    description: '게임 진행에 영향을 주는 수치 시스템을 생성합니다.',
    placeholder: '예: 자원 관리, 그룹의 사기, 안전도, 외부 위협 수준을 추적하고 싶어',
  },
  endings: {
    label: '엔딩',
    description: '다양한 결말과 그 조건을 생성합니다.',
    placeholder:
      '예: 희망적인 탈출 성공, 비극적인 전멸, 새로운 정착지 건설 등의 엔딩',
  },
  traits: {
    label: '특성',
    description: '캐릭터에게 부여할 버프/디버프 특성을 생성합니다.',
    placeholder:
      '예: 리더십, 의료 지식, 기계 수리 같은 긍정적 특성과 트라우마, 부상 같은 부정적 특성',
  },
  keywords: {
    label: '키워드',
    description: '시나리오를 대표하는 핵심 키워드를 생성합니다.',
    placeholder: '예: 포스트아포칼립스 좀비 서바이벌 그룹 갈등 희망',
  },
  genre: {
    label: '장르',
    description: '시나리오에 적합한 장르 태그를 생성합니다.',
    placeholder: '예: 종말 이후 세계에서 인간성을 지키려는 심리 드라마',
  },
  idea_suggestions: {
    label: '아이디어 추천',
    description: '다양한 시나리오 아이디어를 추천받습니다.',
    placeholder: '예: SF, 호러 등 원하는 장르를 입력하거나 비워두세요',
  },
  // 스토리 오프닝 시스템 (Phase 7)
  story_opening: {
    label: '스토리 오프닝',
    description: '게임 시작 시 플레이어를 세계관에 몰입시키는 오프닝을 생성합니다.',
    placeholder: '시나리오 정보가 자동으로 사용됩니다',
  },
  gameplay_config: {
    label: '게임플레이 설정',
    description: '시나리오 특성에 맞는 게임플레이 설정을 자동 생성합니다 (액션 포인트, 서사 단계 등).',
    placeholder: '스탯, 장르 정보가 자동으로 사용됩니다',
  },
};
