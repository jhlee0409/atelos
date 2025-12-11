// Type definitions
export type Character = {
  roleId: string;
  roleName: string;
  characterName: string;
  backstory: string;
  imageUrl: string;
  weightedTraitTypes: string[];
  isEditing?: boolean;
  currentTrait: Trait | null;
};

export type Relationship = {
  id: string;
  personA: string;
  personB: string;
  value: number;
  reason: string;
  isEditing?: boolean;
};

export type ScenarioStat = {
  id: string;
  name: string;
  description: string;
  current: number;
  min: number;
  max: number;
  initialValue?: number;
  range?: [number, number];
  polarity?: 'positive' | 'negative'; // 높을수록 좋음(positive) / 나쁨(negative)
  isEditing?: boolean;
};

export type Trait = {
  traitId: string;
  traitName: string;
  displayName?: string; // 한글 표시명 (예: "리더십")
  type: 'positive' | 'negative';
  weightType: string;
  displayText: string;
  systemInstruction: string;
  iconUrl: string;
  isEditing?: boolean;
};

export type Dilemma = {
  dilemmaId: string;
  title: string;
  description: string;
  isEditing?: boolean;
};

export type ScenarioFlag = {
  flagName: string;
  description: string;
  type: 'boolean' | 'count';
  initial: boolean | number;
  triggerCondition?: string; // AI에게 알려줄 플래그 부여 조건 (예: "탈출 차량 확보 선택 시")
  isEditing?: boolean;
};

export type SystemCondition =
  | {
      type: 'required_stat';
      statId: string;
      comparison:
        | 'greater_equal'
        | 'less_equal'
        | 'equal'
        | 'greater_than'
        | 'less_than'
        | 'not_equal';
      value: number;
      isEditing?: boolean;
    }
  | {
      type: 'required_flag';
      flagName: string;
      isEditing?: boolean;
    }
  | {
      type: 'survivor_count';
      comparison:
        | 'greater_equal'
        | 'less_equal'
        | 'equal'
        | 'greater_than'
        | 'less_than'
        | 'not_equal';
      value: number;
      isEditing?: boolean;
    };

export type GoalCluster = {
  id: string;
  title: string;
  description: string;
  connectedEndings: string[];
};

export type EndingArchetype = {
  endingId: string;
  title: string;
  description: string;
  systemConditions: SystemCondition[];
  isGoalSuccess?: boolean;
  isEditing?: boolean;
};

export type EndCondition = {
  type: 'time_limit' | 'goal_achievement' | 'condition_met';
  value?: number;
  unit?: 'days' | 'hours';
  statId?: string;
};

export type TraitPool = {
  buffs: Trait[];
  debuffs: Trait[];
};

// =============================================================================
// 스토리 오프닝 시스템 (Story Opening System)
// =============================================================================

/**
 * 주인공 설정 - AI가 자연스러운 오프닝을 생성하기 위한 정보
 */
export interface ProtagonistSetup {
  /** 주인공 이름 (없으면 AI가 적절히 호칭) */
  name?: string;
  /** 주인공 직업/역할 */
  occupation?: string;
  /** 성격 특성 (한 줄 설명) */
  personality?: string;
  /** 일상 루틴 (평범한 삶 묘사용) */
  dailyRoutine?: string;
  /** 주인공의 약점 또는 고민 */
  weakness?: string;
}

/**
 * 캐릭터 소개 방식 타입
 */
export type CharacterIntroductionStyle =
  | 'gradual'    // 점진적 소개 - 스토리 진행에 따라 한 명씩
  | 'immediate'  // 즉시 전체 소개 - 첫 장면에 모든 캐릭터 등장
  | 'contextual'; // 맥락적 소개 - 상황에 따라 자연스럽게 등장

/**
 * 오프닝 톤 타입
 */
export type OpeningTone =
  | 'mysterious'  // 신비로운 - 의문점을 남기며 시작
  | 'urgent'      // 긴박한 - 위기 상황으로 바로 진입
  | 'calm'        // 차분한 - 일상에서 시작하여 점진적으로 변화
  | 'dramatic'    // 극적인 - 강렬한 사건으로 시작
  | 'introspective'; // 내성적 - 주인공의 내면 묘사로 시작

