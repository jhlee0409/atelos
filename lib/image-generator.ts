// 이미지 생성 클라이언트 유틸리티

export type ImageType = 'poster' | 'character';

// 시나리오 배경 설정 (다양성 향상용)
export interface ScenarioSetting {
  timePeriod?: string; // 예: '현대', '조선시대', '2150년', '중세'
  location?: string; // 예: '서울', '뉴욕', '판타지 왕국', '우주정거장'
  culture?: string; // 예: '한국', '서양', '다문화', '미래 다국적'
}

export interface PosterImageRequest {
  type: 'poster';
  scenarioId?: string;
  title: string;
  genre: string[];
  synopsis: string;
  keywords: string[];
  setting?: ScenarioSetting; // 배경 설정 추가
}

export interface CharacterImageRequest {
  type: 'character';
  scenarioId?: string;
  characterName: string;
  roleName: string;
  backstory: string;
  traits?: string[]; // 캐릭터 특성 추가
  scenarioTitle: string;
  scenarioGenre: string[];
  setting?: ScenarioSetting; // 배경 설정 추가
}

export type GenerateImageRequest = PosterImageRequest | CharacterImageRequest;

export interface GenerateImageResponse {
  success: boolean;
  imageBase64?: string; // base64 이미지 데이터 (미리보기용)
  imageUrl?: string; // 업로드된 이미지 URL
  storagePath?: string;
  message?: string;
  error?: string;
}

export interface UploadImageResponse {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  error?: string;
}

/**
 * AI를 사용하여 포스터 이미지를 생성합니다.
 * base64 이미지 데이터를 반환합니다 (아직 Storage에 업로드되지 않음)
 */
export async function generatePosterImage(params: {
  title: string;
  genre: string[];
  synopsis: string;
  keywords: string[];
  setting?: ScenarioSetting;
}): Promise<GenerateImageResponse> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'poster',
        ...params,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '이미지 생성에 실패했습니다.',
      };
    }

    return {
      success: true,
      imageBase64: data.imageBase64,
      message: data.message,
    };
  } catch (error) {
    console.error('🎨 포스터 이미지 생성 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '이미지 생성 중 오류가 발생했습니다.',
    };
  }
}

/**
 * AI를 사용하여 캐릭터 이미지를 생성합니다.
 * base64 이미지 데이터를 반환합니다 (아직 Storage에 업로드되지 않음)
 */
export async function generateCharacterImage(params: {
  characterName: string;
  roleName: string;
  backstory: string;
  traits?: string[];
  scenarioTitle: string;
  scenarioGenre: string[];
  setting?: ScenarioSetting;
}): Promise<GenerateImageResponse> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'character',
        ...params,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '이미지 생성에 실패했습니다.',
      };
    }

    return {
      success: true,
      imageBase64: data.imageBase64,
      message: data.message,
    };
  } catch (error) {
    console.error('🎨 캐릭터 이미지 생성 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '이미지 생성 중 오류가 발생했습니다.',
    };
  }
}

/**
 * synopsis와 genre에서 배경 설정 정보를 추론합니다.
 * 이미지 생성 시 다양성을 위해 사용됩니다.
 */
export function inferSettingFromScenario(params: {
  synopsis?: string;
  genre?: string[];
}): ScenarioSetting {
  const { synopsis = '', genre = [] } = params;
  const text = synopsis.toLowerCase();
  const setting: ScenarioSetting = {};

  // 시대 추론
  if (text.includes('조선') || text.includes('고려') || text.includes('삼국') || text.includes('왕조')) {
    setting.timePeriod = '조선시대';
  } else if (text.includes('2100') || text.includes('2200') || text.includes('미래') || text.includes('우주') || text.includes('행성')) {
    setting.timePeriod = '미래';
  } else if (text.includes('중세') || text.includes('medieval') || text.includes('왕국') || text.includes('마법')) {
    setting.timePeriod = '중세 판타지';
  } else if (text.includes('1900') || text.includes('근대') || text.includes('일제')) {
    setting.timePeriod = '근대';
  }

  // 장소 추론
  if (text.includes('서울') || text.includes('부산') || text.includes('한국') || text.includes('강남')) {
    setting.location = '한국';
  } else if (text.includes('뉴욕') || text.includes('new york') || text.includes('미국') || text.includes('워싱턴')) {
    setting.location = '미국';
  } else if (text.includes('런던') || text.includes('파리') || text.includes('유럽') || text.includes('독일')) {
    setting.location = '유럽';
  } else if (text.includes('도쿄') || text.includes('일본') || text.includes('오사카')) {
    setting.location = '일본';
  } else if (text.includes('우주') || text.includes('정거장') || text.includes('행성') || text.includes('함선')) {
    setting.location = '우주';
  }

  // 문화권 추론 (장르 기반)
  const genreStr = genre.join(' ').toLowerCase();
  if (genre.includes('사극') || genreStr.includes('사극')) {
    setting.culture = '한국';
  } else if (genre.includes('판타지') || genreStr.includes('판타지')) {
    setting.culture = '판타지 세계';
  } else if (genre.includes('SF') || genreStr.includes('sf') || genreStr.includes('공상')) {
    setting.culture = '미래 다국적';
  } else if (genre.includes('포스트 아포칼립스') || genreStr.includes('아포칼립스')) {
    setting.culture = '다문화';
  }

  // 기본값: 문화권을 명시하지 않으면 다양성 확보
  if (!setting.culture && !setting.location && !setting.timePeriod) {
    // 장르에 한국 특화 장르가 없으면 다양성을 열어둠
    const koreanGenres = ['드라마', '멜로', '로맨스'];
    const isKoreanGenre = genre.some(g => koreanGenres.includes(g));
    if (!isKoreanGenre) {
      setting.culture = '다양함';
    }
  }

  return setting;
}

/**
 * base64 이미지를 Vercel Blob Storage에 업로드합니다.
 */
export async function uploadImage(params: {
  imageBase64: string;
  scenarioId: string;
  type: 'poster' | 'character';
  fileName?: string;
}): Promise<UploadImageResponse> {
  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '이미지 업로드에 실패했습니다.',
      };
    }

    return {
      success: true,
      imageUrl: data.imageUrl,
      storagePath: data.storagePath,
    };
  } catch (error) {
    console.error('📤 이미지 업로드 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '이미지 업로드 중 오류가 발생했습니다.',
    };
  }
}
