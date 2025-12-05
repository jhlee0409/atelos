import { NextRequest, NextResponse } from 'next/server';
import { getScenario } from '@/lib/firebase-scenarios-admin';

// GET: 특정 시나리오 가져오기 (공개 API - 게임용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const scenario = await getScenario(id);

    if (!scenario) {
      return NextResponse.json(
        { error: '시나리오를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 비활성 시나리오 접근 차단 (테스트 모드는 허용)
    if (scenario.status === 'in_progress') {
      return NextResponse.json(
        { error: '아직 준비 중인 시나리오입니다.' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error('❌ [Public Scenarios API] GET by ID 실패:', error);
    return NextResponse.json(
      { error: '시나리오를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
