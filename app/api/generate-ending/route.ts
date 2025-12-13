import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import type {
  ActionHistoryEntry,
  DynamicEndingConfig,
  DynamicEndingResult,
  Character,
  GoalAchievementLevel,
} from '@/types';

// =============================================================================
// SDT(Self-Determination Theory) 기반 동적 엔딩 생성 API
// 세계 최고 수준의 인터랙티브 내러티브 결말 생성 시스템
// =============================================================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// 결말 생성용 JSON 스키마
const ENDING_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: '결말 제목 (20자 이내, 시적이고 함축적인)',
    },
    narrative: {
      type: SchemaType.STRING,
      description: '결말 내러티브 (500-1000자, 플레이어 행동의 인과적 귀결)',
    },
    goalAchievement: {
      type: SchemaType.STRING,
      enum: ['triumph', 'success', 'partial', 'pyrrhic', 'failure', 'subverted', 'tragic'],
      description: '목표 달성도',
    },
    goalExplanation: {
      type: SchemaType.STRING,
      description: '목표 달성 설명 (플레이어 행동과의 인과관계 명시, 150자)',
    },
    characterFates: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          finalRelationship: { type: SchemaType.NUMBER },
          fate: { type: SchemaType.STRING, description: '캐릭터 운명 (100자 이내)' },
          finalScene: { type: SchemaType.STRING, description: '마지막 장면 (150자 이내)' },
          relationshipJourney: { type: SchemaType.STRING, description: '관계 변화 요약' },
        },
        required: ['name', 'finalRelationship', 'fate'],
      },
    },
    playerLegacy: {
      type: SchemaType.STRING,
      description: '플레이어의 유산/영향 (150자 이내)',
    },
    epilogue: {
      type: SchemaType.STRING,
      description: '에필로그 (200자 이내, 선택적)',
    },
    sdtScores: {
      type: SchemaType.OBJECT,
      properties: {
        autonomy: { type: SchemaType.NUMBER, description: '자율성 점수 (0-100)' },
        competence: { type: SchemaType.NUMBER, description: '유능감 점수 (0-100)' },
        relatedness: { type: SchemaType.NUMBER, description: '관계성 점수 (0-100)' },
      },
      required: ['autonomy', 'competence', 'relatedness'],
    },
    reasoning: {
      type: SchemaType.STRING,
      description: '결말 생성 근거 (내부 분석용)',
    },
  },
  required: [
    'title',
    'narrative',
    'goalAchievement',
    'goalExplanation',
    'characterFates',
    'playerLegacy',
    'sdtScores',
    'reasoning',
  ],
};

// =============================================================================
// SDT 기반 시스템 프롬프트 (세계 최고 수준)
// =============================================================================

