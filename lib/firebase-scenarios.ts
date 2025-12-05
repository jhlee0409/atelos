// Firestore 시나리오 서비스
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ScenarioData } from '@/types';

// 컬렉션 이름
const SCENARIOS_COLLECTION = 'scenarios';

// 시나리오 요약 정보 타입
export interface ScenarioSummary {
  scenarioId: string;
  title: string;
  genre: string[];
  coreKeywords: string[];
  posterImageUrl: string;
  synopsis: string;
  playerGoal: string;
  status: ScenarioData['status'];
  characterCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// Firestore 문서 타입 (timestamp 포함)
interface ScenarioDocument extends ScenarioData {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Timestamp를 ISO 문자열로 변환
function timestampToISOString(timestamp: Timestamp | undefined): string | undefined {
  return timestamp?.toDate().toISOString();
}

// 모든 시나리오 목록 가져오기
export async function getAllScenarios(): Promise<ScenarioSummary[]> {
  try {
    const scenariosRef = collection(db, SCENARIOS_COLLECTION);
    const snapshot = await getDocs(scenariosRef);

    const summaries: ScenarioSummary[] = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as ScenarioDocument;
      summaries.push({
        scenarioId: data.scenarioId,
        title: data.title,
        genre: data.genre || [],
        coreKeywords: data.coreKeywords || [],
        posterImageUrl: data.posterImageUrl || '',
        synopsis: data.synopsis || '',
        playerGoal: data.playerGoal || '',
        status: data.status || 'in_progress',
        characterCount: data.characters?.length || 0,
        createdAt: timestampToISOString(data.createdAt),
        updatedAt: timestampToISOString(data.updatedAt),
      });
    });

    // updatedAt 기준 내림차순 정렬
    summaries.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return summaries;
  } catch (error) {
    console.error('❌ [Firebase] 시나리오 목록 조회 실패:', error);
    throw error;
  }
}

// 활성화된 시나리오만 가져오기 (로비용)
export async function getActiveScenarios(): Promise<ScenarioSummary[]> {
  try {
    const scenariosRef = collection(db, SCENARIOS_COLLECTION);
    const q = query(scenariosRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    const summaries: ScenarioSummary[] = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as ScenarioDocument;
      summaries.push({
        scenarioId: data.scenarioId,
        title: data.title,
        genre: data.genre || [],
        coreKeywords: data.coreKeywords || [],
        posterImageUrl: data.posterImageUrl || '',
        synopsis: data.synopsis || '',
        playerGoal: data.playerGoal || '',
        status: data.status,
        characterCount: data.characters?.length || 0,
        createdAt: timestampToISOString(data.createdAt),
        updatedAt: timestampToISOString(data.updatedAt),
      });
    });

    return summaries;
  } catch (error) {
    console.error('❌ [Firebase] 활성 시나리오 조회 실패:', error);
    throw error;
  }
}

// 특정 시나리오 가져오기
export async function getScenario(scenarioId: string): Promise<ScenarioData | null> {
  try {
    const docRef = doc(db, SCENARIOS_COLLECTION, scenarioId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      return null;
    }

    const data = docSnapshot.data() as ScenarioDocument;
    // Timestamp 필드 제거하고 반환
    const { createdAt, updatedAt, ...scenarioData } = data;
    return scenarioData as ScenarioData;
  } catch (error) {
    console.error(`❌ [Firebase] 시나리오 조회 실패 (${scenarioId}):`, error);
    throw error;
  }
}

// 시나리오 생성
export async function createScenario(scenario: ScenarioData): Promise<string> {
  try {
    const docRef = doc(db, SCENARIOS_COLLECTION, scenario.scenarioId);

    // 기존 문서 확인
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      throw new Error('이미 존재하는 시나리오 ID입니다.');
    }

    await setDoc(docRef, {
      ...scenario,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ [Firebase] 시나리오 생성: ${scenario.scenarioId}`);
    return scenario.scenarioId;
  } catch (error) {
    console.error('❌ [Firebase] 시나리오 생성 실패:', error);
    throw error;
  }
}

// 시나리오 업데이트
export async function updateScenario(scenario: ScenarioData): Promise<string> {
  try {
    const docRef = doc(db, SCENARIOS_COLLECTION, scenario.scenarioId);

    // 기존 문서 확인 후 createdAt 유지
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() as ScenarioDocument : null;

    await setDoc(docRef, {
      ...scenario,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ [Firebase] 시나리오 업데이트: ${scenario.scenarioId}`);
    return scenario.scenarioId;
  } catch (error) {
    console.error('❌ [Firebase] 시나리오 업데이트 실패:', error);
    throw error;
  }
}

// 시나리오 삭제
export async function deleteScenario(scenarioId: string): Promise<void> {
  try {
    const docRef = doc(db, SCENARIOS_COLLECTION, scenarioId);
    await deleteDoc(docRef);
    console.log(`✅ [Firebase] 시나리오 삭제: ${scenarioId}`);
  } catch (error) {
    console.error(`❌ [Firebase] 시나리오 삭제 실패 (${scenarioId}):`, error);
    throw error;
  }
}

// 시나리오 존재 여부 확인
export async function scenarioExists(scenarioId: string): Promise<boolean> {
  try {
    const docRef = doc(db, SCENARIOS_COLLECTION, scenarioId);
    const docSnapshot = await getDoc(docRef);
    return docSnapshot.exists();
  } catch (error) {
    console.error(`❌ [Firebase] 시나리오 존재 확인 실패 (${scenarioId}):`, error);
    throw error;
  }
}
