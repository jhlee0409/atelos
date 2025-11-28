import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경 변수에서 API 키 가져오기
const getApiKey = (): string => {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      '제미나이 API 키가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY를 설정해주세요.',
    );
  }

  return apiKey;
};

// 제미나이 클라이언트 인스턴스 생성
let genAI: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getApiKey());
  }
  return genAI;
};

// 제미나이 API 호출 인터페이스
export interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 제미나이 API 호출 함수
export const callGeminiAPI = async ({
  systemPrompt,
  userPrompt,
  model = 'gemini-2.5-flash-lite-preview-09-2025',
  temperature = 0.5,
  maxTokens = 2000,
}: GeminiRequest): Promise<GeminiResponse> => {
  try {
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

    console.log('🤖 제미나이 API 호출 시작...');
    console.log('📝 시스템 프롬프트:', systemPrompt.substring(0, 200) + '...');
    console.log('👤 사용자 프롬프트:', userPrompt.substring(0, 200) + '...');

    const result = await geminiModel.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ 제미나이 API 응답 성공');
    console.log('📄 응답 길이:', text.length, '문자');

    // 사용량 정보 (제미나이 API에서 제공하는 경우)
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    if (usage) {
      console.log('📊 토큰 사용량:', usage);
    }

    return {
      text,
      usage,
    };
  } catch (error) {
    console.error('❌ 제미나이 API 호출 실패:', error);

    // 에러 타입별 처리
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        throw new Error(
          '제미나이 API 키가 유효하지 않습니다. API 키를 확인해주세요.',
        );
      } else if (error.message.includes('QUOTA')) {
        throw new Error(
          '제미나이 API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.',
        );
      } else if (error.message.includes('RATE_LIMIT')) {
        throw new Error(
          '제미나이 API 요청 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.',
        );
      }
      throw new Error(`제미나이 API 오류: ${error.message}`);
    }

    throw new Error('제미나이 API 호출 중 알 수 없는 오류가 발생했습니다.');
  }
};

// JSON 응답 파싱 유틸리티
export const parseGeminiJsonResponse = <T>(response: GeminiResponse): T => {
  try {
    // JSON 파싱 전에 숫자 앞의 + 기호를 제거하는 전처리
    let cleanedText = response.text;

    // 숫자 앞의 + 기호를 제거 (예: "+5" -> "5", "+10" -> "10")
    cleanedText = cleanedText.replace(/:\s*\+(\d+)/g, ': $1');

    // 추가적으로 일반적인 JSON 정리
    cleanedText = cleanedText.trim();

    console.log('🔄 JSON 파싱 전처리 완료');
    if (cleanedText !== response.text) {
      console.log('✂️ + 기호 제거됨');
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('❌ 제미나이 JSON 응답 파싱 실패:', error);
    console.log('📄 원본 응답:', response.text);

    // 파싱 실패 시 추가적인 정리 시도
    try {
      let fallbackText = response.text;

      // 더 강력한 정리: 모든 종류의 + 기호 제거
      fallbackText = fallbackText.replace(/\+(\d+)/g, '$1');

      // 백틱이나 마크다운 코드 블록 제거
      fallbackText = fallbackText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');

      // 앞뒤 공백 제거
      fallbackText = fallbackText.trim();

      console.log('🔄 폴백 파싱 시도');
      console.log('📝 정리된 텍스트:', fallbackText.substring(0, 200) + '...');

      return JSON.parse(fallbackText);
    } catch (fallbackError) {
      console.error('❌ 폴백 파싱도 실패:', fallbackError);
      throw new Error('제미나이 응답을 JSON으로 파싱할 수 없습니다.');
    }
  }
};

// 제미나이 연결 테스트 함수
export const testGeminiConnection = async (): Promise<boolean> => {
  try {
    const response = await callGeminiAPI({
      systemPrompt: '당신은 도움이 되는 AI 어시스턴트입니다.',
      userPrompt:
        '간단한 JSON 형태로 {"status": "ok", "message": "연결 성공"}을 반환해주세요.',
      maxTokens: 100,
    });

    const parsed = parseGeminiJsonResponse<{ status: string; message: string }>(
      response,
    );
    return parsed.status === 'ok';
  } catch (error) {
    console.error('제미나이 연결 테스트 실패:', error);
    return false;
  }
};
