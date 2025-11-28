import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 서버 사이드에서만 API 키 사용 (클라이언트에 노출되지 않음)
const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      '제미나이 API 키가 설정되지 않았습니다. .env.local 파일에 GOOGLE_GEMINI_API_KEY를 설정해주세요.',
    );
  }

  return apiKey;
};

// 제미나이 클라이언트 인스턴스 (서버 사이드에서만)
let genAI: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getApiKey());
  }
  return genAI;
};

// 요청 본문 타입
interface GeminiRequestBody {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GeminiRequestBody = await request.json();
    const {
      systemPrompt,
      userPrompt,
      model = 'gemini-2.5-flash-lite-preview-09-2025',
      temperature = 0.5,
      maxTokens = 2000,
    } = body;

    // 필수 필드 검증
    if (!systemPrompt || !userPrompt) {
      return NextResponse.json(
        { error: 'systemPrompt와 userPrompt는 필수입니다.' },
        { status: 400 },
      );
    }

    const client = getGeminiClient();
    const geminiModel = client.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
      systemInstruction: systemPrompt,
    });

    console.log('🤖 [API Route] 제미나이 API 호출 시작...');

    const result = await geminiModel.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ [API Route] 제미나이 API 응답 성공');
    console.log('📄 [API Route] 응답 길이:', text.length, '문자');

    // 사용량 정보
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    if (usage) {
      console.log('📊 [API Route] 토큰 사용량:', usage);
    }

    return NextResponse.json({
      text,
      usage,
    });
  } catch (error) {
    console.error('❌ [API Route] 제미나이 API 호출 실패:', error);

    // 에러 타입별 처리
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          { error: '제미나이 API 키가 유효하지 않습니다. API 키를 확인해주세요.' },
          { status: 401 },
        );
      } else if (error.message.includes('QUOTA')) {
        return NextResponse.json(
          { error: '제미나이 API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.' },
          { status: 429 },
        );
      } else if (error.message.includes('RATE_LIMIT')) {
        return NextResponse.json(
          { error: '제미나이 API 요청 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `제미나이 API 오류: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: '제미나이 API 호출 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
