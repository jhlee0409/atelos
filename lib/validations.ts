import { ScenarioData } from '@/types';
import {
  MAX_CORE_KEYWORDS,
  MIN_CORE_KEYWORDS,
  MIN_GENRE,
  VALIDATION_IDS,
} from '@/constants/scenario';

export const validateScenario = (scenario: ScenarioData): string[] => {
  const errors: string[] = [];

  if (!scenario.scenarioId) errors.push(VALIDATION_IDS.SCENARIO_ID);
  if (!scenario.title) errors.push(VALIDATION_IDS.TITLE);
  if (scenario.genre.length < MIN_GENRE) errors.push(VALIDATION_IDS.GENRE);
  if (
    scenario.coreKeywords.length < MIN_CORE_KEYWORDS ||
    scenario.coreKeywords.length > MAX_CORE_KEYWORDS
  )
    errors.push(VALIDATION_IDS.CORE_KEYWORDS);
  if (!scenario.posterImageUrl) errors.push(VALIDATION_IDS.POSTER_IMAGE_URL);
  if (!scenario.synopsis) errors.push(VALIDATION_IDS.SYNOPSIS);
  if (!scenario.playerGoal) errors.push(VALIDATION_IDS.PLAYER_GOAL);

  return errors;
};
