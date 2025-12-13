// Firebase Admin SDK - 서버 전용
// 참고: 이미지 저장은 Vercel Blob Storage 사용 (lib/blob-storage.ts)
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function getFirebaseAdmin() {
  if (!app) {
    const existingApps = getApps();

    if (existingApps.length > 0) {
      console.log('🔥 [Firebase Admin] 기존 앱 재사용');
      app = existingApps[0];
    } else {
      // 서비스 계정 자격 증명 사용 (선택사항 - ID 토큰 검증에 필요)
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccount) {
        console.log('🔥 [Firebase Admin] 서비스 계정 발견, 파싱 시도...');
        try {
          const credentials = JSON.parse(serviceAccount);
          console.log('🔥 [Firebase Admin] JSON 파싱 성공, 초기화 중...');
          app = initializeApp({
            credential: cert(credentials),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          console.log('✅ [Firebase Admin] 초기화 성공');
        } catch (error) {
          console.error('❌ [Firebase Admin] 초기화 실패:', error);
          console.error('❌ [Firebase Admin] serviceAccount 길이:', serviceAccount.length);
          console.error('❌ [Firebase Admin] serviceAccount 미리보기:', serviceAccount.substring(0, 100));
          throw new Error('Firebase Admin 초기화 실패: 서비스 계정 자격 증명을 파싱할 수 없습니다.');
        }
      } else {
        console.error('❌ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않음');
        throw new Error('Firebase Admin 초기화 실패: FIREBASE_SERVICE_ACCOUNT_KEY가 필요합니다.');
      }
    }
  }

  if (!auth) {
    auth = getAuth(app);
  }

  if (!db) {
    db = getFirestore(app);
  }

  return { app, auth, db };
}

export { getFirebaseAdmin };
