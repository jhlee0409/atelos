/**
 * @deprecated This module is deprecated and will be removed in a future version.
 * Use Dynamic Ending System (DynamicEndingConfig) instead.
 *
 * 이 모듈은 레거시 엔딩 시스템을 위한 것입니다.
 * 새 시나리오에서는 dynamicEndingConfig를 사용하세요.
 */
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

export const checkSurvivorCountCondition = (
  condition: Extract<SystemCondition, { type: 'survivor_count' }>,
  survivorCount: number,
): boolean => {
  return compareValues(survivorCount, condition.comparison, condition.value);
};

export const checkEndingConditions = (
  playerState: PlayerState,
  endingArchetypes: EndingArchetype[],
  survivorCount?: number,
): EndingArchetype | null => {
  console.log('🔍 엔딩 조건 체크 시작...');
  console.log('📊 현재 스탯:', playerState.stats);
  console.log('👥 생존자 수:', survivorCount ?? '정보 없음');

  // "결단의 날"과 같은 시간 제한 엔딩은 제외 (별도 처리)
  // systemConditions는 이제 optional - 없으면 체크 건너뜀
  const checkableEndings = endingArchetypes.filter(
    (ending) =>
      ending.systemConditions &&
      ending.systemConditions.length > 0 &&
      ending.endingId !== 'ENDING_TIME_UP',
  );

  for (const ending of checkableEndings) {
    console.log(`\n🎯 "${ending.title}" 엔딩 체크 중...`);

    // systemConditions이 있는 것만 필터링했으므로 안전
    const conditionResults = (ending.systemConditions || []).map((condition) => {
      let result = false;
      let details = '';

      if (condition.type === 'required_stat') {
        result = checkStatCondition(condition, playerState.stats);
        const currentValue = playerState.stats[condition.statId];
        details = `스탯 ${condition.statId}: ${currentValue} ${condition.comparison} ${condition.value} = ${result}`;
      } else if (condition.type === 'survivor_count') {
        // 생존자 수 조건 체크 - survivorCount가 전달되지 않으면 조건을 통과시키지 않음
        if (survivorCount === undefined) {
          result = false;
          details = `생존자 수: 정보 없음 - 조건 미충족`;
        } else {
          result = checkSurvivorCountCondition(condition, survivorCount);
          details = `생존자 수: ${survivorCount} ${condition.comparison} ${condition.value} = ${result}`;
        }
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
