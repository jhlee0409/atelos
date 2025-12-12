/**
 * 테스트용 목 시나리오 데이터
 * 실제 ZERO_HOUR.json 구조를 기반으로 함
 */

import type { ScenarioData, PlayerState, Character, EndingArchetype, ScenarioStat } from '@/types';

// =============================================================================
// Mock Scenario Stats
// =============================================================================

export const mockScenarioStats: ScenarioStat[] = [
  {
    id: 'cityChaos',
    name: '도시 혼란도',
    description: '도시의 전반적인 혼란 수준',
    current: 50,
    initialValue: 50,
    min: 0,
    max: 100,
    range: { min: 0, max: 100 },
  },
  {
    id: 'communityCohesion',
    name: '공동체 결속력',
    description: '커뮤니티의 단결 수준',
    current: 50,
    initialValue: 50,
    min: 0,
    max: 100,
    range: { min: 0, max: 100 },
  },
  {
    id: 'survivalFoundation',
    name: '생존의 기반',
    description: '기본적인 생존 조건',
    current: 50,
    initialValue: 50,
    min: 0,
    max: 100,
    range: { min: 0, max: 100 },
  },
  {
    id: 'citizenTrust',
    name: '시민 신뢰도',
    description: '시민들의 신뢰',
    current: 50,
    initialValue: 50,
    min: 0,
    max: 100,
    range: { min: 0, max: 100 },
  },
  {
    id: 'resourceLevel',
    name: '자원 수준',
    description: '보유 자원 량',
    current: 40,
    initialValue: 40,
    min: 0,
    max: 100,
    range: { min: 0, max: 100 },
  },
];

// =============================================================================
// Mock Characters
// =============================================================================

export const mockCharacters: Character[] = [
  {
    roleId: 'leader',
    roleName: '리더',
    characterName: '박지현',
    backstory: '전직 소방관. 재난 대응 경험이 풍부하다.',
    imageUrl: '',
    weightedTraitTypes: [
      { traitType: 'courageous', weight: 3 },
      { traitType: 'protective', weight: 2 },
    ],
    currentTrait: {
      id: 'courageous',
      name: '용감한',
      type: 'buff',
      description: '위험 상황에서 진가를 발휘한다',
    },
  },
  {
    roleId: 'medic',
    roleName: '의료진',
    characterName: '김서연',
    backstory: '응급실 간호사 출신. 부상자 치료에 능숙하다.',
    imageUrl: '',
    weightedTraitTypes: [
      { traitType: 'compassionate', weight: 3 },
      { traitType: 'skilled', weight: 2 },
    ],
    currentTrait: {
      id: 'compassionate',
      name: '자비로운',
      type: 'buff',
      description: '다른 이들을 돌보는 데 헌신적이다',
    },
  },
  {
    roleId: 'scout',
    roleName: '정찰대',
    characterName: '이동훈',
    backstory: '산악 등반가. 외부 탐색과 지형 파악에 능하다.',
    imageUrl: '',
    weightedTraitTypes: [
      { traitType: 'observant', weight: 3 },
      { traitType: 'agile', weight: 2 },
    ],
    currentTrait: {
      id: 'observant',
      name: '관찰력',
      type: 'buff',
      description: '주변 상황을 빠르게 파악한다',
    },
  },
];

// =============================================================================
// Mock Endings (stat-based only, no flags)
// =============================================================================

export const mockEndingArchetypes: EndingArchetype[] = [
  {
    endingId: 'ENDING_SURVIVAL_SUCCESS',
    title: '생존의 기적',
    description: '모든 역경을 이겨내고 생존에 성공했다.',
    isGoalSuccess: true,
    systemConditions: [
      {
        type: 'required_stat',
        statId: 'survivalFoundation',
        comparison: 'greater_equal',
        value: 70,
      },
      {
        type: 'required_stat',
        statId: 'communityCohesion',
        comparison: 'greater_equal',
        value: 60,
      },
    ],
  },
  {
    endingId: 'ENDING_ESCAPE_SUCCESS',
    title: '탈출 성공',
    description: '위험을 무릅쓰고 탈출에 성공했다.',
    isGoalSuccess: true,
    systemConditions: [
      {
        type: 'required_stat',
        statId: 'survivalFoundation',
        comparison: 'greater_equal',
        value: 60,
      },
      {
        type: 'required_stat',
        statId: 'cityChaos',
        comparison: 'less_than',
        value: 80,
      },
    ],
  },
  {
    endingId: 'ENDING_CHAOS_COLLAPSE',
    title: '혼돈의 종말',
    description: '도시가 혼란에 휩싸이고 모든 것이 무너졌다.',
    isGoalSuccess: false,
    systemConditions: [
      {
        type: 'required_stat',
        statId: 'cityChaos',
        comparison: 'greater_equal',
        value: 90,
      },
    ],
  },
  {
    endingId: 'ENDING_TIME_UP',
    title: '결단의 날',
    description: '시간이 다 되었다.',
    isGoalSuccess: false,
    systemConditions: [],
  },
];

// =============================================================================
// Mock Full Scenario
// =============================================================================

