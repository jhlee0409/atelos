import { PlayerState, SystemCondition, EndingArchetype } from '@/types';

export const checkStatCondition = (
  condition: Extract<SystemCondition, { type: '필수 스탯' }>,
  stats: PlayerState['stats'],
): boolean => {
  const statValue = stats[condition.statId];
  if (statValue === undefined) return false;

  switch (condition.comparison) {
    case '>=':
      return statValue >= condition.value;
    case '<=':
      return statValue <= condition.value;
    case '==':
      return statValue === condition.value;
    default:
      return false;
  }
};

export const checkFlagCondition = (
  condition: Extract<SystemCondition, { type: '필수 플래그' }>,
  flags: PlayerState['flags'],
): boolean => {
  const flagValue = flags[condition.flagName];
  // For boolean flags, we check for true. For count flags, we just check for existence and > 0.
  if (typeof flagValue === 'boolean') {
    return flagValue === true;
  } else if (typeof flagValue === 'number') {
    return flagValue > 0;
  }
  return false;
};

export const checkEndingConditions = (
  playerState: PlayerState,
  endingArchetypes: EndingArchetype[],
): EndingArchetype | null => {
  for (const ending of endingArchetypes) {
    const allConditionsMet = ending.systemConditions.every((condition) => {
      if (condition.type === '필수 스탯') {
        return checkStatCondition(condition, playerState.stats);
      }
      if (condition.type === '필수 플래그') {
        return checkFlagCondition(condition, playerState.flags);
      }
      if (condition.type === '생존자 수') {
        return true; // Placeholder
      }
      return false;
    });

    if (allConditionsMet) {
      return ending;
    }
  }
  return null;
};
