'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Check,
  Lightbulb,
  Users,
  BarChart3,
  Flag,
  Trophy,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateSynopsis,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  type SynopsisResult,
  type SynopsisGenerateRequest,
} from '@/lib/synopsis-generator';
import {
  generateWithAI,
  type CharacterResult,
  type StatResult,
  type FlagResult,
  type EndingResult,
  type RelationshipResult,
  type TraitsResult,
  type TraitResult,
  type IdeaSuggestionsResult,
  type IdeaSuggestion,
} from '@/lib/ai-scenario-generator';
import type { ScenarioData, SystemCondition, Trait } from '@/types';

// 비교 연산자 타입
type ComparisonOperator =
  | 'greater_equal'
  | 'less_equal'
  | 'equal'
  | 'greater_than'
  | 'less_than'
  | 'not_equal';

// 비교 연산자 변환 (AI 형식 → 게임 형식)
const COMPARISON_MAP: Record<string, ComparisonOperator | undefined> = {
  '>=': 'greater_equal',
  '<=': 'less_equal',
  '==': 'equal',
  '>': 'greater_than',
  '<': 'less_than',
  '!=': 'not_equal',
};

// suggestedConditions를 SystemCondition[]으로 변환
const convertToSystemConditions = (
  suggestedConditions: EndingResult['suggestedConditions'] | undefined,
): SystemCondition[] => {
  if (!suggestedConditions) return [];

  const conditions: SystemCondition[] = [];

  // 스탯 조건 변환
  if (suggestedConditions.stats && Array.isArray(suggestedConditions.stats)) {
    for (const stat of suggestedConditions.stats) {
      const comparison = COMPARISON_MAP[stat.comparison];
      if (comparison && stat.statId && typeof stat.value === 'number') {
        conditions.push({
          type: 'required_stat',
          statId: stat.statId,
          comparison,
          value: stat.value,
        });
      }
    }
  }

  // 플래그 조건 변환
  if (suggestedConditions.flags && Array.isArray(suggestedConditions.flags)) {
    for (const flagName of suggestedConditions.flags) {
      if (flagName && typeof flagName === 'string') {
        conditions.push({
          type: 'required_flag',
          flagName: flagName.startsWith('FLAG_') ? flagName : `FLAG_${flagName}`,
        });
      }
    }
  }

  return conditions;
};

// TraitResult를 Trait 타입으로 변환
const convertTraitResult = (
  trait: TraitResult,
  type: 'positive' | 'negative',
): Trait => ({
  traitId: trait.traitId,
  traitName: trait.traitName,
  displayName: trait.displayName,
  type,
  weightType: trait.traitId, // weightType은 traitId와 동일하게 설정
  displayText: trait.description || '',
  systemInstruction: trait.effect || '',
  iconUrl: '', // 기본값 - 에디터에서 설정 가능
});

// 단계 정의
type WizardStep = 'idea' | 'synopsis' | 'characters' | 'system' | 'endings' | 'complete';

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'idea', label: '아이디어', icon: Lightbulb },
  { key: 'synopsis', label: '시놉시스', icon: Sparkles },
  { key: 'characters', label: '캐릭터', icon: Users },
  { key: 'system', label: '시스템', icon: BarChart3 },
  { key: 'endings', label: '엔딩', icon: Trophy },
  { key: 'complete', label: '완료', icon: Check },
];

interface ScenarioWizardProps {
  onComplete: (scenario: Partial<ScenarioData>) => void;
  onCancel: () => void;
}

