// 이미지 생성 클라이언트 유틸리티

export type ImageType = 'poster' | 'character';

export interface PosterImageRequest {
  type: 'poster';
  title: string;
  genre: string[];
  synopsis: string;
  keywords: string[];
}

export interface CharacterImageRequest {
  type: 'character';
  characterName: string;
  roleName: string;
  backstory: string;
  scenarioTitle: string;
  scenarioGenre: string[];
}

export type GenerateImageRequest = PosterImageRequest | CharacterImageRequest;

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
  error?: string;
}

/**
 * AI를 사용하여 포스터 이미지를 생성합니다.
 */
export async function generatePosterImage(params: {
  title: string;
  genre: string[];
  synopsis: string;
  keywords: string[];
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
      imageUrl: data.imageUrl,
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
 */
export async function generateCharacterImage(params: {
  characterName: string;
  roleName: string;
  backstory: string;
  scenarioTitle: string;
  scenarioGenre: string[];
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
      imageUrl: data.imageUrl,
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
