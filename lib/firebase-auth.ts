// Firebase Authentication 서비스
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase-client';

export type AuthUser = User | null;

/**
 * 이메일/비밀번호로 로그인
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ [Auth] 로그인 성공');
    return { success: true };
  } catch (error: any) {
    console.error('❌ [Auth] 로그인 실패:', error);

    // Firebase Auth 에러 코드별 메시지
    const errorMessages: Record<string, string> = {
      'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
      'auth/user-disabled': '비활성화된 계정입니다.',
      'auth/user-not-found': '등록되지 않은 계정입니다.',
      'auth/wrong-password': '비밀번호가 일치하지 않습니다.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
    };

    const errorMessage =
      errorMessages[error.code] || '로그인 중 오류가 발생했습니다.';

    return { success: false, error: errorMessage };
  }
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    console.log('✅ [Auth] 로그아웃 성공');
  } catch (error) {
    console.error('❌ [Auth] 로그아웃 실패:', error);
    throw error;
  }
}

/**
 * 현재 사용자 가져오기
 */
export function getCurrentUser(): AuthUser {
  return auth.currentUser;
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthChange(callback: (user: AuthUser) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * 사용자가 인증되었는지 확인
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}
