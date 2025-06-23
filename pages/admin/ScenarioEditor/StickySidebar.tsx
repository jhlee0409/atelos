'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle } from 'lucide-react';
import { ScenarioData } from '@/types';
import { SetStateAction, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  handleSaveAndActivate: () => void;
  handleTempSave: () => void;
  errors: string[];
};

export default function StickySidebar({
  scenario,
  setScenario,
  handleSaveAndActivate,
  handleTempSave,
  errors,
}: Props) {
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  return (
    <div className="w-100 p-8">
      <div className="sticky top-8 space-y-6">
        {/* 시나리오 상태 */}
        <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
          <CardHeader>
            <CardTitle className="font-sans text-xl text-kairos-gold">
              시나리오 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-hidden rounded-lg border border-socratic-grey">
              {(['작업 중', '테스트 중', '활성'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setScenario((prev) => ({ ...prev, status }))}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    scenario.status === status
                      ? 'bg-kairos-gold text-telos-black'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-socratic-grey">
              <p>
                현재 상태:{' '}
                <span className="font-medium text-gray-800">
                  {scenario.status}
                </span>
              </p>
              <p className="mt-1 text-xs">마지막 수정: 2024년 12월 22일</p>
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼들 */}
        <div className="space-y-3">
          <Button
            onClick={handleSaveAndActivate}
            className="w-full bg-kairos-gold font-medium text-telos-black hover:bg-kairos-gold/90"
            size="lg"
          >
            <Save className="mr-2 h-4 w-4" />
            저장 및 활성화
          </Button>
          <Button
            onClick={handleTempSave}
            variant="outline"
            className="w-full border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            size="lg"
          >
            임시 저장
          </Button>
        </div>

        {/* 유효성 검사 결과 */}
        {errors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div>
                  <p className="mb-2 text-sm font-medium text-red-800">
                    필수 항목 누락
                  </p>
                  <ul className="space-y-1 text-xs text-red-700">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 진행률 및 통계 */}
        <Card className="border-socratic-grey/20 bg-parchment-white">
          <CardContent className="pt-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-socratic-grey">등장인물</span>
                <span className="font-medium text-gray-800">
                  {scenario.characters.length}명
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-socratic-grey">관계 설정</span>
                <span className="font-medium text-gray-800">
                  {scenario.initialRelationships.length}개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-socratic-grey">시나리오 스탯</span>
                <span className="font-medium text-gray-800">
                  {scenario.scenarioStats.length}개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-socratic-grey">특성 풀</span>
                <span className="font-medium text-gray-800">
                  {scenario.traitPool.buffs.length +
                    scenario.traitPool.debuffs.length}
                  개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-socratic-grey">엔딩 원형</span>
                <span className="font-medium text-gray-800">
                  {scenario.endingArchetypes.length}개
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JSON 미리보기 */}
        <Card className="border-socratic-grey/20 bg-parchment-white">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-800">
              JSON 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-100 overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-400">
              <pre>
                {JSON.stringify(scenario, null, 2).substring(0, 200)}...
              </pre>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(scenario, null, 2),
                );
                toast.success('JSON이 클립보드에 복사되었습니다.');
              }}
              variant="outline"
              size="sm"
              className="mt-2 w-full border-socratic-grey text-socratic-grey hover:bg-socratic-grey hover:text-white"
            >
              JSON 복사
            </Button>
            <Button
              className="mt-2 w-full border-socratic-grey text-socratic-grey hover:bg-socratic-grey hover:text-white"
              onClick={() => {
                setIsJsonDialogOpen(true);
              }}
              variant="outline"
            >
              JSON 전체 보기
            </Button>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
        <DialogContent className="max-w-[50vw]">
          <DialogHeader>
            <DialogTitle>JSON 전체 보기</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[70vh] overflow-y-auto bg-gray-900 font-mono text-xs text-green-400">
            {JSON.stringify(scenario, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
