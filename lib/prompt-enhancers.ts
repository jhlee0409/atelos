/**
 * 프롬프트 품질 강화 시스템 (v2.0)
 *
 * 이 모듈은 AI 프롬프트의 품질을 극대화하기 위한 헬퍼 함수들을 제공합니다.
 *
 * 주요 기능:
 * 1. Choice Diversity System - 선택지 반복 방지
 * 2. Character Balancing System - 캐릭터 등장 균형
 * 3. Theme Rotation System - 주제 순환
 * 4. Context Bridge - 맥락 연결 강화
 */

import { ScenarioData, KeyDecision, CharacterArc, ActionRecord } from '@/types';

// =============================================================================
// 1. CHOICE DIVERSITY SYSTEM - 선택지 반복 방지
// =============================================================================

/**
 * 선택지 주제 카테고리 정의
 */
export const CHOICE_THEMES = {
  RESOURCE: '자원', // 물자, 식량, 의료품 관련
  RELATIONSHIP: '관계', // 캐릭터 간 관계, 신뢰, 갈등
  EXPLORATION: '탐색', // 장소 탐색, 정보 수집
  COMBAT: '대응', // 위협 대응, 방어, 공격
  NEGOTIATION: '협상', // 외부 세력과의 협상, 거래
  SURVIVAL: '생존', // 기본 생존, 안전 확보
  ESCAPE: '이동', // 탈출, 이동, 경로
  MORAL: '도덕', // 윤리적 딜레마, 희생
} as const;

export type ChoiceTheme = typeof CHOICE_THEMES[keyof typeof CHOICE_THEMES];

/**
 * 선택지 텍스트에서 주제를 추출
 */
export const extractChoiceTheme = (choiceText: string): ChoiceTheme => {
  const text = choiceText.toLowerCase();

  // 키워드 매칭으로 주제 분류
  if (/자원|물자|식량|의료|보급|물품/.test(text)) return CHOICE_THEMES.RESOURCE;
  if (/관계|신뢰|대화|위로|설득|함께/.test(text)) return CHOICE_THEMES.RELATIONSHIP;
  if (/탐색|조사|수색|발견|찾|살펴/.test(text)) return CHOICE_THEMES.EXPLORATION;
  if (/방어|대응|경계|싸움|저항|막/.test(text)) return CHOICE_THEMES.COMBAT;
  if (/협상|거래|제안|동맹|합의/.test(text)) return CHOICE_THEMES.NEGOTIATION;
  if (/안전|대피|숨|피신|보호/.test(text)) return CHOICE_THEMES.SURVIVAL;
  if (/탈출|이동|떠나|출발|경로/.test(text)) return CHOICE_THEMES.ESCAPE;
  if (/희생|포기|결단|선택|양보/.test(text)) return CHOICE_THEMES.MORAL;

  return CHOICE_THEMES.SURVIVAL; // 기본값
};

/**
 * 최근 선택지들의 주제 분석
 */
export const analyzeRecentChoiceThemes = (
  keyDecisions: KeyDecision[],
  count: number = 5
): { themes: ChoiceTheme[]; dominantTheme: ChoiceTheme | null; needsVariety: boolean } => {
  const recentDecisions = keyDecisions.slice(-count);
  const themes = recentDecisions.map(d => extractChoiceTheme(d.choice));

  // 주제 빈도 계산
  const themeCounts: Record<string, number> = {};
  themes.forEach(theme => {
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  });

  // 가장 많이 나온 주제
  const dominantTheme = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as ChoiceTheme | undefined;

  // 다양성이 필요한지 판단 (같은 주제가 3회 이상 연속)
  const needsVariety = dominantTheme
    ? (themeCounts[dominantTheme] || 0) >= 3
    : false;

  return {
    themes,
    dominantTheme: dominantTheme || null,
    needsVariety,
  };
};

/**
 * 선택지 다양성 가이드라인 생성
 */
