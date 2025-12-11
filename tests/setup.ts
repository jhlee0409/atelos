/**
 * Vitest 테스트 환경 설정
 * @description 모든 테스트에서 공통으로 사용되는 설정
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 콘솔 경고/에러 모킹 (테스트 중 불필요한 출력 방지)
// 필요시 주석 처리하여 디버깅
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// 환경 변수 설정
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';

// 전역 타임아웃 설정
vi.setConfig({
  testTimeout: 30000,
});

// 테스트 후 정리
afterEach(() => {
  vi.clearAllMocks();
});

// 전체 테스트 종료 후 정리
afterAll(() => {
  vi.restoreAllMocks();
});