const SDT_SYSTEM_PROMPT = `<role>
당신은 인터랙티브 내러티브 게임의 결말을 생성하는 마스터 스토리텔러입니다.
Self-Determination Theory(자기결정이론)에 기반하여 플레이어에게
심리적으로 만족스러운 결말을 제공합니다.
</role>

<sdt_framework>
## 자기결정이론(SDT) 핵심 원칙

### 1. 자율성 (Autonomy) - 가장 중요
- 플레이어의 모든 선택이 결말에 의미있게 반영되어야 합니다
- "내 선택이 이 결과를 만들었다"는 인과관계가 명확해야 합니다
- 결말은 플레이어 행동 패턴의 자연스러운 귀결이어야 합니다
- 플레이어가 일관되게 특정 방향으로 선택했다면, 결말은 그 방향을 반영해야 합니다

### 2. 유능감 (Competence)
- 플레이어의 노력과 전략이 인정받아야 합니다
- 성공하면 "나의 현명한 선택 덕분"이라는 느낌을 줘야 합니다
- 실패하더라도 "무엇을 배웠는지", "다음에는 어떻게 할 수 있는지" 명확해야 합니다
- 목표 달성도가 구체적으로 설명되어야 합니다
- "운이 나빴다"는 느낌을 주면 안 됩니다

### 3. 관계성 (Relatedness)
- 캐릭터들과의 관계가 결말의 핵심 요소여야 합니다
- 각 캐릭터의 운명이 플레이어와의 관계에 따라 결정됩니다
- 의미있는 이별, 재회, 또는 관계의 변화가 묘사되어야 합니다
- 플레이어가 관계 형성에 투자했다면, 그 투자가 보상받아야 합니다
</sdt_framework>

<ending_quality_standards>
## 결말 품질 기준

### 필수 요소 (MUST HAVE)
1. **인과적 명확성**: 결말의 모든 요소가 플레이어 행동에서 도출
2. **감정적 해소**: 긴장의 해소와 카타르시스 제공
3. **서사적 완결**: 열린 스레드의 자연스러운 마무리
4. **캐릭터 정의**: 각 캐릭터의 명확한 결말
5. **목표 평가**: 플레이어 목표 달성 여부의 명시적 판정

### 금지 사항 (CRITICAL - 절대 위반 금지)
1. ❌ 플레이어 행동과 무관한 임의의 결말
2. ❌ 설명 없는 급작스러운 전개 (Deus ex machina)
3. ❌ 캐릭터의 갑작스러운 성격 변화
4. ❌ "그냥 그렇게 되었다" 식의 모호한 결말
5. ❌ 플레이어를 혼란스럽게 하는 열린 결말
6. ❌ 의문을 남기는 미해결 요소
7. ❌ 플레이어 선택을 무시하는 강제 결말
8. ❌ 감정적으로 공허한 결말
</ending_quality_standards>

<narrative_techniques>
## 고급 서사 기법

### 결말 유형별 접근
- **triumph (완벽한 성공)**: 영웅적 서사, 성취의 정점, 희생의 가치 인정
- **success (성공)**: 목표 달성, 성장의 완성, 새로운 시작의 암시
- **partial (부분 성공)**: 얻은 것과 잃은 것의 균형, 성장의 대가
- **pyrrhic (피로스의 승리)**: 대가의 무게, 승리의 쓸쓸함, 가치의 재고
- **failure (실패)**: 교훈의 명확화, 실패의 존엄성, 재기의 가능성
- **subverted (전복)**: 예상과 다르지만 돌아보면 필연적, 새로운 관점
- **tragic (비극)**: 피할 수 없는 운명, 비극적 아름다움, 카타르시스

### 톤 관리
- 장르에 맞는 결말 톤 유지
- 감정의 적절한 클라이맥스와 해소
- 여운을 남기되 혼란을 주지 않는 마무리
- 희망적 요소는 행동에서 도출된 것만 사용
</narrative_techniques>

<action_analysis_guide>
## 행동 분석 가이드

### 도덕적 패턴 분석
- selfless (이타적): 타인을 위한 희생, 공동체 우선
- pragmatic (실용적): 효율과 결과 중시, 상황적 판단
- selfish (이기적): 자기 이익 우선, 생존 본능
- neutral (중립): 상황에 따른 균형잡힌 선택

### 관계 패턴 분석
- 지속적으로 대화한 캐릭터 → 깊은 유대 형성
- 회피한 캐릭터 → 소원한 관계, 미련 또는 후회
- 갈등을 겪은 캐릭터 → 화해 또는 결별

### 선택 일관성 분석
- 일관된 선택 → 강한 정체성, 명확한 결말
- 변화하는 선택 → 성장 서사, 변화의 계기 탐색
</action_analysis_guide>

<output_language>
모든 출력은 반드시 한국어로 작성하세요.
</output_language>`;

// =============================================================================
// 유저 프롬프트 빌더
// =============================================================================

