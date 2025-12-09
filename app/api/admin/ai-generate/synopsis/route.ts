import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from '@google/generative-ai';

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

interface SynopsisGenerateRequest {
  idea: string; // 기본 아이디어/컨셉
  tone?: 'dark' | 'hopeful' | 'thriller' | 'dramatic' | 'comedic';
  setting?: string; // 배경 설정 (시대, 장소 등)
  targetLength?: 'short' | 'medium' | 'long'; // 시놉시스 길이
}

export interface SynopsisResult {
  title: string;
  scenarioId: string;
  synopsis: string;
  playerGoal: string;
  genre: string[];
  coreKeywords: string[];
  setting: {
    time: string;
    place: string;
    atmosphere: string;
  };
  suggestedThemes: string[];
  conflictType: string;
  narrativeHooks: string[];
}

// 시놉시스용 JSON 스키마 (Gemini responseSchema)
const SYNOPSIS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: '시나리오 제목 (한글)' },
    scenarioId: { type: SchemaType.STRING, description: '영문 대문자 ID' },
    synopsis: { type: SchemaType.STRING, description: '시놉시스 (200-600자)' },
    playerGoal: { type: SchemaType.STRING, description: '플레이어 목표' },
    genre: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '장르 목록',
    },
    coreKeywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '핵심 키워드 (#으로 시작)',
    },
    setting: {
      type: SchemaType.OBJECT,
      properties: {
        time: { type: SchemaType.STRING, description: '시간적 배경' },
        place: { type: SchemaType.STRING, description: '공간적 배경' },
        atmosphere: { type: SchemaType.STRING, description: '분위기' },
      },
      required: ['time', 'place', 'atmosphere'],
    },
    suggestedThemes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '탐구할 주제들',
    },
    conflictType: { type: SchemaType.STRING, description: '핵심 갈등 유형' },
    narrativeHooks: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '서사적 훅',
    },
  },
  required: [
    'title',
    'scenarioId',
    'synopsis',
    'playerGoal',
    'genre',
    'coreKeywords',
    'setting',
    'suggestedThemes',
    'conflictType',
    'narrativeHooks',
  ],
};

const TONE_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  dark: { name: '다크', description: '어둡고 절망적인 분위기, 생존과 도덕적 딜레마 강조' },
  hopeful: { name: '희망적', description: '희망적이고 성장 서사 중심, 역경을 이겨내는 이야기' },
  thriller: { name: '스릴러', description: '긴장감 넘치는 서스펜스, 예측 불가능한 전개' },
  dramatic: { name: '드라마틱', description: '감정적 깊이와 인물 간 갈등 중심' },
  comedic: { name: '코믹', description: '유머러스하면서도 풍자적인 요소 포함' },
};

const LENGTH_GUIDANCE: Record<string, { chars: string; description: string }> = {
  short: { chars: '100-200자', description: '핵심만 간결하게' },
  medium: { chars: '200-400자', description: '적당한 디테일 포함' },
  long: { chars: '400-600자', description: '상세한 배경과 갈등 포함' },
};

