// Vercel Blob Storage - 이미지 업로드 유틸리티
import { put, del, list } from '@vercel/blob';

export type ImageType = 'poster' | 'character';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Base64 이미지를 Vercel Blob Storage에 업로드
 * 서버 사이드에서만 사용 가능 (API Route에서 호출)
 */
export async function uploadBase64Image(
  base64Data: string,
  scenarioId: string,
  imageType: ImageType,
  fileName?: string
): Promise<UploadResult> {
  try {
    console.log(`📤 [Blob Storage] 업로드 시작: ${imageType} for ${scenarioId}`);

    // base64 데이터에서 prefix 제거 (data:image/png;base64, 등)
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Buffer로 변환
    const imageBuffer = Buffer.from(base64Content, 'base64');
    console.log(`📤 [Blob Storage] 이미지 크기: ${imageBuffer.length} bytes`);

    // 파일명 생성
    const timestamp = Date.now();
    const name = fileName
      ? fileName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_') // 특수문자 제거
      : `${imageType}_${timestamp}`;
    const path = `scenarios/${scenarioId}/${imageType}s/${name}.png`;

    console.log(`📤 [Blob Storage] 경로: ${path}`);

    // Vercel Blob에 업로드
    const blob = await put(path, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false, // 경로 그대로 사용
    });

    console.log(`✅ [Blob Storage] 이미지 업로드 성공: ${blob.url}`);

    return {
      success: true,
      url: blob.url,
      path: blob.pathname,
    };
  } catch (error) {
    console.error('❌ [Blob Storage] 이미지 업로드 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('❌ [Blob Storage] 에러 상세:', errorMessage);
    return {
      success: false,
      error: `Blob Storage 업로드 실패: ${errorMessage}`,
    };
  }
}

/**
 * 이미지 삭제
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    await del(url);
    console.log(`✅ [Blob Storage] 이미지 삭제 성공: ${url}`);
    return true;
  } catch (error) {
    console.error(`❌ [Blob Storage] 이미지 삭제 실패 (${url}):`, error);
    return false;
  }
}

/**
 * 시나리오의 모든 이미지 삭제
 */
export async function deleteScenarioImages(scenarioId: string): Promise<boolean> {
  try {
    const prefix = `scenarios/${scenarioId}/`;

    // 해당 prefix의 모든 파일 목록 가져오기
    const { blobs } = await list({ prefix });

    if (blobs.length === 0) {
      console.log(`📤 [Blob Storage] 삭제할 이미지 없음: ${scenarioId}`);
      return true;
    }

    // 모든 파일 삭제
    await Promise.all(blobs.map((blob) => del(blob.url)));

    console.log(`✅ [Blob Storage] 시나리오 이미지 전체 삭제: ${scenarioId} (${blobs.length}개)`);
    return true;
  } catch (error) {
    console.error(`❌ [Blob Storage] 시나리오 이미지 삭제 실패 (${scenarioId}):`, error);
    return false;
  }
}

/**
 * URL이 Vercel Blob URL인지 확인
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('.public.blob.vercel-storage.com') ||
         url.includes('.blob.vercel-storage.com');
}

/**
 * URL이 Firebase Storage URL인지 확인 (레거시 지원)
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('storage.googleapis.com') ||
         url.includes('firebasestorage.googleapis.com');
}
