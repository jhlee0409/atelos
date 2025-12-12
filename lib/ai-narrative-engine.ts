/**
 * AI Narrative Engine - 2025 Enhanced
 *
 * ATELOS의 핵심 차별화 기능:
 * 1. Self-Evaluation Loop - AI가 자기 응답 품질 평가 및 재생성
 * 2. Narrative Arc Planner - 7일 스토리 아크 계획 및 예측
 * 3. Ending Prediction & Seeding - 엔딩 예측 및 복선 심기
 * 4. Narrative Coherence Check - 서사 일관성 검증
 */

import type { ScenarioData, PlayerState, Character } from '@/types';
import type { KeyDecision, AIResponse, SaveState } from './game-ai-client';
import { compareValues } from '@/constants/comparison-operators';

// =============================================================================
// 1. Self-Evaluation System (자기 평가 시스템)
// =============================================================================

/**
 * AI 응답 품질 평가 결과
 */
export interface SelfEvaluationResult {
  overallScore: number; // 0-100
  dimensions: {
    emotionalDepth: number;      // 감정적 깊이 (0-20)
    characterConsistency: number; // 캐릭터 일관성 (0-20)
    narrativeCoherence: number;   // 서사 일관성 (0-20)
    choiceClarity: number;        // 선택지 명확성 (0-20)
    koreanQuality: number;        // 한국어 품질 (0-20)
  };
  issues: string[];
  suggestions: string[];
  shouldRegenerate: boolean;
}

/**
 * Self-Evaluation 프롬프트 생성
 */
export function buildSelfEvaluationPrompt(
  aiResponse: AIResponse,
  scenario: ScenarioData,
  currentDay: number,
): string {
  const characterNames = scenario.characters.map(c => c.characterName).join(', ');

  return `당신은 AI 스토리텔링 품질 평가자입니다. 다음 AI 응답을 평가하세요.

## 평가 대상 응답
- 내러티브: "${aiResponse.log}"
- 딜레마 프롬프트: "${aiResponse.dilemma.prompt}"
- 선택지 A: "${aiResponse.dilemma.choice_a}"
- 선택지 B: "${aiResponse.dilemma.choice_b}"
${aiResponse.dilemma.choice_c ? `- 선택지 C: "${aiResponse.dilemma.choice_c}"` : ''}

## 평가 컨텍스트
- 시나리오: ${scenario.title}
- 장르: ${scenario.genre?.join(', ') || '미정'}
- 현재 Day: ${currentDay}/7
- 등장인물: ${characterNames}

## 평가 기준 (각 0-20점)

1. **감정적 깊이 (emotionalDepth)**:
   - 내면 묘사 ("...라고 느꼈다", "마음이...")가 있는가?
   - 신체적 감정 표현 ("손이 떨렸다", "가슴이 조였다")이 있는가?
   - 한국적 정서 (한, 정, 운명)가 담겼는가?

2. **캐릭터 일관성 (characterConsistency)**:
   - 캐릭터가 최소 1명 이상 언급되었는가?
   - 캐릭터의 대화/행동이 그들의 성격과 맞는가?
   - 관계 발전이 자연스러운가?

3. **서사 일관성 (narrativeCoherence)**:
   - 1인칭 현재형 ("나는", "내가")으로 작성되었는가?
   - Day ${currentDay}에 맞는 긴장도인가? (Day 1-2: 낮음, Day 5-7: 높음)
   - 스탯 수치나 시스템 용어가 노출되지 않았는가?

4. **선택지 명확성 (choiceClarity)**:
   - 선택지가 15-50자 사이인가?
   - "~한다/~이다" 종결형인가?
   - 세 선택지가 서로 다른 접근법을 나타내는가?

5. **한국어 품질 (koreanQuality)**:
   - 자연스러운 한국어인가?
   - 외래어/시스템 용어가 최소화되었는가?
   - 문장이 간결하고 리듬감이 있는가?

## 출력 형식 (JSON)
{
  "overallScore": 0-100,
  "dimensions": {
    "emotionalDepth": 0-20,
    "characterConsistency": 0-20,
    "narrativeCoherence": 0-20,
    "choiceClarity": 0-20,
    "koreanQuality": 0-20
  },
  "issues": ["발견된 문제점..."],
  "suggestions": ["개선 제안..."],
  "shouldRegenerate": true/false (60점 미만이면 true)
}`;
}