export const generateChoiceDiversityGuideline = (
  keyDecisions: KeyDecision[],
  recentChoiceTexts: string[] = []
): string => {
  const analysis = analyzeRecentChoiceThemes(keyDecisions);

  if (!analysis.needsVariety && recentChoiceTexts.length === 0) {
    return '';
  }

  // 피해야 할 주제
  const avoidThemes = analysis.themes.slice(-2);

  // 권장 주제 (최근에 안 나온 것)
  const allThemes = Object.values(CHOICE_THEMES);
  const suggestedThemes = allThemes.filter(t => !avoidThemes.includes(t)).slice(0, 3);

  let guideline = `
### 🎯 CHOICE DIVERSITY REQUIREMENT (선택지 다양성 - 필수!) ###
**최근 선택지 분석 결과**: ${analysis.dominantTheme ? `"${analysis.dominantTheme}" 주제가 반복되고 있음` : '분석 완료'}
`;

  if (analysis.needsVariety) {
    guideline += `
⚠️ **경고**: 같은 유형의 선택지가 반복됨. 다양성이 필요합니다!

**피해야 할 주제**: ${avoidThemes.join(', ')}
**권장 주제**: ${suggestedThemes.join(', ')}
`;
  }

  if (recentChoiceTexts.length > 0) {
    guideline += `
**직전 턴에 제시된 선택지** (이것과 다른 선택지를 생성하세요):
${recentChoiceTexts.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

**규칙**: 위 선택지와 유사한 표현, 같은 행동, 동일한 대상을 피하세요.
`;
  }

  guideline += `
**3개 선택지 각각 다른 주제로**:
- choice_a: 적극적 행동 (${suggestedThemes[0] || '자원'} 관련)
- choice_b: 신중한 접근 (${suggestedThemes[1] || '관계'} 관련)
- choice_c: 대기/관망 (${suggestedThemes[2] || '탐색'} 관련)
`;

  return guideline;
};

// =============================================================================
// 2. CHARACTER BALANCING SYSTEM - 캐릭터 등장 균형
// =============================================================================

export interface CharacterInteractionStats {
  characterName: string;
  interactionCount: number;
  lastInteractionDay: number;
  trustLevel: number;
  isMet: boolean;
}

/**
 * 캐릭터별 상호작용 통계 계산
 */
export const calculateCharacterInteractionStats = (
  scenario: ScenarioData,
  keyDecisions: KeyDecision[],
  characterArcs: CharacterArc[],
  metCharacters: string[],
  currentDay: number
): CharacterInteractionStats[] => {
  const npcs = scenario.characters.filter(c => c.characterName !== '(플레이어)');

  return npcs.map(npc => {
    // 이 캐릭터가 관련된 결정 수
    const interactions = keyDecisions.filter(d =>
      d.impactedCharacters?.includes(npc.characterName) ||
      d.choice.includes(npc.characterName)
    );

    // 마지막 상호작용 날짜
    const lastInteraction = interactions[interactions.length - 1];
    const lastInteractionDay = lastInteraction?.day || 0;

    // 신뢰도
    const arc = characterArcs.find(a => a.characterName === npc.characterName);
    const trustLevel = arc?.trustLevel || 0;

    return {
      characterName: npc.characterName,
      interactionCount: interactions.length,
      lastInteractionDay,
      trustLevel,
      isMet: metCharacters.includes(npc.characterName),
    };
  });
};

/**
 * 캐릭터 밸런싱 가이드라인 생성
 */
