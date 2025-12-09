import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY가 설정되지 않았습니다.');
  }
  return apiKey;
};

let genAI: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getApiKey());
  }
  return genAI;
};

// 카테고리별 생성 타입
export type GenerationCategory =
  | 'scenario_overview'
  | 'characters'
  | 'relationships'
  | 'stats'
  | 'flags'
  | 'endings'
  | 'traits'
  | 'keywords'
  | 'genre';

interface AIGenerateRequestBody {
  category: GenerationCategory;
  input: string;
  context?: {
    genre?: string[];
    title?: string;
    synopsis?: string;
    existingCharacters?: string[];
    existingStats?: string[];
    existingFlags?: string[];
  };
}

// 카테고리별 프롬프트 템플릿
const getCategoryPrompt = (
  category: GenerationCategory,
  input: string,
  context?: AIGenerateRequestBody['context'],
): { systemPrompt: string; userPrompt: string } => {
  const baseContext = context
    ? `
현재 시나리오 정보:
- 장르: ${context.genre?.join(', ') || '미정'}
- 제목: ${context.title || '미정'}
- 시놉시스: ${context.synopsis || '미정'}
${context.existingCharacters?.length ? `- 기존 캐릭터: ${context.existingCharacters.join(', ')}` : ''}
${context.existingStats?.length ? `- 기존 스탯: ${context.existingStats.join(', ')}` : ''}
${context.existingFlags?.length ? `- 기존 플래그: ${context.existingFlags.join(', ')}` : ''}
`
    : '';

  const prompts: Record<
    GenerationCategory,
    { systemPrompt: string; userPrompt: string }
  > = {
    scenario_overview: {
      systemPrompt: `당신은 인터랙티브 내러티브 게임 시나리오 전문가입니다. 사용자의 아이디어를 바탕으로 시나리오 개요를 생성합니다.
응답은 반드시 다음 JSON 형식으로:
{
  "title": "시나리오 제목 (한글, 20자 이내)",
  "synopsis": "시나리오 개요 설명 (한글, 200-500자)",
  "playerGoal": "플레이어 목표 (한글, 100자 이내)",
  "genre": ["장르1", "장르2", "장르3"],
  "coreKeywords": ["#키워드1", "#키워드2", "#키워드3", "#키워드4", "#키워드5"],
  "scenarioId": "SCENARIO_ID_FORMAT"
}
장르 예시: 포스트아포칼립스, SF, 판타지, 호러, 미스터리, 로맨스, 스릴러, 역사, 현대, 액션
키워드는 반드시 #으로 시작해야 합니다.
scenarioId는 영문 대문자와 언더스코어만 사용합니다.`,
      userPrompt: `다음 아이디어로 시나리오 개요를 생성해주세요:\n${input}${baseContext}`,
    },

    characters: {
      systemPrompt: `당신은 인터랙티브 내러티브 게임의 캐릭터 디자이너입니다.
응답은 반드시 다음 JSON 형식의 배열로:
{
  "characters": [
    {
      "roleId": "ROLE_ID (영문 대문자)",
      "roleName": "역할명 (한글)",
      "characterName": "캐릭터 이름 (한글)",
      "backstory": "배경 스토리 (한글, 100-200자)",
      "suggestedTraits": ["특성ID1", "특성ID2"]
    }
  ]
}
역할 예시: LEADER, MEDIC, SOLDIER, SCIENTIST, SURVIVOR, MERCHANT, ANTAGONIST, MENTOR
특성 예시: optimistic, pessimistic, brave, cautious, charismatic, analytical, aggressive, peaceful`,
      userPrompt: `다음 설명을 바탕으로 캐릭터를 생성해주세요:\n${input}${baseContext}\n2-4명의 캐릭터를 제안해주세요.`,
    },

    relationships: {
      systemPrompt: `당신은 캐릭터 관계 디자이너입니다. 캐릭터들 간의 초기 관계를 설계합니다.
응답은 반드시 다음 JSON 형식의 배열로:
{
  "relationships": [
    {
      "personA": "캐릭터A 이름 (한글)",
      "personB": "캐릭터B 이름 (한글)",
      "value": -100에서 100 사이의 정수,
      "reason": "관계 설명 (한글, 50자 이내)"
    }
  ]
}
value 기준:
- 100: 깊은 신뢰/사랑/헌신
- 50~99: 우호적/협력적
- 0~49: 중립~약간 우호적
- -49~-1: 중립~약간 적대적
- -99~-50: 적대적/불신
- -100: 극심한 적대/증오

관계는 양방향이 아닐 수 있습니다 (A→B와 B→A가 다를 수 있음).
모든 캐릭터 쌍에 대해 최소 한 방향의 관계를 정의해주세요.
갈등, 로맨스, 멘토-멘티, 라이벌 등 다양한 관계 역학을 포함해주세요.`,
      userPrompt: `다음 캐릭터들 간의 초기 관계를 생성해주세요:\n${input}${baseContext}\n각 캐릭터 쌍마다 관계를 정의해주세요.`,
    },

    stats: {
      systemPrompt: `당신은 게임 시스템 디자이너입니다. 시나리오에 적합한 게임 스탯을 설계합니다.
응답은 반드시 다음 JSON 형식의 배열로:
{
  "stats": [
    {
      "id": "statId (camelCase 영문)",
      "name": "스탯 이름 (한글)",
      "description": "스탯 설명 (한글, 50자 이내)",
      "min": 0,
      "max": 100,
      "initialValue": 50,
      "polarity": "positive" | "negative"
    }
  ]
}
polarity: positive는 높을수록 좋음, negative는 낮을수록 좋음
일반적인 스탯 예시: morale(사기), resources(자원), safety(안전도), trust(신뢰도), chaos(혼란도)`,
      userPrompt: `다음 시나리오에 적합한 스탯을 제안해주세요:\n${input}${baseContext}\n4-6개의 스탯을 제안해주세요.`,
    },

    flags: {
      systemPrompt: `당신은 게임 시스템 디자이너입니다. 시나리오 진행을 추적할 플래그를 설계합니다.
응답은 반드시 다음 JSON 형식의 배열로:
{
  "flags": [
    {
      "flagName": "FLAG_NAME_FORMAT (영문 대문자, FLAG_ 접두사)",
      "type": "boolean" | "count",
      "description": "플래그 설명 (한글, 50자 이내)",
      "triggerCondition": "발동 조건 설명 (한글, 100자 이내)"
    }
  ]
}

중요: 게임에는 3가지 주요 루트(경로)가 있으며, 각 루트에 맞는 플래그를 반드시 포함해야 합니다:

1. 탈출 루트 (Escape Route): 위험을 피해 안전한 곳으로 이동하는 선택
   - 예시: FLAG_ESCAPE_ROUTE_FOUND, FLAG_VEHICLE_SECURED, FLAG_EXIT_DISCOVERED

2. 항전 루트 (Defense Route): 현재 위치를 지키고 방어하는 선택
   - 예시: FLAG_DEFENSES_COMPLETE, FLAG_RESOURCE_STOCKPILE, FLAG_TERRITORY_SECURED

3. 협상 루트 (Negotiation Route): 외부 세력과 협력하거나 대화로 해결하는 선택
   - 예시: FLAG_ALLY_NETWORK_FORMED, FLAG_PEACE_TREATY, FLAG_CONTACT_ESTABLISHED

각 루트별로 최소 1-2개의 플래그를 포함하고, 추가로 일반적인 이벤트 플래그도 포함해주세요.
플래그 예시: FLAG_SECRET_DISCOVERED, FLAG_BETRAYAL_REVEALED, FLAG_LEADER_CHOSEN`,
      userPrompt: `다음 시나리오에 적합한 이벤트 플래그를 제안해주세요:\n${input}${baseContext}\n\n중요: 탈출/항전/협상 3가지 루트에 맞는 플래그를 각각 포함해서 8-12개의 플래그를 제안해주세요.`,
    },

    endings: {
      systemPrompt: `당신은 내러티브 디자이너입니다. 시나리오의 다양한 엔딩을 설계합니다.
응답은 반드시 다음 JSON 형식의 배열로:
{
  "endings": [
    {
      "endingId": "ENDING_ID (영문 대문자)",
      "title": "엔딩 제목 (한글)",
      "description": "엔딩 설명 (한글, 100-200자)",
      "isGoalSuccess": true | false,
      "suggestedConditions": {
        "stats": [{ "statId": "스탯ID", "comparison": ">=", "value": 70 }],
        "flags": ["FLAG_NAME"]
      }
    }
  ]
}
비교 연산자: >=, <=, ==, >, <, !=
좋은 엔딩과 나쁜 엔딩을 균형있게 포함해주세요.`,
      userPrompt: `다음 시나리오에 적합한 엔딩을 제안해주세요:\n${input}${baseContext}\n3-5개의 다양한 엔딩을 제안해주세요.`,
    },

    traits: {
      systemPrompt: `당신은 캐릭터 시스템 디자이너입니다. 캐릭터 특성(버프/디버프)을 설계합니다.
응답은 반드시 다음 JSON 형식으로:
{
  "buffs": [
    {
      "traitId": "traitId (camelCase 영문, 예: leadership)",
      "traitName": "시스템 이름 (영문 snake_case, 예: natural_leader)",
      "displayName": "표시 이름 (한글, 예: 타고난 리더)",
      "description": "특성 설명 (한글, 50자 이내)",
      "effect": "게임 내 효과 설명 (한글)"
    }
  ],
  "debuffs": [
    {
      "traitId": "traitId (camelCase 영문, 예: trauma)",
      "traitName": "시스템 이름 (영문 snake_case, 예: deep_trauma)",
      "displayName": "표시 이름 (한글, 예: 깊은 트라우마)",
      "description": "특성 설명 (한글, 50자 이내)",
      "effect": "게임 내 효과 설명 (한글)"
    }
  ]
}
중요: traitName은 영문 시스템 식별자, displayName은 사용자에게 보여줄 한글 이름입니다.`,
      userPrompt: `다음 시나리오에 적합한 캐릭터 특성을 제안해주세요:\n${input}${baseContext}\n버프 3-4개, 디버프 3-4개를 제안해주세요.`,
    },

    keywords: {
      systemPrompt: `당신은 시나리오 태깅 전문가입니다.
응답은 반드시 다음 JSON 형식으로:
{
  "keywords": ["#키워드1", "#키워드2", "#키워드3", "#키워드4", "#키워드5", "#키워드6", "#키워드7", "#키워드8"]
}
키워드는 반드시 #으로 시작해야 합니다.
시나리오의 핵심 테마, 분위기, 설정, 주요 요소를 표현하는 키워드를 생성해주세요.`,
      userPrompt: `다음 시나리오에 적합한 핵심 키워드를 제안해주세요:\n${input}${baseContext}\n6-10개의 키워드를 제안해주세요.`,
    },

    genre: {
      systemPrompt: `당신은 게임 장르 분류 전문가입니다.
응답은 반드시 다음 JSON 형식으로:
{
  "genres": ["장르1", "장르2", "장르3", "장르4", "장르5", "장르6"]
}
장르 예시: 포스트아포칼립스, SF, 판타지, 호러, 미스터리, 로맨스, 스릴러, 역사, 현대, 액션, 어드벤처, 서바이벌, 심리, 사이버펑크, 스팀펑크, 디스토피아, 유토피아, 군사, 정치, 사회비평`,
      userPrompt: `다음 시나리오에 적합한 장르를 제안해주세요:\n${input}${baseContext}\n5-8개의 장르를 제안해주세요.`,
    },
  };

  return prompts[category];
};

export async function POST(request: NextRequest) {
  try {
    const body: AIGenerateRequestBody = await request.json();
    const { category, input, context } = body;

    if (!category || !input) {
      return NextResponse.json(
        { error: 'category와 input은 필수입니다.' },
        { status: 400 },
      );
    }

    const { systemPrompt, userPrompt } = getCategoryPrompt(
      category,
      input,
      context,
    );

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
      systemInstruction: systemPrompt,
    });

    console.log(`🤖 [AI Generate] 카테고리: ${category}, 입력: ${input.substring(0, 100)}...`);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [AI Generate] 응답 성공: ${text.length}자`);

    // JSON 파싱 검증
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON 정리 시도
      const cleaned = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      category,
      data: parsed,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    });
  } catch (error) {
    console.error('❌ [AI Generate] 생성 실패:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `AI 생성 오류: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'AI 생성 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
