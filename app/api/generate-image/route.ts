import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { optimizeBase64Image } from '@/lib/image-optimizer';

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
  scenarioId?: string; // Vercel Blob Storage 저장용
  // 포스터용 필드
  title?: string;
  genre?: string[];
  synopsis?: string;
  keywords?: string[];
  // 시나리오 배경 정보 (다양성 향상용)
  setting?: {
    timePeriod?: string; // 예: '현대', '조선시대', '2150년', '중세'
    location?: string; // 예: '서울', '뉴욕', '판타지 왕국', '우주정거장'
    culture?: string; // 예: '한국', '서양', '다문화', '미래 다국적'
  };
  // 캐릭터용 필드
  characterName?: string;
  roleName?: string;
  backstory?: string;
  traits?: string[]; // 캐릭터 특성
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

// 장르/배경별 시각적 스타일 (미학) 매핑
const AESTHETICS_MAP: Record<string, { visualStyle: string; characterStyle: string; diversity: string }> = {
  // 한국 특화 장르
  사극: {
    visualStyle: 'traditional Korean historical drama (sageuk) aesthetics with Joseon-era grandeur',
    characterStyle: 'Korean historical figures with traditional hanbok and period-appropriate styling',
    diversity: 'Korean historical',
  },
  // SF - 글로벌/미래지향
  SF: {
    visualStyle: 'international sci-fi cinema aesthetics blending Eastern and Western influences',
    characterStyle: 'diverse multinational cast reflecting a globalized future',
    diversity: 'diverse international, mixed ethnicities',
  },
  // 판타지 - 다양한 스타일
  판타지: {
    visualStyle: 'high fantasy aesthetics inspired by both Western and Eastern mythology',
    characterStyle: 'fantastical characters with varied appearances, from European medieval to Asian folklore',
    diversity: 'fantasy diverse, varied skin tones and features',
  },
  // 포스트 아포칼립스 - 글로벌
  '포스트 아포칼립스': {
    visualStyle: 'gritty post-apocalyptic cinema with international survival aesthetics',
    characterStyle: 'survivors from various backgrounds, weathered and diverse',
    diversity: 'diverse survivors, mixed ethnicities',
  },
  // 액션/전쟁 - 국제적
  액션: {
    visualStyle: 'Hollywood-style action cinema with global appeal',
    characterStyle: 'action heroes and characters of varied backgrounds',
    diversity: 'international action cast',
  },
  전쟁: {
    visualStyle: 'war film aesthetics, could be Korean War, WWII, or fictional conflict',
    characterStyle: 'soldiers and civilians from the conflict period',
    diversity: 'period-appropriate based on setting',
  },
  // 한국 현대물
  드라마: {
    visualStyle: 'contemporary Korean drama (K-drama) aesthetics',
    characterStyle: 'modern Korean characters in contemporary settings',
    diversity: 'primarily Korean with possible international characters',
  },
  로맨스: {
    visualStyle: 'romantic drama aesthetics with soft, intimate visuals',
    characterStyle: 'attractive leads appropriate to the setting',
    diversity: 'based on story setting',
  },
  멜로: {
    visualStyle: 'emotional melodrama with Korean cinematic sensibility',
    characterStyle: 'expressive Korean characters with deep emotional range',
    diversity: 'Korean melodrama cast',
  },
  // 서양 느낌
  미스터리: {
    visualStyle: 'noir and mystery cinema aesthetics, international detective style',
    characterStyle: 'mysterious figures, could be any ethnicity based on setting',
    diversity: 'diverse based on story setting',
  },
  범죄: {
    visualStyle: 'crime thriller aesthetics blending Korean noir with international influences',
    characterStyle: 'morally complex characters from urban environments',
    diversity: 'urban diverse',
  },
  스릴러: {
    visualStyle: 'psychological thriller cinema with suspenseful atmosphere',
    characterStyle: 'tense characters revealing inner turmoil',
    diversity: 'based on story setting',
  },
  호러: {
    visualStyle: 'Asian horror aesthetics with supernatural elements',
    characterStyle: 'characters facing the unknown, often Korean/Asian horror style',
    diversity: 'Asian horror tradition',
  },
  // 기본값
  default: {
    visualStyle: 'cinematic aesthetics with international appeal',
    characterStyle: 'diverse characters appropriate to the narrative',
    diversity: 'diverse international',
  },
};