function buildUserPrompt(
  scenario: {
    title: string;
    synopsis: string;
    genre: string[];
    playerGoal: string;
    characters: Character[];
  },
  dynamicEndingConfig: DynamicEndingConfig,
  actionHistory: ActionHistoryEntry[],
  finalState: {
    stats: Record<string, number>;
    relationships: Record<string, number>;
    day: number;
  },
  // [Stage 5] 발견된 정보 (optional)
  discoveredInfo?: {
    metCharacters: string[];
    discoveredRelationships: string[];
    hintedRelationships: string[];
    informationPieces: string[];
    revealedNPCRelations: string[];
  }
): string {
  // 행동 히스토리를 분석 가능한 형태로 변환
  const formattedHistory = actionHistory
    .map((a, idx) => {
      const statsStr = a.consequence.statsChanged.length > 0
        ? a.consequence.statsChanged.map(s => `${s.statId} ${s.delta > 0 ? '+' : ''}${s.delta}`).join(', ')
        : '없음';
      const relStr = a.consequence.relationshipsChanged.length > 0
        ? a.consequence.relationshipsChanged.map(r => `${r.character} ${r.delta > 0 ? '+' : ''}${r.delta}`).join(', ')
        : '없음';
      const eventsStr = a.consequence.significantEvents.length > 0
        ? a.consequence.significantEvents.join(', ')
        : '없음';

      return `[행동 ${idx + 1}] Day ${a.day} - ${a.actionType}
- 내용: ${a.content}
- 대상: ${a.target || '없음'}
- 스탯 변화: ${statsStr}
- 관계 변화: ${relStr}
- 주요 이벤트: ${eventsStr}
- 요약: ${a.narrativeSummary}
- 도덕적 성격: ${a.moralAlignment || '미평가'}`;
    })
    .join('\n\n');

  // 도덕적 패턴 분석
  const moralCounts = actionHistory.reduce((acc, a) => {
    if (a.moralAlignment) {
      acc[a.moralAlignment] = (acc[a.moralAlignment] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const dominantMoral = Object.entries(moralCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  // 캐릭터별 상호작용 횟수
  const characterInteractions = actionHistory.reduce((acc, a) => {
    if (a.target && scenario.characters.some(c => c.characterName === a.target)) {
      acc[a.target] = (acc[a.target] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return `<request>
다음 플레이어의 게임 기록을 분석하고, SDT 원칙에 기반한
만족스러운 결말을 생성해주세요.
</request>

<scenario_context>
제목: ${scenario.title}
시놉시스: ${scenario.synopsis}
장르: ${scenario.genre.join(', ')}
플레이어 목표: ${scenario.playerGoal}
총 플레이 일수: ${finalState.day}일
</scenario_context>

<characters>
${scenario.characters.map(c => `- ${c.characterName} (${c.roleName}): ${c.backstory}`).join('\n')}
</characters>

<player_behavior_analysis>
## 행동 통계
- 총 행동 수: ${actionHistory.length}회
- 행동 유형 분포:
  - 선택: ${actionHistory.filter(a => a.actionType === 'choice' && !a.isCustomInput).length}회
  - 직접 입력: ${actionHistory.filter(a => a.actionType === 'choice' && a.isCustomInput).length}회
  - 대화: ${actionHistory.filter(a => a.actionType === 'dialogue').length}회
  - 탐색: ${actionHistory.filter(a => a.actionType === 'exploration').length}회

## 도덕적 패턴
- 지배적 패턴: ${dominantMoral}
- 분포: ${JSON.stringify(moralCounts)}

## 캐릭터 상호작용
${Object.entries(characterInteractions)
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => `- ${name}: ${count}회 상호작용`)
  .join('\n') || '- 기록 없음'}
</player_behavior_analysis>

<action_history>
${formattedHistory}
</action_history>

<final_state>
## 최종 스탯
${Object.entries(finalState.stats).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## 최종 관계
${Object.entries(finalState.relationships).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
</final_state>

<evaluation_weights>
- 목표 달성: ${(dynamicEndingConfig.evaluationCriteria.goalWeight * 100).toFixed(0)}%
- 관계 품질: ${(dynamicEndingConfig.evaluationCriteria.relationshipWeight * 100).toFixed(0)}%
- 도덕적 일관성: ${(dynamicEndingConfig.evaluationCriteria.moralWeight * 100).toFixed(0)}%
- 서사적 완결: ${(dynamicEndingConfig.evaluationCriteria.narrativeWeight * 100).toFixed(0)}%
</evaluation_weights>

<narrative_guidelines>
${dynamicEndingConfig.narrativeGuidelines}
</narrative_guidelines>

<ending_tone_hints>
${dynamicEndingConfig.endingToneHints.join(', ')}
</ending_tone_hints>

<critical_requirements>
1. 결말은 반드시 플레이어 행동의 자연스러운 결과여야 합니다
2. 각 캐릭터의 운명은 플레이어와의 관계도에 따라 결정됩니다
3. 목표 달성도는 실제 행동 기록을 기반으로 정확히 평가합니다
4. 플레이어에게 의문이나 혼란을 주는 요소를 절대 포함하지 마세요
5. 모든 주요 스레드가 해결되어야 합니다
6. 플레이어가 투자한 관계는 결말에서 보상받아야 합니다
7. 한국어로 작성하세요
</critical_requirements>

${discoveredInfo ? `<discovered_knowledge>
## [Stage 5] 플레이어가 발견한 정보

### 만난 캐릭터
${discoveredInfo.metCharacters.length > 0 ? discoveredInfo.metCharacters.join(', ') : '없음'}

### 알게 된 NPC 관계
- 직접 발견: ${discoveredInfo.discoveredRelationships.length > 0 ? discoveredInfo.discoveredRelationships.join(', ') : '없음'}
- 힌트 얻음: ${discoveredInfo.hintedRelationships.length > 0 ? discoveredInfo.hintedRelationships.join(', ') : '없음'}
- 공개된 관계: ${discoveredInfo.revealedNPCRelations.length > 0 ? discoveredInfo.revealedNPCRelations.join(', ') : '없음'}

### 획득한 정보 조각 (최근 20개)
${discoveredInfo.informationPieces.length > 0 ? discoveredInfo.informationPieces.map((info, i) => `${i + 1}. ${info}`).join('\n') : '없음'}

**참고**: 위 정보는 플레이어가 직접 발견한 것입니다. 결말에서 이 정보를 활용하여 플레이어의 탐색과 대화 노력을 보상해주세요.
</discovered_knowledge>` : ''}`;
}

// =============================================================================
// API 핸들러
// =============================================================================

export interface GenerateEndingRequest {
  scenarioId: string;
  scenario: {
    title: string;
    synopsis: string;
    genre: string[];
    playerGoal: string;
    characters: Character[];
  };
  dynamicEndingConfig: DynamicEndingConfig;
  actionHistory: ActionHistoryEntry[];
  finalState: {
    stats: Record<string, number>;
    relationships: Record<string, number>;
    day: number;
  };
  // [Stage 5] 발견된 정보 (optional for backwards compatibility)
  discoveredInfo?: {
    metCharacters: string[];
    discoveredRelationships: string[];
    hintedRelationships: string[];
    informationPieces: string[];
    revealedNPCRelations: string[];
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateEndingRequest;

    // 입력 검증
    if (!body.scenario || !body.dynamicEndingConfig || !body.actionHistory || !body.finalState) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.actionHistory.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action history is empty' },
        { status: 400 }
      );
    }

    console.log('🎬 Generating dynamic ending for scenario:', body.scenario.title);
    console.log('📊 Action history entries:', body.actionHistory.length);

    // Gemini 모델 설정
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ENDING_RESPONSE_SCHEMA,
        temperature: 0.8, // 창의적인 결말 생성을 위해 약간 높은 온도
        maxOutputTokens: 4000,
      },
    });

    // 프롬프트 생성
    // [Stage 5] discoveredInfo 전달
    const userPrompt = buildUserPrompt(
      body.scenario,
      body.dynamicEndingConfig,
      body.actionHistory,
      body.finalState,
      body.discoveredInfo
    );

    // AI 호출
    const result = await model.generateContent([
      { text: SDT_SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const responseText = result.response.text();
    console.log('🤖 AI Response received, parsing...');

    // JSON 파싱
    let ending: DynamicEndingResult;
    try {
      ending = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // 응답 검증
    if (!ending.title || !ending.narrative || !ending.goalAchievement) {
      console.error('❌ Invalid ending structure:', ending);
      return NextResponse.json(
        { success: false, error: 'Invalid ending structure from AI' },
        { status: 500 }
      );
    }

    // goalAchievement 타입 검증
    const validAchievements: GoalAchievementLevel[] = [
      'triumph', 'success', 'partial', 'pyrrhic', 'failure', 'subverted', 'tragic'
    ];
    if (!validAchievements.includes(ending.goalAchievement)) {
      ending.goalAchievement = 'partial'; // 기본값
    }

    // SDT 점수 검증 및 정규화
    if (ending.sdtScores) {
      ending.sdtScores.autonomy = Math.min(100, Math.max(0, ending.sdtScores.autonomy || 50));
      ending.sdtScores.competence = Math.min(100, Math.max(0, ending.sdtScores.competence || 50));
      ending.sdtScores.relatedness = Math.min(100, Math.max(0, ending.sdtScores.relatedness || 50));
    } else {
      ending.sdtScores = { autonomy: 50, competence: 50, relatedness: 50 };
    }

    console.log('✅ Dynamic ending generated successfully');
    console.log('📈 SDT Scores:', ending.sdtScores);
    console.log('🏆 Goal Achievement:', ending.goalAchievement);

    // 사용량 정보
    const usage = result.response.usageMetadata;

    return NextResponse.json({
      success: true,
      ending,
      usage: usage ? {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
      } : undefined,
    });

  } catch (error) {
    console.error('❌ Error generating ending:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