export const generateCharacterBalancingGuideline = (
  scenario: ScenarioData,
  keyDecisions: KeyDecision[],
  characterArcs: CharacterArc[],
  metCharacters: string[],
  currentDay: number,
  totalDays: number
): string => {
  const stats = calculateCharacterInteractionStats(
    scenario,
    keyDecisions,
    characterArcs,
    metCharacters,
    currentDay
  );

  // 아직 만나지 않은 캐릭터
  const unmetCharacters = stats.filter(s => !s.isMet);

  // 상호작용이 적은 캐릭터 (만났지만 1회 이하)
  const neglectedCharacters = stats.filter(s => s.isMet && s.interactionCount <= 1);

  // 상호작용이 과다한 캐릭터 (5회 이상)
  const overusedCharacters = stats.filter(s => s.interactionCount >= 5);

  // Day별 캐릭터 도입 요구사항
  const dayProgress = currentDay / totalDays;
  const expectedMetCount = Math.ceil(stats.length * Math.min(dayProgress + 0.3, 1));
  const actualMetCount = metCharacters.length;
  const needsNewCharacter = actualMetCount < expectedMetCount && unmetCharacters.length > 0;

  let guideline = `
### 👥 CHARACTER BALANCING (캐릭터 등장 균형 - 중요!) ###
**현재 Day ${currentDay}/${totalDays}** | 만난 캐릭터: ${actualMetCount}/${stats.length}명
`;

  if (needsNewCharacter) {
    const suggestedCharacter = unmetCharacters[0];
    guideline += `
⚠️ **새 캐릭터 등장 필요!**
아직 만나지 않은 캐릭터: ${unmetCharacters.map(c => c.characterName).join(', ')}

**이번 턴에 "${suggestedCharacter.characterName}" 캐릭터를 등장시키세요:**
- 서사에 자연스럽게 등장
- 선택지에 이 캐릭터 관련 옵션 포함
- 기존 캐릭터와의 연결고리 제시
`;
  }

  if (overusedCharacters.length > 0) {
    guideline += `
⚠️ **과다 등장 캐릭터**: ${overusedCharacters.map(c => `${c.characterName}(${c.interactionCount}회)`).join(', ')}
→ 이 캐릭터 대신 다른 캐릭터를 중심으로 서사를 전개하세요.
`;
  }

  if (neglectedCharacters.length > 0 && !needsNewCharacter) {
    guideline += `
💡 **소외된 캐릭터**: ${neglectedCharacters.map(c => c.characterName).join(', ')}
→ 이 캐릭터와의 상호작용 기회를 선택지에 포함하세요.
`;
  }

  // 캐릭터 상태 요약
  guideline += `
**캐릭터별 상호작용 현황**:
${stats.map(s => `- ${s.characterName}: ${s.interactionCount}회${s.isMet ? '' : ' (미등장)'} | 신뢰도: ${s.trustLevel}`).join('\n')}
`;

  return guideline;
};

// =============================================================================
// 3. THEME ROTATION SYSTEM - 주제 순환
// =============================================================================

/**
 * 서사 주제 카테고리
 */
export const NARRATIVE_THEMES = {
  TENSION: '긴장', // 위기, 위협, 시간 압박
  DISCOVERY: '발견', // 새로운 정보, 비밀, 단서
  RELATIONSHIP: '관계', // 캐릭터 간 유대, 갈등, 화해
  DECISION: '결정', // 중요한 선택, 분기점
  CONSEQUENCE: '결과', // 이전 선택의 결과
  HOPE: '희망', // 작은 승리, 긍정적 변화
  LOSS: '상실', // 실패, 손실, 희생
  MYSTERY: '미스터리', // 의문, 수수께끼, 진실 추적
} as const;

export type NarrativeTheme = typeof NARRATIVE_THEMES[keyof typeof NARRATIVE_THEMES];

/**
 * 서사 흐름에 따른 권장 주제 결정
 */
export const getRecommendedNarrativeTheme = (
  currentDay: number,
  totalDays: number,
  recentThemes: NarrativeTheme[]
): { recommended: NarrativeTheme[]; avoid: NarrativeTheme[] } => {
  const progress = currentDay / totalDays;

  // 서사 단계별 권장 주제
  let phaseThemes: NarrativeTheme[];
  if (progress <= 0.3) {
    // 1막: 설정
    phaseThemes = [NARRATIVE_THEMES.DISCOVERY, NARRATIVE_THEMES.RELATIONSHIP, NARRATIVE_THEMES.MYSTERY];
  } else if (progress <= 0.6) {
    // 2막 전반: 상승
    phaseThemes = [NARRATIVE_THEMES.TENSION, NARRATIVE_THEMES.DECISION, NARRATIVE_THEMES.CONSEQUENCE];
  } else if (progress <= 0.85) {
    // 2막 후반: 전환점
    phaseThemes = [NARRATIVE_THEMES.DECISION, NARRATIVE_THEMES.LOSS, NARRATIVE_THEMES.TENSION];
  } else {
    // 3막: 결말
    phaseThemes = [NARRATIVE_THEMES.CONSEQUENCE, NARRATIVE_THEMES.HOPE, NARRATIVE_THEMES.DECISION];
  }

  // 최근에 사용한 주제 피하기
  const avoid = recentThemes.slice(-2);
  const recommended = phaseThemes.filter(t => !avoid.includes(t));

  return { recommended, avoid };
};

