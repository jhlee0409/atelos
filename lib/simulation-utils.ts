import {
  ScenarioData,
  PlayerState,
  ScenarioStat,
  EndingArchetype,
  Dilemma,
  SystemCondition,
} from '@/types';

export interface StatChangeEffect {
  statId: string;
  change: number;
  reason?: string;
}

export interface DilemmaChoice {
  text: string;
  statChanges: Record<string, number>;
  /** @deprecated Use ActionHistory for tracking player actions instead */
  flagsToSet?: string[];
}

export interface GeneratedDilemma {
  id: string;
  title: string;
  description: string;
  choices: DilemmaChoice[];
}

export interface DilemmaGenerationContext {
  scenario: ScenarioData;
  playerState: PlayerState;
  currentDay: number;
  previousDilemmas: string[];
}

export class SimulationUtils {
  static generateRandomDilemma(
    context: DilemmaGenerationContext,
  ): GeneratedDilemma {
    const { scenario, playerState, currentDay } = context;

    // Get available stats that aren't at max/min
    const availableStats = scenario.scenarioStats.filter((stat) => {
      const currentValue = playerState.stats[stat.id];
      return currentValue > stat.min && currentValue < stat.max;
    });

    if (availableStats.length === 0) {
      return this.generateDefaultDilemma(currentDay);
    }

    // Select random stat to focus on
    const targetStat =
      availableStats[Math.floor(Math.random() * availableStats.length)];

    // Generate contextual dilemma based on stat
    const dilemmaTemplates = this.getDilemmaTemplates(targetStat.id);
    const template =
      dilemmaTemplates[Math.floor(Math.random() * dilemmaTemplates.length)];

    return {
      id: `generated_${currentDay}_${Date.now()}`,
      title: template.title.replace('{day}', currentDay.toString()),
      description: template.description,
      choices: template.choices.map((choice: any) => ({
        text: choice.text,
        statChanges: choice.statChanges,
        flagsToSet: choice.flagsToSet || [],
      })),
    };
  }

  private static getDilemmaTemplates(statId: string): any[] {
    const templates: Record<string, any[]> = {
      cityChaos: [
        {
          title: 'Day {day}: Civil Unrest',
          description:
            'A large group of citizens is protesting food shortages. How do you respond?',
          choices: [
            {
              text: 'Deploy peacekeepers to maintain order',
              statChanges: { cityChaos: -15, communityCohesion: -10 },
            },
            {
              text: 'Negotiate with protest leaders',
              statChanges: { cityChaos: -5, communityCohesion: 5 },
            },
            {
              text: 'Ignore the protests',
              statChanges: { cityChaos: 10, survivalFoundation: -5 },
            },
          ],
        },
      ],
      communityCohesion: [
        {
          title: 'Day {day}: Community Division',
          description:
            'Two factions in your community are in conflict over resource allocation.',
          choices: [
            {
              text: 'Mediate between the factions',
              statChanges: { communityCohesion: 10, cityChaos: -5 },
            },
            {
              text: 'Support the stronger faction',
              statChanges: { communityCohesion: -15, survivalFoundation: 10 },
            },
            {
              text: 'Distribute resources equally',
              statChanges: { communityCohesion: 5, survivalFoundation: -10 },
            },
          ],
        },
      ],
      survivalFoundation: [
        {
          title: 'Day {day}: Resource Discovery',
          description:
            "Scouts have found a cache of supplies, but it's in dangerous territory.",
          choices: [
            {
              text: 'Send a team to retrieve it',
              statChanges: { survivalFoundation: 15, cityChaos: 5 },
            },
            {
              text: 'Secure the area first',
              statChanges: { survivalFoundation: 5, cityChaos: -10 },
            },
            {
              text: 'Leave it for now',
              statChanges: { communityCohesion: -5 },
            },
          ],
        },
      ],
    };

    return templates[statId] || [this.getGenericDilemmaTemplate()];
  }