/**
 * 스토리 오프닝 구조
 * 3단계 오프닝: 프롤로그 → 촉발 사건 → 첫 딜레마
 */
export interface StoryOpening {
  /**
   * 프롤로그 - 주인공의 일상, 평범한 삶 묘사
   * 예: "평범한 도시의 평범한 회사원 김민준. 그의 삶은 어제까지 반복되는 서류 작업과 야근의 연속이었다."
   */
  prologue?: string;

  /**
   * 촉발 사건 - 일상을 깨뜨리는 결정적 순간
   * 예: "하지만 오늘, 그의 손끝에서 푸른빛이 터져 나왔다."
   */
  incitingIncident?: string;

  /**
   * 첫 번째 등장 캐릭터 - 촉발 사건 직후 만나는 인물
   * 지정하지 않으면 시나리오의 첫 번째 캐릭터 사용
   */
  firstCharacterToMeet?: string;

  /**
   * 첫 대면 상황 - 첫 캐릭터와 어떤 상황에서 만나는지
   * 예: "그녀는 주인공의 이상한 행동을 목격하고 조용히 다가왔다"
   */
  firstEncounterContext?: string;

  /** 주인공 설정 */
  protagonistSetup?: ProtagonistSetup;

  /** 캐릭터 소개 방식 (기본값: contextual) */
  characterIntroductionStyle?: CharacterIntroductionStyle;

  /** 오프닝 톤 (기본값: calm) */
  openingTone?: OpeningTone;

  /**
   * 오프닝에서 강조할 테마/키워드
   * AI가 이 키워드들을 자연스럽게 녹여서 작성
   */
  thematicElements?: string[];

  /**
   * 시간대 설정 (기본값: morning)
   * 오프닝 장면의 시간대
   */
  timeOfDay?: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

  /**
   * 오프닝 장소
   * 구체적인 장소 설명 (예: "서울 강남의 한 오피스 빌딩")
   */
  openingLocation?: string;
}

export type ScenarioData = {
  scenarioId: string;
  title: string;
  genre: string[];
  coreKeywords: string[];
  posterImageUrl: string;
  synopsis: string;
  playerGoal: string;
  characters: Character[];
  initialRelationships: Relationship[];
  endCondition: EndCondition;
  scenarioStats: ScenarioStat[];
  traitPool: TraitPool;
  flagDictionary: ScenarioFlag[];
  goalCluster?: GoalCluster;
  endingArchetypes: EndingArchetype[];
  status: 'in_progress' | 'testing' | 'active';
  /** 스토리 오프닝 설정 (Phase 7) */
  storyOpening?: StoryOpening;
};

// --- Game-specific state types, not part of scenario definition ---

export type PlayerState = {
  stats: Record<string, number>;
  flags: Record<string, boolean | number>;
  traits: string[]; // array of traitIds
  relationships: Record<string, number>;
};

export type StoryState = {
  currentDay: number;
  currentHour: number;
  turn: number;
  lastNarrative: string;
  lastChoice: {
    action: { actionId: string; description_for_ai: string };
    playerFeedback: string;
  } | null;
  recentEvents: string[];
};

// 스탯 변화 기록
export interface StatChangeRecord {
  statId: string;
  statName: string;
  originalChange: number;
  amplifiedChange: number;
  appliedChange: number;
  previousValue: number;
  newValue: number;
}

// 관계 변화 기록
export interface RelationshipChangeRecord {
  pair: string;
  change: number;
  previousValue: number;
  newValue: number;
}

// 변화 요약 데이터
export interface ChangeSummaryData {
  statChanges: StatChangeRecord[];
  relationshipChanges: RelationshipChangeRecord[];
  flagsAcquired: string[];
  timestamp: number;
}