/**
 * Self-Evaluation 결과 파싱
 */
export function parseSelfEvaluationResponse(responseText: string): SelfEvaluationResult | null {
  try {
    // JSON 추출
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      overallScore: parsed.overallScore || 0,
      dimensions: {
        emotionalDepth: parsed.dimensions?.emotionalDepth || 0,
        characterConsistency: parsed.dimensions?.characterConsistency || 0,
        narrativeCoherence: parsed.dimensions?.narrativeCoherence || 0,
        choiceClarity: parsed.dimensions?.choiceClarity || 0,
        koreanQuality: parsed.dimensions?.koreanQuality || 0,
      },
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
      shouldRegenerate: parsed.shouldRegenerate || parsed.overallScore < 60,
    };
  } catch {
    return null;
  }
}

/**
 * 빠른 클라이언트 사이드 품질 체크 (AI 호출 없이)
 */
export function quickQualityCheck(
  aiResponse: AIResponse,
  scenario: ScenarioData,
  currentDay: number,
): SelfEvaluationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let totalScore = 0;

  // 1. 감정적 깊이 체크
  const emotionalPatterns = [
    /느꼈다|생각했다|느낀다|생각한다/,
    /마음이|가슴이|심장이/,
    /떨렸다|떨린다|조였다|조인다/,
    /한숨|눈물|눈시울/,
  ];
  let emotionalScore = 0;
  emotionalPatterns.forEach(pattern => {
    if (pattern.test(aiResponse.log)) emotionalScore += 5;
  });
  if (emotionalScore === 0) {
    issues.push('감정 표현이 부족합니다');
    suggestions.push('내면 묘사나 신체적 감정 표현을 추가하세요');
  }
  totalScore += emotionalScore;

  // 2. 캐릭터 일관성 체크
  const characterNames = scenario.characters.map(c => c.characterName);
  const mentionedCharacters = characterNames.filter(name => aiResponse.log.includes(name));
  const characterScore = Math.min(20, mentionedCharacters.length * 10);
  if (mentionedCharacters.length === 0) {
    issues.push('캐릭터가 언급되지 않았습니다');
    suggestions.push(`${characterNames.slice(0, 3).join(', ')} 중 한 명을 언급하세요`);
  }
  totalScore += characterScore;

  // 3. 서사 일관성 체크
  let narrativeScore = 0;
  // 1인칭 체크
  if (/나는|내가|나의/.test(aiResponse.log)) {
    narrativeScore += 10;
  } else {
    issues.push('1인칭 서술이 아닙니다');
    suggestions.push('"나는", "내가" 등 1인칭으로 서술하세요');
  }
  // 스탯 노출 체크
  if (!/\d{2,}/.test(aiResponse.log) || !/cityChaos|communityCohesion/i.test(aiResponse.log)) {
    narrativeScore += 10;
  } else {
    issues.push('스탯 수치나 시스템 용어가 노출되었습니다');
    suggestions.push('숫자와 영문 스탯명을 제거하세요');
  }
  totalScore += narrativeScore;

  // 4. 선택지 명확성 체크
  let choiceScore = 0;
  const choices = [aiResponse.dilemma.choice_a, aiResponse.dilemma.choice_b, aiResponse.dilemma.choice_c].filter(Boolean);
  choices.forEach(choice => {
    if (choice && choice.length >= 15 && choice.length <= 50) choiceScore += 5;
    if (choice && /한다|이다|는다|ㄴ다\.?$/.test(choice)) choiceScore += 2;
  });
  choiceScore = Math.min(20, choiceScore);
  if (choiceScore < 10) {
    issues.push('선택지 형식이 부적절합니다');
    suggestions.push('15-50자, "~한다" 종결형으로 작성하세요');
  }
  totalScore += choiceScore;

  // 5. 한국어 품질 체크
  const koreanChars = (aiResponse.log.match(/[가-힣]/g) || []).length;
  const totalChars = aiResponse.log.replace(/\s/g, '').length;
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;
  let koreanScore = Math.min(20, Math.round(koreanRatio * 25));
  if (koreanRatio < 0.7) {
    issues.push('한국어 비율이 낮습니다');
    suggestions.push('영문 표현을 한국어로 대체하세요');
  }
  totalScore += koreanScore;

  return {
    overallScore: totalScore,
    dimensions: {
      emotionalDepth: emotionalScore,
      characterConsistency: characterScore,
      narrativeCoherence: narrativeScore,
      choiceClarity: choiceScore,
      koreanQuality: koreanScore,
    },
    issues,
    suggestions,
    shouldRegenerate: totalScore < 60,
  };
}


