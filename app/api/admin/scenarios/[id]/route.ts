import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { ScenarioData } from '@/types';

const SCENARIOS_DIR = path.join(process.cwd(), 'data', 'scenarios');

// GET: 특정 시나리오 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const filePath = path.join(SCENARIOS_DIR, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const scenario: ScenarioData = JSON.parse(content);

      return NextResponse.json({
        success: true,
        scenario,
      });
    } catch {
      return NextResponse.json(
        { error: '시나리오를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error('❌ [Scenarios API] GET by ID 실패:', error);
    return NextResponse.json(
      { error: '시나리오를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
