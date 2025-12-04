'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ScenarioData, Character, ScenarioStat, ScenarioFlag, EndingArchetype, Trait } from '@/types';
import BaseContent from '@/components/admin/ScenarioEditor/BaseContent';
import CharacterContent from '@/components/admin/ScenarioEditor/CharacterContent';
import SystemRulesContent from '@/components/admin/ScenarioEditor/SystemRulesContent';
import CoreStoryElementsContent from '@/components/admin/ScenarioEditor/CoreStoryElementsContent';
import StickySidebar from '@/components/admin/ScenarioEditor/StickySidebar';
import ScenarioHeader from '@/components/admin/ScenarioEditor/ScenarioHeader';
import { toast } from 'sonner';
import { STORAGE_KEY } from '@/constants/scenario';
import { validateScenario } from '@/lib/validations';
import { getScenarioData } from '@/mocks';
import GeminiTest from '@/components/ui/gemini-test';
import AIScenarioGenerator from '@/components/admin/AIScenarioGenerator';
import ScenarioList from '@/components/admin/ScenarioList';
import {
  fetchScenario,
  createScenario,
  updateScenario,
  createEmptyScenario,
} from '@/lib/scenario-api';
import type {
  GenerationCategory,
  ScenarioOverviewResult,
  CharacterResult,
  StatResult,
  FlagResult,
  EndingResult,
  TraitsResult,
} from '@/lib/ai-scenario-generator';

const ADMIN_AUTH_KEY = 'atelos_admin_auth';

function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '인증에 실패했습니다.');
        return;
      }

      // 인증 성공 - 세션 스토리지에 저장
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      onAuthenticated();
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-telos-black">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold text-white">
            ADMIN
          </h1>
          <p className="text-sm text-zinc-500">
            관리자 비밀번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-900 focus:outline-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-red-900 py-3 font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '확인 중...' : '접속'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 비교 연산자 변환 함수
const convertComparison = (comp: string): 'greater_equal' | 'less_equal' | 'equal' | 'greater_than' | 'less_than' | 'not_equal' => {
  const map: Record<string, 'greater_equal' | 'less_equal' | 'equal' | 'greater_than' | 'less_than' | 'not_equal'> = {
    '>=': 'greater_equal',
    '<=': 'less_equal',
    '==': 'equal',
    '>': 'greater_than',
    '<': 'less_than',
    '!=': 'not_equal',
  };
  return map[comp] || 'greater_equal';
};

