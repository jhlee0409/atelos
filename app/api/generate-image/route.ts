import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GOOGLE_GEMINI_API_KEY를 설정해주세요.',
    );
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

// 이미지 생성 요청 타입
export type ImageType = 'poster' | 'character';

interface GenerateImageRequestBody {
  type: ImageType;
  // 포스터용 필드
  title?: string;
  genre?: string[];
  synopsis?: string;
  keywords?: string[];
  // 캐릭터용 필드
  characterName?: string;
  roleName?: string;
  backstory?: string;
  scenarioTitle?: string;
  scenarioGenre?: string[];
}

// 포스터 이미지 프롬프트 생성
function buildPosterPrompt(data: GenerateImageRequestBody): string {
  const genres = data.genre?.join(', ') || '드라마';
  const keywords = data.keywords?.join(', ') || '';

  return `Create a dramatic movie poster for a Korean interactive narrative game.

Title: "${data.title || 'Untitled'}"
Genre: ${genres}
Synopsis: ${data.synopsis || 'A dramatic story of survival and choices.'}
Keywords: ${keywords}

Style Requirements:
- Cinematic movie poster composition (portrait orientation, 2:3 aspect ratio)
- Dark, moody atmosphere with dramatic lighting
- Post-apocalyptic or thriller aesthetic
- Professional quality, high contrast
- Korean drama/movie poster style
- No text or letters on the image
- Atmospheric fog, shadows, or dramatic sky elements
- Color palette: deep reds, blacks, grays, with selective highlighting

The image should evoke tension, mystery, and the weight of difficult choices.`;
}

// 캐릭터 이미지 프롬프트 생성
function buildCharacterPrompt(data: GenerateImageRequestBody): string {
  const genres = data.scenarioGenre?.join(', ') || '드라마';

  return `Create a character portrait for a Korean interactive narrative game.

Character Name: "${data.characterName || 'Unknown'}"
Role: ${data.roleName || 'Supporting Character'}
Background: ${data.backstory || 'A mysterious figure with hidden depths.'}
Game Title: "${data.scenarioTitle || 'Untitled'}"
Genre: ${genres}

Style Requirements:
- Upper body portrait or bust shot (square 1:1 aspect ratio)
- Realistic style with Korean drama aesthetics
- Dramatic cinematic lighting
- Character should appear weathered, determined, or contemplative
- Post-apocalyptic or thriller setting appropriate attire
- Professional quality, detailed features
- No text or letters on the image
- Muted color palette with selective accent colors
- Age-appropriate appearance based on the role

The portrait should convey the character's personality and story through expression and atmosphere.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequestBody = await request.json();
    const { type } = body;

    if (!type || (type !== 'poster' && type !== 'character')) {
      return NextResponse.json(
        { error: '유효한 이미지 타입(poster 또는 character)을 지정해주세요.' },
        { status: 400 },
      );
    }

    // 프롬프트 생성
    const prompt =
      type === 'poster' ? buildPosterPrompt(body) : buildCharacterPrompt(body);

    console.log(`🎨 [Image Gen] ${type} 이미지 생성 시작...`);
    console.log(`📝 [Image Gen] 프롬프트:`, prompt.substring(0, 200) + '...');

    const client = getGeminiClient();

    // Gemini 2.5 Flash Image 모델 사용 (프로덕션)
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        // @ts-expect-error - responseModalities is valid for image generation
        responseModalities: ['Text', 'Image'],
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // 응답에서 이미지 데이터 추출
    let imageBase64: string | null = null;
    let textResponse: string | null = null;

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if ('inlineData' in part && part.inlineData) {
          imageBase64 = part.inlineData.data;
        }
        if ('text' in part && part.text) {
          textResponse = part.text;
        }
      }
    }

    if (!imageBase64) {
      console.error('❌ [Image Gen] 이미지 데이터를 찾을 수 없습니다.');
      return NextResponse.json(
        { error: '이미지 생성에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 },
      );
    }

    console.log('✅ [Image Gen] 이미지 생성 성공');

    // Base64 이미지 URL 형식으로 반환
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      message: textResponse,
    });
  } catch (error) {
    console.error('❌ [Image Gen] 이미지 생성 실패:', error);

    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          { error: 'API 키가 유효하지 않습니다.' },
          { status: 401 },
        );
      }
      if (
        error.message.includes('QUOTA') ||
        error.message.includes('RATE_LIMIT')
      ) {
        return NextResponse.json(
          { error: 'API 요청 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 },
        );
      }
      if (error.message.includes('SAFETY')) {
        return NextResponse.json(
          {
            error:
              '안전 필터에 의해 이미지 생성이 차단되었습니다. 프롬프트를 수정해주세요.',
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: `이미지 생성 오류: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: '이미지 생성 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
