// Type definitions
export type Character = {
  roleId: string;
  roleName: string;
  characterName: string;
  backstory: string;
  imageUrl: string;
  weightedTraitTypes: string[];
  isEditing?: boolean;
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
  initialValue: number;
  range: [number, number];
  isEditing?: boolean;
};

export type Trait = {
  traitId: string;
  traitName: string;
  type: '긍정' | '부정';
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

export type SystemCondition = {
  type: '필수 스탯' | '필수 플래그' | '생존자 수';
  statId?: string;
  comparison?: '>=' | '<=' | '==';
  value?: number;
  flagName?: string;
  isEditing?: boolean;
};

export type EndingArchetype = {
  endingId: string;
  title: string;
  description: string;
  systemConditions: SystemCondition[];
  isEditing?: boolean;
};

export type EndCondition = {
  type: '시간제한' | '목표 달성' | '조건 충족';
  value?: number;
  unit?: '일' | '시간';
  statId?: string;
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
  traitPool: {
    buffs: Trait[];
    debuffs: Trait[];
  };
  coreDilemmas: Dilemma[];
  endingArchetypes: EndingArchetype[];
  status: '작업 중' | '테스트 중' | '활성';
};