// =============================================================================
// 2. Narrative Arc Planner (서사 아크 계획 시스템)
// =============================================================================

/**
 * 서사 아크 계획
 */
export interface NarrativeArcPlan {
  overview: string;
  dayPlans: DayPlan[];
  keyTurningPoints: TurningPoint[];
  characterArcs: CharacterArcPlan[];
  thematicProgression: string[];
  predictedEndings: PredictedEnding[];
}

export interface DayPlan {
  day: number;
  phase: 'setup' | 'rising_action' | 'midpoint' | 'climax' | 'resolution';
  tensionLevel: number; // 1-10
  primaryFocus: string;
  keyEvents: string[];
  emotionalBeats: string[];
  characterFocus: string[];
}

export interface TurningPoint {
  day: number;
  type: 'revelation' | 'betrayal' | 'sacrifice' | 'alliance' | 'loss' | 'victory';
  description: string;
  triggerCondition: string;
  impact: string;
}

export interface CharacterArcPlan {
  characterName: string;
  startingState: string;
  endingState: string;
  keyMoments: string[];
  relationshipChanges: string[];
}

export interface PredictedEnding {
  endingId: string;
  endingName: string;
  probability: number; // 0-100
  requiredFlags: string[];
  requiredStats: { [key: string]: { comparison: string; value: number } };
  seedsToPlant: string[];
}

/**
 * Narrative Arc Planning 프롬프트 생성
 */
export function buildNarrativeArcPrompt(
  scenario: ScenarioData,
  currentState: SaveState,
): string {
  const currentDay = currentState.context.currentDay || 1;
  const totalDays = scenario.endCondition.value || 7;
  const remainingDays = totalDays - currentDay + 1;

  const characterList = scenario.characters
    .map(c => `- ${c.characterName}: ${c.backstory?.substring(0, 100) || ''}`)
    .join('\n');

  const statSummary = Object.entries(currentState.context.scenarioStats)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const flagSummary = Object.entries(currentState.context.flags)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ') || '없음';

  const endingConditions = scenario.endingArchetypes
    ?.map(e => `- ${e.id}: ${e.description || e.id}`)
    .join('\n') || '기본 엔딩';

  const keyDecisionsSummary = currentState.keyDecisions
    ?.map(d => `Day ${d.day}: ${d.choice} → ${d.consequence}`)
    .join('\n') || '없음';

  return `당신은 서사 전략가입니다. 현재 게임 상태를 분석하고 남은 ${remainingDays}일의 서사 아크를 계획하세요.

## 시나리오 정보
- 제목: ${scenario.title}
- 장르: ${scenario.genre?.join(', ') || '미정'}
- 목표: ${scenario.playerGoal}
- 총 일수: ${totalDays}일

## 캐릭터
${characterList}

## 현재 게임 상태 (Day ${currentDay})
**스탯:**
${statSummary}

**획득 플래그:**
${flagSummary}

**주요 결정 히스토리:**
${keyDecisionsSummary}

## 가능한 엔딩
${endingConditions}

## 계획 요청
1. 남은 ${remainingDays}일에 대한 서사 아크 계획
2. 현재 상태에서 가장 가능성 있는 엔딩 예측
3. 해당 엔딩을 위해 심어야 할 복선
4. 캐릭터 아크 진행 방향
5. 긴장감 곡선 (Peak-Valley 패턴)

## 출력 형식 (JSON)
{
  "overview": "전체 서사 요약",
  "dayPlans": [
    {
      "day": ${currentDay},
      "phase": "rising_action",
      "tensionLevel": 6,
      "primaryFocus": "관계 시험",
      "keyEvents": ["예상 이벤트1", "예상 이벤트2"],
      "emotionalBeats": ["의심", "갈등"],
      "characterFocus": ["캐릭터이름"]
    }
  ],
  "keyTurningPoints": [
    {
      "day": 5,
      "type": "revelation",
      "description": "숨겨진 진실 공개",
      "triggerCondition": "특정 플래그 획득 시",
      "impact": "관계 대전환"
    }
  ],
  "characterArcs": [
    {
      "characterName": "캐릭터이름",
      "startingState": "현재 상태",
      "endingState": "예상 최종 상태",
      "keyMoments": ["전환점1"],
      "relationshipChanges": ["관계 변화1"]
    }
  ],
  "predictedEndings": [
    {
      "endingId": "ENDING_ID",
      "endingName": "엔딩 이름",
      "probability": 70,
      "requiredFlags": ["FLAG_NEEDED"],
      "requiredStats": {"statId": {"comparison": ">=", "value": 60}},
      "seedsToPlant": ["이번 턴에 심을 복선"]
    }
  ],
  "thematicProgression": ["테마1 심화", "테마2 도입"]
}`;
}

