/**
 * 시나리오 데이터 기반 동적 매핑 유틸리티
 *
 * 시나리오 JSON에서 스탯/플래그/캐릭터 정보를 추출하여
 * 영어 ID ↔ 한글 레이블 변환을 동적으로 수행합니다.
 */

import type { ScenarioData, ScenarioStat, ScenarioFlag, Character } from '@/types';

// ===== 스탯 매핑 관련 =====

export interface StatMapping {
  id: string;        // 영어 ID (예: "oxygenLevel")
  name: string;      // 한글 이름 (예: "산소 잔량")
  description?: string;
  polarity?: 'positive' | 'negative';  // 높을수록 좋은지/나쁜지
}

/**
 * 시나리오 데이터에서 스탯 매핑 추출
 */
export const extractStatMappings = (scenario: ScenarioData): StatMapping[] => {
  return scenario.scenarioStats.map((stat) => ({
    id: stat.id,
    name: stat.name,
    description: stat.description,
    // 기본적으로 positive, 특정 키워드가 포함되면 negative
    polarity: inferStatPolarity(stat),
  }));
};

/**
 * 스탯 극성 추론 (이름/설명 기반)
 */
const inferStatPolarity = (stat: ScenarioStat): 'positive' | 'negative' => {
  const negativeKeywords = ['혼란', '위험', '공포', '피해', '손상', '오염', '스트레스'];
  const text = `${stat.name} ${stat.description || ''}`.toLowerCase();

  for (const keyword of negativeKeywords) {
    if (text.includes(keyword)) {
      return 'negative';
    }
  }
  return 'positive';
};

/**
 * 시나리오에서 스탯 ID → 한글 이름 변환
 */
export const getStatNameFromScenario = (
  statId: string,
  scenario: ScenarioData
): string => {
  const stat = scenario.scenarioStats.find((s) => s.id === statId);
  return stat?.name || `[${statId}]`;
};

/**
 * 시나리오에서 모든 스탯 ID 목록 추출
 */
export const getAllStatIdsFromScenario = (scenario: ScenarioData): string[] => {
  return scenario.scenarioStats.map((s) => s.id);
};

/**
 * 시나리오에서 ID → 이름 맵 생성
 */
export const buildStatIdToNameMap = (
  scenario: ScenarioData
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const stat of scenario.scenarioStats) {
    map[stat.id] = stat.name;
  }
  return map;
};

// ===== 플래그 매핑 관련 =====

export interface FlagMapping {
  id: string;          // 영어 ID (예: "FLAG_ESCAPE_SECURED")
  name: string;        // 한글 이름 (예: "탈출 수단 확보")
  description?: string;
}

/**
 * 시나리오 데이터에서 플래그 매핑 추출
 */
export const extractFlagMappings = (scenario: ScenarioData): FlagMapping[] => {
  return scenario.flagDictionary.map((flag) => ({
    id: flag.flagName,
    name: flag.description.split('.')[0] || flag.flagName, // 첫 문장을 이름으로 사용
    description: flag.description,
  }));
};

/**
 * 시나리오에서 플래그 ID → 한글 설명 변환
 */
export const getFlagNameFromScenario = (
  flagId: string,
  scenario: ScenarioData
): string => {
  const cleanId = flagId.replace(/^FLAG_/, '');
  const flag = scenario.flagDictionary.find(
    (f) => f.flagName === flagId || f.flagName === cleanId || f.flagName === `FLAG_${cleanId}`
  );
  return flag?.description.split('.')[0] || `[${flagId}]`;
};

/**
 * 시나리오에서 모든 플래그 ID 목록 추출
 */
export const getAllFlagIdsFromScenario = (scenario: ScenarioData): string[] => {
  return scenario.flagDictionary.map((f) => f.flagName);
};

// ===== 캐릭터 매핑 관련 =====

export interface CharacterMapping {
  roleId: string;      // 역할 ID (예: "ENGINEER")
  roleName: string;    // 역할 한글 이름 (예: "기관사")
  characterName: string; // 캐릭터 이름 (예: "카이 첸")
}

/**
 * 시나리오 데이터에서 캐릭터 매핑 추출
 */
export const extractCharacterMappings = (scenario: ScenarioData): CharacterMapping[] => {
  return scenario.characters.map((char) => ({
    roleId: char.roleId,
    roleName: char.roleName,
    characterName: char.characterName,
  }));
};

/**
 * 시나리오에서 캐릭터 이름 목록 추출
 */
export const getAllCharacterNamesFromScenario = (scenario: ScenarioData): string[] => {
  return scenario.characters.map((c) => c.characterName);
};

// ===== 서사 정리용 정규식 패턴 생성 =====