export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
    /** @deprecated turnsInCurrentDay는 actionPoints로 대체됩니다. 하위 호환성을 위해 유지. */
    turnsInCurrentDay?: number;
    // --- 행동 게이지 시스템 (Phase 4) ---
    /** 현재 잔여 행동 포인트 */
    actionPoints?: number;
    /** 해당 일 최대 행동 포인트 */
    maxActionPoints?: number;
    /** 오늘 수행한 행동 기록 */
    actionsThisDay?: ActionRecord[];
    // --- 맥락 연결 시스템 (Phase 5) ---
    /** 현재 행동 맥락 */
    actionContext?: ActionContext;
    // --- 동적 월드 시스템 (Phase 6) ---
    /** 월드 상태 */
    worldState?: WorldState;
  };
  community: {
    survivors: {
      name: string;
      role: string;
      traits: string[];
      status: string;
    }[];
    hiddenRelationships: { [key: string]: number };
  };
  log: string;
  chatHistory: {
    type: 'system' | 'player' | 'ai' | 'change-summary';
    content: string;
    timestamp: number;
    changeSummary?: ChangeSummaryData; // 변화 요약 데이터 (type이 'change-summary'일 때)
  }[];
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
    choice_c?: string; // 3번째 선택지 (대기/관망 옵션)
  };
  characterArcs?: CharacterArc[]; // 캐릭터 아크 트래킹
  keyDecisions?: KeyDecision[]; // 회상 시스템 - 주요 결정 기록
  lastChangeSummary?: ChangeSummaryData; // 마지막 변화 요약
}

export interface AIResponse {
  log: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
    choice_c?: string; // 3번째 선택지 (대기/관망 옵션)
  };
  statChanges: {
    scenarioStats: { [key: string]: number };
    survivorStatus: { name: string; newStatus: string }[];
    hiddenRelationships_change: any[]; // Type can be refined if needed
    flags_acquired: string[];
    shouldAdvanceTime?: boolean; // AI가 시간 진행 여부를 결정
  };
}

export interface PlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

