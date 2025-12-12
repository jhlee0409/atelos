'use client';

import { SetStateAction, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScenarioData, GameplayConfig, RouteScoreConfig } from '@/types';
import { DEFAULT_GAMEPLAY_CONFIG, DEFAULT_ROUTE_SCORES } from '@/lib/gameplay-config';
import { Loader2, Plus, Trash2, Sparkles, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { generateWithAI, GameplayConfigResult } from '@/lib/ai-scenario-generator';
import { toast } from 'sonner';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
};

export default function GameplayConfigContent({ scenario, setScenario }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const config = scenario.gameplayConfig || {};

  // Helper to update gameplayConfig
  const updateConfig = (updates: Partial<GameplayConfig>) => {
    setScenario((prev) => ({
      ...prev,
      gameplayConfig: {
        ...prev.gameplayConfig,
        ...updates,
      },
    }));
  };

  // Helper to update a specific route score
  const updateRouteScore = (index: number, updates: Partial<RouteScoreConfig>) => {
    const currentRouteScores = config.routeScores || DEFAULT_ROUTE_SCORES;
    const newRouteScores = currentRouteScores.map((rs, i) =>
      i === index ? { ...rs, ...updates } : rs
    );
    updateConfig({ routeScores: newRouteScores });
  };

  // Add new route
  const addRoute = () => {
    const currentRouteScores = config.routeScores || DEFAULT_ROUTE_SCORES;
    updateConfig({
      routeScores: [
        ...currentRouteScores,
        { routeName: '새 루트' },
      ],
    });
  };

  // Remove route
  const removeRoute = (index: number) => {
    const currentRouteScores = config.routeScores || DEFAULT_ROUTE_SCORES;
    updateConfig({
      routeScores: currentRouteScores.filter((_, i) => i !== index),
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setScenario((prev) => ({
      ...prev,
      gameplayConfig: undefined,
    }));
    toast.success('기본값으로 초기화되었습니다.');
  };

  // AI Generate
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateWithAI<GameplayConfigResult>(
        'gameplay_config',
        scenario.synopsis || scenario.title,
        {
          genre: scenario.genre,
          title: scenario.title,
          synopsis: scenario.synopsis,
          existingStats: scenario.scenarioStats?.map((s) => s.id) || [],
        }
      );

      if (response.success && response.data) {
        const data = response.data;
        updateConfig({
          routeActivationRatio: data.routeActivationRatio,
          endingCheckRatio: data.endingCheckRatio,
          narrativePhaseRatios: data.narrativePhaseRatios,
          actionPointsPerDay: data.actionPointsPerDay,
          criticalStatThreshold: data.criticalStatThreshold,
          warningStatThreshold: data.warningStatThreshold,
          routeScores: data.routeScores,
          tokenBudgetMultiplier: data.tokenBudgetMultiplier,
          useGenreFallback: data.useGenreFallback,
          customFallbackChoices: data.customFallbackChoices,
        });
        toast.success('게임플레이 설정이 생성되었습니다!');
        if (data.reasoning) {
          toast.info(`AI 설명: ${data.reasoning.substring(0, 100)}...`);
        }
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('AI 생성 실패:', error);
      toast.error('AI 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Current values with defaults
  const routeActivationRatio = config.routeActivationRatio ?? DEFAULT_GAMEPLAY_CONFIG.routeActivationRatio;
  const endingCheckRatio = config.endingCheckRatio ?? DEFAULT_GAMEPLAY_CONFIG.endingCheckRatio;
  const actionPointsPerDay = config.actionPointsPerDay ?? DEFAULT_GAMEPLAY_CONFIG.actionPointsPerDay;
  const criticalStatThreshold = config.criticalStatThreshold ?? DEFAULT_GAMEPLAY_CONFIG.criticalStatThreshold;
  const warningStatThreshold = config.warningStatThreshold ?? DEFAULT_GAMEPLAY_CONFIG.warningStatThreshold;
  const tokenBudgetMultiplier = config.tokenBudgetMultiplier ?? DEFAULT_GAMEPLAY_CONFIG.tokenBudgetMultiplier;
  const useGenreFallback = config.useGenreFallback ?? DEFAULT_GAMEPLAY_CONFIG.useGenreFallback;
  const narrativePhaseRatios = config.narrativePhaseRatios ?? DEFAULT_GAMEPLAY_CONFIG.narrativePhaseRatios;
  const routeScores = config.routeScores || DEFAULT_ROUTE_SCORES;

  const totalDays = scenario.endCondition?.value || 7;

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-sans text-2xl text-kairos-gold">
              게임플레이 설정
            </CardTitle>
            <CardDescription className="mt-1">
              시나리오의 게임 밸런스와 루트 점수 시스템을 설정합니다
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              variant="outline"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold/10"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 자동 생성
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="icon"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* 타이밍 설정 */}
          <Card className="border-kairos-gold/30 bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-kairos-gold">타이밍 설정</CardTitle>
              <p className="text-sm text-socratic-grey">
                총 {totalDays}일 게임 기준
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    루트 활성화 비율
                    <Info className="h-3 w-3 text-socratic-grey" />
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="0.9"
                      value={routeActivationRatio}
                      onChange={(e) =>
                        updateConfig({ routeActivationRatio: parseFloat(e.target.value) || 0.4 })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-socratic-grey">
                      = Day {Math.ceil(totalDays * routeActivationRatio)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    엔딩 체크 비율
                    <Info className="h-3 w-3 text-socratic-grey" />
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="0.9"
                      value={endingCheckRatio}
                      onChange={(e) =>
                        updateConfig({ endingCheckRatio: parseFloat(e.target.value) || 0.7 })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-socratic-grey">
                      = Day {Math.ceil(totalDays * endingCheckRatio)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>서사 단계 비율</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <span className="text-xs text-socratic-grey">도입부</span>
                    <Input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="0.5"
                      value={narrativePhaseRatios.setup}
                      onChange={(e) =>
                        updateConfig({
                          narrativePhaseRatios: {
                            ...narrativePhaseRatios,
                            setup: parseFloat(e.target.value) || 0.3,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-socratic-grey">전개</span>
                    <Input
                      type="number"
                      step="0.05"
                      min="0.3"
                      max="0.8"
                      value={narrativePhaseRatios.rising_action}
                      onChange={(e) =>
                        updateConfig({
                          narrativePhaseRatios: {
                            ...narrativePhaseRatios,
                            rising_action: parseFloat(e.target.value) || 0.6,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-socratic-grey">중반</span>
                    <Input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="0.95"
                      value={narrativePhaseRatios.midpoint}
                      onChange={(e) =>
                        updateConfig({
                          narrativePhaseRatios: {
                            ...narrativePhaseRatios,
                            midpoint: parseFloat(e.target.value) || 0.75,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-socratic-grey">클라이맥스</span>
                    <Input type="number" value={1.0} disabled className="bg-gray-100" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 게임 밸런스 */}
          <Card className="border-kairos-gold/30 bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-kairos-gold">게임 밸런스</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>하루당 행동 포인트</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={actionPointsPerDay}
                    onChange={(e) =>
                      updateConfig({ actionPointsPerDay: parseInt(e.target.value) || 3 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>위험 스탯 임계값</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="0.5"
                    value={criticalStatThreshold}
                    onChange={(e) =>
                      updateConfig({ criticalStatThreshold: parseFloat(e.target.value) || 0.4 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>경고 스탯 임계값</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="0.7"
                    value={warningStatThreshold}
                    onChange={(e) =>
                      updateConfig({ warningStatThreshold: parseFloat(e.target.value) || 0.5 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI 토큰 예산 배수</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                    value={tokenBudgetMultiplier}
                    onChange={(e) =>
                      updateConfig({ tokenBudgetMultiplier: parseFloat(e.target.value) || 1.0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>장르 기반 폴백 사용</Label>
                  <select
                    value={useGenreFallback ? 'true' : 'false'}
                    onChange={(e) =>
                      updateConfig({ useGenreFallback: e.target.value === 'true' })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="true">사용</option>
                    <option value="false">사용 안함</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 루트 점수 설정 */}
          <Card className="border-kairos-gold/30 bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-kairos-gold">루트 점수 설정</CardTitle>
              <p className="text-sm text-socratic-grey">
                플래그 획득에 따른 루트 점수를 설정합니다. 점수가 가장 높은 루트가 표시됩니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {routeScores.map((route, routeIndex) => (
                <Card key={routeIndex} className="border-socratic-grey/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={route.routeName}
                        onChange={(e) =>
                          updateRouteScore(routeIndex, { routeName: e.target.value })
                        }
                        placeholder="루트 이름"
                        className="w-48 font-semibold"
                      />
                      <Button
                        onClick={() => removeRoute(routeIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-socratic-grey">
                        루트 분기는 ActionHistory 기반으로 자동 계산됩니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={addRoute}
                className="w-full border-2 border-dashed"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                루트 추가
              </Button>
            </CardContent>
          </Card>

          {/* 커스텀 폴백 선택지 */}
          <Card className="border-kairos-gold/30 bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-kairos-gold">커스텀 폴백 선택지 (선택)</CardTitle>
              <p className="text-sm text-socratic-grey">
                AI가 선택지를 생성하지 못했을 때 사용할 기본 선택지입니다. 비워두면 장르 기반 기본값을 사용합니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>상황 설명</Label>
                <Textarea
                  value={config.customFallbackChoices?.prompt || ''}
                  onChange={(e) =>
                    updateConfig({
                      customFallbackChoices: {
                        prompt: e.target.value,
                        choice_a: config.customFallbackChoices?.choice_a || '',
                        choice_b: config.customFallbackChoices?.choice_b || '',
                      },
                    })
                  }
                  placeholder="새로운 상황에서 첫 번째 결정을 내려야 한다..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>선택지 A</Label>
                  <Input
                    value={config.customFallbackChoices?.choice_a || ''}
                    onChange={(e) =>
                      updateConfig({
                        customFallbackChoices: {
                          prompt: config.customFallbackChoices?.prompt || '',
                          choice_a: e.target.value,
                          choice_b: config.customFallbackChoices?.choice_b || '',
                        },
                      })
                    }
                    placeholder="상황을 파악한다"
                  />
                </div>
                <div className="space-y-2">
                  <Label>선택지 B</Label>
                  <Input
                    value={config.customFallbackChoices?.choice_b || ''}
                    onChange={(e) =>
                      updateConfig({
                        customFallbackChoices: {
                          prompt: config.customFallbackChoices?.prompt || '',
                          choice_a: config.customFallbackChoices?.choice_a || '',
                          choice_b: e.target.value,
                        },
                      })
                    }
                    placeholder="즉시 행동한다"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button onClick={resetToDefaults} variant="outline">
              기본값으로 초기화
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
