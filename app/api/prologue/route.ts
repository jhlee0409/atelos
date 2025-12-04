import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('제미나이 API 키가 설정되지 않았습니다.');
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

interface PrologueRequestBody {
  item: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PrologueRequestBody = await request.json();
    const { item } = body;

    if (!item || item.trim().length === 0) {
      return NextResponse.json(
        { error: '아이템을 입력해주세요.' },
        { status: 400 }
      );
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200,
      },
    });

    const prompt = `당신은 포스트 아포칼립스 세계관의 작가입니다.
플레이어가 폐허가 된 도시에서 눈을 떴을 때, 손에 "${item}"을(를) 쥐고 있습니다.
이 상황을 묘사하는 짧고 강렬한 프롤로그 한 문단(2-3문장)을 한국어로 작성해주세요.
분위기는 긴장감 있고 미스터리하게 유지하세요.
오직 프롤로그 텍스트만 출력하세요.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return NextResponse.json({ prologue: text });
  } catch (error) {
    console.error('❌ [Prologue API] 프롤로그 생성 실패:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `프롤로그 생성 오류: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '프롤로그 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
