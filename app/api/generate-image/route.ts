import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadBase64Image } from '@/lib/blob-storage';

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
  scenarioId?: string; // Firebase Storage 저장용
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

// 장르별 비주얼 스타일 매핑
const GENRE_STYLE_MAP: Record<
  string,
  {
    atmosphere: string;
    lighting: string;
    colorPalette: string;
    mood: string;
    visualElements: string;
  }
> = {
  // 어두운/긴장감 장르
  스릴러: {
    atmosphere: 'tense and suspenseful with lurking danger',
    lighting: 'harsh shadows, low-key lighting with dramatic contrast',
    colorPalette: 'desaturated blues, grays, and blacks with occasional red accents',
    mood: 'paranoid, claustrophobic, and uncertain',
    visualElements: 'urban environments, rain-slicked streets, silhouettes',
  },
  호러: {
    atmosphere: 'dread-filled and unsettling with supernatural undertones',
    lighting: 'deep shadows, flickering lights, underlit faces',
    colorPalette: 'dark greens, sickly yellows, deep blacks, blood reds',
    mood: 'terrifying, ominous, and visceral',
    visualElements: 'fog, decay, distorted perspectives, isolation',
  },
  미스터리: {
    atmosphere: 'enigmatic and layered with hidden secrets',
    lighting: 'film noir style, venetian blind shadows, moody ambiance',
    colorPalette: 'sepia tones, warm shadows, golden highlights',
    mood: 'intriguing, contemplative, and secretive',
    visualElements: 'magnifying elements, obscured faces, symbolic objects',
  },
  범죄: {
    atmosphere: 'gritty and morally ambiguous underworld',
    lighting: 'neon-lit nights, harsh street lights, smoky interiors',
    colorPalette: 'noir blacks, neon pinks and blues, dirty yellows',
    mood: 'dangerous, seductive, and corrupt',
    visualElements: 'cityscapes, money, weapons, shadowy figures',
  },

  // 액션/모험 장르
  액션: {
    atmosphere: 'explosive and high-energy with constant motion',
    lighting: 'dynamic backlighting, lens flares, fire and explosion glow',
    colorPalette: 'bold oranges, fiery reds, steel blues, metallic grays',
    mood: 'adrenaline-pumping, heroic, and intense',
    visualElements: 'debris, motion blur, dramatic poses, urban destruction',
  },
  모험: {
    atmosphere: 'vast and wondrous with endless possibilities',
    lighting: 'golden hour sunlight, epic landscape lighting',
    colorPalette: 'earthy browns, sky blues, lush greens, sunset oranges',
    mood: 'adventurous, hopeful, and determined',
    visualElements: 'expansive landscapes, maps, ancient artifacts, journeys',
  },
  전쟁: {
    atmosphere: 'brutal and chaotic with the weight of sacrifice',
    lighting: 'smoky battlefield haze, muzzle flashes, burning embers',
    colorPalette: 'muddy browns, military greens, blood reds, ash grays',
    mood: 'somber, heroic, and devastating',
    visualElements: 'trenches, soldiers, destruction, flags, medals',
  },

  // SF/판타지 장르
  SF: {
    atmosphere: 'futuristic and technologically advanced',
    lighting: 'neon glows, holographic displays, artificial light sources',
    colorPalette: 'electric blues, cyber purples, chrome silvers, LED whites',
    mood: 'innovative, dystopian or utopian, alienating',
    visualElements: 'spacecraft, robots, cityscapes, digital interfaces',
  },
  판타지: {
    atmosphere: 'magical and otherworldly with ancient power',
    lighting: 'ethereal glows, mystical light sources, enchanted luminescence',
    colorPalette: 'royal purples, mystical blues, golden magic, forest greens',
    mood: 'wondrous, epic, and mythical',
    visualElements: 'castles, magical creatures, enchanted forests, runes',
  },
  '포스트 아포칼립스': {
    atmosphere: 'desolate and survival-focused in a broken world',
    lighting: 'dusty sunlight, overcast skies, campfire warmth',
    colorPalette: 'rust oranges, dusty browns, faded colors, toxic greens',
    mood: 'desperate, resilient, and haunting',
    visualElements: 'ruins, makeshift shelters, scavenged gear, empty cities',
  },

  // 감성/드라마 장르
  드라마: {
    atmosphere: 'emotionally charged with human depth',
    lighting: 'naturalistic with emotional undertones, window light',
    colorPalette: 'warm neutrals, emotional blues, intimate golden tones',
    mood: 'contemplative, bittersweet, and profound',
    visualElements: 'intimate spaces, meaningful objects, expressive faces',
  },
  로맨스: {
    atmosphere: 'intimate and emotionally warm with tenderness',
    lighting: 'soft diffused light, golden hour warmth, candlelit ambiance',
    colorPalette: 'soft pinks, warm peaches, romantic reds, gentle lavenders',
    mood: 'tender, passionate, and hopeful',
    visualElements: 'couples, flowers, meaningful locations, gentle touches',
  },
  멜로: {
    atmosphere: 'emotionally intense with beautiful sadness',
    lighting: 'rain-filtered light, autumn sun, melancholic blue hours',
    colorPalette: 'muted pastels, tearful blues, nostalgic sepia',
    mood: 'heartbreaking, yearning, and deeply emotional',
    visualElements: 'rain, autumn leaves, empty spaces, memories',
  },

  // 시대/역사 장르
  사극: {
    atmosphere: 'historically rich with cultural grandeur',
    lighting: 'candlelit interiors, natural daylight, ceremonial torches',
    colorPalette: 'royal golds, deep reds, traditional Korean colors, aged paper tones',
    mood: 'dignified, political, and culturally rich',
    visualElements: 'hanbok, palaces, traditional architecture, royal artifacts',
  },
  역사: {
    atmosphere: 'period-authentic with historical weight',
    lighting: 'era-appropriate lighting, oil lamps, natural sources',
    colorPalette: 'vintage tones, period-accurate colors, aged textures',
    mood: 'nostalgic, epic, and documentary',
    visualElements: 'period costumes, historical settings, artifacts',
  },

  // 코미디/가벼운 장르
  코미디: {
    atmosphere: 'light-hearted and energetically playful',
    lighting: 'bright and even, sitcom-style lighting, cheerful',
    colorPalette: 'vibrant primaries, cheerful yellows, playful pinks',
    mood: 'humorous, absurd, and joyful',
    visualElements: 'exaggerated expressions, comedic situations, bright settings',
  },
  가족: {
    atmosphere: 'warm and heartfelt with family bonds',
    lighting: 'warm home lighting, sunny outdoor scenes, cozy interiors',
    colorPalette: 'warm yellows, comforting oranges, homey browns',
    mood: 'heartwarming, nostalgic, and loving',
    visualElements: 'family gatherings, homes, shared moments, generations',
  },

  // 기본값
  default: {
    atmosphere: 'cinematic and visually striking',
    lighting: 'dramatic cinematic lighting with depth',
    colorPalette: 'rich and balanced with emotional undertones',
    mood: 'engaging and emotionally resonant',
    visualElements: 'compelling composition with narrative focus',
  },
};

