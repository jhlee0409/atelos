'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
  Users,
  ChevronRight,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchScenariosList,
  deleteScenario,
  type ScenarioSummary,
} from '@/lib/scenario-api';
import type { ScenarioData } from '@/types';

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: ScenarioData['status'] }) {
  const statusConfig = {
    in_progress: { label: '작업 중', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50' },
    testing: { label: '테스트 중', className: 'bg-blue-600/20 text-blue-400 border-blue-600/50' },
    active: { label: '활성', className: 'bg-green-600/20 text-green-400 border-green-600/50' },
  };

  const config = statusConfig[status] || statusConfig.in_progress;

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

// 시나리오 카드 컴포넌트 (링크 기반)
function ScenarioCard({
  scenario,
  onDelete,
  isDeleting,
}: {
  scenario: ScenarioSummary;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group">
      <Link href={`/admin/${scenario.scenarioId}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* 포스터 이미지 */}
            <div className="w-24 h-32 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
              {scenario.posterImageUrl ? (
                <img
                  src={scenario.posterImageUrl}
                  alt={scenario.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-zinc-600" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-white transition-colors">
                    {scenario.title || '(제목 없음)'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    ID: {scenario.scenarioId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={scenario.status} />
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>

              {/* 장르 태그 */}
              {scenario.genre.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {scenario.genre.map((g, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{scenario.characterCount}명</span>
                </div>
              </div>
            </div>

            {/* 삭제 버튼 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.preventDefault()}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>시나리오 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{scenario.title || scenario.scenarioId}" 시나리오를 삭제하시겠습니까?
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function ScenarioListPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchScenariosList();
      setScenarios(response.scenarios);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const handleDelete = async (scenarioId: string) => {
    setDeletingId(scenarioId);
    try {
      await deleteScenario(scenarioId);
      setScenarios((prev) => prev.filter((s) => s.scenarioId !== scenarioId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-telos-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">시나리오 관리</h1>
          <p className="text-zinc-500 mt-2">시나리오를 생성하고 관리하세요</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadScenarios}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            새로고침
          </Button>
          <Link href="/admin/new">
            <Button size="lg">
              <Wand2 className="w-4 h-4 mr-2" />
              새 시나리오 만들기
            </Button>
          </Link>
        </div>

        {/* 리스트 */}
        <div className="space-y-4">
          {isLoading && scenarios.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              시나리오 불러오는 중...
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadScenarios}>
                다시 시도
              </Button>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">
                아직 시나리오가 없습니다
              </h3>
              <p className="text-zinc-600 mb-6">
                첫 번째 시나리오를 만들어보세요
              </p>
              <Link href="/admin/new">
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  시나리오 만들기
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.scenarioId}
                  scenario={scenario}
                  onDelete={() => handleDelete(scenario.scenarioId)}
                  isDeleting={deletingId === scenario.scenarioId}
                />
              ))}

              <div className="text-center text-sm text-zinc-600 pt-4">
                총 {scenarios.length}개의 시나리오
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScenarioListPage;