function ScenarioEditor() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    // 기본적으로 빈 시나리오로 시작
    return createEmptyScenario();
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isNewScenario, setIsNewScenario] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);

  // 시나리오 선택 핸들러
  const handleSelectScenario = useCallback(async (scenarioId: string) => {
    setIsLoadingScenario(true);
    try {
      const response = await fetchScenario(scenarioId);
      setScenario(response.scenario);
      setIsNewScenario(false);
      setErrors([]);
      toast.success(`"${response.scenario.title}" 시나리오를 불러왔습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '시나리오를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingScenario(false);
    }
  }, []);

  // 새 시나리오 생성 핸들러
  const handleCreateNew = useCallback(() => {
    setScenario(createEmptyScenario());
    setIsNewScenario(true);
    setErrors([]);
    toast.info('새 시나리오를 작성하세요.');
  }, []);

  // AI 생성 결과를 시나리오에 적용하는 핸들러
  const handleAIApply = useCallback(
    (category: GenerationCategory, data: unknown, selectedIndices: number[]) => {
      switch (category) {
        case 'scenario_overview': {
          const overview = data as ScenarioOverviewResult;
          setScenario((prev) => ({
            ...prev,
            scenarioId: overview.scenarioId || prev.scenarioId,
            title: overview.title || prev.title,
            synopsis: overview.synopsis || prev.synopsis,
            playerGoal: overview.playerGoal || prev.playerGoal,
            genre: overview.genre?.length ? overview.genre : prev.genre,
            coreKeywords: overview.coreKeywords?.length
              ? overview.coreKeywords
              : prev.coreKeywords,
          }));
          toast.success('시나리오 개요가 적용되었습니다.');
          break;
        }

        case 'characters': {
          const { characters } = data as { characters: CharacterResult[] };
          const selectedCharacters = selectedIndices
            .map((i) => characters[i])
            .filter(Boolean);

          const newCharacters: Character[] = selectedCharacters.map((char) => ({
            roleId: char.roleId,
            roleName: char.roleName,
            characterName: char.characterName,
            backstory: char.backstory || '',
            imageUrl: '',
            weightedTraitTypes: char.suggestedTraits || [],
            currentTrait: null,
          }));

          setScenario((prev) => ({
            ...prev,
            characters: [...prev.characters, ...newCharacters],
          }));
          toast.success(`${selectedCharacters.length}명의 캐릭터가 추가되었습니다.`);
          break;
        }

        case 'stats': {
          const { stats } = data as { stats: StatResult[] };
          const selectedStats = selectedIndices
            .map((i) => stats[i])
            .filter(Boolean);

          const newStats: ScenarioStat[] = selectedStats.map((stat) => ({
            id: stat.id,
            name: stat.name,
            description: stat.description || '',
            min: stat.min || 0,
            max: stat.max || 100,
            current: stat.initialValue || 50,
            initialValue: stat.initialValue || 50,
            range: [stat.min || 0, stat.max || 100] as [number, number],
          }));

          setScenario((prev) => ({
            ...prev,
            scenarioStats: [...prev.scenarioStats, ...newStats],
          }));
          toast.success(`${selectedStats.length}개의 스탯이 추가되었습니다.`);
          break;
        }

        case 'flags': {
          const { flags } = data as { flags: FlagResult[] };
          const selectedFlags = selectedIndices
            .map((i) => flags[i])
            .filter(Boolean);

          const newFlags: ScenarioFlag[] = selectedFlags.map((flag) => ({
            flagName: flag.flagName,
            description: flag.description || '',
            type: flag.type || 'boolean',
            initial: flag.type === 'count' ? 0 : false,
            triggerCondition: flag.triggerCondition || '',
          }));

          setScenario((prev) => ({
            ...prev,
            flagDictionary: [...prev.flagDictionary, ...newFlags],
          }));
          toast.success(`${selectedFlags.length}개의 플래그가 추가되었습니다.`);
          break;
        }

        case 'endings': {
          const { endings } = data as { endings: EndingResult[] };
          const selectedEndings = selectedIndices
            .map((i) => endings[i])
            .filter(Boolean);

          const newEndings: EndingArchetype[] = selectedEndings.map((ending) => {
            const systemConditions: EndingArchetype['systemConditions'] = [];

            // 스탯 조건 추가
            ending.suggestedConditions?.stats?.forEach((statCond) => {
              systemConditions.push({
                type: 'required_stat',
                statId: statCond.statId,
                comparison: convertComparison(statCond.comparison),
                value: statCond.value,
              });
            });

            // 플래그 조건 추가
            ending.suggestedConditions?.flags?.forEach((flagName) => {
              systemConditions.push({
                type: 'required_flag',
                flagName,
              });
            });

            return {
              endingId: ending.endingId,
              title: ending.title,
              description: ending.description || '',
              isGoalSuccess: ending.isGoalSuccess || false,
              systemConditions,
            };
          });

          setScenario((prev) => ({
            ...prev,
            endingArchetypes: [...prev.endingArchetypes, ...newEndings],
          }));
          toast.success(`${selectedEndings.length}개의 엔딩이 추가되었습니다.`);
          break;
        }

        case 'traits': {
          const traitsData = data as TraitsResult;
          const allTraits = [
            ...(traitsData.buffs || []).map((t, i) => ({ ...t, isBuff: true, originalIdx: i })),
            ...(traitsData.debuffs || []).map((t, i) => ({ ...t, isBuff: false, originalIdx: (traitsData.buffs?.length || 0) + i })),
          ];

          const selectedTraits = selectedIndices.map((i) => allTraits[i]).filter(Boolean);

          const newBuffs: Trait[] = selectedTraits
            .filter((t) => t.isBuff)
            .map((t) => ({
              traitId: t.traitId,
              traitName: t.traitName,
              type: 'positive' as const,
              weightType: t.traitId,
              displayText: t.description,
              systemInstruction: t.effect,
              iconUrl: '',
            }));

          const newDebuffs: Trait[] = selectedTraits
            .filter((t) => !t.isBuff)
            .map((t) => ({
              traitId: t.traitId,
              traitName: t.traitName,
              type: 'negative' as const,
              weightType: t.traitId,
              displayText: t.description,
              systemInstruction: t.effect,
              iconUrl: '',
            }));

          setScenario((prev) => ({
            ...prev,
            traitPool: {
              buffs: [...prev.traitPool.buffs, ...newBuffs],
              debuffs: [...prev.traitPool.debuffs, ...newDebuffs],
            },
          }));
          toast.success(`${selectedTraits.length}개의 특성이 추가되었습니다.`);
          break;
        }

        case 'keywords': {
          const { keywords } = data as { keywords: string[] };
          const selectedKeywords = selectedIndices
            .map((i) => keywords[i])
            .filter(Boolean);

          setScenario((prev) => ({
            ...prev,
            coreKeywords: [...new Set([...prev.coreKeywords, ...selectedKeywords])],
          }));
          toast.success(`${selectedKeywords.length}개의 키워드가 추가되었습니다.`);
          break;
        }

        case 'genre': {
          const { genres } = data as { genres: string[] };
          const selectedGenres = selectedIndices
            .map((i) => genres[i])
            .filter(Boolean);

          setScenario((prev) => ({
            ...prev,
            genre: [...new Set([...prev.genre, ...selectedGenres])],
          }));
          toast.success(`${selectedGenres.length}개의 장르가 추가되었습니다.`);
          break;
        }

        default:
          break;
      }
    },
    [],
  );

  // Save functions
  const handleTempSave = async () => {
    if (!scenario.scenarioId) {
      toast.error('시나리오 ID를 먼저 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (isNewScenario) {
        await createScenario(scenario);
        setIsNewScenario(false);
      } else {
        await updateScenario(scenario);
      }
      // localStorage에도 백업
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
      toast.success('시나리오가 저장되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndActivate = async () => {
    if (!scenario.scenarioId) {
      toast.error('시나리오 ID를 먼저 입력해주세요.');
      return;
    }

    const validationErrors = validateScenario(scenario);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error(
        `다음 필수 항목을 입력해주세요:\n${validationErrors.join(', ')}`,
      );
      return;
    }

    const finalScenario = { ...scenario, status: 'active' as const };

    setIsSaving(true);
    try {
      if (isNewScenario) {
        await createScenario(finalScenario);
        setIsNewScenario(false);
      } else {
        await updateScenario(finalScenario);
      }
      setScenario(finalScenario);
      setErrors([]);
      // localStorage에도 백업
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalScenario));
      toast.success('시나리오가 저장되고 활성화되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Generator용 컨텍스트 생성
  const aiContext = {
    genre: scenario.genre,
    title: scenario.title,
    synopsis: scenario.synopsis,
    existingCharacters: scenario.characters.map((c) => c.characterName),
    existingStats: scenario.scenarioStats.map((s) => s.name),
    existingFlags: scenario.flagDictionary.map((f) => f.flagName),
  };

  return (
    <div className="min-h-screen bg-telos-black">
      <div className="flex">
        {/* Main Content */}
        <div className="mx-auto max-w-5xl flex-1 px-8 py-12">
          <ScenarioHeader />

          {/* Gemini API Test Section */}
          <div className="mb-8 flex justify-center">
            <GeminiTest />
          </div>

          {/* Scenario List */}
          <div className="mb-8">
            <ScenarioList
              onSelectScenario={handleSelectScenario}
              onCreateNew={handleCreateNew}
              currentScenarioId={scenario.scenarioId}
            />
          </div>

          {/* Loading Overlay */}
          {isLoadingScenario && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                <span className="text-white">시나리오 불러오는 중...</span>
              </div>
            </div>
          )}

          {/* AI Scenario Generator */}
          <div className="mb-8">
            <AIScenarioGenerator
              context={aiContext}
              onApply={handleAIApply}
            />
          </div>

          <div className="space-y-8">
            {/* Section 1: 시나리오 기본 정보 */}
            <BaseContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 2: 등장인물 및 관계 설정 */}
            <CharacterContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 3: 시나리오 시스템 규칙 */}
            <SystemRulesContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 4: 핵심 서사 요소 */}
            <CoreStoryElementsContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
          </div>
        </div>

        {/* Sticky Sidebar */}
        <StickySidebar
          scenario={scenario}
          setScenario={setScenario}
          handleSaveAndActivate={handleSaveAndActivate}
          handleTempSave={handleTempSave}
          errors={errors}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}

export default function AtelosScenarioEditor() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 세션 스토리지에서 인증 상태 확인
    const authStatus = sessionStorage.getItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // 초기 로딩 상태
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 화면
  if (!isAuthenticated) {
    return <AdminLogin onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // 인증된 경우 에디터 화면
  return <ScenarioEditor />;
}