/**
 * Narrative Arc 결과 파싱
 */
export function parseNarrativeArcResponse(responseText: string): NarrativeArcPlan | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      overview: parsed.overview || '',
      dayPlans: parsed.dayPlans || [],
      keyTurningPoints: parsed.keyTurningPoints || [],
      characterArcs: parsed.characterArcs || [],
      thematicProgression: parsed.thematicProgression || [],
      predictedEndings: parsed.predictedEndings || [],
    };
  } catch {
    return null;
  }
}


// =============================================================================
// 3. Ending Prediction & Seeding (엔딩 예측 및 복선 시스템)
// =============================================================================

/**
 * 엔딩 예측 결과
 */
export interface EndingPrediction {
  mostLikelyEnding: {
    id: string;
    name: string;
    probability: number;
    missingRequirements: string[];
  };
  alternativeEndings: {
    id: string;
    name: string;
    probability: number;
    pathToReach: string;
  }[];
  currentTrajectory: 'positive' | 'negative' | 'neutral' | 'uncertain';
  urgentActions: string[];
  seedsForCurrentTurn: NarrativeSeed[];
}

/**
 * 서사 복선 (Narrative Seed)
 */
export interface NarrativeSeed {
  type: 'foreshadowing' | 'character_hint' | 'item_placement' | 'dialogue_hook' | 'atmosphere';
  description: string;
  targetEnding: string;
  urgency: 'low' | 'medium' | 'high';
  implementation: string; // AI가 어떻게 구현해야 하는지
}

/**
 * 현재 상태에서 엔딩 확률 계산 (AI 호출 없이)
 */
