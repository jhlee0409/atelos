import { PlayerState, SystemCondition, EndingArchetype } from '@/types';
import { compareValues } from '@/constants/comparison-operators';

export const checkStatCondition = (
  condition: Extract<SystemCondition, { type: 'required_stat' }>,
  stats: PlayerState['stats'],
): boolean => {
  const statValue = stats[condition.statId];
  if (statValue === undefined) return false;

  // 개선된 비교 연산자 함수 사용
  return compareValues(statValue, condition.comparison, condition.value);
};

export const checkFlagCondition = (
  condition: Extract<SystemCondition, { type: 'required_flag' }>,
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
  console.log('🔍 엔딩 조건 체크 시작...');
  console.log('📊 현재 스탯:', playerState.stats);
  console.log('🏴 현재 플래그:', playerState.flags);

  // "결단의 날"과 같은 시간 제한 엔딩은 제외 (별도 처리)
  const checkableEndings = endingArchetypes.filter(
    (ending) =>
      ending.systemConditions.length > 0 &&
      ending.endingId !== 'ENDING_TIME_UP',
  );

  for (const ending of checkableEndings) {
    console.log(`\n🎯 "${ending.title}" 엔딩 체크 중...`);

    const conditionResults = ending.systemConditions.map((condition) => {
      let result = false;
      let details = '';

      if (condition.type === 'required_stat') {
        result = checkStatCondition(condition, playerState.stats);
        const currentValue = playerState.stats[condition.statId];
        details = `스탯 ${condition.statId}: ${currentValue} ${condition.comparison} ${condition.value} = ${result}`;
      } else if (condition.type === 'required_flag') {
        result = checkFlagCondition(condition, playerState.flags);
        const currentValue = playerState.flags[condition.flagName];
        details = `플래그 ${condition.flagName}: ${currentValue} = ${result}`;
      } else if (condition.type === 'survivor_count') {
        result = true; // Placeholder - 생존자 수 체크 로직 추가 필요
        details = `생존자 수: true (placeholder)`;
      }

      console.log(`  ✓ ${details}`);
      return result;
    });

    const allConditionsMet = conditionResults.every((result) => result);
    console.log(`  📋 모든 조건 만족: ${allConditionsMet}`);

    if (allConditionsMet) {
      console.log(`🎉 엔딩 발동: "${ending.title}"`);
      return ending;
    }
  }

  console.log('❌ 만족하는 엔딩 조건 없음');
  return null;
};
