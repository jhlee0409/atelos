// 이미지 생성 클라이언트 유틸리티

export type ImageType = 'poster' | 'character';

export interface PosterImageRequest {
  type: 'poster';
  scenarioId?: string;
  title: string;
  genre: string[];
  synopsis: string;
  keywords: string[];
}

export interface CharacterImageRequest {
  type: 'character';
  scenarioId?: string;
  characterName: string;
  roleName: string;
  backstory: string;
  scenarioTitle: string;
  scenarioGenre: string[];
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