export function calculateEndingProbabilities(
  scenario: ScenarioData,
  currentState: SaveState,
): EndingPrediction {
  const endings = scenario.endingArchetypes || [];
  const stats = currentState.context.scenarioStats;
  const flags = currentState.context.flags;
  const currentDay = currentState.context.currentDay || 1;
  const totalDays = scenario.endCondition.value || 7;

  // 각 엔딩에 대한 확률 계산
  const endingScores: { id: string; name: string; score: number; missing: string[] }[] = [];

  for (const ending of endings) {
    let score = 0;
    const missing: string[] = [];

    // 스탯 조건 체크
    if (ending.systemConditions) {
      for (const condition of ending.systemConditions) {
        if (condition.required_stat) {
          const statValue = stats[condition.required_stat.statId] || 0;
          const { comparison, value } = condition.required_stat;

          // Fix: compareValues로 영단어('greater_equal')와 기호('>=') 모두 지원
          const satisfied = compareValues(statValue, comparison, value);

          if (satisfied) {
            score += 20;
          } else {
            // 얼마나 가까운지에 따른 부분 점수
            const distance = Math.abs(statValue - value);
            const partialScore = Math.max(0, 15 - distance / 5);
            score += partialScore;
            missing.push(`${condition.required_stat.statId} ${comparison} ${value} (현재: ${statValue})`);
          }
        }

        if (condition.required_flag) {
          if (flags[condition.required_flag.flagName]) {
            score += 25;
          } else {
            missing.push(`플래그 필요: ${condition.required_flag.flagName}`);
          }
        }
      }
    }

    endingScores.push({
      id: ending.id,
      name: ending.description || ending.id,
      score,
      missing,
    });
  }

  // 점수순 정렬
  endingScores.sort((a, b) => b.score - a.score);

  // 확률로 변환 (소프트맥스)
  const totalScore = endingScores.reduce((sum, e) => sum + Math.exp(e.score / 20), 0);
  const endingsWithProb = endingScores.map(e => ({
    ...e,
    probability: Math.round((Math.exp(e.score / 20) / totalScore) * 100),
  }));

  // 가장 높은 확률의 엔딩
  const mostLikely = endingsWithProb[0];

  // 대안 엔딩들 (상위 3개)
  const alternatives = endingsWithProb.slice(1, 4).map(e => ({
    id: e.id,
    name: e.name,
    probability: e.probability,
    pathToReach: e.missing.length > 0
      ? `필요: ${e.missing.slice(0, 2).join(', ')}`
      : '조건 충족됨',
  }));

  // 현재 궤적 판단
  let trajectory: 'positive' | 'negative' | 'neutral' | 'uncertain' = 'uncertain';
  if (mostLikely.probability > 50) {
    const isGoodEnding = endings.find(e => e.id === mostLikely.id)?.isGoalSuccess;
    trajectory = isGoodEnding ? 'positive' : 'negative';
  } else if (endingsWithProb.slice(0, 3).every(e => Math.abs(e.probability - mostLikely.probability) < 15)) {
    trajectory = 'neutral';
  }

  // 긴급 행동 제안
  const urgentActions: string[] = [];
  if (currentDay >= totalDays - 2) {
    if (mostLikely.missing.length > 0) {
      urgentActions.push(`엔딩 조건 미충족: ${mostLikely.missing[0]}`);
    }
  }

  // 이번 턴에 심을 복선
  const seeds = generateNarrativeSeeds(mostLikely.id, currentDay, totalDays, mostLikely.missing);

  return {
    mostLikelyEnding: {
      id: mostLikely.id,
      name: mostLikely.name,
      probability: mostLikely.probability,
      missingRequirements: mostLikely.missing,
    },
    alternativeEndings: alternatives,
    currentTrajectory: trajectory,
    urgentActions,
    seedsForCurrentTurn: seeds,
  };
}

/**
 * 서사 복선 생성
 */
