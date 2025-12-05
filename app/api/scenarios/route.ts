import { NextResponse } from 'next/server';
import { getActiveScenarios } from '@/lib/firebase-scenarios-admin';

// GET: 활성화된 시나리오 목록 가져오기 (공개 API - 로비용)
export async function GET() {
  try {
    const scenarios = await getActiveScenarios();

    return NextResponse.json({
      success: true,
      scenarios,
      total: scenarios.length,
    });
  } catch (error) {
    console.error('❌ [Public Scenarios API] GET 실패:', error);
    return NextResponse.json(
      { error: '시나리오 목록을 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
