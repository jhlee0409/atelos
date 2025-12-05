/**
 * 기존 JSON 시나리오를 Firestore로 마이그레이션하는 스크립트
 *
 * 사용법:
 * npx tsx scripts/migrate-scenarios.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// 필수 환경 변수 확인
if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase 환경 변수가 설정되지 않았습니다.');
  console.error('다음 환경 변수를 설정하세요:');
  console.error('  FIREBASE_API_KEY');
  console.error('  FIREBASE_PROJECT_ID');
  console.error('  FIREBASE_APP_ID');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SCENARIOS_DIR = path.join(process.cwd(), 'data', 'scenarios');

async function migrateScenarios() {
  console.log('🚀 시나리오 마이그레이션 시작...\n');

  // index.json 읽기
  const indexPath = path.join(SCENARIOS_DIR, 'index.json');

  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.json 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const index = JSON.parse(indexContent);

  console.log(`📋 마이그레이션할 시나리오: ${index.scenarios.length}개\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const scenarioId of index.scenarios) {
    const scenarioPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);

    if (!fs.existsSync(scenarioPath)) {
      console.error(`❌ ${scenarioId}: 파일을 찾을 수 없음`);
      errorCount++;
      continue;
    }

    try {
      const scenarioContent = fs.readFileSync(scenarioPath, 'utf-8');
      const scenario = JSON.parse(scenarioContent);

      // Firestore에 저장
      const docRef = doc(db, 'scenarios', scenarioId);
      await setDoc(docRef, {
        ...scenario,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ ${scenarioId}: 마이그레이션 완료`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${scenarioId}: 마이그레이션 실패`, error);
      errorCount++;
    }
  }

  console.log('\n📊 마이그레이션 결과:');
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${errorCount}개`);
  console.log('\n✨ 마이그레이션 완료!');
}

migrateScenarios().catch(console.error);
