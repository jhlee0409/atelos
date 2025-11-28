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

/**
 * HTML 특수문자를 이스케이프하여 XSS 공격 방지
 * @param text 이스케이프할 문자열
 * @returns 이스케이프된 안전한 문자열
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return text.replace(/[&<>"'`=/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * 이스케이프된 HTML을 다시 원래 문자로 복원 (필요 시)
 * @param text 복원할 문자열
 * @returns 원래 문자열
 */
export function unescapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  return text.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g,
    (entity) => htmlUnescapeMap[entity] || entity
  );
}

/**
 * 텍스트에서 위험한 스크립트/이벤트 핸들러 패턴 제거
 * dangerouslySetInnerHTML 사용 전 추가 보안 레이어
 * @param html 검사할 HTML 문자열
 * @returns 정제된 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 스크립트 태그 제거
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 이벤트 핸들러 속성 제거 (onclick, onerror 등)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // javascript: 프로토콜 제거
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // data: 프로토콜 제거 (이미지 제외)
  sanitized = sanitized.replace(/data\s*:\s*(?!image\/)/gi, '');

  // iframe, object, embed 태그 제거
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/(iframe|object|embed|form|input|button)>/gi, '');

  return sanitized;
}