/**
 * 시나리오 기반 스탯 ID 필터링 패턴 생성
 * cleanNarrativeFormatting에서 사용
 */
export const buildStatFilterPatterns = (scenario: ScenarioData): RegExp[] => {
  const statIds = getAllStatIdsFromScenario(scenario);
  const statNames = scenario.scenarioStats.map((s) => s.name);

  if (statIds.length === 0) return [];

  const statIdsPattern = statIds.join('|');
  const statNamesPattern = statNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 정규식 특수문자 이스케이프
    .join('|');

  return [
    // 영어 스탯 ID + 수치 (예: "oxygenLevel 수치가 72이다")
    new RegExp(`(${statIdsPattern})\\s*수치가?\\s*\\d+[에이]?\\s*(달한다는|달하는|이다|였다|이라니)?[^.]*[.,]?\\s*`, 'gi'),
    // 영어 스탯 ID + 이/가 + 수치 (예: "crewSanity가 60이다")
    new RegExp(`(${statIdsPattern})[이가은는]\\s*\\d+[에이]?\\s*[^.]*[.,]?\\s*`, 'gi'),
    // 영어 스탯 ID 단독 노출
    new RegExp(`\\b(${statIdsPattern})\\b`, 'gi'),
    // 한글 스탯명 + 괄호 숫자 (예: "산소 잔량(72)")
    new RegExp(`(${statNamesPattern})\\s*\\(?\\s*\\d+\\s*\\)?`, 'gi'),
    // 한글 스탯명 + 이/가 + 숫자 (예: "산소 잔량이 72밖에")
    new RegExp(`(${statNamesPattern})[이가은는]\\s*\\d+\\s*(밖에|이상|이하|정도|로|으로)?[^.]*[.,]?\\s*`, 'gi'),
  ];
};

/**
 * 일반적인 스탯/수치 노출 패턴 (시나리오 무관)
 */
export const getGenericStatFilterPatterns = (): RegExp[] => {
  return [
    // camelCase 영어 ID + 수치
    /\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]*\s*수치가?\s*\d+[에이]?\s*[^.]*[.,]?\s*/g,
    // camelCase 영어 ID + 이/가 + 수치
    /\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]*[이가은는]\s*\d+[에이]?\s*[^.]*[.,]?\s*/g,
    // camelCase 영어 ID 단독
    /\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]*\b/g,
    // 빈 괄호 "()"
    /\(\)/g,
    // "수치가 XX" 일반 패턴
    /[가-힣A-Za-z'']+\s*수치가?\s*\d+[에이]?[가이]?\s*(달한다는|달하는|이다|였다|이라니|라니)?[^.]*\./gi,
    // "XX%", "XX점" 노출
    /\d+\s*(%|퍼센트|점)\s*(밖에|정도|이다|였다)?/gi,
    // 영어 따옴표 + 수치
    /[''][a-zA-Z\s]+['']\s*수치가?\s*\d+[에이]?\s*[^.]*[.,]?\s*/gi,
  ];
};

// ===== 전체 매핑 캐시 (성능 최적화) =====

interface ScenarioMappingCache {
  scenarioId: string;
  statIdToName: Record<string, string>;
  flagIdToName: Record<string, string>;
  statFilterPatterns: RegExp[];
  allStatIds: string[];
  allFlagIds: string[];
  allCharacterNames: string[];
}

let mappingCache: ScenarioMappingCache | null = null;

/**
 * 시나리오 매핑 캐시 초기화/갱신
 */
export const initScenarioMappingCache = (scenario: ScenarioData): ScenarioMappingCache => {
  // 동일 시나리오면 캐시 재사용
  if (mappingCache && mappingCache.scenarioId === scenario.scenarioId) {
    return mappingCache;
  }

  const statIdToName: Record<string, string> = {};
  for (const stat of scenario.scenarioStats) {
    statIdToName[stat.id] = stat.name;
  }

  const flagIdToName: Record<string, string> = {};
  for (const flag of scenario.flagDictionary) {
    flagIdToName[flag.flagName] = flag.description.split('.')[0];
  }

  mappingCache = {
    scenarioId: scenario.scenarioId,
    statIdToName,
    flagIdToName,
    statFilterPatterns: buildStatFilterPatterns(scenario),
    allStatIds: getAllStatIdsFromScenario(scenario),
    allFlagIds: getAllFlagIdsFromScenario(scenario),
    allCharacterNames: getAllCharacterNamesFromScenario(scenario),
  };

  return mappingCache;
};

/**
 * 캐시된 매핑 가져오기
 */
export const getScenarioMappingCache = (): ScenarioMappingCache | null => {
  return mappingCache;
};

/**
 * 캐시 초기화
 */
export const clearScenarioMappingCache = (): void => {
  mappingCache = null;
};