// 장르에서 스타일 정보 추출
function getStyleFromGenres(genres: string[]): (typeof GENRE_STYLE_MAP)['default'] {
  // 첫 번째 매칭되는 장르의 스타일 사용
  for (const genre of genres) {
    const normalizedGenre = genre.trim();
    if (GENRE_STYLE_MAP[normalizedGenre]) {
      return GENRE_STYLE_MAP[normalizedGenre];
    }
  }
  return GENRE_STYLE_MAP['default'];
}

// 포스터 이미지 프롬프트 생성 (고도화)
function buildPosterPrompt(data: GenerateImageRequestBody): string {
  const genres = data.genre || ['드라마'];
  const style = getStyleFromGenres(genres);
  const genreText = genres.join(', ');
  const keywordText = data.keywords?.join(', ') || '';

  // 구조화된 자연어 프롬프트 (Google 권장 방식)
  return `Create a cinematic movie poster for a Korean interactive narrative game titled "${data.title || 'Untitled'}".

[SCENE DESCRIPTION]
The poster should capture the essence of this story: ${data.synopsis || 'A dramatic tale of choices and consequences.'}
The visual should immediately communicate the ${genreText} genre to viewers.

[SUBJECT & COMPOSITION]
Design a dramatic vertical movie poster composition in 2:3 aspect ratio.
Use a layered composition with foreground, midground, and background elements that create depth.
The main visual focus should embody the core themes: ${keywordText || 'drama, tension, choices'}.
Frame the composition using the rule of thirds for maximum visual impact.

[ATMOSPHERE & MOOD]
The overall atmosphere should feel ${style.atmosphere}.
Evoke a sense of ${style.mood} that draws viewers into the narrative.

[LIGHTING & CAMERA]
Apply ${style.lighting}.
Shoot with a cinematic wide-angle lens perspective, creating an epic sense of scale.
Use shallow depth of field to guide the viewer's eye to key elements.

[COLOR & STYLE]
Color palette: ${style.colorPalette}.
Visual style: High-quality photorealistic rendering with Korean cinema aesthetics.
Include these visual elements where appropriate: ${style.visualElements}.

[TECHNICAL REQUIREMENTS]
- Professional movie poster quality
- No text, titles, or letters anywhere in the image
- Clean composition suitable for adding text overlays later
- Dramatic and marketable visual appeal

The final image should look like it belongs on a theater wall, immediately communicating genre and tone while intriguing potential viewers.`;
}