/**
 * 주제 순환 가이드라인 생성
 */
export const generateThemeRotationGuideline = (
  currentDay: number,
  totalDays: number,
  keyDecisions: KeyDecision[]
): string => {
  // 최근 결정들의 주제 추출 (간단한 분류)
  const recentThemes: NarrativeTheme[] = keyDecisions.slice(-3).map(d => {
    const text = d.consequence + d.choice;
    if (/위기|위협|시간|급박/.test(text)) return NARRATIVE_THEMES.TENSION;
    if (/발견|알게|비밀|단서/.test(text)) return NARRATIVE_THEMES.DISCOVERY;
    if (/관계|신뢰|함께|갈등/.test(text)) return NARRATIVE_THEMES.RELATIONSHIP;
    if (/결정|선택|분기/.test(text)) return NARRATIVE_THEMES.DECISION;
    if (/결과|덕분에|때문에/.test(text)) return NARRATIVE_THEMES.CONSEQUENCE;
    return NARRATIVE_THEMES.DECISION;
  });

  const { recommended, avoid } = getRecommendedNarrativeTheme(currentDay, totalDays, recentThemes);

  return `
### 📖 NARRATIVE THEME (서사 주제 순환) ###
**현재 서사 진행도**: ${Math.round((currentDay / totalDays) * 100)}%

**이번 턴 권장 주제**: ${recommended.join(', ')}
**피해야 할 주제**: ${avoid.join(', ')} (최근 사용됨)

**주제별 서사 가이드**:
- 긴장: 시간 제한, 외부 위협 언급
- 발견: 새로운 정보나 비밀 공개
- 관계: 캐릭터 간 감정 교류
- 결정: 중요한 갈림길 제시
- 결과: 이전 선택의 영향 보여주기
- 희망: 작은 성공, 긍정적 변화
`;
};

// =============================================================================
// 4. CONTEXT BRIDGE - 맥락 연결 강화
// =============================================================================

/**
 * 이전 턴과의 연결고리 생성
 */
export const generateContextBridge = (
  keyDecisions: KeyDecision[],
  actionContext?: {
    currentSituation?: string;
    todayActions?: {
      explorations: Array<{ location: string; result: string }>;
      dialogues: Array<{ characterName: string; topic: string; outcome?: string }>;
      choices: Array<{ choice: string; consequence: string }>;
    };
  }
): string => {
  if (!keyDecisions.length && !actionContext) {
    return '';
  }

  let bridge = `
### 🔗 CONTEXT BRIDGE (맥락 연결 - 필수 참조!) ###
`;

  // 직전 선택과 결과
  const lastDecision = keyDecisions[keyDecisions.length - 1];
  if (lastDecision) {
    bridge += `
**직전 턴**:
- 선택: "${lastDecision.choice}"
- 결과: "${lastDecision.consequence}"
- 영향받은 캐릭터: ${lastDecision.impactedCharacters?.join(', ') || '없음'}

**AI 지시**: 이 선택의 결과를 이어서 서술하세요. "이전 선택 덕분에/때문에..." 형식으로 연결.
`;
  }

  // 오늘의 행동 요약
  if (actionContext?.todayActions) {
    const { explorations, dialogues, choices } = actionContext.todayActions;
    const todayActions: string[] = [];

    if (explorations?.length) {
      todayActions.push(`탐색: ${explorations.map(e => e.location).join(', ')}`);
    }
    if (dialogues?.length) {
      todayActions.push(`대화: ${dialogues.map(d => d.characterName).join(', ')}`);
    }
    if (choices?.length) {
      todayActions.push(`선택: ${choices.length}회`);
    }

    if (todayActions.length) {
      bridge += `
**오늘 한 행동들** (참조하여 연속성 유지):
${todayActions.map(a => `- ${a}`).join('\n')}
`;
    }
  }

  // 현재 상황
  if (actionContext?.currentSituation) {
    bridge += `
**현재 상황 요약**:
"${actionContext.currentSituation.substring(0, 150)}..."
`;
  }

  return bridge;
};