// 배경 설정에서 미학 정보 추출
function getAestheticsFromSetting(setting?: GenerateImageRequestBody['setting'], genres?: string[]): typeof AESTHETICS_MAP['default'] {
  // 문화권 설정이 있으면 우선 사용
  if (setting?.culture) {
    const culture = setting.culture.toLowerCase();
    if (culture.includes('한국') || culture.includes('korean')) {
      return {
        visualStyle: 'Korean cinematic aesthetics',
        characterStyle: 'Korean characters with local styling',
        diversity: 'Korean',
      };
    }
    if (culture.includes('서양') || culture.includes('western') || culture.includes('유럽')) {
      return {
        visualStyle: 'Western cinematic aesthetics',
        characterStyle: 'Western characters with varied European/American features',
        diversity: 'Western diverse',
      };
    }
    if (culture.includes('다문화') || culture.includes('다국적') || culture.includes('international')) {
      return {
        visualStyle: 'international cinematic aesthetics',
        characterStyle: 'diverse multinational cast',
        diversity: 'diverse international, mixed ethnicities',
      };
    }
  }

  // 시대/지역 설정 확인
  if (setting?.timePeriod) {
    const period = setting.timePeriod.toLowerCase();
    if (period.includes('조선') || period.includes('고려') || period.includes('삼국')) {
      return AESTHETICS_MAP['사극'];
    }
    if (period.includes('중세') || period.includes('medieval')) {
      return {
        visualStyle: 'medieval European fantasy aesthetics',
        characterStyle: 'medieval European character designs',
        diversity: 'European medieval',
      };
    }
    if (period.includes('미래') || period.includes('21') || period.includes('22')) {
      return AESTHETICS_MAP['SF'];
    }
  }

  if (setting?.location) {
    const location = setting.location.toLowerCase();
    if (location.includes('서울') || location.includes('부산') || location.includes('한국')) {
      return {
        visualStyle: 'modern Korean urban aesthetics',
        characterStyle: 'contemporary Korean characters',
        diversity: 'Korean modern',
      };
    }
    if (location.includes('뉴욕') || location.includes('런던') || location.includes('파리') || location.includes('미국') || location.includes('유럽')) {
      return {
        visualStyle: 'Western urban cinematic aesthetics',
        characterStyle: 'diverse Western urban characters',
        diversity: 'Western urban diverse',
      };
    }
    if (location.includes('우주') || location.includes('space') || location.includes('행성')) {
      return AESTHETICS_MAP['SF'];
    }
  }

  // 장르에서 미학 추출
  if (genres?.length) {
    for (const genre of genres) {
      if (AESTHETICS_MAP[genre]) {
        return AESTHETICS_MAP[genre];
      }
    }
  }

  return AESTHETICS_MAP['default'];
}

