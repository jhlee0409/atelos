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

const TONE_DESCRIPTIONS: Record<string, string> = {
  dark: '어둡고 절망적인 분위기, 생존과 도덕적 딜레마 강조',
  hopeful: '희망적이고 성장 서사 중심, 역경을 이겨내는 이야기',
  thriller: '긴장감 넘치는 서스펜스, 예측 불가능한 전개',
  dramatic: '감정적 깊이와 인물 간 갈등 중심',
  comedic: '유머러스하면서도 풍자적인 요소 포함',
};

const LENGTH_GUIDANCE: Record<string, string> = {
  short: '100-200자의 간결한 시놉시스',
  medium: '200-400자의 적당한 시놉시스',
  long: '400-600자의 상세한 시놉시스',
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

    const toneDescription = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.dramatic;
    const lengthGuidance = LENGTH_GUIDANCE[targetLength] || LENGTH_GUIDANCE.medium;

    const systemPrompt = `당신은 인터랙티브 내러티브 게임 시나리오 전문 작가입니다.
사용자의 아이디어를 바탕으로 매력적인 시나리오 시놉시스를 생성합니다.

핵심 원칙:
1. 플레이어가 주인공이 되어 선택하는 인터랙티브 스토리
2. 명확한 목표와 시간 제한이 있는 구조 (보통 7일)
3. 도덕적 딜레마와 의미 있는 선택지 포함
4. 다양한 엔딩으로 이어질 수 있는 분기점

톤: ${toneDescription}
길이: ${lengthGuidance}

응답은 반드시 다음 JSON 형식으로:
{
  "title": "시나리오 제목 (한글, 창의적이고 인상적인 제목, 부제 포함 가능)",
  "scenarioId": "SCENARIO_ID (영문 대문자와 언더스코어, 예: ZERO_HOUR, LAST_STAND)",
  "synopsis": "시나리오 시놉시스 (한글, ${lengthGuidance})",
  "playerGoal": "플레이어의 핵심 목표 (한글, 한 문장으로 명확하게)",
  "genre": ["장르1", "장르2", "장르3"],
  "coreKeywords": ["#키워드1", "#키워드2", "#키워드3", "#키워드4", "#키워드5"],
  "setting": {
    "time": "시간적 배경 (예: 2024년 대한민국, 근미래, 중세 판타지 세계)",
    "place": "공간적 배경 (예: 폐쇄된 도시, 고립된 마을, 우주 정거장)",
    "atmosphere": "전반적인 분위기 (예: 긴박한, 절망적인, 신비로운)"
  },
  "suggestedThemes": ["이 시나리오가 탐구할 주제 3-4개"],
  "conflictType": "핵심 갈등 유형 (예: 인간 vs 환경, 개인 vs 사회, 생존 vs 도덕)",
  "narrativeHooks": ["플레이어를 끌어당길 서사적 훅 3개 (예: 숨겨진 비밀, 시간 제한, 배신의 가능성)"]
}

키워드는 반드시 #으로 시작해야 합니다.
장르 예시: 포스트아포칼립스, SF, 판타지, 호러, 미스터리, 스릴러, 심리, 서바이벌, 사회비평, 디스토피아`;

    const userPrompt = `다음 아이디어로 인터랙티브 게임 시나리오 시놉시스를 생성해주세요:

아이디어: ${idea}
${setting ? `배경 설정: ${setting}` : ''}

플레이어가 주인공이 되어 선택하고 결과를 맞이하는 매력적인 시나리오를 만들어주세요.`;

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.8, // 창의성을 위해 약간 높게
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
      systemInstruction: systemPrompt,
    });

    console.log(`🤖 [Synopsis Generate] 아이디어: ${idea.substring(0, 50)}...`);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [Synopsis Generate] 응답 성공: ${text.length}자`);

    // JSON 파싱
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