export async function POST(request: NextRequest) {
  try {
    const body: SynopsisGenerateRequest = await request.json();
    const { idea, tone = 'dramatic', setting, targetLength = 'medium' } = body;

    if (!idea || idea.trim().length < 10) {
      return NextResponse.json(
        { error: '아이디어는 최소 10자 이상 입력해주세요.' },
        { status: 400 },
      );
    }

    const toneInfo = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.dramatic;
    const lengthInfo = LENGTH_GUIDANCE[targetLength] || LENGTH_GUIDANCE.medium;

    // XML 구조화된 시스템 프롬프트
    const systemPrompt = `<role>인터랙티브 내러티브 게임 시나리오 전문 작가</role>

<task>사용자의 아이디어를 바탕으로 매력적인 시나리오 시놉시스를 생성합니다.</task>

<core_principles>
  <principle>플레이어가 주인공이 되어 선택하는 인터랙티브 스토리</principle>
  <principle>명확한 목표와 시간 제한이 있는 구조 (보통 7일)</principle>
  <principle>도덕적 딜레마와 의미 있는 선택지 포함</principle>
  <principle>다양한 엔딩으로 이어질 수 있는 분기점</principle>
</core_principles>

<tone name="${toneInfo.name}">${toneInfo.description}</tone>
<length chars="${lengthInfo.chars}">${lengthInfo.description}</length>

<output_guidelines>
  <guideline>title: 한글, 창의적이고 인상적인 제목 (부제 포함 가능)</guideline>
  <guideline>scenarioId: 영문 대문자와 언더스코어 (예: ZERO_HOUR, LAST_STAND)</guideline>
  <guideline>synopsis: ${lengthInfo.chars}의 시놉시스</guideline>
  <guideline>playerGoal: 한 문장으로 명확하게</guideline>
  <guideline>genre: 3-5개</guideline>
  <guideline>coreKeywords: 반드시 #으로 시작 (5-7개)</guideline>
  <guideline>setting: 시간적/공간적 배경과 분위기</guideline>
  <guideline>suggestedThemes: 3-4개 탐구 주제</guideline>
  <guideline>conflictType: 핵심 갈등 (예: 인간 vs 환경)</guideline>
  <guideline>narrativeHooks: 3개의 서사적 훅</guideline>
</output_guidelines>

<genre_examples>포스트아포칼립스, SF, 판타지, 호러, 미스터리, 스릴러, 심리, 서바이벌, 사회비평, 디스토피아, 로맨스, 역사, 현대, 액션</genre_examples>

<example>
{
  "title": "제로 아워: 마지막 7일",
  "scenarioId": "ZERO_HOUR",
  "synopsis": "좀비 바이러스가 창궐한 대한민국. 당신은 고립된 아파트 단지에서 30명의 생존자를 이끄는 지도자다. 외부 구조대가 7일 후 도착한다는 소식을 들었지만, 자원은 부족하고 외부 생존자 집단이 단지를 노리고 있다. 모두를 살릴 수 없는 상황에서, 당신은 어떤 선택을 할 것인가?",
  "playerGoal": "7일간 생존자들을 이끌고 안전하게 구조대를 기다린다",
  "genre": ["포스트아포칼립스", "서바이벌", "심리", "스릴러"],
  "coreKeywords": ["#좀비", "#생존", "#선택", "#희생", "#리더십"],
  "setting": {
    "time": "2024년 대한민국, 좀비 아포칼립스 발생 2주 후",
    "place": "서울 외곽의 고립된 아파트 단지",
    "atmosphere": "긴박하고 절망적인, 그러나 희망의 실낱같은 빛이 있는"
  },
  "suggestedThemes": ["생존과 인간성의 균형", "리더십의 무게", "희생의 의미", "공동체의 가치"],
  "conflictType": "생존 vs 도덕",
  "narrativeHooks": ["7일이라는 시간 제한", "자원 부족으로 인한 선택의 딜레마", "외부 집단의 위협"]
}
</example>`;

    // XML 구조화된 유저 프롬프트
    const userPrompt = `<request>다음 아이디어로 인터랙티브 게임 시나리오 시놉시스를 생성해주세요.</request>

<input_idea>${idea}</input_idea>
${setting ? `<setting_hint>${setting}</setting_hint>` : ''}

<instruction>플레이어가 주인공이 되어 선택하고 결과를 맞이하는 매력적인 시나리오를 만들어주세요.</instruction>`;

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.85, // 창의적 시놉시스 생성을 위해 높게
        maxOutputTokens: 3000, // 상세한 시놉시스를 위해 증가
        responseMimeType: 'application/json',
        responseSchema: SYNOPSIS_SCHEMA, // JSON 스키마로 구조 보장
      },
      systemInstruction: systemPrompt,
    });

    console.log(`🤖 [Synopsis Generate] 톤: ${tone}, 길이: ${targetLength}`);
    console.log(`📝 [Synopsis Generate] 아이디어: ${idea.substring(0, 50)}...`);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [Synopsis Generate] 응답 성공: ${text.length}자`);

    // responseSchema가 있으면 파싱이 보장되지만, 안전하게 처리
    let parsed: SynopsisResult;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
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
    console.error('❌ [Synopsis Generate] 생성 실패:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `시놉시스 생성 오류: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: '시놉시스 생성 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
