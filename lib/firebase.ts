// Firebase 클라이언트 설정
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase 설정 - 환경 변수에서만 로드
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// 필수 환경 변수 검증
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_APP_ID',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ [Firebase] Missing required environment variable: ${envVar}`);
  }
}

// Firebase 앱 초기화 (중복 초기화 방지)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firestore 인스턴스
export const db = getFirestore(app);

// Analytics 인스턴스 (브라우저 환경에서만)
export const getAnalyticsInstance = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getAnalytics(app);
  }
  return null;
};

export { app };
