// Type definitions
export type Character = {
  roleId: string;
  roleName: string;
  characterName: string;
  backstory: string;
  imageUrl: string;
  weightedTraitTypes: string[];
  isEditing?: boolean;
  currentTrait: Trait | null;
};

export type Relationship = {
  id: string;
  personA: string;
  personB: string;
  value: number;
  reason: string;
  isEditing?: boolean;
};

export type ScenarioStat = {
  id: string;
  name: string;
  description: string;
  current: number;
  min: number;
  max: number;
  initialValue?: number;
  range?: [number, number];
  isEditing?: boolean;
};

export type Trait = {
  traitId: string;
  traitName: string;
  type: 'positive' | 'negative';
  weightType: string;
  displayText: string;
  systemInstruction: string;
  iconUrl: string;
  isEditing?: boolean;
};

export type Dilemma = {
  dilemmaId: string;
  title: string;
  description: string;
  isEditing?: boolean;
};

export type ScenarioFlag = {
  flagName: string;
  description: string;
  type: 'boolean' | 'count';
  initial: boolean | number;
  isEditing?: boolean;
};

export type SystemCondition =
  | {
      type: 'required_stat';
      statId: string;
      comparison:
        | 'greater_equal'
        | 'less_equal'
        | 'equal'
        | 'greater_than'
        | 'less_than'
        | 'not_equal';
      value: number;
      isEditing?: boolean;
    }
  | {
      type: 'required_flag';
      flagName: string;
      isEditing?: boolean;
    }
  | {
      type: 'survivor_count';
      comparison:
        | 'greater_equal'
        | 'less_equal'
        | 'equal'
        | 'greater_than'
        | 'less_than'
        | 'not_equal';
      value: number;
      isEditing?: boolean;
    };

export type GoalCluster = {
  id: string;
  title: string;
  description: string;
  connectedEndings: string[];
};

export type EndingArchetype = {
  endingId: string;
  title: string;
  description: string;
  systemConditions: SystemCondition[];
  isGoalSuccess?: boolean;
  isEditing?: boolean;
};

export type EndCondition = {
  type: 'time_limit' | 'goal_achievement' | 'condition_met';
  value?: number;
  unit?: 'days' | 'hours';
  statId?: string;
};

export type TraitPool = {
  buffs: Trait[];
  debuffs: Trait[];
};

export type ScenarioData = {
  scenarioId: string;
  title: string;
  genre: string[];
  coreKeywords: string[];
  posterImageUrl: string;
  synopsis: string;
  playerGoal: string;
  characters: Character[];
  initialRelationships: Relationship[];
  endCondition: EndCondition;
  scenarioStats: ScenarioStat[];
  traitPool: TraitPool;
  flagDictionary: ScenarioFlag[];
  goalCluster?: GoalCluster;
  endingArchetypes: EndingArchetype[];
  status: 'in_progress' | 'testing' | 'active';
};

// --- Game-specific state types, not part of scenario definition ---

export type PlayerState = {
  stats: Record<string, number>;
  flags: Record<string, boolean | number>;
  traits: string[]; // array of traitIds
  relationships: Record<string, number>;
};

export type StoryState = {
  currentDay: number;
  currentHour: number;
  turn: number;
  lastNarrative: string;
  lastChoice: {
    action: { actionId: string; description_for_ai: string };
    playerFeedback: string;
  } | null;
  recentEvents: string[];
};

export interface SaveState {
  context: {
    scenarioId: string;
    scenarioStats: { [key: string]: number };
    flags: { [key: string]: boolean | number };
    currentDay?: number;
    remainingHours?: number;
  };
  community: {
    survivors: {
      name: string;
      role: string;
      traits: string[];
      status: string;
    }[];
    hiddenRelationships: { [key: string]: number };
  };
  log: string;
  chatHistory: {
    type: 'system' | 'player' | 'ai';
    content: string;
    timestamp: number;
  }[];
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
}

export interface AIResponse {
  log: string;
  dilemma: {
    prompt: string;
    choice_a: string;
    choice_b: string;
  };
  statChanges: {
    scenarioStats: { [key: string]: number };
    survivorStatus: { name: string; newStatus: string }[];
    hiddenRelationships_change: any[]; // Type can be refined if needed
    flags_acquired: string[];
    shouldAdvanceTime?: boolean; // AI가 시간 진행 여부를 결정
  };
}

export interface PlayerAction {
  actionId: string;
  actionDescription: string;
  playerFeedback: string;
}

export interface AvailableAction {
  actionId: string;
  description_for_ai: string;
}
