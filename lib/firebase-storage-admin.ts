// Firebase Admin Storage - 서버 전용 이미지 업로드
import { getFirebaseAdmin } from './firebase-admin';

export type ImageType = 'poster' | 'character';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Base64 이미지를 Firebase Storage에 업로드 (Admin SDK 사용)
 * 서버 사이드에서만 사용 가능
 */
export async function uploadBase64ImageAdmin(
  base64Data: string,
  scenarioId: string,
  imageType: ImageType,
  fileName?: string
): Promise<UploadResult> {
  try {
    const { storage } = getFirebaseAdmin();

    if (!storage) {
      console.error('❌ [Storage Admin] Firebase Storage가 초기화되지 않았습니다.');
      return {
        success: false,
        error: 'Firebase Storage가 초기화되지 않았습니다.',
      };
    }

    // base64 데이터에서 prefix 제거 (data:image/png;base64, 등)
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Buffer로 변환
    const imageBuffer = Buffer.from(base64Content, 'base64');

    // 파일명 생성
    const timestamp = Date.now();
    const name = fileName || `${imageType}_${timestamp}`;
    const path = `scenarios/${scenarioId}/${imageType}s/${name}.png`;

    // 버킷과 파일 참조 가져오기
    const bucket = storage.bucket();
    const file = bucket.file(path);

    // 파일 업로드
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // 1년 캐시
      },
    });

    // 파일을 공개로 설정
    await file.makePublic();

    // 공개 URL 생성
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    console.log(`✅ [Storage Admin] 이미지 업로드 성공: ${path}`);

    return {
      success: true,
      url: publicUrl,
      path,
    };
  } catch (error) {
    console.error('❌ [Storage Admin] 이미지 업로드 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 실패',
    };
  }
}

/**
 * 이미지 삭제 (Admin SDK 사용)
 */
export async function deleteImageAdmin(path: string): Promise<boolean> {
  try {
    const { storage } = getFirebaseAdmin();

    if (!storage) {
      console.error('❌ [Storage Admin] Firebase Storage가 초기화되지 않았습니다.');
      return false;
    }

    const bucket = storage.bucket();
    const file = bucket.file(path);

    await file.delete();
    console.log(`✅ [Storage Admin] 이미지 삭제 성공: ${path}`);
    return true;
  } catch (error) {
    console.error(`❌ [Storage Admin] 이미지 삭제 실패 (${path}):`, error);
    return false;
  }
}

/**
 * 시나리오의 모든 이미지 삭제 (Admin SDK 사용)
 */
export async function deleteScenarioImagesAdmin(scenarioId: string): Promise<boolean> {
  try {
    const { storage } = getFirebaseAdmin();

    if (!storage) {
      console.error('❌ [Storage Admin] Firebase Storage가 초기화되지 않았습니다.');
      return false;
    }

    const bucket = storage.bucket();
    const prefix = `scenarios/${scenarioId}/`;

    // 해당 prefix의 모든 파일 목록 가져오기
    const [files] = await bucket.getFiles({ prefix });

    // 모든 파일 삭제
    await Promise.all(files.map((file) => file.delete()));

    console.log(`✅ [Storage Admin] 시나리오 이미지 전체 삭제: ${scenarioId}`);
    return true;
  } catch (error) {
    console.error(`❌ [Storage Admin] 시나리오 이미지 삭제 실패 (${scenarioId}):`, error);
    return false;
  }
}