export const mockScenario: ScenarioData = {
  scenarioId: 'test-scenario-001',
  title: '테스트 시나리오',
  synopsis: '종말 이후의 세계에서 생존자들을 이끌어야 합니다.',
  playerGoal: '7일간 생존하고 커뮤니티를 이끄세요.',
  genre: '포스트 아포칼립스',
  thumbnailUrl: '',
  characters: mockCharacters,
  initialRelationships: [
    { pair: ['박지현', '김서연'], value: 60 },
    { pair: ['박지현', '이동훈'], value: 40 },
    { pair: ['김서연', '이동훈'], value: 50 },
  ],
  scenarioStats: mockScenarioStats,
  traitPool: [
    {
      id: 'courageous',
      name: '용감한',
      type: 'buff',
      description: '위험 상황에서 진가를 발휘',
    },
    {
      id: 'compassionate',
      name: '자비로운',
      type: 'buff',
      description: '다른 이들을 돌보는 데 헌신적',
    },
    {
      id: 'cowardly',
      name: '겁많은',
      type: 'debuff',
      description: '위험 상황에서 위축됨',
    },
  ],
  // flagDictionary removed - using ActionHistory for tracking
  endingArchetypes: mockEndingArchetypes,
  endCondition: {
    type: 'time_limit',
    days: 7,
    hours: 168,
  },
};

// =============================================================================
// Mock Player States
// =============================================================================

export const mockPlayerStateInitial: PlayerState = {
  stats: {
    cityChaos: 50,
    communityCohesion: 50,
    survivalFoundation: 50,
    citizenTrust: 50,
    resourceLevel: 40,
  },
  flags: {}, // deprecated - kept for backwards compatibility
  traits: [],
  relationships: {
    '박지현-김서연': 60,
    '박지현-이동훈': 40,
    '김서연-이동훈': 50,
  },
};

export const mockPlayerStateMidGame: PlayerState = {
  stats: {
    cityChaos: 65,
    communityCohesion: 45,
    survivalFoundation: 55,
    citizenTrust: 40,
    resourceLevel: 35,
  },
  flags: {}, // deprecated - kept for backwards compatibility
  traits: [],
  relationships: {
    '박지현-김서연': 55,
    '박지현-이동훈': 50,
    '김서연-이동훈': 45,
  },
};

export const mockPlayerStateEndingSuccess: PlayerState = {
  stats: {
    cityChaos: 30,
    communityCohesion: 75,
    survivalFoundation: 80,
    citizenTrust: 70,
    resourceLevel: 60,
  },
  flags: {}, // deprecated - kept for backwards compatibility
  traits: [],
  relationships: {
    '박지현-김서연': 80,
    '박지현-이동훈': 70,
    '김서연-이동훈': 65,
  },
};

export const mockPlayerStateChaosEnding: PlayerState = {
  stats: {
    cityChaos: 95,
    communityCohesion: 20,
    survivalFoundation: 30,
    citizenTrust: 15,
    resourceLevel: 10,
  },
  flags: {}, // deprecated - kept for backwards compatibility
  traits: [],
  relationships: {
    '박지현-김서연': 20,
    '박지현-이동훈': 15,
    '김서연-이동훈': 25,
  },
};

// =============================================================================
// Mock AI Responses
// =============================================================================

export const mockValidAIResponse = {
  log: '박지현이 창고 문을 열자, 먼지 냄새와 함께 오래된 물자들이 눈에 들어왔다. "여기 식량이 꽤 남아있어요." 김서연이 조심스럽게 선반을 확인하며 말했다. 하지만 그 순간, 바깥에서 낯선 소리가 들려왔다. 누군가 접근하고 있었다.',
  dilemma: {
    prompt: '창고 바깥에서 발소리가 들린다. 어떻게 대응할 것인가?',
    choice_a: '조용히 숨어서 상대방을 관찰한다',
    choice_b: '당당하게 나가서 누구인지 확인한다',
    choice_c: '김서연에게 후방 경계를 맡기고 정찰한다',
  },
  statChanges: {
    scenarioStats: {
      resourceLevel: 10,
      cityChaos: -5,
    },
    survivorStatus: [],
    hiddenRelationships_change: [],
    flags_acquired: [], // deprecated - kept for backwards compatibility
  },
};

export const mockInvalidAIResponse_MissingFields = {
  log: '상황이 전개되었습니다.',
  dilemma: {
    prompt: '선택하세요',
    // choice_a, choice_b 누락
  },
  statChanges: {
    scenarioStats: {},
  },
};

export const mockInvalidAIResponse_LanguageMixed = {
  log: '박지현이 문을 열었다. مرحبا العالم 이상한 언어가 섞여있다. ภาษาไทย 태국어도 보인다.',
  dilemma: {
    prompt: 'นี่คือการทดสอบ 테스트 प्रश्न',
    choice_a: '선택 А (러시아어)',
    choice_b: '선택 B 정상',
  },
  statChanges: {
    scenarioStats: { cityChaos: 5 },
    survivorStatus: [],
    hiddenRelationships_change: [],
    flags_acquired: [],
  },
};

export const mockInvalidAIResponse_ExcessiveStatChange = {
  log: '엄청난 변화가 일어났습니다.',
  dilemma: {
    prompt: '큰 결정의 순간입니다.',
    choice_a: '적극적으로 행동한다',
    choice_b: '신중하게 접근한다',
  },
  statChanges: {
    scenarioStats: {
      cityChaos: 100, // 초과 (max 40)
      resourceLevel: -60, // 초과 (max -40)
    },
    survivorStatus: [],
    hiddenRelationships_change: [],
    flags_acquired: [],
  },
};
