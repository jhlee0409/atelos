'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Edit,
  Loader2,
  RefreshCw,
  Users,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchScenariosList,
  deleteScenario,
  type ScenarioSummary,
} from '@/lib/scenario-api';
import type { ScenarioData } from '@/types';

interface ScenarioListProps {
  onSelectScenario: (scenarioId: string) => void;
  onCreateNew: () => void;
  currentScenarioId?: string;
}

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

// 시나리오 카드 컴포넌트
function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
  onDelete,
  isDeleting,
}: {
  scenario: ScenarioSummary;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-zinc-600',
        isSelected ? 'border-zinc-500 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/30',
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 포스터 이미지 */}
          <div className="w-16 h-20 rounded bg-zinc-800 flex-shrink-0 overflow-hidden">
            {scenario.posterImageUrl ? (
              <img
                src={scenario.posterImageUrl}
                alt={scenario.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-zinc-600" />
              </div>
            )}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm truncate">
                  {scenario.title || '(제목 없음)'}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {scenario.scenarioId}
                </p>
              </div>
              <StatusBadge status={scenario.status} />
            </div>

            {/* 장르 태그 */}
            {scenario.genre.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {scenario.genre.slice(0, 3).map((g, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                    {g}
                  </Badge>
                ))}
                {scenario.genre.length > 3 && (
                  <span className="text-xs text-zinc-500">+{scenario.genre.length - 3}</span>
                )}
              </div>
            )}

            {/* 캐릭터 수 */}
            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
              <Users className="w-3 h-3" />
              <span>{scenario.characterCount}명</span>
            </div>
          </div>

          {/* 삭제 버튼 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-900/20"
                onClick={(e) => e.stopPropagation()}
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
                    e.stopPropagation();
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
    </Card>
  );
}

export function ScenarioList({
  onSelectScenario,
  onCreateNew,
  currentScenarioId,
}: ScenarioListProps) {
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
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="w-5 h-5" />
              시나리오 목록
            </CardTitle>
            <CardDescription>
              저장된 시나리오를 선택하거나 새로 만드세요
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadScenarios}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
            <Button onClick={onCreateNew} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              새 시나리오
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && scenarios.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            불러오는 중...
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadScenarios}>
              다시 시도
            </Button>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">저장된 시나리오가 없습니다</p>
            <Button onClick={onCreateNew} variant="outline" size="sm" className="mt-3">
              <Plus className="w-4 h-4 mr-1" />
              첫 시나리오 만들기
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.scenarioId}
                scenario={scenario}
                isSelected={currentScenarioId === scenario.scenarioId}
                onSelect={() => onSelectScenario(scenario.scenarioId)}
                onDelete={() => handleDelete(scenario.scenarioId)}
                isDeleting={deletingId === scenario.scenarioId}
              />
            ))}
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="text-xs text-zinc-500 text-center pt-2 border-t border-zinc-800">
            총 {scenarios.length}개의 시나리오
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScenarioList;
