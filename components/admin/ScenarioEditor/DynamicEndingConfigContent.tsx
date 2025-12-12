'use client';

import { DynamicEndingConfig } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Target,
  Users,
  Scale,
  BookOpen,
  AlertTriangle,
  Info,
  Plus,
  X
} from 'lucide-react';
import { useState } from 'react';

interface DynamicEndingConfigContentProps {
  config: DynamicEndingConfig | undefined;
  genre: string[];
  onChange: (config: DynamicEndingConfig) => void;
}

// 기본값
const DEFAULT_CONFIG: DynamicEndingConfig = {
  enabled: true,
  endingDay: 7,
  warningDays: 2,
  goalType: 'manual',
  evaluationCriteria: {
    goalWeight: 0.3,
    relationshipWeight: 0.3,
    moralWeight: 0.2,
    narrativeWeight: 0.2,
  },
  narrativeGuidelines: '',
  endingToneHints: [],
};

export function DynamicEndingConfigContent({
  config,
  genre,
  onChange,
}: DynamicEndingConfigContentProps) {
  const currentConfig = config ?? DEFAULT_CONFIG;
  const [newToneHint, setNewToneHint] = useState('');

  const handleChange = <K extends keyof DynamicEndingConfig>(
    key: K,
    value: DynamicEndingConfig[K]
  ) => {
    onChange({
      ...currentConfig,
      [key]: value,
    });
  };

  const handleCriteriaChange = (
    key: keyof DynamicEndingConfig['evaluationCriteria'],
    value: number
  ) => {
    onChange({
      ...currentConfig,
      evaluationCriteria: {
        ...currentConfig.evaluationCriteria,
        [key]: value,
      },
    });
  };

  const addToneHint = () => {
    if (newToneHint.trim()) {
      handleChange('endingToneHints', [...currentConfig.endingToneHints, newToneHint.trim()]);
      setNewToneHint('');
    }
  };

  const removeToneHint = (index: number) => {
    handleChange(
      'endingToneHints',
      currentConfig.endingToneHints.filter((_, i) => i !== index)
    );
  };

  // 자동으로 장르 기반 톤 힌트 추가
  const addGenreToneHints = () => {
    const genreTones: Record<string, string[]> = {
      '스릴러': ['긴장감 유지', '반전 가능', '심리적 여운'],
      '호러': ['공포의 여운', '불안한 해소', '생존의 대가'],
      '미스터리': ['진실 공개', '논리적 마무리', '숨겨진 동기 공개'],
      'SF': ['과학적 결말', '인류의 미래', '기술의 대가'],
      '드라마': ['감정적 해소', '관계의 성장', '일상으로의 복귀'],
      '로맨스': ['관계의 결실', '감정적 카타르시스', '사랑의 증명'],
      '판타지': ['영웅의 귀환', '세계의 변화', '희생의 보상'],
      '액션': ['최종 대결', '정의 구현', '영웅적 순간'],
    };

    const hints: string[] = [];
    for (const g of genre) {
      if (genreTones[g]) {
        hints.push(...genreTones[g]);
      }
    }

    if (hints.length > 0) {
      const uniqueHints = [...new Set([...currentConfig.endingToneHints, ...hints])];
      handleChange('endingToneHints', uniqueHints);
    }
  };

  const totalWeight =
    currentConfig.evaluationCriteria.goalWeight +
    currentConfig.evaluationCriteria.relationshipWeight +
    currentConfig.evaluationCriteria.moralWeight +
    currentConfig.evaluationCriteria.narrativeWeight;

  return (
    <div className="space-y-6">
      {/* 시스템 활성화 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">동적 결말 시스템</CardTitle>
            </div>
            <Switch
              checked={currentConfig.enabled}
              onCheckedChange={(checked) => handleChange('enabled', checked)}
            />
          </div>
          <CardDescription>
            플레이어 행동을 분석하여 자동으로 결말을 생성합니다.
            기존 엔딩 아키타입 시스템을 대체합니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {currentConfig.enabled && (
        <>
          {/* 결말 트리거 설정 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">결말 트리거 설정</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endingDay">결말 일차</Label>
                  <Input
                    id="endingDay"
                    type="number"
                    min={3}
                    max={30}
                    value={currentConfig.endingDay}
                    onChange={(e) => handleChange('endingDay', parseInt(e.target.value) || 7)}
                  />
                  <p className="text-xs text-muted-foreground">
                    이 일차에 도달하면 결말이 생성됩니다
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warningDays">경고 시작 (일 전)</Label>
                  <Input
                    id="warningDays"
                    type="number"
                    min={1}
                    max={5}
                    value={currentConfig.warningDays}
                    onChange={(e) => handleChange('warningDays', parseInt(e.target.value) || 2)}
                  />
                  <p className="text-xs text-muted-foreground">
                    결말 {currentConfig.warningDays}일 전부터 경고 표시
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SDT 평가 기준 가중치 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">SDT 평가 기준 가중치</CardTitle>
              </div>
              <CardDescription>
                Self-Determination Theory 기반 결말 평가 가중치를 설정합니다.
                {totalWeight !== 1 && (
                  <span className="ml-2 text-yellow-500">
                    (현재 합계: {(totalWeight * 100).toFixed(0)}% - 100%가 권장됩니다)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 목표 달성도 (유능감) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <Label>목표 달성도 (Competence)</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {(currentConfig.evaluationCriteria.goalWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[currentConfig.evaluationCriteria.goalWeight * 100]}
                  onValueChange={([v]) => handleCriteriaChange('goalWeight', v / 100)}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  플레이어가 목표를 얼마나 달성했는지 평가
                </p>
              </div>

              {/* 관계 품질 (관계성) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-pink-500" />
                    <Label>관계 품질 (Relatedness)</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {(currentConfig.evaluationCriteria.relationshipWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[currentConfig.evaluationCriteria.relationshipWeight * 100]}
                  onValueChange={([v]) => handleCriteriaChange('relationshipWeight', v / 100)}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  캐릭터들과의 관계가 결말에 미치는 영향
                </p>
              </div>

              {/* 도덕적 일관성 (자율성) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-500" />
                    <Label>도덕적 일관성 (Autonomy)</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {(currentConfig.evaluationCriteria.moralWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[currentConfig.evaluationCriteria.moralWeight * 100]}
                  onValueChange={([v]) => handleCriteriaChange('moralWeight', v / 100)}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  플레이어 선택의 도덕적 일관성 평가
                </p>
              </div>

              {/* 서사적 완결성 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                    <Label>서사적 완결성</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {(currentConfig.evaluationCriteria.narrativeWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[currentConfig.evaluationCriteria.narrativeWeight * 100]}
                  onValueChange={([v]) => handleCriteriaChange('narrativeWeight', v / 100)}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  모든 서사적 스레드가 마무리되었는지 평가
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 결말 톤 힌트 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-cyan-500" />
                  <CardTitle className="text-lg">결말 톤 힌트</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={addGenreToneHints}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  장르 기반 추가
                </Button>
              </div>
              <CardDescription>
                AI가 결말 생성 시 참고할 톤/분위기 키워드
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentConfig.endingToneHints.map((hint, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {hint}
                    <button
                      onClick={() => removeToneHint(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="새 톤 힌트 입력..."
                  value={newToneHint}
                  onChange={(e) => setNewToneHint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToneHint()}
                />
                <Button onClick={addToneHint} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 서사 가이드라인 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">서사 가이드라인</CardTitle>
              </div>
              <CardDescription>
                AI가 결말 생성 시 따라야 할 창작자 지침
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="예: 주인공의 희생이 헛되지 않았음을 보여줄 것. 생존자들에게 희망적 미래를 암시할 것. 악역의 최후는 명확히 묘사할 것..."
                value={currentConfig.narrativeGuidelines}
                onChange={(e) => handleChange('narrativeGuidelines', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* 경고 */}
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">동적 결말 시스템 활성화 시</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- 기존 엔딩 아키타입(EndingArchetypes)은 무시됩니다</li>
                    <li>- 플레이어 행동 기록(ActionHistory)이 수집됩니다</li>
                    <li>- Day {currentConfig.endingDay} 도달 시 AI가 결말을 생성합니다</li>
                    <li>- SDT 원칙에 따라 플레이어 만족도를 최적화합니다</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
