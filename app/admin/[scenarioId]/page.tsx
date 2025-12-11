'use client';

import { useState, useEffect, useCallback, SetStateAction } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchScenario, updateScenario } from '@/lib/scenario-api';
import type { ScenarioData } from '@/types';
import BaseContent from '@/components/admin/ScenarioEditor/BaseContent';
import StoryOpeningContent from '@/components/admin/ScenarioEditor/StoryOpeningContent';
import CharacterContent from '@/components/admin/ScenarioEditor/CharacterContent';
import SystemRulesContent from '@/components/admin/ScenarioEditor/SystemRulesContent';
import CoreStoryElementsContent from '@/components/admin/ScenarioEditor/CoreStoryElementsContent';
import StickySidebar from '@/components/admin/ScenarioEditor/StickySidebar';
import { toast } from 'sonner';
import { VALIDATION_IDS } from '@/constants/scenario';
import { useAuth } from '@/contexts/AuthContext';

function ScenarioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;

  const [scenario, setScenarioState] = useState<ScenarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Type-safe wrapper for setScenario that handles null
  const setScenario = useCallback((value: SetStateAction<ScenarioData>) => {
    setScenarioState((prev) => {
      if (prev === null) return prev;
      if (typeof value === 'function') {
        return value(prev);
      }
      return value;
    });
  }, []);

  // Load scenario data
  const loadScenario = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchScenario(scenarioId);
      setScenarioState(response.scenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시나리오를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  // Validation
  const validateScenario = useCallback(() => {
    if (!scenario) return [];

    const errors: string[] = [];

    if (!scenario.scenarioId.trim()) {
      errors.push(VALIDATION_IDS.SCENARIO_ID);
    }
    if (!scenario.title.trim()) {
      errors.push(VALIDATION_IDS.TITLE);
    }
    if (!scenario.synopsis.trim()) {
      errors.push(VALIDATION_IDS.SYNOPSIS);
    }
    if (!scenario.playerGoal.trim()) {
      errors.push(VALIDATION_IDS.PLAYER_GOAL);
    }
    if (!scenario.posterImageUrl?.trim()) {
      errors.push(VALIDATION_IDS.POSTER_IMAGE_URL);
    }

    return errors;
  }, [scenario]);

  // Save handlers
  const handleSaveAndActivate = async () => {
    if (!scenario) return;

    const errors = validateScenario();
    setValidationErrors(errors);

    if (errors.length > 0) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await updateScenario({ ...scenario, status: 'active' });
      toast.success('시나리오가 저장되고 활성화되었습니다.');
      router.push('/admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTempSave = async () => {
    if (!scenario) return;

    setIsSaving(true);
    try {
      await updateScenario(scenario);
      toast.success('시나리오가 임시 저장되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          시나리오 불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-telos-black dark">
        <p className="mb-4 text-red-400">{error || '시나리오를 찾을 수 없습니다.'}</p>
        <Link href="/admin">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-white">
      {/* Header */}
      <div className="border-b border-socratic-grey/20 bg-white/80 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {scenario.title || '(제목 없음)'}
              </h1>
              <p className="text-sm text-socratic-grey">
                ID: {scenario.scenarioId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div id="section-basic">
            <BaseContent
              scenario={scenario}
              setScenario={setScenario}
              errors={validationErrors}
            />
          </div>
          <div id="section-story">
            <StoryOpeningContent
              scenario={scenario}
              setScenario={setScenario}
            />
          </div>
          <div id="section-characters">
            <CharacterContent
              scenario={scenario}
              setScenario={setScenario}
              errors={validationErrors}
            />
          </div>
          <div id="section-system">
            <SystemRulesContent
              scenario={scenario}
              setScenario={setScenario}
              errors={validationErrors}
            />
          </div>
          <div id="section-core">
            <CoreStoryElementsContent
              scenario={scenario}
              setScenario={setScenario}
              errors={validationErrors}
            />
          </div>
        </div>

        {/* Sidebar */}
        <StickySidebar
          scenario={scenario}
          setScenario={setScenario}
          handleSaveAndActivate={handleSaveAndActivate}
          handleTempSave={handleTempSave}
          errors={validationErrors}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}

export default function ScenarioDetailPage() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to admin page for login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
    return null;
  }

  return <ScenarioDetailContent />;
}
