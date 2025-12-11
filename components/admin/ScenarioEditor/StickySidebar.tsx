'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle, AlertTriangle, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { ScenarioData } from '@/types';
import { SetStateAction, useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { validateScenario, type ValidationResult } from '@/lib/scenario-validator';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  handleSaveAndActivate: () => void;
  handleTempSave: () => void;
  errors: string[];
  isSaving?: boolean;
};

export default function StickySidebar({
  scenario,
  setScenario,
  handleSaveAndActivate,
  handleTempSave,
  errors,
  isSaving = false,
}: Props) {
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isValidationExpanded, setIsValidationExpanded] = useState(true);

  // 데이터 일관성 검증
  const validationResult: ValidationResult = useMemo(() => {
    return validateScenario(scenario);
  }, [scenario]);

  // 카테고리별 이슈 그룹화
  const issuesByCategory = useMemo(() => {
    const grouped: Record<string, typeof validationResult.issues> = {};
    validationResult.issues.forEach((issue) => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });
    return grouped;
  }, [validationResult.issues]);

  const categoryLabels: Record<string, string> = {
    ending: '엔딩 조건',
    stat: '스탯',
    flag: '플래그',
    character: '캐릭터',
    relationship: '관계',
  };

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
              {([
                { value: 'in_progress', label: '작업 중' },
                { value: 'testing', label: '테스트 중' },
                { value: 'active', label: '활성' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setScenario((prev) => ({ ...prev, status: value }))}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    scenario.status === value
                      ? 'bg-kairos-gold text-telos-black'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-socratic-grey">
              <p>
                현재 상태:{' '}
                <span className="font-medium text-gray-800">
                  {scenario.status === 'in_progress' ? '작업 중' : scenario.status === 'testing' ? '테스트 중' : '활성'}
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
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? '저장 중...' : '저장 및 활성화'}
          </Button>
          <Button
            onClick={handleTempSave}
            variant="outline"
            className="w-full border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '임시 저장'}
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

        {/* 데이터 일관성 검증 */}
        <Card className={`border-socratic-grey/20 ${
          validationResult.summary.errors > 0
            ? 'border-red-200 bg-red-50/50'
            : validationResult.summary.warnings > 0
              ? 'border-yellow-200 bg-yellow-50/50'
              : 'border-green-200 bg-green-50/50'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-2">
                {validationResult.summary.errors > 0 ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : validationResult.summary.warnings > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-gray-800">데이터 일관성 검사</span>
              </div>
              <button
                onClick={() => setIsValidationExpanded(!isValidationExpanded)}
                className="rounded p-1 hover:bg-black/5"
              >
                {isValidationExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 요약 */}
            <div className="flex items-center gap-3 text-xs">
              {validationResult.summary.errors > 0 && (
                <span className="text-red-600">
                  오류 {validationResult.summary.errors}개
                </span>
              )}
              {validationResult.summary.warnings > 0 && (
                <span className="text-yellow-600">
                  경고 {validationResult.summary.warnings}개
                </span>
              )}
              {validationResult.isValid && validationResult.summary.warnings === 0 && (
                <span className="text-green-600">문제 없음</span>
              )}
            </div>

            {/* 상세 이슈 목록 */}
            {isValidationExpanded && validationResult.issues.length > 0 && (
              <div className="mt-3 space-y-3">
                {Object.entries(issuesByCategory).map(([category, issues]) => (
                  <div key={category}>
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      {categoryLabels[category] || category}
                    </p>
                    <ul className="space-y-1">
                      {issues.map((issue, idx) => (
                        <li
                          key={idx}
                          className={`rounded px-2 py-1 text-xs ${
                            issue.type === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <div className="flex items-start gap-1">
                            {issue.type === 'error' ? (
                              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            )}
                            <div>
                              <span>{issue.message}</span>
                              {issue.suggestion && (
                                <p className="mt-0.5 text-[10px] opacity-80">
                                  {issue.suggestion}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                  {(scenario.traitPool?.buffs?.length || 0) +
                    (scenario.traitPool?.debuffs?.length || 0)}
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
