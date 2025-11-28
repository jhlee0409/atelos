import type { ScenarioData } from '@/types';
import ZERO_HOUR from './ZERO_HOUR.json';

// Cast the JSON to ScenarioData type
const scenarios: Record<string, ScenarioData> = {
  ZERO_HOUR: ZERO_HOUR as ScenarioData,
};

/**
 * Get scenario data by ID
 * @param scenarioId - The scenario ID to look up
 * @returns The scenario data or undefined if not found
 */
export function getScenarioData(scenarioId: string): ScenarioData | undefined {
  return scenarios[scenarioId];
}

/**
 * Get all active scenarios
 * @returns Array of active scenario data
 */
export function getAllActiveScenarios(): ScenarioData[] {
  return Object.values(scenarios).filter(
    (scenario) => scenario.status === 'active',
  );
}

/**
 * Get all scenarios (regardless of status)
 * @returns Array of all scenario data
 */
export function getAllScenarios(): ScenarioData[] {
  return Object.values(scenarios);
}

export default scenarios;