  private static getGenericDilemmaTemplate(): any {
    return {
      title: 'Day {day}: Unexpected Challenge',
      description: 'An unforeseen situation requires your immediate attention.',
      choices: [
        {
          text: 'Take decisive action',
          statChanges: { cityChaos: -5, survivalFoundation: 5 },
        },
        {
          text: 'Consult with advisors',
          statChanges: { communityCohesion: 5, cityChaos: 5 },
        },
      ],
    };
  }

  private static generateDefaultDilemma(currentDay: number): GeneratedDilemma {
    return {
      id: `default_${currentDay}`,
      title: `Day ${currentDay}: Status Quo`,
      description: 'Another day passes in the struggle for survival.',
      choices: [
        {
          text: 'Continue current policies',
          statChanges: {},
          flagsToSet: [],
        },
      ],
    };
  }

  static applyStatChanges(
    currentStats: Record<string, number>,
    changes: Record<string, number>,
    statDefinitions: ScenarioStat[],
  ): Record<string, number> {
    const newStats = { ...currentStats };

    Object.entries(changes).forEach(([statId, change]) => {
      const statDef = statDefinitions.find((s) => s.id === statId);
      if (!statDef) return;

      const currentValue = newStats[statId] || statDef.current;
      const newValue = currentValue + change;

      // Clamp to min/max values
      newStats[statId] = Math.max(statDef.min, Math.min(statDef.max, newValue));
    });

    return newStats;
  }

  private static checkStatCondition(
    condition: Extract<SystemCondition, { type: 'required_stat' }>,
    stats: PlayerState['stats'],
  ): boolean {
    const statValue = stats[condition.statId];
    if (statValue === undefined) return false;

    switch (condition.comparison) {
      case 'greater_equal':
        return statValue >= condition.value;
      case 'less_equal':
        return statValue <= condition.value;
      case 'equal':
        return statValue === condition.value;
      case 'greater_than':
        return statValue > condition.value;
      case 'less_than':
        return statValue < condition.value;
      case 'not_equal':
        return statValue !== condition.value;
      default:
        return false;
    }
  }

  private static checkSurvivorCountCondition(
    condition: Extract<SystemCondition, { type: 'survivor_count' }>,
    survivorCount: number,
  ): boolean {
    switch (condition.comparison) {
      case 'greater_equal':
        return survivorCount >= condition.value;
      case 'less_equal':
        return survivorCount <= condition.value;
      case 'equal':
        return survivorCount === condition.value;
      case 'greater_than':
        return survivorCount > condition.value;
      case 'less_than':
        return survivorCount < condition.value;
      case 'not_equal':
        return survivorCount !== condition.value;
      default:
        return false;
    }
  }

  /**
   * Checks if any ending conditions have been met based on the current player state.
   * @param playerState - The current state of the player (stats, flags).
   * @param endingArchetypes - The list of possible endings for the scenario.
   * @param survivorCount - The current survivor count (optional).
   * @returns The triggered EndingArchetype if conditions are met, otherwise null.
   */
  static checkEndingConditions(
    playerState: PlayerState,
    endingArchetypes: EndingArchetype[],
    survivorCount?: number,
  ): EndingArchetype | null {
    for (const ending of endingArchetypes) {
      // systemConditions가 optional이므로 안전하게 처리
      const conditions = ending.systemConditions || [];
      const conditionsMet = conditions.every((condition) => {
        switch (condition.type) {
          case 'required_stat':
            return this.checkStatCondition(condition, playerState.stats);
          case 'survivor_count':
            // survivorCount가 전달되지 않으면 조건 미충족
            if (survivorCount === undefined) return false;
            return this.checkSurvivorCountCondition(condition, survivorCount);
          default:
            return false;
        }
      });

      if (conditionsMet) {
        return ending;
      }
    }

    return null;
  }

  static calculateStatChange(
    baseChange: number,
    traits: string[],
    traitDefinitions: { id: string; statModifiers?: Record<string, number> }[],
  ): number {
    let totalChange = baseChange;

    traits.forEach((traitId) => {
      const trait = traitDefinitions.find((t) => t.id === traitId);
      if (trait?.statModifiers) {
        Object.values(trait.statModifiers).forEach((modifier) => {
          totalChange += modifier;
        });
      }
    });

    return totalChange;
  }
}
