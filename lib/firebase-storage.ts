// Firebase Storage 이미지 서비스
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from './firebase';

// 이미지 타입
export type ImageType = 'poster' | 'character';

// 업로드 결과 타입
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Base64 이미지를 Firebase Storage에 업로드
 */
export async function uploadBase64Image(
  base64Data: string,
  scenarioId: string,
  imageType: ImageType,
  fileName?: string
): Promise<UploadResult> {
  try {
    // base64 데이터에서 prefix 제거 (data:image/png;base64, 등)
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // 파일명 생성
    const timestamp = Date.now();
    const name = fileName || `${imageType}_${timestamp}`;
    const path = `scenarios/${scenarioId}/${imageType}s/${name}.png`;

    const storageRef = ref(storage, path);

    // base64 문자열로 업로드
    await uploadString(storageRef, base64Content, 'base64', {
      contentType: 'image/png',
    });

    // 다운로드 URL 가져오기
    const url = await getDownloadURL(storageRef);

    console.log(`✅ [Storage] 이미지 업로드 성공: ${path}`);

    return {
      success: true,
      url,
      path,
    };
  } catch (error) {
    console.error('❌ [Storage] 이미지 업로드 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 실패',
    };
  }
}

/**
 * File 객체를 Firebase Storage에 업로드
 */
export async function uploadImageFile(
  file: File,
  scenarioId: string,
  imageType: ImageType,
  fileName?: string
): Promise<UploadResult> {
  try {
    // 파일명 생성
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const name = fileName || `${imageType}_${timestamp}`;
    const path = `scenarios/${scenarioId}/${imageType}s/${name}.${extension}`;

    const storageRef = ref(storage, path);

    // 파일 업로드
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    // 다운로드 URL 가져오기
    const url = await getDownloadURL(storageRef);

    console.log(`✅ [Storage] 파일 업로드 성공: ${path}`);

    return {
      success: true,
      url,
      path,
    };
  } catch (error) {
    console.error('❌ [Storage] 파일 업로드 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 실패',
    };
  }
}

/**
 * 이미지 삭제
 */
export async function deleteImage(path: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log(`✅ [Storage] 이미지 삭제 성공: ${path}`);
    return true;
  } catch (error) {
    console.error(`❌ [Storage] 이미지 삭제 실패 (${path}):`, error);
    return false;
  }
}

/**
 * 시나리오의 모든 이미지 삭제
 */
export async function deleteScenarioImages(scenarioId: string): Promise<boolean> {
  try {
    const folderRef = ref(storage, `scenarios/${scenarioId}`);
    const result = await listAll(folderRef);

    // 하위 폴더의 모든 파일 삭제
    for (const prefix of result.prefixes) {
      const subResult = await listAll(prefix);
      for (const item of subResult.items) {
        await deleteObject(item);
      }
    }

    // 직접 파일 삭제
    for (const item of result.items) {
      await deleteObject(item);
    }

    console.log(`✅ [Storage] 시나리오 이미지 전체 삭제: ${scenarioId}`);
    return true;
  } catch (error) {
    console.error(`❌ [Storage] 시나리오 이미지 삭제 실패 (${scenarioId}):`, error);
    return false;
  }
}

/**
 * 시나리오의 포스터 이미지 URL 가져오기
 */
export async function getScenarioPosterUrl(scenarioId: string): Promise<string | null> {
  try {
    const folderRef = ref(storage, `scenarios/${scenarioId}/posters`);
    const result = await listAll(folderRef);

    if (result.items.length === 0) {
      return null;
    }

    // 가장 최근 이미지 반환
    const latestItem = result.items[result.items.length - 1];
    return await getDownloadURL(latestItem);
  } catch (error) {
    console.error(`❌ [Storage] 포스터 URL 조회 실패 (${scenarioId}):`, error);
    return null;
  }
}

/**
 * 캐릭터 이미지 URL 가져오기
 */
export async function getCharacterImageUrl(
  scenarioId: string,
  characterName: string
): Promise<string | null> {
  try {
    // characterName을 파일명으로 사용하여 찾기
    const path = `scenarios/${scenarioId}/characters/${characterName}.png`;
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    // 파일이 없으면 null 반환
    return null;
  }
}

/**
 * 시나리오의 모든 캐릭터 이미지 URL 가져오기
 */
export async function getAllCharacterImageUrls(
  scenarioId: string
): Promise<Record<string, string>> {
  try {
    const folderRef = ref(storage, `scenarios/${scenarioId}/characters`);
    const result = await listAll(folderRef);

    const urls: Record<string, string> = {};

    for (const item of result.items) {
      const name = item.name.replace(/\.[^/.]+$/, ''); // 확장자 제거
      urls[name] = await getDownloadURL(item);
    }

    return urls;
  } catch (error) {
    console.error(`❌ [Storage] 캐릭터 이미지 목록 조회 실패 (${scenarioId}):`, error);
    return {};
  }
}