// 캐릭터 아크 시스템 - 캐릭터별 성장/변화 트래킹
export interface CharacterMoment {
  day: number;
  type: 'relationship' | 'status' | 'decision' | 'revelation';
  description: string;
  relatedCharacter?: string; // 관계 변화 시 상대 캐릭터
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CharacterArc {
  characterName: string;
  moments: CharacterMoment[];
  currentMood: 'hopeful' | 'anxious' | 'angry' | 'resigned' | 'determined';
  trustLevel: number; // -100 ~ 100, 플레이어와의 신뢰도
}

// 회상 시스템 - 주요 결정 기록
export interface KeyDecision {
  day: number;
  turn: number;
  choice: string; // 플레이어가 선택한 선택지 텍스트
  consequence: string; // 선택의 결과 요약 (50자 이내)
  category: 'survival' | 'relationship' | 'moral' | 'strategic';
  flagsAcquired?: string[]; // 이 선택으로 획득한 플래그
  impactedCharacters?: string[]; // 영향받은 캐릭터들
}

export interface AvailableAction {
  actionId: string;
  description_for_ai: string;
}

// Phase 3: 캐릭터 대화 시스템
export interface DialogueTopic {
  topicId: string;
  label: string; // 표시될 대화 주제 (예: "탈출 계획에 대해 묻는다")
  category: 'info' | 'advice' | 'relationship' | 'personal'; // 정보, 조언, 관계, 개인적
}

export interface CharacterDialogueOption {
  characterName: string;
  role: string;
  availableTopics: DialogueTopic[];
  currentMood?: CharacterArc['currentMood'];
  trustLevel?: number;
}

export interface DialogueResponse {
  characterName: string;
  dialogue: string; // 캐릭터의 대사
  mood: CharacterArc['currentMood'];
  infoGained?: string; // 획득한 정보 (있는 경우)
  relationshipChange?: number; // 관계 변화 (있는 경우)
}

// Phase 3: 탐색 시스템
export interface ExplorationLocation {
  locationId: string;
  name: string; // 표시될 장소 이름
  description: string; // 장소 설명
  icon: 'warehouse' | 'entrance' | 'medical' | 'roof' | 'basement' | 'quarters';
  available: boolean; // 탐색 가능 여부
  cooldownUntil?: number; // 쿨다운 (day 단위)
}

export interface ExplorationResult {
  locationId: string;
  narrative: string; // 탐색 결과 서사
  rewards?: {
    statChanges?: { [key: string]: number };
    flagsAcquired?: string[];
    infoGained?: string;
  };
}

// Phase 3: 게임 모드 (선택지, 대화, 탐색)
export type GameMode = 'choice' | 'dialogue' | 'exploration';

// Phase 3: 자유 텍스트 입력
export interface FreeTextInput {
  text: string;
  timestamp: number;
}

// =============================================================================
// Phase 4: 행동 게이지 시스템 (Action Gauge System)
// =============================================================================

/**
 * 행동 유형 - 플레이어가 수행할 수 있는 모든 행동 종류
 */
export type ActionType = 'choice' | 'dialogue' | 'exploration' | 'freeText';

/**
 * 행동 기록 - 각 행동의 상세 정보를 기록
 * 엔딩 분기 및 리플레이 분석에 활용
 */
export interface ActionRecord {
  /** 행동 유형 */
  actionType: ActionType;
  /** 행동 수행 시각 */
  timestamp: number;
  /** 행동 대상 (캐릭터명, 장소명, 선택지 텍스트 등) */
  target?: string;
  /** 소모된 행동 포인트 */
  cost: number;
  /** 행동 수행 시점의 Day */
  day: number;
  /** 행동 결과 요약 */
  result?: {
    /** 스탯 변화 */
    statChanges?: Record<string, number>;
    /** 획득한 플래그 */
    flagsAcquired?: string[];
    /** 관계 변화 */
    relationshipChanges?: Record<string, number>;
    /** 획득한 정보 */
    infoGained?: string;
  };
}

/**
 * 행동 게이지 설정 - 시나리오별 커스터마이징 가능
 * (Phase 4 확장용, 현재는 기본값 사용)
 */
export interface ActionGaugeConfig {
  /** 기본 일일 행동 포인트 */
  baseActionPoints: number;
  /** 행동 유형별 비용 */
  actionCosts: Record<ActionType, number>;
  /** 가변 AP 활성화 여부 */
  enableVariableAP?: boolean;
  /** 가변 AP 계산에 사용할 스탯 ID */
  variableAPStatId?: string;
}

// =============================================================================
// Phase 5: 맥락 연결 시스템 (Context Linking System)
// =============================================================================

/**
 * 발견한 단서/정보 - 탐색/대화를 통해 획득
 */
export interface DiscoveredClue {
  /** 단서 ID (자동 생성) */
  clueId: string;
  /** 단서 내용 */
  content: string;
  /** 발견 출처 */
  source: {
    type: 'exploration' | 'dialogue' | 'choice';
    locationId?: string;
    characterName?: string;
  };
  /** 발견 시점 */
  discoveredAt: {
    day: number;
    actionIndex: number;
  };
  /** 관련 플래그 */
  relatedFlags?: string[];
  /** 관련 캐릭터 */
  relatedCharacters?: string[];
  /** 단서 중요도 */
  importance: 'low' | 'medium' | 'high';
}

/**
 * 캐릭터 현재 상태 - 동적 대화 상대 결정에 사용
 */
export interface CharacterPresence {
  /** 캐릭터 이름 */
  characterName: string;
  /** 현재 위치 */
  currentLocation: string;
  /** 대화 가능 여부 */
  availableForDialogue: boolean;
  /** 대화 불가 사유 */
  unavailableReason?: string;
  /** 현재 활동 */
  currentActivity?: string;
  /** 마지막 상호작용 */
  lastInteraction?: {
    day: number;
    type: 'dialogue' | 'choice';
    summary: string;
  };
}

/**
 * 동적 탐색 위치 - 상황에 따라 생성
 */
export interface DynamicLocation {
  /** 위치 ID */
  locationId: string;
  /** 위치 이름 */
  name: string;
  /** 위치 설명 (현재 상황 반영) */
  description: string;
  /** 탐색 가능 여부 */
  available: boolean;
  /** 탐색 불가 사유 */
  unavailableReason?: string;
  /** 위치 유형 */
  type: 'interior' | 'exterior' | 'hidden' | 'temporary';
  /** 발견 조건 (플래그 또는 이전 탐색) */
  discoveredBy?: string;
  /** 예상 발견물 힌트 */
  hint?: string;
}

/**
 * 현재 행동 맥락 - 모든 AI 호출에 전달
 */
export interface ActionContext {
  /** 현재 위치/장소 */
  currentLocation: string;
  /** 현재 상황 요약 (AI가 생성) */
  currentSituation: string;
  /** 오늘 수행한 행동 요약 */
  todayActions: {
    explorations: { location: string; result: string }[];
    dialogues: { character: string; topic: string; outcome: string }[];
    choices: { choice: string; consequence: string }[];
  };
  /** 발견한 단서들 */
  discoveredClues: DiscoveredClue[];
  /** 긴급한 사안 (다음 선택지에 반영) */
  urgentMatters: string[];
  /** 캐릭터 현재 상태들 */
  characterPresences: CharacterPresence[];
  /** 탐색 가능한 위치들 (동적 생성) */
  availableLocations: DynamicLocation[];
  /** 마지막 업데이트 시점 */
  lastUpdated: {
    day: number;
    actionIndex: number;
  };
}

/**
 * 맥락 업데이트 이벤트 - 행동 후 맥락 변경 사항
 */
export interface ContextUpdate {
  /** 새로 발견한 단서 */
  newClues?: DiscoveredClue[];
  /** 캐릭터 위치/상태 변경 */
  characterChanges?: Partial<CharacterPresence>[];
  /** 새로 개방된 위치 */
  newLocations?: DynamicLocation[];
  /** 닫힌 위치 */
  closedLocations?: string[];
  /** 현재 상황 업데이트 */
  situationUpdate?: string;
  /** 긴급 사안 추가 */
  newUrgentMatters?: string[];
  /** 해결된 긴급 사안 */
  resolvedMatters?: string[];
}

// =============================================================================
// Phase 6: 동적 월드 시스템 (Dynamic World State System)
// =============================================================================

/**
 * 위치 상태 - 위치의 현재 상태를 추적
 */
export type LocationStatus =
  | 'available'      // 탐색 가능
  | 'explored'       // 탐색 완료 (쿨다운 필요)
  | 'destroyed'      // 파괴됨 (영구 접근 불가)
  | 'blocked'        // 일시적 차단 (조건 충족 시 개방)
  | 'hidden'         // 숨겨짐 (발견 필요)
  | 'locked';        // 잠김 (특정 아이템/플래그 필요)

/**
 * 구체적 발견물 - 탐색으로 발견할 수 있는 실체적 아이템/정보
 */
export interface ConcreteDiscovery {
  /** 발견물 고유 ID */
  discoveryId: string;
  /** 발견물 유형 */
  type: 'item' | 'document' | 'equipment' | 'clue' | 'resource';
  /** 발견물 이름 (구체적) */
  name: string;
  /** 발견물 설명 */
  description: string;
  /** 발견 장소 ID */
  locationId: string;
  /** 발견 조건 (플래그/스탯 조건) */
  discoveryCondition?: {
    requiredFlag?: string;
    requiredStat?: { statId: string; minValue: number };
    requiredItem?: string;
  };
  /** 발견 시 효과 */
  effects?: {
    statChanges?: Record<string, number>;
    flagsAcquired?: string[];
    newLocationsUnlocked?: string[];
    locationsDestroyed?: string[];
    locationsBlocked?: string[];
    relationshipChanges?: Record<string, number>;
  };
  /** 발견 여부 */
  discovered: boolean;
  /** 발견 Day */
  discoveredOnDay?: number;
  /** 1회 발견 가능 여부 */
  oneTimeOnly: boolean;
  /** 중요도 */
  importance: 'trivial' | 'minor' | 'major' | 'critical';
}

/**
 * 월드 위치 - 탐색 가능한 위치의 상세 정보
 */
export interface WorldLocation {
  /** 위치 ID */
  locationId: string;
  /** 위치 이름 */
  name: string;
  /** 기본 설명 */
  baseDescription: string;
  /** 현재 상태에 따른 설명 */
  currentDescription: string;
  /** 아이콘 타입 */
  icon: 'warehouse' | 'entrance' | 'medical' | 'roof' | 'basement' | 'quarters' | 'office' | 'corridor' | 'exterior' | 'hidden';
  /** 위치 상태 */
  status: LocationStatus;
  /** 상태 사유 (파괴됨, 차단됨 등일 때) */
  statusReason?: string;
  /** 잠금 해제 조건 */
  unlockCondition?: {
    requiredFlag?: string;
    requiredItem?: string;
    requiredDay?: number;
    requiredExploration?: string; // 다른 위치 탐색 필요
  };
  /** 탐색 쿨다운 (Day 단위) */
  explorationCooldown: number;
  /** 마지막 탐색 Day */
  lastExploredDay?: number;
  /** 연결된 위치들 (여기서 발견되면 개방) */
  connectedLocations?: string[];
  /** 위험도 (높을수록 부정적 이벤트 확률 증가) */
  dangerLevel: 0 | 1 | 2 | 3;
  /** 이 위치에서 발견 가능한 것들 */
  possibleDiscoveries: string[]; // ConcreteDiscovery IDs
}

/**
 * 오브젝트 관계 - 게임 오브젝트 간의 상관관계
 */
export interface ObjectRelation {
  /** 관계 ID */
  relationId: string;
  /** 관계 유형 */
  type:
    | 'character-location'   // 캐릭터가 위치에 있음/관련됨
    | 'character-item'       // 캐릭터가 아이템 소유/관련
    | 'location-item'        // 위치에 아이템이 있음
    | 'character-character'  // 캐릭터 간 관계
    | 'location-location'    // 위치 간 연결
    | 'item-flag';           // 아이템이 플래그와 연결
  /** 주체 */
  subject: { type: 'character' | 'location' | 'item'; id: string };
  /** 대상 */
  object: { type: 'character' | 'location' | 'item' | 'flag'; id: string };
  /** 관계 설명 */
  description: string;
  /** 관계 강도 (-100 ~ 100) */
  strength: number;
  /** 관계 활성화 여부 */
  active: boolean;
  /** 관계 활성화/비활성화 조건 */
  activationCondition?: {
    requiredFlag?: string;
    requiredDay?: number;
  };
}

/**
 * 월드 이벤트 - 게임 상태 변화를 일으키는 이벤트
 */
export interface WorldEvent {
  /** 이벤트 ID */
  eventId: string;
  /** 이벤트 유형 */
  type: 'location_destroyed' | 'location_unlocked' | 'location_blocked' | 'item_discovered' | 'character_moved' | 'character_unavailable';
  /** 이벤트 설명 */
  description: string;
  /** 트리거 조건 */
  trigger: {
    flag?: string;
    stat?: { statId: string; comparison: 'gte' | 'lte' | 'eq'; value: number };
    day?: number;
    exploration?: string; // 특정 위치 탐색 시
    choice?: string; // 특정 선택지 선택 시
  };
  /** 이벤트 효과 */
  effects: {
    locationChanges?: { locationId: string; newStatus: LocationStatus; reason?: string }[];
    characterChanges?: { characterName: string; available: boolean; reason?: string }[];
    newDiscoveries?: string[]; // ConcreteDiscovery IDs to unlock
    removeDiscoveries?: string[]; // ConcreteDiscovery IDs to remove
    newRelations?: ObjectRelation[];
    removeRelations?: string[]; // Relation IDs to remove
  };
  /** 발동 여부 */
  triggered: boolean;
  /** 발동 Day */
  triggeredOnDay?: number;
  /** 1회성 이벤트 여부 */
  oneTime: boolean;
}

/**
 * 월드 상태 - 동적 월드의 전체 상태
 */
export interface WorldState {
  /** 모든 위치 */
  locations: WorldLocation[];
  /** 모든 발견물 */
  discoveries: ConcreteDiscovery[];
  /** 모든 관계 */
  relations: ObjectRelation[];
  /** 대기 중인 이벤트 */
  pendingEvents: WorldEvent[];
  /** 발동된 이벤트 기록 */
  triggeredEvents: WorldEvent[];
  /** 수집한 아이템 목록 */
  inventory: string[]; // ConcreteDiscovery IDs of 'item' type
  /** 획득한 문서/정보 목록 */
  documents: string[]; // ConcreteDiscovery IDs of 'document' or 'clue' type
  /** 월드 상태 마지막 업데이트 */
  lastUpdated: {
    day: number;
    actionIndex: number;
  };
}

/**
 * 월드 상태 업데이트 결과
 */
export interface WorldStateUpdateResult {
  /** 업데이트된 월드 상태 */
  worldState: WorldState;
  /** 트리거된 이벤트들 */
  triggeredEvents: WorldEvent[];
  /** 새로 발견한 것들 */
  newDiscoveries: ConcreteDiscovery[];
  /** 상태가 변경된 위치들 */
  changedLocations: { locationId: string; previousStatus: LocationStatus; newStatus: LocationStatus; reason?: string }[];
  /** UI에 표시할 알림 메시지 */
  notifications: string[];
}