// =============================================================================
// 5. CONSOLIDATED RULES - 통합 규칙
// =============================================================================

/**
 * 공통 언어 규칙 (모든 프롬프트에서 재사용)
 */
export const LANGUAGE_RULES = `
### LANGUAGE RULES (언어 규칙 - 모든 응답에 적용) ###
1. **한국어만 사용**: 아랍어, 태국어, 힌디어 등 외국어 금지
2. **한글 문자만**: 기본 한글, 문장부호, 최소한의 영어(기술용어)만 허용
3. **자연스러운 한국어**: 한국어 문법과 어순 준수
4. **외국 문자 절대 금지**: 아랍어(العربية), 태국어(ภาษาไทย), 힌디어(हिन्दी) 등
`;

/**
 * 공통 선택지 규칙
 */
export const CHOICE_FORMAT_RULES = `
### CHOICE FORMAT RULES (선택지 형식 규칙) ###
1. **정확히 3개**: choice_a, choice_b, choice_c 필수
2. **길이**: 각 15-50자 (글자 수, 단어 수 아님)
3. **어미**: 반드시 "~한다" 또는 "~이다"로 종결
4. **대비**: 3개 선택지는 서로 다른 전략 표현
5. **캐릭터 명시**: 특정 인물 관련 시 이름 포함
6. **시스템 ID 금지**: [ACTION_ID] 같은 내부 ID 노출 금지

**예시**:
- choice_a (적극): "박준경과 함께 외부 그룹과의 협상을 시도한다" (32자) ✅
- choice_b (신중): "내부 방어 시설을 보강하며 경계를 강화한다" (22자) ✅
- choice_c (대기): "일단 상황을 더 지켜보며 정보를 수집한다" (21자) ✅

**금지 예시**:
- "예" (너무 짧음) ❌
- "[NEGOTIATE] 협상한다" (시스템 ID 노출) ❌
- "동의함" (어미 불일치, 모호함) ❌
`;

/**
 * 공통 감정 표현 규칙
 */
export const EMOTIONAL_EXPRESSION_RULES = `
### EMOTIONAL EXPRESSION (감정 표현 - 필수) ###
모든 서사에 반드시 포함:
1. **내면 생각**: "...라고 느꼈다", "...라고 생각했다"
2. **감정 단어**: 불안, 희망, 걱정, 기쁨, 분노, 슬픔, 두려움, 안도
3. **신체 반응**: "마음이 무거웠다", "가슴이 조여왔다", "손이 떨렸다"
4. **캐릭터 감정**: 각 캐릭터의 감정 상태 묘사

**최소 200자** 이상의 서사에 위 요소들이 자연스럽게 포함되어야 함.
`;

/**
 * 스탯 변화 규칙
 */
export const STAT_CHANGE_RULES = `
### STAT CHANGE GUIDELINES (스탯 변화 규칙) ###
**행동 유형별 변화량**:
- 일반 행동 (대화, 소규모 탐색): ±5 ~ ±10
- 중요 행동 (핵심 결정, 협상): ±10 ~ ±20
- 극단적 행동 (희생, 대규모 충돌): ±20 ~ ±30
- **절대 ±40 초과 금지**

**스탯 방향성**:
- 긍정 스탯 (사기, 자원, 안전, 신뢰): 높을수록 좋음
- 부정 스탯 (혼란, 위협, 위험): 낮을수록 좋음
`;