function generateNarrativeSeeds(
  targetEndingId: string,
  currentDay: number,
  totalDays: number,
  missingRequirements: string[],
): NarrativeSeed[] {
  const seeds: NarrativeSeed[] = [];
  const remainingDays = totalDays - currentDay;

  // Day별 복선 강도 조절
  const urgency: 'low' | 'medium' | 'high' =
    remainingDays <= 1 ? 'high' :
    remainingDays <= 3 ? 'medium' : 'low';

  // 기본 분위기 복선 (항상 추가)
  seeds.push({
    type: 'atmosphere',
    description: '엔딩 분위기 암시',
    targetEnding: targetEndingId,
    urgency: 'low',
    implementation: targetEndingId.includes('SACRIFICE')
      ? '희생의 무게를 암시하는 분위기 묘사 추가'
      : targetEndingId.includes('ESCAPE')
        ? '탈출의 가능성과 긴박함 묘사'
        : '결말을 향한 긴장감 고조',
  });

  // 미충족 조건에 따른 복선
  if (missingRequirements.length > 0 && urgency !== 'low') {
    const firstMissing = missingRequirements[0];

    if (firstMissing.includes('플래그')) {
      seeds.push({
        type: 'item_placement',
        description: '플래그 획득 기회 암시',
        targetEnding: targetEndingId,
        urgency,
        implementation: '다음 선택에서 해당 플래그를 획득할 수 있는 상황 제시',
      });
    }

    if (firstMissing.includes('>=') || firstMissing.includes('<=')) {
      seeds.push({
        type: 'dialogue_hook',
        description: '스탯 변화 기회 제공',
        targetEnding: targetEndingId,
        urgency,
        implementation: '캐릭터 대화를 통해 해당 스탯에 영향을 줄 선택 제시',
      });
    }
  }

  // 캐릭터 관련 복선 (중반 이후)
  if (currentDay >= Math.ceil(totalDays / 2)) {
    seeds.push({
      type: 'character_hint',
      description: '캐릭터 아크 전환점 암시',
      targetEnding: targetEndingId,
      urgency: 'medium',
      implementation: '핵심 캐릭터의 숨겨진 면모나 과거 언급',
    });
  }

  // 클라이맥스 복선 (Day 5+)
  if (currentDay >= totalDays - 2) {
    seeds.push({
      type: 'foreshadowing',
      description: '결말 직접 복선',
      targetEnding: targetEndingId,
      urgency: 'high',
      implementation: `"${targetEndingId}" 엔딩으로 향하는 결정적 순간 암시`,
    });
  }

  return seeds;
}


// =============================================================================
// 4. Narrative Coherence Check (서사 일관성 검증)
// =============================================================================

/**
 * 서사 일관성 검증 결과
 */
export interface CoherenceCheckResult {
  isCoherent: boolean;
  score: number; // 0-100
  issues: CoherenceIssue[];
  recommendations: string[];
}

export interface CoherenceIssue {
  type: 'character_inconsistency' | 'plot_hole' | 'tone_mismatch' | 'pacing_problem' | 'dead_end';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: string; // 어디서 발생했는지
  suggestion: string;
}

/**
 * 하루 끝에 서사 일관성 검증 (AI 호출 없이)
 */
