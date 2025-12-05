// Firebase Admin SDK - 서버 전용
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App | undefined;
let auth: Auth | undefined;

function getFirebaseAdmin() {
  if (!app) {
    const existingApps = getApps();

    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      // 서비스 계정 자격 증명 사용 (선택사항 - ID 토큰 검증에 필요)
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccount) {
        try {
          const credentials = JSON.parse(serviceAccount);
          app = initializeApp({
            credential: cert(credentials),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        } catch (error) {
          console.error('Firebase Admin 초기화 실패:', error);
          // 서비스 계정 없이 초기화 (제한된 기능)
          app = initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        }
      } else {
        // 서비스 계정 없이 초기화
        app = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
    }
  }

  if (!auth) {
    auth = getAuth(app);
  }

  return { app, auth };
}

export { getFirebaseAdmin };
