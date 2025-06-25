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
  SCENARIO_ID: 'scenarioId',
  TITLE: 'title',
  GENRE: 'genre',
  CORE_KEYWORDS: 'coreKeywords',
  POSTER_IMAGE_URL: 'posterImageUrl',
  SYNOPSIS: 'synopsis',
  PLAYER_GOAL: 'playerGoal',
} as const;

export const MIN_CORE_KEYWORDS = 3;
export const MAX_CORE_KEYWORDS = 5;

export const MIN_GENRE = 1;

export const STORAGE_KEY = 'atelos_scenario';