export function checkNarrativeCoherence(
  todayNarratives: string[],
  keyDecisions: KeyDecision[],
  characterArcs: { characterName: string; trustLevel: number; currentMood: string }[],
  currentDay: number,
  totalDays: number,
): CoherenceCheckResult {
  const issues: CoherenceIssue[] = [];
  let score = 100;

  // 1. 긴장도 패턴 체크 (Peak-Valley)
  const dayRatio = currentDay / totalDays;
  const expectedTension = dayRatio < 0.3 ? 'low' : dayRatio < 0.7 ? 'medium' : 'high';

  // 내러티브에서 긴장 관련 키워드 카운트
  const combinedNarrative = todayNarratives.join(' ');
  const tensionKeywords = ['위험', '긴급', '죽', '희생', '배신', '폭발', '최후'];
  const calmKeywords = ['평화', '안정', '희망', '화해', '웃', '안심'];

  const tensionCount = tensionKeywords.filter(k => combinedNarrative.includes(k)).length;
  const calmCount = calmKeywords.filter(k => combinedNarrative.includes(k)).length;

  const actualTension = tensionCount > calmCount + 2 ? 'high' :
                        calmCount > tensionCount + 2 ? 'low' : 'medium';

  if (expectedTension === 'high' && actualTension === 'low') {
    issues.push({
      type: 'pacing_problem',
      severity: 'medium',
      description: `Day ${currentDay}는 클라이맥스 구간인데 긴장감이 낮습니다`,
      location: `Day ${currentDay}`,
      suggestion: '더 긴박한 상황이나 갈등을 추가하세요',
    });
    score -= 15;
  }

  if (expectedTension === 'low' && actualTension === 'high') {
    issues.push({
      type: 'pacing_problem',
      severity: 'low',
      description: `Day ${currentDay}는 도입부인데 긴장감이 너무 높습니다`,
      location: `Day ${currentDay}`,
      suggestion: '캐릭터 소개와 세계관 설정에 집중하세요',
    });
    score -= 10;
  }

  // 2. 캐릭터 일관성 체크
  for (const arc of characterArcs) {
    // 신뢰도와 무드 불일치 체크
    if (arc.trustLevel < -50 && arc.currentMood === 'hopeful') {
      issues.push({
        type: 'character_inconsistency',
        severity: 'medium',
        description: `${arc.characterName}의 신뢰도가 매우 낮은데 희망적인 무드입니다`,
        location: `캐릭터: ${arc.characterName}`,
        suggestion: '캐릭터의 감정 상태를 신뢰도에 맞게 조정하세요',
      });
      score -= 10;
    }

    if (arc.trustLevel > 50 && arc.currentMood === 'angry') {
      issues.push({
        type: 'character_inconsistency',
        severity: 'low',
        description: `${arc.characterName}의 신뢰도가 높은데 분노 상태입니다`,
        location: `캐릭터: ${arc.characterName}`,
        suggestion: '높은 신뢰도에 맞는 감정 상태로 전환하거나 이유를 제시하세요',
      });
      score -= 5;
    }
  }

  // 3. 플롯 홀 체크 - 결정과 결과의 연결
  const todayDecisions = keyDecisions.filter(d => d.day === currentDay);
  for (const decision of todayDecisions) {
    // 결과가 너무 짧으면 플롯 홀 가능성
    if (decision.consequence.length < 20) {
      issues.push({
        type: 'plot_hole',
        severity: 'low',
        description: `"${decision.choice}"의 결과가 명확하지 않습니다`,
        location: `Day ${currentDay}, 결정`,
        suggestion: '선택의 결과를 더 구체적으로 서술하세요',
      });
      score -= 5;
    }
  }

  // 4. 데드엔드 체크 - 남은 일수 대비 진행 상황
  if (currentDay >= totalDays - 1 && keyDecisions.length < totalDays) {
    issues.push({
      type: 'dead_end',
      severity: 'high',
      description: '마지막 날인데 주요 결정이 부족합니다',
      location: `Day ${currentDay}`,
      suggestion: '결말로 향하는 중요한 선택을 제시하세요',
    });
    score -= 20;
  }

  // 권장사항 생성
  const recommendations: string[] = [];

  if (issues.some(i => i.type === 'pacing_problem')) {
    recommendations.push(`Day ${currentDay}의 긴장감을 ${expectedTension === 'high' ? '높이' : '조절'}세요`);
  }

  if (issues.some(i => i.type === 'character_inconsistency')) {
    recommendations.push('캐릭터의 감정 상태와 신뢰도를 일치시키세요');
  }

  if (currentDay >= totalDays - 2) {
    recommendations.push('엔딩으로 향하는 복선을 강화하세요');
  }

  return {
    isCoherent: score >= 70,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}


// =============================================================================
// 5. 통합 Narrative Engine 인터페이스
// =============================================================================

/**
 * Narrative Engine 상태
 */
export interface NarrativeEngineState {
  currentArcPlan: NarrativeArcPlan | null;
  endingPrediction: EndingPrediction | null;
  lastCoherenceCheck: CoherenceCheckResult | null;
  lastSelfEvaluation: SelfEvaluationResult | null;
  seedsPlanted: NarrativeSeed[];
  regenerationCount: number;
}

/**
 * Narrative Engine 초기 상태
 */
export function createInitialNarrativeEngineState(): NarrativeEngineState {
  return {
    currentArcPlan: null,
    endingPrediction: null,
    lastCoherenceCheck: null,
    lastSelfEvaluation: null,
    seedsPlanted: [],
    regenerationCount: 0,
  };
}

/**
 * AI 응답 개선 지시문 생성
 * Self-Evaluation 결과를 바탕으로 재생성 프롬프트에 추가할 지시문
 */
export function buildImprovementDirective(
  evaluation: SelfEvaluationResult,
  seeds: NarrativeSeed[],
): string {
  const directives: string[] = [];

  // 평가 결과에 따른 지시
  if (evaluation.dimensions.emotionalDepth < 10) {
    directives.push('- 반드시 내면 묘사 ("...라고 느꼈다")와 신체적 감정 표현 ("손이 떨렸다") 포함');
  }

  if (evaluation.dimensions.characterConsistency < 10) {
    directives.push('- 캐릭터 이름을 직접 언급하고 그들의 반응/대화 포함');
  }

  if (evaluation.dimensions.narrativeCoherence < 10) {
    directives.push('- 반드시 1인칭 ("나는", "내가")으로 서술, 스탯 수치/영문 용어 제거');
  }

  if (evaluation.dimensions.choiceClarity < 10) {
    directives.push('- 선택지는 15-50자, "~한다" 종결형, 서로 다른 접근법 제시');
  }

  // 복선 지시
  const highUrgencySeeds = seeds.filter(s => s.urgency === 'high');
  if (highUrgencySeeds.length > 0) {
    directives.push(`\n### 이번 응답에 반드시 포함할 복선 ###`);
    highUrgencySeeds.forEach(seed => {
      directives.push(`- [${seed.type}] ${seed.implementation}`);
    });
  }

  const mediumUrgencySeeds = seeds.filter(s => s.urgency === 'medium');
  if (mediumUrgencySeeds.length > 0) {
    directives.push(`\n### 가능하면 포함할 복선 ###`);
    mediumUrgencySeeds.forEach(seed => {
      directives.push(`- [${seed.type}] ${seed.implementation}`);
    });
  }

  if (directives.length === 0) {
    return '';
  }

  return `
### 품질 개선 지시 (이전 응답 평가: ${evaluation.overallScore}/100점) ###
${directives.join('\n')}
`;
}

/**
 * 턴 종료 시 Narrative Engine 업데이트
 */
export function updateNarrativeEngineAfterTurn(
  state: NarrativeEngineState,
  scenario: ScenarioData,
  saveState: SaveState,
  aiResponse: AIResponse,
): NarrativeEngineState {
  const currentDay = saveState.context.currentDay || 1;
  const totalDays = scenario.endCondition.value || 7;

  // 1. Self-Evaluation (빠른 체크)
  const selfEval = quickQualityCheck(aiResponse, scenario, currentDay);

  // 2. 엔딩 예측 업데이트
  const endingPred = calculateEndingProbabilities(scenario, saveState);

  // 3. 일관성 체크 (하루 끝에만)
  let coherenceCheck = state.lastCoherenceCheck;
  if (saveState.context.turnsInCurrentDay === 0) { // 새 날 시작
    coherenceCheck = checkNarrativeCoherence(
      [aiResponse.log],
      saveState.keyDecisions || [],
      saveState.characterArcs?.map(a => ({
        characterName: a.characterName,
        trustLevel: a.trustLevel,
        currentMood: a.currentMood,
      })) || [],
      currentDay,
      totalDays,
    );
  }

  // 4. 심은 복선 기록
  const plantedSeeds = [
    ...state.seedsPlanted,
    ...endingPred.seedsForCurrentTurn.filter(s => s.urgency === 'high'),
  ];

  return {
    ...state,
    endingPrediction: endingPred,
    lastCoherenceCheck: coherenceCheck,
    lastSelfEvaluation: selfEval,
    seedsPlanted: plantedSeeds.slice(-10), // 최근 10개만 유지
    regenerationCount: selfEval.shouldRegenerate ? state.regenerationCount + 1 : state.regenerationCount,
  };
}

export default {
  // Self-Evaluation
  buildSelfEvaluationPrompt,
  parseSelfEvaluationResponse,
  quickQualityCheck,

  // Narrative Arc Planning
  buildNarrativeArcPrompt,
  parseNarrativeArcResponse,

  // Ending Prediction
  calculateEndingProbabilities,

  // Coherence Check
  checkNarrativeCoherence,

  // Integration
  createInitialNarrativeEngineState,
  buildImprovementDirective,
  updateNarrativeEngineAfterTurn,
};
