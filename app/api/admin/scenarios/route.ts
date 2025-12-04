import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { ScenarioData } from '@/types';

// 시나리오 저장 경로
const SCENARIOS_DIR = path.join(process.cwd(), 'data', 'scenarios');
const SCENARIOS_INDEX_FILE = path.join(SCENARIOS_DIR, 'index.json');

// 디렉토리 존재 확인 및 생성
async function ensureDirectoryExists() {
  try {
    await fs.access(SCENARIOS_DIR);
  } catch {
    await fs.mkdir(SCENARIOS_DIR, { recursive: true });
  }
}

// 시나리오 인덱스 파일 로드
async function loadScenariosIndex(): Promise<{ scenarios: string[]; updatedAt: string }> {
  try {
    const content = await fs.readFile(SCENARIOS_INDEX_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { scenarios: [], updatedAt: new Date().toISOString() };
  }
}

// 시나리오 인덱스 파일 저장
async function saveScenariosIndex(scenarios: string[]) {
  await ensureDirectoryExists();
  await fs.writeFile(
    SCENARIOS_INDEX_FILE,
    JSON.stringify({ scenarios, updatedAt: new Date().toISOString() }, null, 2),
  );
}

// 개별 시나리오 파일 로드
async function loadScenario(scenarioId: string): Promise<ScenarioData | null> {
  try {
    const filePath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 개별 시나리오 파일 저장
async function saveScenario(scenario: ScenarioData) {
  await ensureDirectoryExists();
  const filePath = path.join(SCENARIOS_DIR, `${scenario.scenarioId}.json`);
  await fs.writeFile(filePath, JSON.stringify(scenario, null, 2));
}

// 개별 시나리오 파일 삭제
async function deleteScenarioFile(scenarioId: string) {
  try {
    const filePath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
    await fs.unlink(filePath);
  } catch {
    // 파일이 없어도 무시
  }
}

// 시나리오 요약 정보 타입
export interface ScenarioSummary {
  scenarioId: string;
  title: string;
  genre: string[];
  posterImageUrl: string;
  status: ScenarioData['status'];
  characterCount: number;
  updatedAt?: string;
}

// GET: 모든 시나리오 리스트 가져오기
export async function GET() {
  try {
    await ensureDirectoryExists();
    const index = await loadScenariosIndex();

    const summaries: ScenarioSummary[] = [];

    for (const scenarioId of index.scenarios) {
      const scenario = await loadScenario(scenarioId);
      if (scenario) {
        summaries.push({
          scenarioId: scenario.scenarioId,
          title: scenario.title,
          genre: scenario.genre,
          posterImageUrl: scenario.posterImageUrl,
          status: scenario.status,
          characterCount: scenario.characters?.length || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      scenarios: summaries,
      total: summaries.length,
    });
  } catch (error) {
    console.error('❌ [Scenarios API] GET 실패:', error);
    return NextResponse.json(
      { error: '시나리오 목록을 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}

// POST: 새 시나리오 생성
export async function POST(request: NextRequest) {
  try {
    const scenario: ScenarioData = await request.json();

    if (!scenario.scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId는 필수입니다.' },
        { status: 400 },
      );
    }

    // 기존 시나리오 확인
    const existing = await loadScenario(scenario.scenarioId);
    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 시나리오 ID입니다.' },
        { status: 409 },
      );
    }

    // 시나리오 저장
    await saveScenario(scenario);

    // 인덱스 업데이트
    const index = await loadScenariosIndex();
    if (!index.scenarios.includes(scenario.scenarioId)) {
      index.scenarios.push(scenario.scenarioId);
      await saveScenariosIndex(index.scenarios);
    }

    console.log(`✅ [Scenarios API] 시나리오 생성: ${scenario.scenarioId}`);

    return NextResponse.json({
      success: true,
      message: '시나리오가 생성되었습니다.',
      scenarioId: scenario.scenarioId,
    });
  } catch (error) {
    console.error('❌ [Scenarios API] POST 실패:', error);
    return NextResponse.json(
      { error: '시나리오 생성에 실패했습니다.' },
      { status: 500 },
    );
  }
}

// PUT: 시나리오 업데이트
export async function PUT(request: NextRequest) {
  try {
    const scenario: ScenarioData = await request.json();

    if (!scenario.scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId는 필수입니다.' },
        { status: 400 },
      );
    }

    // 시나리오 저장
    await saveScenario(scenario);

    // 인덱스에 없으면 추가
    const index = await loadScenariosIndex();
    if (!index.scenarios.includes(scenario.scenarioId)) {
      index.scenarios.push(scenario.scenarioId);
      await saveScenariosIndex(index.scenarios);
    }

    console.log(`✅ [Scenarios API] 시나리오 업데이트: ${scenario.scenarioId}`);

    return NextResponse.json({
      success: true,
      message: '시나리오가 저장되었습니다.',
      scenarioId: scenario.scenarioId,
    });
  } catch (error) {
    console.error('❌ [Scenarios API] PUT 실패:', error);
    return NextResponse.json(
      { error: '시나리오 저장에 실패했습니다.' },
      { status: 500 },
    );
  }
}

// DELETE: 시나리오 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('id');

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId는 필수입니다.' },
        { status: 400 },
      );
    }

    // 시나리오 파일 삭제
    await deleteScenarioFile(scenarioId);

    // 인덱스에서 제거
    const index = await loadScenariosIndex();
    index.scenarios = index.scenarios.filter((id) => id !== scenarioId);
    await saveScenariosIndex(index.scenarios);

    console.log(`✅ [Scenarios API] 시나리오 삭제: ${scenarioId}`);

    return NextResponse.json({
      success: true,
      message: '시나리오가 삭제되었습니다.',
      scenarioId,
    });
  } catch (error) {
    console.error('❌ [Scenarios API] DELETE 실패:', error);
    return NextResponse.json(
      { error: '시나리오 삭제에 실패했습니다.' },
      { status: 500 },
    );
  }
}
