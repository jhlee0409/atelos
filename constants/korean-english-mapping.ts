// ===== 시나리오 스탯 매핑 =====
export const STAT_MAPPING = {
  // 영어 ID -> 한글 표시명
  cityChaos: '도시 혼란도',
  communityCohesion: '공동체 응집력',
  survivalFoundation: '생존 기반',
  // 다른 시나리오에서 사용할 수 있는 공통 스탯들
  health: '체력',
  morale: '사기',
  resources: '자원',
  reputation: '평판',
  knowledge: '지식',
  security: '보안',
} as const;

// ===== 스탯 극성 매핑 (높을수록 좋은지/나쁜지) =====
export const STAT_POLARITY = {
  // negative: 높을수록 나쁨 (빨간색으로 표시)
  cityChaos: 'negative',
  // positive: 높을수록 좋음 (초록색으로 표시)
  communityCohesion: 'positive',
  survivalFoundation: 'positive',
  // 다른 시나리오용 공통 스탯들
  health: 'positive',
  morale: 'positive',
  resources: 'positive',
  reputation: 'positive',
  knowledge: 'positive',
  security: 'positive',
} as const;

// ===== 시나리오 플래그 매핑 =====
export const FLAG_MAPPING = {
  // 영어 ID -> 한글 표시명 (FLAG_ 접두사 제거하여 관리 개선)
  ESCAPE_VEHICLE_SECURED: '탈출 수단 확보',
  IDEOLOGY_ESTABLISHED: '이념 확립',
  DEFENSES_COMPLETE: '방어 체계 완성',
  LEADER_SACRIFICE: '리더의 희생',
  ALLY_NETWORK_FORMED: '동맹 네트워크 구축',
  GOVERNMENT_CONTACT: '정부 접촉',
  UNDERGROUND_HIDEOUT: '지하 은신처',
  RESOURCE_MONOPOLY: '자원 독점',
  MARTYR_LEGEND: '순교자 전설',
  // 공통 플래그들
  FIRST_AID_TRAINED: '응급처치 훈련',
  LEADERSHIP_ESTABLISHED: '리더십 확립',
  ALLIANCE_FORMED: '동맹 체결',
  SECRET_DISCOVERED: '비밀 발견',
  ENEMY_DEFEATED: '적 격퇴',
} as const;

// ===== 캐릭터 역할 매핑 =====
export const CHARACTER_ROLE_MAPPING = {
  // 영어 ID -> 한글 표시명 (일관성 있는 명명 규칙)
  leader: '리더',
  guardian: '수호자',
  heart: '심장',
  technician: '기술자',
  // 확장 가능한 공통 역할들
  hacker: '해커',
  security_expert: '보안 전문가',
  medical_officer: '의료진',
  logistics_coordinator: '물류 조정관',
  communications_specialist: '통신 전문가',
  scout: '정찰병',
  engineer: '엔지니어',
  diplomat: '외교관',
  strategist: '전략가',
} as const;

// ===== 캐릭터 특성 매핑 =====
export const CHARACTER_TRAIT_MAPPING = {
  // 영어 ID -> 한글 표시명 (체계적 분류)
  // 성격 특성
  leadership: '리더십',
  cynicism: '냉소주의',
  optimistic: '낙관주의자',
  pragmatic: '실용주의자',
  idealistic: '이상주의자',
  cautious: '신중한',
  aggressive: '공격적인',
  analytical: '분석적인',
  empathetic: '공감적인',
  // 행동 특성
  negotiation: '협상',
  decision_making: '의사결정',
  control: '통제',
  principles: '원칙',
  distrust: '불신',
  altruism: '이타심',
  empathy: '공감',
  survival_skills: '생존 기술',
  selfishness: '이기심',
  realism: '현실주의',
  // 능력 특성
  rule_of_law: '법치주의',
  dictatorial: '독재적',
} as const;

// ===== 생존자 상태 매핑 =====
export const STATUS_MAPPING = {
  // 영어 ID -> 한글 표시명
  normal: '정상',
  injured: '부상',
  sick: '질병',
  exhausted: '탈진',
  missing: '실종',
  dead: '사망',
  recovering: '회복 중',
  critical: '위중',
  quarantined: '격리',
} as const;

// ===== 타입 정의 (타입 안전성 향상) =====
export type StatId = keyof typeof STAT_MAPPING;
export type FlagId = keyof typeof FLAG_MAPPING;
export type RoleId = keyof typeof CHARACTER_ROLE_MAPPING;
export type TraitId = keyof typeof CHARACTER_TRAIT_MAPPING;
export type StatusId = keyof typeof STATUS_MAPPING;
export type StatPolarity = 'positive' | 'negative';

// ===== 역방향 매핑 함수들 (개선된 타입 안전성) =====
export const getStatIdByKorean = (koreanName: string): StatId | null => {
  const entry = Object.entries(STAT_MAPPING).find(
    ([_, korean]) => korean === koreanName,
  );
  return entry ? (entry[0] as StatId) : null;
};

export const getFlagIdByKorean = (koreanName: string): FlagId | null => {
  const entry = Object.entries(FLAG_MAPPING).find(
    ([_, korean]) => korean === koreanName,
  );
  return entry ? (entry[0] as FlagId) : null;
};

// ===== 정방향 매핑 함수들 (안전한 기본값 제공) =====
export const getKoreanStatName = (englishId: string): string => {
  return STAT_MAPPING[englishId as StatId] || `[${englishId}]`;
};

export const getKoreanFlagName = (englishId: string): string => {
  // FLAG_ 접두사 처리 개선
  const cleanId = englishId.replace(/^FLAG_/, '') as FlagId;
  return FLAG_MAPPING[cleanId] || `[${englishId}]`;
};

export const getKoreanRoleName = (englishId: string): string => {
  return CHARACTER_ROLE_MAPPING[englishId as RoleId] || `[${englishId}]`;
};

export const getKoreanTraitName = (englishId: string): string => {
  return CHARACTER_TRAIT_MAPPING[englishId as TraitId] || `[${englishId}]`;
};

export const getKoreanStatusName = (englishId: string): string => {
  return STATUS_MAPPING[englishId as StatusId] || `[${englishId}]`;
};

export const getStatPolarity = (englishId: string): StatPolarity => {
  return STAT_POLARITY[englishId as StatId] || 'positive';
};

// ===== 유틸리티 함수들 (관리 편의성 향상) =====
export const isValidStatId = (id: string): id is StatId => {
  return id in STAT_MAPPING;
};

export const isValidFlagId = (id: string): id is FlagId => {
  const cleanId = id.replace(/^FLAG_/, '');
  return cleanId in FLAG_MAPPING;
};

export const getAllStatIds = (): StatId[] => {
  return Object.keys(STAT_MAPPING) as StatId[];
};

export const getAllFlagIds = (): FlagId[] => {
  return Object.keys(FLAG_MAPPING) as FlagId[];
};
