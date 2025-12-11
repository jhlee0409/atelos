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
import { validateScenario, getIssueCountByTab, type ValidationResult, type ValidationIssue } from '@/lib/scenario-validator';

// 섹션으로 스크롤하는 함수
const scrollToSection = (targetTab?: ValidationIssue['targetTab']) => {
  if (!targetTab) return;

  const sectionMap: Record<string, string> = {
    basic: 'section-basic',
    characters: 'section-characters',
    system: 'section-system',
    story: 'section-story',
  };

  const sectionId = sectionMap[targetTab];
  if (sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 하이라이트 효과 추가
      element.classList.add('ring-2', 'ring-kairos-gold', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-kairos-gold', 'ring-offset-2');
      }, 2000);
    }
  }
};

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
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isJsonImportDialogOpen, setIsJsonImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // 데이터 일관성 검증
  const validationResult: ValidationResult = useMemo(() => {
    return validateScenario(scenario);
  }, [scenario]);

  // 저장 및 활성화 핸들러 (검증 포함)
  const handleSaveWithValidation = () => {
    // 데이터 일관성 오류가 있으면 차단
    if (validationResult.summary.errors > 0) {
      toast.error(`데이터 일관성 오류 ${validationResult.summary.errors}개를 먼저 해결해주세요.`);
      return;
    }

    // 경고만 있으면 확인 다이얼로그 표시
    if (validationResult.summary.warnings > 0) {
      setIsWarningDialogOpen(true);
      return;
    }

    // 문제 없으면 바로 저장
    handleSaveAndActivate();
  };

  // 경고 무시하고 저장
  const handleProceedWithWarnings = () => {
    setIsWarningDialogOpen(false);
    handleSaveAndActivate();
  };

  // JSON 임포트 검증
  const handleValidateImportJson = () => {
    setImportError(null);
    setImportValidation(null);

    try {
      const parsed = JSON.parse(importJsonText);
      // 기본 구조 체크
      if (!parsed.scenarioId || !parsed.title) {
        setImportError('필수 필드(scenarioId, title)가 누락되었습니다.');
        return;
      }
      // 배열 필드 체크
      if (!Array.isArray(parsed.characters) || !Array.isArray(parsed.scenarioStats)) {
        setImportError('characters와 scenarioStats는 배열이어야 합니다.');
        return;
      }
      // 검증 실행
      const validation = validateScenario(parsed as ScenarioData);
      setImportValidation(validation);
    } catch {
      setImportError('유효하지 않은 JSON 형식입니다.');
    }
  };

  // JSON 임포트 적용
  const handleApplyImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      // 기존 ID 유지
      setScenario(() => ({
        ...parsed,
        scenarioId: scenario.scenarioId, // ID는 변경 불가
      }));
      setIsJsonImportDialogOpen(false);
      setImportJsonText('');
      setImportValidation(null);
      toast.success('JSON이 적용되었습니다. 저장하기 전까지 변경사항이 반영되지 않습니다.');
    } catch {
      toast.error('JSON 적용에 실패했습니다.');
    }
  };

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
    trait: '특성',
    duplicate: '중복 ID',
  };

  // 섹션별 이슈 카운트
  const issueCountByTab = useMemo(() => {
    return getIssueCountByTab(validationResult);
  }, [validationResult]);

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
            onClick={handleSaveWithValidation}
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

        {/* 섹션 네비게이션 (검증 배지 포함) */}
        <Card className="border-socratic-grey/20 bg-parchment-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">
              섹션 바로가기
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {([
                { tab: 'basic' as const, label: '기본 정보', section: 'section-basic' },
                { tab: 'story' as const, label: '스토리 오프닝', section: 'section-story' },
                { tab: 'characters' as const, label: '캐릭터', section: 'section-characters' },
                { tab: 'system' as const, label: '시스템 규칙', section: 'section-system' },
              ]).map(({ tab, label, section }) => {
                const counts = issueCountByTab[tab];
                const hasIssues = counts.errors > 0 || counts.warnings > 0;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      const element = document.getElementById(section);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-gray-100"
                  >
                    <span className="text-gray-700">{label}</span>
                    {hasIssues && (
                      <div className="flex items-center gap-1">
                        {counts.errors > 0 && (
                          <span className="flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {counts.errors}
                          </span>
                        )}
                        {counts.warnings > 0 && (
                          <span className="flex items-center gap-0.5 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {counts.warnings}
                          </span>
                        )}
                      </div>
                    )}
                    {!hasIssues && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
                          onClick={() => scrollToSection(issue.targetTab)}
                          className={`cursor-pointer rounded px-2 py-1 text-xs transition-all hover:ring-1 ${
                            issue.type === 'error'
                              ? 'bg-red-100 text-red-700 hover:ring-red-300'
                              : 'bg-yellow-100 text-yellow-700 hover:ring-yellow-300'
                          }`}
                          title="클릭하여 해당 섹션으로 이동"
                        >
                          <div className="flex items-start gap-1">
                            {issue.type === 'error' ? (
                              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <span>{issue.message}</span>
                              {issue.suggestion && (
                                <p className="mt-0.5 text-[10px] opacity-80">
                                  {issue.suggestion}
                                </p>
                              )}
                              {issue.targetTab && (
                                <span className="ml-1 text-[10px] opacity-60">
                                  → {issue.targetTab === 'basic' ? '기본 정보' :
                                     issue.targetTab === 'characters' ? '캐릭터' :
                                     issue.targetTab === 'system' ? '시스템 규칙' : '스토리 오프닝'}
                                </span>
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
            <Button
              className="mt-2 w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              onClick={() => {
                setImportJsonText('');
                setImportValidation(null);
                setImportError(null);
                setIsJsonImportDialogOpen(true);
              }}
              variant="outline"
            >
              JSON 임포트
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

      {/* 검증 경고 확인 다이얼로그 */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              검증 경고 확인
            </DialogTitle>
            <DialogDescription className="text-left">
              시나리오에 {validationResult.summary.warnings}개의 경고가 있습니다.
              이대로 활성화하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 max-h-48 overflow-y-auto rounded border border-yellow-200 bg-yellow-50 p-3">
            <ul className="space-y-1 text-xs text-yellow-700">
              {validationResult.issues
                .filter((i) => i.type === 'warning')
                .map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>{issue.message}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsWarningDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleProceedWithWarnings}
              className="bg-yellow-500 text-white hover:bg-yellow-600"
            >
              경고 무시하고 활성화
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* JSON 임포트 다이얼로그 */}
      <Dialog open={isJsonImportDialogOpen} onOpenChange={setIsJsonImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>JSON 임포트</DialogTitle>
            <DialogDescription>
              시나리오 JSON을 붙여넣고 검증 후 적용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="JSON을 여기에 붙여넣으세요..."
              className="h-48 w-full rounded border border-gray-300 bg-gray-50 p-3 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleValidateImportJson}
                variant="outline"
                disabled={!importJsonText.trim()}
              >
                검증하기
              </Button>
              <Button
                onClick={async () => {
                  const text = await navigator.clipboard.readText();
                  setImportJsonText(text);
                }}
                variant="outline"
              >
                클립보드에서 붙여넣기
              </Button>
            </div>

            {/* 에러 메시지 */}
            {importError && (
              <div className="rounded border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {importError}
                </div>
              </div>
            )}

            {/* 검증 결과 */}
            {importValidation && (
              <div className={`rounded border p-3 ${
                importValidation.summary.errors > 0
                  ? 'border-red-200 bg-red-50'
                  : importValidation.summary.warnings > 0
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-green-200 bg-green-50'
              }`}>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  {importValidation.summary.errors > 0 ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700">
                        오류 {importValidation.summary.errors}개, 경고 {importValidation.summary.warnings}개
                      </span>
                    </>
                  ) : importValidation.summary.warnings > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-700">
                        경고 {importValidation.summary.warnings}개
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-700">검증 통과</span>
                    </>
                  )}
                </div>
                {importValidation.issues.length > 0 && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                    {importValidation.issues.slice(0, 10).map((issue, idx) => (
                      <li key={idx} className={issue.type === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                        • {issue.message}
                      </li>
                    ))}
                    {importValidation.issues.length > 10 && (
                      <li className="text-gray-500">...외 {importValidation.issues.length - 10}개</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsJsonImportDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleApplyImportJson}
              disabled={!importValidation || importValidation.summary.errors > 0}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              적용하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
