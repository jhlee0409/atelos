// 이미지 최적화 유틸리티 (서버 사이드 전용)
import sharp from 'sharp';

export type ImageType = 'poster' | 'character';

// 이미지 타입별 최적화 설정
const IMAGE_CONFIGS = {
  poster: {
    maxWidth: 800,
    maxHeight: 1200,
    quality: 80,
  },
  character: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 80,
  },
} as const;

export interface OptimizeResult {
  success: boolean;
  buffer?: Buffer;
  base64?: string;
  originalSize?: number;
  optimizedSize?: number;
  format?: string;
  error?: string;
}

/**
 * Buffer 이미지를 WebP로 최적화합니다.
 * - 지정된 최대 크기로 리사이징
 * - WebP 형식으로 변환 (더 작은 파일 크기)
 * - 품질 조정으로 추가 압축
 */
export async function optimizeImageBuffer(
  imageBuffer: Buffer,
  imageType: ImageType
): Promise<OptimizeResult> {
  try {
    const config = IMAGE_CONFIGS[imageType];
    const originalSize = imageBuffer.length;

    console.log(`🖼️ [Image Optimizer] 최적화 시작 - 원본 크기: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    const optimizedBuffer = await sharp(imageBuffer)
      .resize(config.maxWidth, config.maxHeight, {
        fit: 'inside', // 비율 유지하면서 최대 크기 내에서 리사이징
        withoutEnlargement: true, // 원본보다 크게 확대하지 않음
      })
      .webp({
        quality: config.quality,
        effort: 4, // 압축 노력 (0-6, 높을수록 느리지만 작은 파일)
      })
      .toBuffer();

    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ [Image Optimizer] 최적화 완료 - 최적화 크기: ${(optimizedSize / 1024).toFixed(1)}KB (${compressionRatio}% 감소)`);

    return {
      success: true,
      buffer: optimizedBuffer,
      originalSize,
      optimizedSize,
      format: 'webp',
    };
  } catch (error) {
    console.error('❌ [Image Optimizer] 최적화 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '이미지 최적화 실패',
    };
  }
}

/**
 * Base64 이미지를 최적화하고 data URI로 반환합니다.
 */
export async function optimizeBase64Image(
  base64Data: string,
  imageType: ImageType
): Promise<OptimizeResult> {
  try {
    // base64 데이터에서 prefix 제거 (data:image/png;base64, 등)
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Buffer로 변환
    const imageBuffer = Buffer.from(base64Content, 'base64');

    // 최적화 수행
    const result = await optimizeImageBuffer(imageBuffer, imageType);

    if (!result.success || !result.buffer) {
      return result;
    }

    // 최적화된 이미지를 data URI로 변환
    const optimizedBase64 = `data:image/webp;base64,${result.buffer.toString('base64')}`;

    return {
      ...result,
      base64: optimizedBase64,
    };
  } catch (error) {
    console.error('❌ [Image Optimizer] Base64 최적화 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Base64 이미지 최적화 실패',
    };
  }
}

/**
 * 이미지 메타데이터를 가져옵니다.
 */
export async function getImageMetadata(imageBuffer: Buffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
    };
  } catch (error) {
    console.error('❌ [Image Optimizer] 메타데이터 조회 실패:', error);
    return null;
  }
}
