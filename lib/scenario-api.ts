// 시나리오 API 클라이언트 함수
import type { ScenarioData } from '@/types';

export interface ScenarioSummary {
  scenarioId: string;
  title: string;
  genre: string[];
  posterImageUrl: string;
  status: ScenarioData['status'];
  characterCount: number;
  updatedAt?: string;
}

export interface ScenariosListResponse {
  success: boolean;
  scenarios: ScenarioSummary[];
  total: number;
}

export interface ScenarioResponse {
  success: boolean;
  scenario: ScenarioData;
}

// 시나리오 리스트 가져오기
export async function fetchScenariosList(): Promise<ScenariosListResponse> {
  const response = await fetch('/api/admin/scenarios');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시나리오 목록을 불러오는데 실패했습니다.');
  }
  return response.json();
}

// 특정 시나리오 가져오기
export async function fetchScenario(scenarioId: string): Promise<ScenarioResponse> {
  const response = await fetch(`/api/admin/scenarios/${scenarioId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시나리오를 불러오는데 실패했습니다.');
  }
  return response.json();
}

// 새 시나리오 생성
export async function createScenario(scenario: ScenarioData): Promise<{ success: boolean; scenarioId: string }> {
  const response = await fetch('/api/admin/scenarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시나리오 생성에 실패했습니다.');
  }
  return response.json();
}

// 시나리오 업데이트
export async function updateScenario(scenario: ScenarioData): Promise<{ success: boolean; scenarioId: string }> {
  const response = await fetch('/api/admin/scenarios', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시나리오 저장에 실패했습니다.');
  }
  return response.json();
}

// 시나리오 삭제
export async function deleteScenario(scenarioId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/admin/scenarios?id=${scenarioId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '시나리오 삭제에 실패했습니다.');
  }
  return response.json();
}

// 빈 시나리오 템플릿 생성
export function createEmptyScenario(): ScenarioData {
  return {
    scenarioId: '',
    title: '',
    genre: [],
    coreKeywords: [],
    posterImageUrl: '',
    synopsis: '',
    playerGoal: '',
    characters: [],
    initialRelationships: [],
    endCondition: { type: 'time_limit', value: 7, unit: 'days' },
    scenarioStats: [],
    traitPool: { buffs: [], debuffs: [] },
    flagDictionary: [],
    endingArchetypes: [],
    status: 'in_progress',
  };
}
