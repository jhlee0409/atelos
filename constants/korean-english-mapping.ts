/**
 * 한국어-영어 매핑 유틸리티 함수
 *
 * 주의: 대부분의 매핑은 시나리오 JSON 데이터에서 직접 가져옵니다.
 * 이 파일의 함수들은 폴백용 또는 간단한 변환용으로 사용됩니다.
 */

// 스탯 이름 매핑 (폴백용)
const STAT_NAME_FALLBACK: Record<string, string> = {
  cityChaos: '도시 혼란도',
  communityCohesion: '공동체 응집력',
  survivalFoundation: '생존 기반',
  oxygenLevel: '산소 잔량',
  hullIntegrity: '함체 내구도',
  crewSanity: '정신력',
};

// 플래그 이름 매핑 (폴백용)
const FLAG_NAME_FALLBACK: Record<string, string> = {
  FLAG_ESCAPE_VEHICLE_SECURED: '탈출 수단 확보',
  FLAG_DEFENSES_COMPLETE: '방어 시설 완료',
  FLAG_ALLY_NETWORK_FORMED: '동맹 네트워크 형성',
  FLAG_GOVERNMENT_CONTACT: '정부 연락',
  FLAG_LEADER_SACRIFICE: '리더 희생',
  FLAG_RESOURCE_MONOPOLY: '자원 독점',
  FLAG_IDEOLOGY_ESTABLISHED: '이념 확립',
  FLAG_UNDERGROUND_HIDEOUT: '지하 은신처',
};

// 역할 이름 매핑 (폴백용)
const ROLE_NAME_FALLBACK: Record<string, string> = {
  leader: '리더',
  medical: '의료',
  combat: '전투',
  engineer: '기술',
  scout: '정찰',
  negotiator: '협상가',
};

/**
 * 영어 스탯 ID를 한국어 이름으로 변환
 * @param statId 영어 스탯 ID
 * @returns 한국어 이름 또는 원본 ID
 */
export const getKoreanStatName = (statId: string): string => {
  return STAT_NAME_FALLBACK[statId] || statId;
};

/**
 * 영어 플래그 이름을 한국어로 변환
 * @param flagName 플래그 이름 (FLAG_ 접두사 포함 가능)
 * @returns 한국어 이름 또는 정리된 원본 이름
 */
export const getKoreanFlagName = (flagName: string): string => {
  // FLAG_ 접두사 제거
  const cleanName = flagName.startsWith('FLAG_') ? flagName : `FLAG_${flagName}`;
  return FLAG_NAME_FALLBACK[cleanName] || flagName.replace('FLAG_', '').replace(/_/g, ' ');
};

/**
 * 영어 역할 ID를 한국어 이름으로 변환
 * @param roleId 영어 역할 ID
 * @returns 한국어 이름 또는 원본 ID
 */
export const getKoreanRoleName = (roleId: string): string => {
  const lowerRole = roleId.toLowerCase();
  return ROLE_NAME_FALLBACK[lowerRole] || roleId;
};

/**
 * 스탯 극성 확인 (높을수록 좋음 = positive)
 * @param statId 스탯 ID
 * @returns 'positive' 또는 'negative'
 */
export const getStatPolarity = (statId: string): 'positive' | 'negative' => {
  const negativeStats = ['cityChaos', 'stress', 'danger', 'hostility'];
  return negativeStats.includes(statId) ? 'negative' : 'positive';
};

// DEPRECATED 호환성 유지
export const DEPRECATED_NOTICE = '일부 함수는 시나리오 JSON 데이터를 우선 사용해야 합니다.';
