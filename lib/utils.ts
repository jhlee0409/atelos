import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 파일을 base64 데이터 URL로 변환
 * blob URL 대신 base64를 사용하면 JSON으로 저장/로드가 가능
 * @param file 변환할 파일
 * @param maxSizeKB 최대 파일 크기 (KB), 기본 2048KB (2MB)
 * @returns Promise<string> base64 데이터 URL
 */
export async function fileToBase64(
  file: File,
  maxSizeKB: number = 2048,
): Promise<string> {
  // 파일 크기 검증
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB > maxSizeKB) {
    throw new Error(
      `파일 크기가 너무 큽니다. 최대 ${maxSizeKB}KB까지 허용됩니다. (현재: ${Math.round(fileSizeKB)}KB)`,
    );
  }

  // 이미지 파일 타입 검증
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * base64 데이터 URL인지 확인
 * @param url 확인할 URL
 * @returns boolean
 */
export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * blob URL인지 확인
 * @param url 확인할 URL
 * @returns boolean
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}