// 캐릭터 이미지 프롬프트 생성 (고도화)
function buildCharacterPrompt(data: GenerateImageRequestBody): string {
  const genres = data.scenarioGenre || ['드라마'];
  const style = getStyleFromGenres(genres);
  const genreText = genres.join(', ');

  // 캐릭터 배경에서 나이/성별 힌트 추출 시도
  const backstory = data.backstory || '';
  const roleName = data.roleName || 'Supporting Character';

  return `Create a character portrait for "${data.characterName || 'Unknown'}", a key figure in the Korean ${genreText} narrative game "${data.scenarioTitle || 'Untitled'}".

[CHARACTER IDENTITY]
This character serves as the ${roleName} in the story.
Their background: ${backstory || 'A complex individual shaped by the world around them, carrying both visible and hidden depths.'}

[PORTRAIT COMPOSITION]
Frame as an upper body portrait shot in 1:1 square aspect ratio.
Position the character slightly off-center using the rule of thirds.
Create depth with a softly blurred background that hints at their world.
Capture them in a moment that reveals their inner nature.

[EXPRESSION & POSE]
The facial expression should convey layers of emotion appropriate to their role.
Body language should reflect their personality and current emotional state.
Eyes should be the focal point, telling their own story.

[ATMOSPHERE & ENVIRONMENT]
Background atmosphere: ${style.atmosphere}.
The environment should subtly reflect their world and circumstances.
Include contextual elements from: ${style.visualElements}.

[LIGHTING]
Apply ${style.lighting}.
Use Rembrandt or loop lighting to sculpt facial features dramatically.
Add subtle rim lighting to separate the subject from the background.

[COLOR & STYLE]
Color treatment: ${style.colorPalette}.
Visual style: Photorealistic Korean drama aesthetics with cinematic quality.
The overall mood should feel ${style.mood}.

[TECHNICAL REQUIREMENTS]
- High-quality portrait photography style
- No text or watermarks
- Detailed facial features with emotional depth
- Professional headshot quality suitable for character selection screens

The portrait should make viewers immediately curious about this character's story and role in the narrative.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequestBody = await request.json();
    const { type, scenarioId } = body;

    if (!type || (type !== 'poster' && type !== 'character')) {
      return NextResponse.json(
        { error: '유효한 이미지 타입(poster 또는 character)을 지정해주세요.' },
        { status: 400 },
      );
    }

    // 프롬프트 생성
    const prompt =
      type === 'poster' ? buildPosterPrompt(body) : buildCharacterPrompt(body);

    // 종횡비 설정: 포스터는 2:3, 캐릭터는 1:1
    const aspectRatio = type === 'poster' ? '2:3' : '1:1';

    console.log(`🎨 [Image Gen] ${type} 이미지 생성 시작...`);
    console.log(`📐 [Image Gen] 종횡비: ${aspectRatio}`);
    console.log(`🎭 [Image Gen] 장르:`, body.genre || body.scenarioGenre || ['default']);

    const client = getGeminiClient();

    // Gemini 2.5 Flash Image 모델 사용 (프로덕션)
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        // @ts-expect-error - responseModalities and imageConfig are valid for image generation
        responseModalities: ['Text', 'Image'],
        imageConfig: {
          aspectRatio,
        },
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

    // scenarioId가 필수 - Firebase Storage에 업로드
    if (!scenarioId) {
      console.error('❌ [Image Gen] scenarioId가 없습니다.');
      return NextResponse.json(
        { error: 'scenarioId가 필요합니다. 시나리오 ID를 먼저 입력해주세요.' },
        { status: 400 },
      );
    }

    const fileName = type === 'character' && body.characterName
      ? body.characterName
      : undefined;

    const uploadResult = await uploadBase64Image(
      imageBase64,
      scenarioId,
      type,
      fileName
    );

    if (uploadResult.success && uploadResult.url) {
      console.log('✅ [Image Gen] Vercel Blob Storage 업로드 성공:', uploadResult.url);
      return NextResponse.json({
        success: true,
        imageUrl: uploadResult.url,
        storagePath: uploadResult.path,
        message: textResponse,
      });
    }

    // Storage 업로드 실패 시 에러 반환
    console.error('❌ [Image Gen] Storage 업로드 실패:', uploadResult.error);
    return NextResponse.json(
      {
        error: uploadResult.error || 'Vercel Blob Storage 업로드에 실패했습니다. BLOB_READ_WRITE_TOKEN 환경변수를 확인해주세요.',
        details: '이미지는 생성되었지만 Storage에 저장하지 못했습니다.'
      },
      { status: 500 },
    );
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