// =============================================================================
// 6. MASTER GUIDELINE GENERATOR - 통합 가이드라인 생성
// =============================================================================

export interface PromptEnhancementOptions {
  scenario: ScenarioData;
  keyDecisions: KeyDecision[];
  characterArcs: CharacterArc[];
  metCharacters: string[];
  currentDay: number;
  totalDays: number;
  recentChoiceTexts?: string[];
  actionContext?: {
    currentSituation?: string;
    todayActions?: {
      explorations: Array<{ location: string; result: string }>;
      dialogues: Array<{ characterName: string; topic: string; outcome?: string }>;
      choices: Array<{ choice: string; consequence: string }>;
    };
  };
}

/**
 * 통합 프롬프트 강화 가이드라인 생성
 */
export const generateEnhancedPromptGuidelines = (options: PromptEnhancementOptions): string => {
  const {
    scenario,
    keyDecisions,
    characterArcs,
    metCharacters,
    currentDay,
    totalDays,
    recentChoiceTexts = [],
    actionContext,
  } = options;

  // 각 시스템의 가이드라인 생성
  const choiceDiversity = generateChoiceDiversityGuideline(keyDecisions, recentChoiceTexts);
  const characterBalancing = generateCharacterBalancingGuideline(
    scenario,
    keyDecisions,
    characterArcs,
    metCharacters,
    currentDay,
    totalDays
  );
  const themeRotation = generateThemeRotationGuideline(currentDay, totalDays, keyDecisions);
  const contextBridge = generateContextBridge(keyDecisions, actionContext);

  // 통합 가이드라인
  return `
${LANGUAGE_RULES}
${EMOTIONAL_EXPRESSION_RULES}
${CHOICE_FORMAT_RULES}
${STAT_CHANGE_RULES}

${contextBridge}
${choiceDiversity}
${characterBalancing}
${themeRotation}
`;
};

/**
 * 응답 품질 검증 (선택지 다양성)
 */
export const validateChoiceDiversity = (
  choices: { choice_a: string; choice_b: string; choice_c?: string },
  previousChoices: string[]
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  const allChoices = [choices.choice_a, choices.choice_b, choices.choice_c].filter(Boolean) as string[];

  // 1. 3개 선택지 확인
  if (allChoices.length < 3) {
    issues.push('선택지가 3개 미만');
  }

  // 2. 길이 확인 (15-50자)
  allChoices.forEach((choice, i) => {
    if (choice.length < 15) {
      issues.push(`choice_${['a', 'b', 'c'][i]}: 너무 짧음 (${choice.length}자)`);
    }
    if (choice.length > 50) {
      issues.push(`choice_${['a', 'b', 'c'][i]}: 너무 김 (${choice.length}자)`);
    }
  });

  // 3. 어미 확인
  allChoices.forEach((choice, i) => {
    if (!/(한다|이다|있다|없다|된다)[."]?$/.test(choice)) {
      issues.push(`choice_${['a', 'b', 'c'][i]}: 어미가 "~한다/이다"로 끝나지 않음`);
    }
  });

  // 4. 이전 선택지와 유사성 확인
  previousChoices.forEach(prev => {
    allChoices.forEach((choice, i) => {
      // 80% 이상 유사하면 문제
      const similarity = calculateSimilarity(prev, choice);
      if (similarity > 0.8) {
        issues.push(`choice_${['a', 'b', 'c'][i]}: 이전 선택지와 너무 유사 (${Math.round(similarity * 100)}%)`);
      }
    });
  });

  // 5. 선택지 간 유사성 확인
  for (let i = 0; i < allChoices.length; i++) {
    for (let j = i + 1; j < allChoices.length; j++) {
      const similarity = calculateSimilarity(allChoices[i], allChoices[j]);
      if (similarity > 0.6) {
        issues.push(`choice_${['a', 'b', 'c'][i]}와 choice_${['a', 'b', 'c'][j]}가 너무 유사 (${Math.round(similarity * 100)}%)`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * 간단한 문자열 유사도 계산 (Jaccard similarity)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
};
