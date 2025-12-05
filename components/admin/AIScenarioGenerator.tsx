'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GenerationCategory,
  GenerationContext,
  CATEGORY_INFO,
  generateWithAI,
  ScenarioOverviewResult,
  CharacterResult,
  StatResult,
  FlagResult,
  EndingResult,
  TraitsResult,
} from '@/lib/ai-scenario-generator';

// Chip 컴포넌트 - 선택 가능한 제안 항목
interface SelectableChipProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function SelectableChip({
  label,
  sublabel,
  selected,
  onToggle,
  disabled,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
        'hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500',
        selected
          ? 'bg-zinc-800 border-zinc-600 text-white'
          : 'bg-zinc-900/50 border-zinc-700 text-zinc-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'w-4 h-4 rounded-full border flex items-center justify-center transition-all',
          selected ? 'bg-green-600 border-green-600' : 'border-zinc-600',
        )}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </span>
      <span className="flex flex-col items-start">
        <span className="font-medium">{label}</span>
        {sublabel && (
          <span className="text-xs text-zinc-500">{sublabel}</span>
        )}
      </span>
    </button>
  );
}

// 확장 가능한 결과 카드
interface ExpandableResultCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

function ExpandableResultCard({
  title,
  description,
  selected,
  onToggle,
  children,
  disabled,
}: ExpandableResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        selected
          ? 'bg-zinc-800/50 border-zinc-600'
          : 'bg-zinc-900/30 border-zinc-800',
        disabled && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0',
            selected ? 'bg-green-600 border-green-600' : 'border-zinc-600',
            !disabled && 'hover:border-zinc-500',
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{title}</div>
          {description && !expanded && (
            <div className="text-xs text-zinc-500 truncate">{description}</div>
          )}
        </div>
        {children && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        )}
      </div>
      {expanded && children && (
        <div className="px-3 pb-3 pt-0 text-xs text-zinc-400 border-t border-zinc-800 mt-2 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

// 메인 AI Generator 컴포넌트
interface AIScenarioGeneratorProps {
  context?: GenerationContext;
  onApply: (category: GenerationCategory, data: unknown, selectedIndices: number[]) => void;
  defaultCategory?: GenerationCategory;
  compact?: boolean;
}

type GenerationResult =
  | { type: 'scenario_overview'; data: ScenarioOverviewResult }
  | { type: 'characters'; data: { characters: CharacterResult[] } }
  | { type: 'stats'; data: { stats: StatResult[] } }
  | { type: 'flags'; data: { flags: FlagResult[] } }
  | { type: 'endings'; data: { endings: EndingResult[] } }
  | { type: 'traits'; data: TraitsResult }
  | { type: 'keywords'; data: { keywords: string[] } }
  | { type: 'genre'; data: { genres: string[] } };

export function AIScenarioGenerator({
  context,
  onApply,
  defaultCategory = 'scenario_overview',
  compact = false,
}: AIScenarioGeneratorProps) {
  const [category, setCategory] = useState<GenerationCategory>(defaultCategory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) {
      setError('아이디어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedIndices(new Set());

    try {
      const response = await generateWithAI(category, input, context);
      setResult({ type: category, data: response.data } as GenerationResult);

      // 기본적으로 모든 항목 선택
      const itemCount = getItemCount(category, response.data);
      setSelectedIndices(new Set(Array.from({ length: itemCount }, (_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [category, input, context]);

  const getItemCount = (cat: GenerationCategory, data: unknown): number => {
    switch (cat) {
      case 'scenario_overview':
        return 1;
      case 'characters':
        return (data as { characters: unknown[] }).characters?.length || 0;
      case 'stats':
        return (data as { stats: unknown[] }).stats?.length || 0;
      case 'flags':
        return (data as { flags: unknown[] }).flags?.length || 0;
      case 'endings':
        return (data as { endings: unknown[] }).endings?.length || 0;
      case 'traits': {
        const traits = data as TraitsResult;
        return (traits.buffs?.length || 0) + (traits.debuffs?.length || 0);
      }
      case 'keywords':
        return (data as { keywords: string[] }).keywords?.length || 0;
      case 'genre':
        return (data as { genres: string[] }).genres?.length || 0;
      default:
        return 0;
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (result) {
      const count = getItemCount(result.type, result.data);
      setSelectedIndices(new Set(Array.from({ length: count }, (_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleApply = () => {
    if (result && selectedIndices.size > 0) {
      onApply(result.type, result.data, Array.from(selectedIndices));
      // 적용 후 초기화
      setResult(null);
      setSelectedIndices(new Set());
      setInput('');
    }
  };

  const renderResults = () => {
    if (!result) return null;

    switch (result.type) {
      case 'scenario_overview': {
        const data = result.data;
        return (
          <div className="space-y-3">
            <ExpandableResultCard
              title={data.title}
              description={data.synopsis}
              selected={selectedIndices.has(0)}
              onToggle={() => toggleSelection(0)}
            >
              <div className="space-y-2">
                <div><strong>목표:</strong> {data.playerGoal}</div>
                <div><strong>장르:</strong> {data.genre.join(', ')}</div>
                <div><strong>키워드:</strong> {data.coreKeywords.join(' ')}</div>
                <div><strong>ID:</strong> {data.scenarioId}</div>
              </div>
            </ExpandableResultCard>
          </div>
        );
      }

      case 'characters': {
        const characters = result.data.characters || [];
        return (
          <div className="space-y-2">
            {characters.map((char, idx) => (
              <ExpandableResultCard
                key={idx}
                title={`${char.characterName} (${char.roleName})`}
                description={char.backstory}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              >
                <div className="space-y-1">
                  <div><strong>역할 ID:</strong> {char.roleId}</div>
                  <div><strong>배경:</strong> {char.backstory}</div>
                  {char.suggestedTraits?.length > 0 && (
                    <div><strong>제안 특성:</strong> {char.suggestedTraits.join(', ')}</div>
                  )}
                </div>
              </ExpandableResultCard>
            ))}
          </div>
        );
      }

      case 'stats': {
        const stats = result.data.stats || [];
        return (
          <div className="space-y-2">
            {stats.map((stat, idx) => (
              <ExpandableResultCard
                key={idx}
                title={`${stat.name} (${stat.id})`}
                description={stat.description}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              >
                <div className="space-y-1">
                  <div><strong>범위:</strong> {stat.min} ~ {stat.max}</div>
                  <div><strong>초기값:</strong> {stat.initialValue}</div>
                  <div><strong>극성:</strong> {stat.polarity === 'positive' ? '높을수록 좋음' : '낮을수록 좋음'}</div>
                </div>
              </ExpandableResultCard>
            ))}
          </div>
        );
      }

      case 'flags': {
        const flags = result.data.flags || [];
        return (
          <div className="space-y-2">
            {flags.map((flag, idx) => (
              <ExpandableResultCard
                key={idx}
                title={flag.flagName}
                description={flag.description}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              >
                <div className="space-y-1">
                  <div><strong>타입:</strong> {flag.type === 'boolean' ? '불린' : '카운트'}</div>
                  <div><strong>발동 조건:</strong> {flag.triggerCondition}</div>
                </div>
              </ExpandableResultCard>
            ))}
          </div>
        );
      }

      case 'endings': {
        const endings = result.data.endings || [];
        return (
          <div className="space-y-2">
            {endings.map((ending, idx) => (
              <ExpandableResultCard
                key={idx}
                title={`${ending.title} ${ending.isGoalSuccess ? '(성공)' : '(실패)'}`}
                description={ending.description}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              >
                <div className="space-y-1">
                  <div><strong>ID:</strong> {ending.endingId}</div>
                  {ending.suggestedConditions?.stats?.length > 0 && (
                    <div>
                      <strong>스탯 조건:</strong>{' '}
                      {ending.suggestedConditions.stats
                        .map((s) => `${s.statId} ${s.comparison} ${s.value}`)
                        .join(', ')}
                    </div>
                  )}
                  {ending.suggestedConditions?.flags?.length > 0 && (
                    <div>
                      <strong>플래그 조건:</strong>{' '}
                      {ending.suggestedConditions.flags.join(', ')}
                    </div>
                  )}
                </div>
              </ExpandableResultCard>
            ))}
          </div>
        );
      }

      case 'traits': {
        const { buffs = [], debuffs = [] } = result.data;
        const allTraits = [...buffs.map((t, i) => ({ ...t, isBuff: true, idx: i })), ...debuffs.map((t, i) => ({ ...t, isBuff: false, idx: buffs.length + i }))];

        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2">버프 특성</h4>
              <div className="space-y-2">
                {buffs.map((trait, idx) => (
                  <ExpandableResultCard
                    key={idx}
                    title={`${trait.traitName} (${trait.traitId})`}
                    description={trait.description}
                    selected={selectedIndices.has(idx)}
                    onToggle={() => toggleSelection(idx)}
                  >
                    <div><strong>효과:</strong> {trait.effect}</div>
                  </ExpandableResultCard>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">디버프 특성</h4>
              <div className="space-y-2">
                {debuffs.map((trait, idx) => (
                  <ExpandableResultCard
                    key={idx}
                    title={`${trait.traitName} (${trait.traitId})`}
                    description={trait.description}
                    selected={selectedIndices.has(buffs.length + idx)}
                    onToggle={() => toggleSelection(buffs.length + idx)}
                  >
                    <div><strong>효과:</strong> {trait.effect}</div>
                  </ExpandableResultCard>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'keywords': {
        const keywords = result.data.keywords || [];
        return (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, idx) => (
              <SelectableChip
                key={idx}
                label={keyword}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              />
            ))}
          </div>
        );
      }

      case 'genre': {
        const genres = result.data.genres || [];
        return (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre, idx) => (
              <SelectableChip
                key={idx}
                label={genre}
                selected={selectedIndices.has(idx)}
                onToggle={() => toggleSelection(idx)}
              />
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const categoryInfo = CATEGORY_INFO[category];

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">AI 생성</span>
        </div>
        <div className="flex gap-2">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as GenerationCategory)}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_INFO) as GenerationCategory[]).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_INFO[cat].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={categoryInfo.placeholder}
            className="flex-1 min-h-[36px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '생성'}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-400 flex items-center gap-2">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {selectedIndices.size}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  전체 선택
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  선택 해제
                </Button>
              </div>
            </div>
            {renderResults()}
            <Button
              onClick={handleApply}
              disabled={selectedIndices.size === 0}
              className="w-full"
            >
              선택한 항목 적용 ({selectedIndices.size}개)
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          AI 시나리오 생성 도우미
        </CardTitle>
        <CardDescription>
          아이디어를 입력하면 AI가 시나리오 요소를 제안합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 카테고리 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">생성할 항목</label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as GenerationCategory);
              setResult(null);
              setSelectedIndices(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_INFO) as GenerationCategory[]).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <div className="flex flex-col items-start">
                    <span>{CATEGORY_INFO[cat].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">{categoryInfo.description}</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">아이디어 입력</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={categoryInfo.placeholder}
            className="min-h-[80px] resize-none"
            rows={3}
          />
        </div>

        {/* 생성 버튼 */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !input.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              AI가 생성 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {categoryInfo.label} 생성하기
            </>
          )}
        </Button>

        {/* 에러 표시 */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-900 rounded-lg text-sm text-red-400 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">생성 결과</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {selectedIndices.size}개 선택됨
                </span>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  전체 선택
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  선택 해제
                </Button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
              {renderResults()}
            </div>

            <Button
              onClick={handleApply}
              disabled={selectedIndices.size === 0}
              className="w-full"
              variant="default"
            >
              <Check className="w-4 h-4 mr-2" />
              선택한 항목 적용하기 ({selectedIndices.size}개)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIScenarioGenerator;