// 캐릭터 배경에서 외모 힌트 추출
function extractAppearanceHints(backstory?: string, roleName?: string, traits?: string[]): string {
  const hints: string[] = [];

  // backstory에서 나이 관련 힌트 추출
  if (backstory) {
    const text = backstory.toLowerCase();
    // 나이대 추출
    if (text.includes('젊은') || text.includes('청년') || text.includes('20대') || text.includes('대학')) {
      hints.push('young adult in their 20s');
    } else if (text.includes('중년') || text.includes('40대') || text.includes('50대') || text.includes('경험 많은')) {
      hints.push('middle-aged, experienced');
    } else if (text.includes('노인') || text.includes('노년') || text.includes('60대') || text.includes('원로')) {
      hints.push('elderly, wise appearance');
    } else if (text.includes('10대') || text.includes('학생') || text.includes('소년') || text.includes('소녀')) {
      hints.push('teenager, youthful');
    }

    // 성별 힌트 (한국어 역할명에서)
    if (text.includes('여성') || text.includes('그녀') || text.includes('딸') || text.includes('어머니') || text.includes('여자') || text.includes('아내')) {
      hints.push('female');
    } else if (text.includes('남성') || text.includes('그는') || text.includes('아들') || text.includes('아버지') || text.includes('남자') || text.includes('남편')) {
      hints.push('male');
    }

    // 직업/외모 관련
    if (text.includes('군인') || text.includes('병사') || text.includes('장교')) {
      hints.push('military bearing, disciplined posture');
    }
    if (text.includes('과학자') || text.includes('연구원') || text.includes('박사')) {
      hints.push('intellectual appearance, thoughtful expression');
    }
    if (text.includes('의사') || text.includes('간호사') || text.includes('의료')) {
      hints.push('medical professional demeanor');
    }
    if (text.includes('무사') || text.includes('검객') || text.includes('전사')) {
      hints.push('warrior physique, battle-hardened');
    }
  }

  // 역할명에서 힌트
  if (roleName) {
    const role = roleName.toLowerCase();
    if (role.includes('리더') || role.includes('지도자') || role.includes('대장')) {
      hints.push('authoritative presence, leadership aura');
    }
    if (role.includes('조력자') || role.includes('보조')) {
      hints.push('supportive and approachable demeanor');
    }
    if (role.includes('악역') || role.includes('적대자')) {
      hints.push('intimidating or unsettling presence');
    }
  }

  // 특성에서 힌트
  if (traits?.length) {
    for (const trait of traits) {
      const t = trait.toLowerCase();
      if (t.includes('강인') || t.includes('힘') || t.includes('체력')) {
        hints.push('strong build, physically capable');
      }
      if (t.includes('지적') || t.includes('지능') || t.includes('전략')) {
        hints.push('sharp, intelligent eyes');
      }
      if (t.includes('카리스마') || t.includes('매력')) {
        hints.push('charismatic, magnetic presence');
      }
    }
  }

  return hints.length > 0 ? hints.join(', ') : 'distinctive and memorable appearance';
}

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
  const aesthetics = getAestheticsFromSetting(data.setting, genres);
  const genreText = genres.join(', ');
  const keywordText = data.keywords?.join(', ') || '';

  // 배경 설정 문자열 생성
  const settingContext = data.setting
    ? `Set in ${data.setting.location || 'an evocative location'}${data.setting.timePeriod ? ` during ${data.setting.timePeriod}` : ''}.`
    : '';

  // 구조화된 자연어 프롬프트 (Google 권장 방식)
  return `Create a cinematic movie poster for an interactive narrative game titled "${data.title || 'Untitled'}".

[SCENE DESCRIPTION]
The poster should capture the essence of this story: ${data.synopsis || 'A dramatic tale of choices and consequences.'}
${settingContext}
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
Visual style: High-quality photorealistic rendering with ${aesthetics.visualStyle}.
Include these visual elements where appropriate: ${style.visualElements}.

[DIVERSITY & REPRESENTATION]
Character representation: ${aesthetics.diversity}.
${aesthetics.characterStyle}.

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
  const aesthetics = getAestheticsFromSetting(data.setting, genres);
  const genreText = genres.join(', ');

  // 캐릭터 배경에서 나이/성별/외모 힌트 추출
  const backstory = data.backstory || '';
  const roleName = data.roleName || 'Supporting Character';
  const appearanceHints = extractAppearanceHints(backstory, roleName, data.traits);

  return `Create a character portrait for "${data.characterName || 'Unknown'}", a key figure in a ${genreText} narrative game "${data.scenarioTitle || 'Untitled'}".

[CHARACTER IDENTITY]
This character serves as the ${roleName} in the story.
Their background: ${backstory || 'A complex individual shaped by the world around them, carrying both visible and hidden depths.'}

[APPEARANCE GUIDANCE]
Physical characteristics: ${appearanceHints}.
Character style context: ${aesthetics.characterStyle}.
Ethnicity/diversity context: ${aesthetics.diversity}.

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
Visual style: Photorealistic ${aesthetics.visualStyle} with cinematic quality.
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

    console.log('✅ [Image Gen] 이미지 생성 성공, 최적화 시작...');

    // 이미지 최적화 (리사이징 + WebP 변환)
    const optimizeResult = await optimizeBase64Image(
      `data:image/png;base64,${imageBase64}`,
      type
    );

    if (!optimizeResult.success || !optimizeResult.base64) {
      console.error('❌ [Image Gen] 이미지 최적화 실패:', optimizeResult.error);
      // 최적화 실패 시 원본 반환
      return NextResponse.json({
        success: true,
        imageBase64: `data:image/png;base64,${imageBase64}`,
        message: textResponse,
      });
    }

    console.log(`✅ [Image Gen] 이미지 최적화 완료 - ${(optimizeResult.originalSize! / 1024 / 1024).toFixed(2)}MB → ${(optimizeResult.optimizedSize! / 1024).toFixed(1)}KB`);

    // 최적화된 이미지 반환
    return NextResponse.json({
      success: true,
      imageBase64: optimizeResult.base64,
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