export function ScenarioWizard({ onComplete, onCancel }: ScenarioWizardProps) {
  // 현재 단계
  const [currentStep, setCurrentStep] = useState<WizardStep>('idea');

  // 입력 상태
  const [idea, setIdea] = useState('');
  const [tone, setTone] = useState<SynopsisGenerateRequest['tone']>('dramatic');
  const [setting, setSetting] = useState('');
  const [targetLength, setTargetLength] = useState<SynopsisGenerateRequest['targetLength']>('medium');

  // 생성된 데이터
  const [synopsisResult, setSynopsisResult] = useState<SynopsisResult | null>(null);
  const [characters, setCharacters] = useState<CharacterResult[]>([]);
  const [relationships, setRelationships] = useState<RelationshipResult[]>([]);
  const [traits, setTraits] = useState<TraitsResult>({ buffs: [], debuffs: [] });
  const [stats, setStats] = useState<StatResult[]>([]);
  const [flags, setFlags] = useState<FlagResult[]>([]);
  const [endings, setEndings] = useState<EndingResult[]>([]);

  // 아이디어 추천
  const [ideaSuggestions, setIdeaSuggestions] = useState<IdeaSuggestion[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 아이디어 추천 생성
  const handleGenerateIdeas = useCallback(async () => {
    setIsLoadingIdeas(true);
    setError(null);

    try {
      const response = await generateWithAI<IdeaSuggestionsResult>(
        'idea_suggestions',
        '', // 빈 입력 = 다양한 장르
      );
      setIdeaSuggestions(response.data.ideas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '아이디어 추천에 실패했습니다.');
    } finally {
      setIsLoadingIdeas(false);
    }
  }, []);

  // 추천 아이디어 선택 - 톤, 길이, 배경 설정도 자동 적용
  const handleSelectIdea = useCallback((selectedIdea: IdeaSuggestion) => {
    setIdea(selectedIdea.idea);
    setTone(selectedIdea.tone);
    setTargetLength(selectedIdea.targetLength);
    setSetting(selectedIdea.setting);
    setIdeaSuggestions([]); // 선택 후 추천 목록 숨기기
  }, []);

  // 시놉시스 생성
  const handleGenerateSynopsis = useCallback(async () => {
    if (!idea.trim()) {
      setError('아이디어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await generateSynopsis({
        idea,
        tone,
        setting: setting || undefined,
        targetLength,
      });
      setSynopsisResult(response.data);
      setCurrentStep('synopsis');
    } catch (err) {
      setError(err instanceof Error ? err.message : '시놉시스 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [idea, tone, setting, targetLength]);

  // 캐릭터 생성 (관계도 함께 생성)
  const handleGenerateCharacters = useCallback(async () => {
    if (!synopsisResult) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1단계: 캐릭터 생성
      const charResponse = await generateWithAI<{ characters: CharacterResult[] }>(
        'characters',
        `시나리오: ${synopsisResult.title}\n시놉시스: ${synopsisResult.synopsis}\n배경: ${synopsisResult.setting.place}, ${synopsisResult.setting.time}\n갈등: ${synopsisResult.conflictType}`,
        {
          genre: synopsisResult.genre,
          title: synopsisResult.title,
          synopsis: synopsisResult.synopsis,
        },
      );
      const generatedCharacters = charResponse.data.characters || [];
      setCharacters(generatedCharacters);

      // 2단계: 관계와 특성을 병렬로 생성
      const characterDescriptions = generatedCharacters
        .map((c) => `${c.characterName} (${c.roleName}): ${c.backstory}`)
        .join('\n');

      const suggestedTraitsSet = new Set(
        generatedCharacters.flatMap((c) => c.suggestedTraits || []),
      );

      const [relResponse, traitsResponse] = await Promise.all([
        // 관계 생성 (캐릭터가 2명 이상일 때만)
        generatedCharacters.length >= 2
          ? generateWithAI<{ relationships: RelationshipResult[] }>(
              'relationships',
              `캐릭터 목록:\n${characterDescriptions}\n\n시나리오 갈등: ${synopsisResult.conflictType}`,
              {
                genre: synopsisResult.genre,
                title: synopsisResult.title,
                synopsis: synopsisResult.synopsis,
                existingCharacters: generatedCharacters.map((c) => c.characterName),
              },
            )
          : Promise.resolve({ data: { relationships: [] } }),
        // 특성 생성
        generateWithAI<TraitsResult>(
          'traits',
          `시나리오: ${synopsisResult.title}\n캐릭터들의 제안된 특성: ${[...suggestedTraitsSet].join(', ')}\n캐릭터 목록:\n${characterDescriptions}`,
          {
            genre: synopsisResult.genre,
            title: synopsisResult.title,
            synopsis: synopsisResult.synopsis,
          },
        ),
      ]);

      setRelationships(relResponse.data.relationships || []);
      setTraits(traitsResponse.data || { buffs: [], debuffs: [] });

      setCurrentStep('characters');
    } catch (err) {
      setError(err instanceof Error ? err.message : '캐릭터 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [synopsisResult]);

  // 시스템(스탯/플래그) 생성
  const handleGenerateSystem = useCallback(async () => {
    if (!synopsisResult) return;

    setIsLoading(true);
    setError(null);

    try {
      // 캐릭터 상세정보 문자열 생성
      const characterDetails = characters
        .map((c) => `- ${c.characterName} (${c.roleName}): ${c.backstory}`)
        .join('\n');

      // 스탯과 플래그를 병렬로 생성
      const [statsResponse, flagsResponse] = await Promise.all([
        generateWithAI<{ stats: StatResult[] }>(
          'stats',
          `시나리오: ${synopsisResult.title}
시놉시스: ${synopsisResult.synopsis}
테마: ${synopsisResult.suggestedThemes.join(', ')}
갈등: ${synopsisResult.conflictType}

등장 캐릭터:
${characterDetails}`,
          {
            genre: synopsisResult.genre,
            title: synopsisResult.title,
            synopsis: synopsisResult.synopsis,
            existingCharacters: characters.map((c) => `${c.characterName} (${c.roleName})`),
          },
        ),
        generateWithAI<{ flags: FlagResult[] }>(
          'flags',
          `시나리오: ${synopsisResult.title}
시놉시스: ${synopsisResult.synopsis}
서사적 훅: ${synopsisResult.narrativeHooks.join(', ')}
갈등: ${synopsisResult.conflictType}

등장 캐릭터:
${characterDetails}`,
          {
            genre: synopsisResult.genre,
            title: synopsisResult.title,
            synopsis: synopsisResult.synopsis,
            existingCharacters: characters.map((c) => `${c.characterName} (${c.roleName})`),
          },
        ),
      ]);

      setStats(statsResponse.data.stats || []);
      setFlags(flagsResponse.data.flags || []);
      setCurrentStep('system');
    } catch (err) {
      setError(err instanceof Error ? err.message : '시스템 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [synopsisResult, characters]);

  // 엔딩 생성
  const handleGenerateEndings = useCallback(async () => {
    if (!synopsisResult) return;

    setIsLoading(true);
    setError(null);

    try {
      // 스탯 상세정보
      const statDetails = stats
        .map((s) => `- ${s.name} (${s.id}): ${s.description || '설명 없음'}, 범위 ${s.min}-${s.max}`)
        .join('\n');

      // 플래그 상세정보 (루트별 분류)
      const flagDetails = flags
        .map((f) => `- ${f.flagName}: ${f.description}`)
        .join('\n');

      // 캐릭터 정보
      const characterNames = characters.map((c) => c.characterName).join(', ');

      const response = await generateWithAI<{ endings: EndingResult[] }>(
        'endings',
        `시나리오: ${synopsisResult.title}
시놉시스: ${synopsisResult.synopsis}
플레이어 목표: ${synopsisResult.playerGoal}
핵심 갈등: ${synopsisResult.conflictType}

등장 캐릭터: ${characterNames}

게임 스탯:
${statDetails}

이벤트 플래그:
${flagDetails}

엔딩은 스탯과 플래그 조건을 조합하여 다양한 결말을 만들어주세요.
탈출/항전/협상 각 루트별로 최소 1개씩의 엔딩을 포함해주세요.`,
        {
          genre: synopsisResult.genre,
          title: synopsisResult.title,
          synopsis: synopsisResult.synopsis,
          existingStats: stats.map((s) => `${s.name} (${s.id})`),
          existingFlags: flags.map((f) => f.flagName),
        },
      );
      setEndings(response.data.endings || []);
      setCurrentStep('endings');
    } catch (err) {
      setError(err instanceof Error ? err.message : '엔딩 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [synopsisResult, characters, stats, flags]);

  // 완료 및 적용
  const handleComplete = useCallback(() => {
    if (!synopsisResult) return;

    const scenario: Partial<ScenarioData> = {
      scenarioId: synopsisResult.scenarioId,
      title: synopsisResult.title,
      synopsis: synopsisResult.synopsis,
      playerGoal: synopsisResult.playerGoal,
      genre: synopsisResult.genre,
      coreKeywords: synopsisResult.coreKeywords,
      posterImageUrl: '', // 기본값 - 에디터에서 설정 가능
      characters: characters.map((char) => ({
        roleId: char.roleId,
        roleName: char.roleName,
        characterName: char.characterName,
        backstory: char.backstory || '',
        imageUrl: '',
        weightedTraitTypes: char.suggestedTraits || [],
        currentTrait: null,
      })),
      initialRelationships: relationships.map((rel, idx) => ({
        id: `rel_${idx + 1}`,
        personA: rel.personA,
        personB: rel.personB,
        value: rel.value,
        reason: rel.reason,
      })),
      scenarioStats: stats.map((stat) => ({
        id: stat.id,
        name: stat.name,
        description: stat.description || '',
        min: stat.min || 0,
        max: stat.max || 100,
        current: stat.initialValue || 50,
        initialValue: stat.initialValue || 50,
        range: [stat.min || 0, stat.max || 100] as [number, number],
      })),
      traitPool: {
        buffs: (traits.buffs || []).map((t) => convertTraitResult(t, 'positive')),
        debuffs: (traits.debuffs || []).map((t) => convertTraitResult(t, 'negative')),
      },
      flagDictionary: flags.map((flag) => ({
        flagName: flag.flagName,
        description: flag.description || '',
        type: flag.type || 'boolean',
        initial: flag.type === 'count' ? 0 : false,
        triggerCondition: flag.triggerCondition || '',
      })),
      endingArchetypes: endings.map((ending) => ({
        endingId: ending.endingId,
        title: ending.title,
        description: ending.description || '',
        isGoalSuccess: ending.isGoalSuccess || false,
        systemConditions: convertToSystemConditions(ending.suggestedConditions),
      })),
      endCondition: { type: 'time_limit', value: 7, unit: 'days' }, // 기본값 - 7일 제한
      status: 'in_progress',
    };

    onComplete(scenario);
  }, [synopsisResult, characters, relationships, traits, stats, flags, endings, onComplete]);

  // 단계 이동
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    setError(null);
  };

  // 현재 단계 인덱스
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // 단계별 내용 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 'idea':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="idea">시나리오 아이디어</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateIdeas}
                  disabled={isLoadingIdeas}
                  className="text-xs"
                >
                  {isLoadingIdeas ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      추천 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      아이디어 추천받기
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="예: 좀비 아포칼립스에서 생존자 그룹을 이끌고 안전 지대를 찾아 떠나는 7일간의 여정"
                className="min-h-[120px]"
              />
              <p className="text-xs text-zinc-500">
                시나리오의 핵심 컨셉을 자유롭게 설명해주세요. AI가 이를 바탕으로 상세한 시놉시스를 생성합니다.
              </p>
            </div>

            {/* 아이디어 추천 목록 */}
            {ideaSuggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">추천 아이디어</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIdeaSuggestions([])}
                    className="text-xs text-zinc-500 h-6"
                  >
                    닫기
                  </Button>
                </div>
                <div className="grid gap-2">
                  {ideaSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectIdea(suggestion)}
                      className="text-left p-3 rounded-lg border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors"
                    >
                      <p className="text-sm text-zinc-200">{suggestion.idea}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.genre}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TONE_OPTIONS.find(t => t.value === suggestion.tone)?.label || suggestion.tone}
                        </Badge>
                        <span className="text-xs text-zinc-500">{suggestion.hook}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1">{suggestion.setting}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>분위기/톤</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-zinc-500">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>시놉시스 길이</Label>
                <Select
                  value={targetLength}
                  onValueChange={(v) => setTargetLength(v as typeof targetLength)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setting">배경 설정 (선택)</Label>
              <Input
                id="setting"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="예: 2024년 대한민국 서울, 근미래 우주 정거장"
              />
            </div>

            <Button
              onClick={handleGenerateSynopsis}
              disabled={isLoading || !idea.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  시놉시스 생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  시놉시스 생성하기
                </>
              )}
            </Button>
          </div>
        );

      case 'synopsis':
        return synopsisResult ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{synopsisResult.title}</h3>
                <p className="text-xs text-zinc-500">ID: {synopsisResult.scenarioId}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {synopsisResult.genre.map((g, i) => (
                  <Badge key={i} variant="secondary">{g}</Badge>
                ))}
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm leading-relaxed">{synopsisResult.synopsis}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">목표:</span>
                  <p className="mt-1">{synopsisResult.playerGoal}</p>
                </div>
                <div>
                  <span className="text-zinc-500">갈등:</span>
                  <p className="mt-1">{synopsisResult.conflictType}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {synopsisResult.coreKeywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                ))}
              </div>

              <div className="p-3 bg-zinc-900/50 rounded-lg text-sm">
                <p className="text-zinc-500 mb-2">서사적 훅:</p>
                <ul className="list-disc list-inside space-y-1">
                  {synopsisResult.narrativeHooks.map((hook, i) => (
                    <li key={i}>{hook}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep('idea')}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 생성
              </Button>
              <Button
                onClick={handleGenerateCharacters}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                캐릭터 생성
              </Button>
            </div>
          </div>
        ) : null;

      case 'characters':
        return (
          <div className="space-y-6">
            {/* 캐릭터 목록 */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                캐릭터 ({characters.length}명)
              </h4>
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {characters.map((char, idx) => (
                  <Card key={idx} className="bg-zinc-800/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{char.characterName}</h4>
                          <p className="text-xs text-zinc-500">{char.roleName} ({char.roleId})</p>
                        </div>
                        {char.suggestedTraits && (
                          <div className="flex gap-1">
                            {char.suggestedTraits.slice(0, 2).map((t, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">{char.backstory}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 관계 목록 */}
            {relationships.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  관계 ({relationships.length}개)
                </h4>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2 rounded text-sm flex items-center justify-between',
                        rel.value >= 50 ? 'bg-green-900/20' :
                        rel.value >= 0 ? 'bg-zinc-800/30' :
                        rel.value >= -50 ? 'bg-yellow-900/20' : 'bg-red-900/20',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rel.personA}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="font-medium">{rel.personB}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={rel.value >= 0 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {rel.value > 0 ? '+' : ''}{rel.value}
                        </Badge>
                        <span className="text-xs text-zinc-500">{rel.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep('synopsis')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateCharacters}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 생성
              </Button>
              <Button
                onClick={handleGenerateSystem}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                스탯/플래그 생성
              </Button>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  스탯 ({stats.length}개)
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="p-2 bg-zinc-800/30 rounded text-sm">
                      <div className="font-medium">{stat.name}</div>
                      <div className="text-xs text-zinc-500">{stat.id} ({stat.min}-{stat.max})</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  플래그 ({flags.length}개)
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {flags.map((flag, idx) => (
                    <div key={idx} className="p-2 bg-zinc-800/30 rounded text-sm">
                      <div className="font-medium text-xs">{flag.flagName}</div>
                      <div className="text-xs text-zinc-500">{flag.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep('characters')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateSystem}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 생성
              </Button>
              <Button
                onClick={handleGenerateEndings}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                엔딩 생성
              </Button>
            </div>
          </div>
        );

      case 'endings':
        return (
          <div className="space-y-6">
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {endings.map((ending, idx) => (
                <Card key={idx} className={cn(
                  "bg-zinc-800/30",
                  ending.isGoalSuccess ? "border-green-900/50" : "border-red-900/50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{ending.title}</h4>
                      <Badge variant={ending.isGoalSuccess ? "default" : "destructive"}>
                        {ending.isGoalSuccess ? '성공' : '실패'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{ending.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep('system')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateEndings}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 생성
              </Button>
              <Button
                onClick={() => setCurrentStep('complete')}
                disabled={isLoading}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                완료
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto bg-green-600/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">시나리오 생성 완료!</h3>
              <p className="text-sm text-zinc-500 mt-1">
                "{synopsisResult?.title}" 시나리오가 준비되었습니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{characters.length}</div>
                <div className="text-xs text-zinc-500">캐릭터</div>
              </div>
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{relationships.length}</div>
                <div className="text-xs text-zinc-500">관계</div>
              </div>
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{(traits.buffs?.length || 0) + (traits.debuffs?.length || 0)}</div>
                <div className="text-xs text-zinc-500">특성</div>
              </div>
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{stats.length}</div>
                <div className="text-xs text-zinc-500">스탯</div>
              </div>
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{flags.length}</div>
                <div className="text-xs text-zinc-500">플래그</div>
              </div>
              <div className="p-3 bg-zinc-800/30 rounded">
                <div className="text-lg font-bold">{endings.length}</div>
                <div className="text-xs text-zinc-500">엔딩</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => goToStep('idea')}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                처음부터
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                시나리오에 적용
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand2 className="w-5 h-5 text-yellow-500" />
              시나리오 생성 위저드
            </CardTitle>
            <CardDescription>
              단계별로 시나리오를 자동 생성합니다
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex items-center justify-between mt-4 px-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isCompleted = idx < currentStepIndex;

            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => isCompleted && goToStep(step.key)}
                  disabled={!isCompleted}
                  className={cn(
                    'flex flex-col items-center gap-1 transition-all',
                    isActive && 'text-white',
                    isCompleted && 'text-green-500 cursor-pointer',
                    !isActive && !isCompleted && 'text-zinc-600',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      isActive && 'bg-zinc-700',
                      isCompleted && 'bg-green-600/20',
                      !isActive && !isCompleted && 'bg-zinc-800',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-1',
                      idx < currentStepIndex ? 'bg-green-600' : 'bg-zinc-800',
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}

export default ScenarioWizard;
