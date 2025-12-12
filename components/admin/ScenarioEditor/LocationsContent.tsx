'use client';

import { SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScenarioData } from '@/types';
import { MapPin, Sparkles, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
};

/**
 * v1.2: 동적 위치 시스템 안내
 *
 * 기존 정적 위치 설정 대신 동적 위치 발견 시스템으로 변경됨.
 * 위치는 AI 서사를 통해 자연스럽게 발견되며, 시작 위치만 storyOpening에서 설정.
 */
export default function LocationsContent({ scenario, setScenario }: Props) {
  const openingLocation = scenario.storyOpening?.openingLocation || '본부';
  const hasLegacyLocations = scenario.locations && scenario.locations.length > 0;

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-sans text-2xl text-kairos-gold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              탐색 위치 시스템
            </CardTitle>
            <CardDescription className="mt-1">
              v1.2: 동적 위치 발견 시스템
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 동적 시스템 안내 */}
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong className="block mb-2">동적 위치 발견 시스템 (v1.2)</strong>
            <p className="text-sm mb-2">
              이제 탐색 위치는 AI 서사를 통해 자연스럽게 발견됩니다.
              미리 정의된 장소 대신, 플레이어의 행동과 대화에 따라 새로운 장소가 드러납니다.
            </p>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li><strong>시작 위치</strong>: 스토리 오프닝에서 설정한 장소만 처음에 탐색 가능</li>
              <li><strong>발견 방식</strong>: 대화, 탐색, 선택의 결과로 새 장소 언급 시 자동 추가</li>
              <li><strong>AI 연동</strong>: AI가 서사에서 자연스럽게 새 장소를 소개</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 현재 시작 위치 */}
        <div className="rounded-lg border border-socratic-grey/30 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">현재 시작 위치</span>
          </div>
          <p className="text-lg font-semibold text-kairos-gold">{openingLocation}</p>
          <p className="text-sm text-muted-foreground mt-1">
            스토리 오프닝 &gt; 시작 장소에서 변경할 수 있습니다.
          </p>
        </div>

        {/* 레거시 데이터 경고 */}
        {hasLegacyLocations && (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>레거시 위치 데이터 감지</strong>
              <p className="text-sm mt-1">
                이 시나리오에는 기존 정적 위치 데이터({scenario.locations?.length}개)가 있습니다.
                이 데이터는 호환성을 위해 유지되지만, 새로운 동적 시스템이 우선 적용됩니다.
              </p>
              <button
                onClick={() => setScenario(prev => ({ ...prev, locations: undefined }))}
                className="mt-2 text-sm text-amber-700 underline hover:text-amber-900"
              >
                레거시 데이터 제거하기
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* 작동 방식 설명 */}
        <div className="rounded-lg border border-socratic-grey/30 bg-zinc-50 p-4 space-y-3">
          <h4 className="font-medium">작동 방식</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <span className="font-mono bg-zinc-200 px-2 py-0.5 rounded">1</span>
              <span>게임 시작 시 <code className="bg-zinc-200 px-1 rounded">{openingLocation}</code>만 탐색 가능</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono bg-zinc-200 px-2 py-0.5 rounded">2</span>
              <span>AI가 서사에서 새 장소 언급 시 자동으로 탐색 목록에 추가</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono bg-zinc-200 px-2 py-0.5 rounded">3</span>
              <span>대화/탐색으로 얻은 정보로 새 장소 발견 가능</span>
            </div>
          </div>
        </div>

        {/* AI 프롬프트 필드 */}
        <div className="text-xs text-muted-foreground">
          <p><strong>AI 응답 필드:</strong> <code>locations_discovered: [{'{'}name, description{'}'}]</code></p>
          <p className="mt-1">AI가 서사에서 새 장소를 언급하면 이 필드를 통해 탐색 가능 장소로 추가됩니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}
