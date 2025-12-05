import { NextRequest, NextResponse } from 'next/server';
import type { ScenarioData } from '@/types';
import {
  getAllScenariosAdmin,
  getScenarioAdmin,
  createScenarioAdmin,
  updateScenarioAdmin,
  deleteScenarioAdmin,
  ScenarioSummary,
} from '@/lib/firebase-scenarios-admin';

// GET: 모든 시나리오 리스트 가져오기
export async function GET() {
  try {
    const summaries = await getAllScenariosAdmin();

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

    await createScenarioAdmin(scenario);

    console.log(`✅ [Scenarios API] 시나리오 생성: ${scenario.scenarioId}`);

    return NextResponse.json({
      success: true,
      message: '시나리오가 생성되었습니다.',
      scenarioId: scenario.scenarioId,
    });
  } catch (error: any) {
    console.error('❌ [Scenarios API] POST 실패:', error);

    // 중복 ID 에러 처리
    if (error.message?.includes('이미 존재하는')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

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

    await updateScenarioAdmin(scenario);

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

    await deleteScenarioAdmin(scenarioId);

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
