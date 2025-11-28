import { ScenarioData } from '@/types';

export const initialScenario: ScenarioData = {
  scenarioId: '',
  title: '',
  genre: [],
  coreKeywords: [],
  posterImageUrl: '',
  synopsis: '',
  playerGoal: '',
  characters: [],
  initialRelationships: [],
  endCondition: { type: 'time_limit' },
  scenarioStats: [],
  traitPool: { buffs: [], debuffs: [] },
  goalCluster: undefined,
  endingArchetypes: [],
  status: 'in_progress',
  flagDictionary: [],
} as const;

// validation ids
export const VALIDATION_IDS = {
  // 기본 정보
  SCENARIO_ID: 'scenarioId',
  TITLE: 'title',
  GENRE: 'genre',
  CORE_KEYWORDS: 'coreKeywords',
  POSTER_IMAGE_URL: 'posterImageUrl',
  SYNOPSIS: 'synopsis',
  PLAYER_GOAL: 'playerGoal',
  // 캐릭터
  CHARACTERS_MIN: 'characters_min',
  CHARACTER_ROLE_ID: 'character_roleId',
  CHARACTER_ROLE_NAME: 'character_roleName',
  CHARACTER_NAME: 'character_name',
  // 스탯
  STATS_MIN: 'stats_min',
  STAT_ID: 'stat_id',
  STAT_NAME: 'stat_name',
  STAT_RANGE: 'stat_range',
  // 엔딩
  ENDINGS_MIN: 'endings_min',
  ENDING_ID: 'ending_id',
  ENDING_TITLE: 'ending_title',
  // 관계
  RELATIONSHIP_INVALID: 'relationship_invalid',
  // 플래그
  FLAG_NAME: 'flag_name',
} as const;

// 검증 상수
export const MIN_CORE_KEYWORDS = 3;
export const MAX_CORE_KEYWORDS = 5;
export const MIN_GENRE = 1;
export const MIN_CHARACTERS = 1;
export const MIN_STATS = 1;
export const MIN_ENDINGS = 1;

export const STORAGE_KEY = 'atelos_scenario';
