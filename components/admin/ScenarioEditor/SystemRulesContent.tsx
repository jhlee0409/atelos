'use client';

import { SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScenarioData, ScenarioStat, Trait } from '@/types';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
};

export default function SystemRulesContent({ scenario, setScenario }: Props) {
  // ========== 스탯 관리 함수들 ==========
  const addStat = () => {
    const newStat: ScenarioStat = {
      id: `stat_${Date.now()}`,
      name: '',
      description: '',
      current: 50,
      min: 0,
      max: 100,
      initialValue: 50,
      range: [0, 100],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      scenarioStats: [...prev.scenarioStats, newStat],
    }));
  };

  const updateStat = (
    index: number,
    field: keyof ScenarioStat,
    value: string | number,
  ) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) => {
        if (i !== index) return stat;

        // 숫자 필드 처리
        if (['current', 'min', 'max', 'initialValue'].includes(field)) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
          const updatedStat = { ...stat, [field]: numValue };

          // range도 함께 업데이트
          if (field === 'min' || field === 'max') {
            updatedStat.range = [
              field === 'min' ? numValue : stat.min,
              field === 'max' ? numValue : stat.max,
            ];
          }

          // current와 initialValue가 범위 내에 있도록 조정
          if (field === 'min' || field === 'max') {
            const newMin = field === 'min' ? numValue : stat.min;
            const newMax = field === 'max' ? numValue : stat.max;
            if (updatedStat.current < newMin) updatedStat.current = newMin;
            if (updatedStat.current > newMax) updatedStat.current = newMax;
            if (updatedStat.initialValue !== undefined) {
              if (updatedStat.initialValue < newMin) updatedStat.initialValue = newMin;
              if (updatedStat.initialValue > newMax) updatedStat.initialValue = newMax;
            }
          }

          return updatedStat;
        }

        return { ...stat, [field]: value };
      }),
    }));
  };

  const removeStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.filter((_, i) => i !== index),
    }));
  };

  const saveStat = (index: number) => {
    const stat = scenario.scenarioStats[index];

    // ID 검증
    if (!stat.id.trim() || stat.id.startsWith('stat_')) {
      alert('유효한 스탯 ID를 입력해주세요. (예: cityChaos, communityCohesion)');
      return;
    }

    // 이름 검증
    if (!stat.name.trim()) {
      alert('스탯 이름을 입력해주세요.');
      return;
    }

    // ID 중복 검증
    const isDuplicate = scenario.scenarioStats.some(
      (s, i) => i !== index && s.id === stat.id
    );
    if (isDuplicate) {
      alert('이미 존재하는 스탯 ID입니다.');
      return;
    }

    // min/max 검증
    if (stat.min >= stat.max) {
      alert('최소값은 최대값보다 작아야 합니다.');
      return;
    }

    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((s, i) =>
        i === index ? { ...s, isEditing: false } : s,
      ),
    }));
  };

  const editStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, isEditing: true } : stat,
      ),
    }));
  };

  // ========== 특성 (Trait) 관리 함수들 ==========
  const addTrait = (type: 'positive' | 'negative') => {
    const newTrait: Trait = {
      traitId: `trait_${Date.now()}`,
      traitName: '',
      displayName: '',
      type,
      weightType: type === 'positive' ? 'buff' : 'debuff',
      displayText: '',
      systemInstruction: '',
      iconUrl: '',
      isEditing: true,
    };

    setScenario((prev) => ({
      ...prev,
      traitPool: {
        buffs: type === 'positive' ? [...(prev.traitPool?.buffs || []), newTrait] : (prev.traitPool?.buffs || []),
        debuffs: type === 'negative' ? [...(prev.traitPool?.debuffs || []), newTrait] : (prev.traitPool?.debuffs || []),
      },
    }));
  };

  const updateTrait = (
    type: 'positive' | 'negative',
    index: number,
    field: keyof Trait,
    value: string,
  ) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        buffs: type === 'positive'
          ? (prev.traitPool?.buffs || []).map((trait, i) =>
              i === index ? { ...trait, [field]: value } : trait
            )
          : (prev.traitPool?.buffs || []),
        debuffs: type === 'negative'
          ? (prev.traitPool?.debuffs || []).map((trait, i) =>
              i === index ? { ...trait, [field]: value } : trait
            )
          : (prev.traitPool?.debuffs || []),
      },
    }));
  };

  const removeTrait = (type: 'positive' | 'negative', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        buffs: type === 'positive'
          ? (prev.traitPool?.buffs || []).filter((_, i) => i !== index)
          : (prev.traitPool?.buffs || []),
        debuffs: type === 'negative'
          ? (prev.traitPool?.debuffs || []).filter((_, i) => i !== index)
          : (prev.traitPool?.debuffs || []),
      },
    }));
  };

  const saveTrait = (type: 'positive' | 'negative', index: number) => {
    const traits = type === 'positive' ? (scenario.traitPool?.buffs || []) : (scenario.traitPool?.debuffs || []);
    const trait = traits[index];

    if (!trait) {
      alert('특성을 찾을 수 없습니다.');
      return;
    }

    // ID 검증
    if (!trait.traitId.trim() || trait.traitId.startsWith('trait_')) {
      alert('유효한 특성 ID를 입력해주세요. (예: leadership, trauma)');
      return;
    }

    // displayName 검증
    if (!trait.displayName?.trim()) {
      alert('표시 이름(한글)을 입력해주세요.');
      return;
    }

    // displayText 검증
    if (!trait.displayText?.trim()) {
      alert('특성 설명을 입력해주세요.');
      return;
    }

    setScenario((prev) => ({
      ...prev,
      traitPool: {
        buffs: type === 'positive'
          ? (prev.traitPool?.buffs || []).map((t, i) =>
              i === index ? { ...t, isEditing: false } : t
            )
          : (prev.traitPool?.buffs || []),
        debuffs: type === 'negative'
          ? (prev.traitPool?.debuffs || []).map((t, i) =>
              i === index ? { ...t, isEditing: false } : t
            )
          : (prev.traitPool?.debuffs || []),
      },
    }));
  };

  const editTrait = (type: 'positive' | 'negative', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        buffs: type === 'positive'
          ? (prev.traitPool?.buffs || []).map((t, i) =>
              i === index ? { ...t, isEditing: true } : t
            )
          : (prev.traitPool?.buffs || []),
        debuffs: type === 'negative'
          ? (prev.traitPool?.debuffs || []).map((t, i) =>
              i === index ? { ...t, isEditing: true } : t
            )
          : (prev.traitPool?.debuffs || []),
      },
    }));
  };

  // 특성 카드 렌더링 함수
  const renderTraitCard = (trait: Trait, index: number, type: 'positive' | 'negative') => (
    <Card
      key={trait.traitId || index}
      className={`overflow-hidden ${
        type === 'positive' ? 'border-green-300/50' : 'border-red-300/50'
      }`}
    >
      <CardContent className="p-4">
        {trait.isEditing ? (
          // 편집 모드
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>특성 ID (영문)</Label>
                <Input
                  value={trait.traitId}
                  onChange={(e) =>
                    updateTrait(type, index, 'traitId', e.target.value.replace(/\s/g, '_').toLowerCase())
                  }
                  placeholder="leadership"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>시스템 이름 (영문)</Label>
                <Input
                  value={trait.traitName}
                  onChange={(e) =>
                    updateTrait(type, index, 'traitName', e.target.value.replace(/\s/g, '_').toLowerCase())
                  }
                  placeholder="natural_leader"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>표시 이름 (한글) *</Label>
                <Input
                  value={trait.displayName || ''}
                  onChange={(e) => updateTrait(type, index, 'displayName', e.target.value)}
                  placeholder="타고난 리더"
                />
              </div>
              <div className="space-y-1">
                <Label>가중치 타입</Label>
                <Input
                  value={trait.weightType}
                  onChange={(e) => updateTrait(type, index, 'weightType', e.target.value)}
                  placeholder="leadership_skills"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>특성 설명 (사용자에게 표시) *</Label>
              <Textarea
                value={trait.displayText}
                onChange={(e) => updateTrait(type, index, 'displayText', e.target.value)}
                placeholder="그의 존재만으로도 그룹은 쉽게 무너지지 않으며, 그의 지시는 왠지 모를 신뢰를 준다."
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>AI 시스템 지시 (게임 로직용)</Label>
              <Textarea
                value={trait.systemInstruction}
                onChange={(e) => updateTrait(type, index, 'systemInstruction', e.target.value)}
                placeholder="이 캐릭터의 리더십 특성을 반영하여 그룹 의사결정에 긍정적 영향을 주도록 합니다."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => removeTrait(type, index)}
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-100"
              >
                삭제
              </Button>
              <Button onClick={() => saveTrait(type, index)} size="sm">
                저장
              </Button>
            </div>
          </div>
        ) : (
          // 보기 모드
          <div className="flex items-start justify-between">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${type === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {trait.displayName || trait.traitName}
                </span>
                <span className="font-mono text-xs text-socratic-grey">
                  ({trait.traitId})
                </span>
              </div>
              <p className="mt-1 text-sm text-socratic-grey">
                {trait.displayText}
              </p>
              {trait.weightType && (
                <p className="mt-1 text-xs text-kairos-gold">
                  가중치: {trait.weightType}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => editTrait(type, index)}
                size="sm"
                variant="outline"
              >
                수정
              </Button>
              <Button
                onClick={() => removeTrait(type, index)}
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-100"
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl text-kairos-gold">
          시나리오 시스템 규칙
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ========== 스탯 관리 섹션 ========== */}
        <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-xl text-kairos-gold">
              시나리오 스탯 관리
              <span className="text-sm font-normal text-socratic-grey">
                ({scenario.scenarioStats?.length || 0}개)
              </span>
            </CardTitle>
            <p className="text-sm text-socratic-grey">
              게임에서 추적되는 수치 스탯을 관리합니다. (예: 도시 혼란도, 공동체 응집력)
            </p>
          </CardHeader>
          <CardContent className="mt-2 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {scenario.scenarioStats?.map((stat, index) => (
                <Card
                  key={stat.id || index}
                  className="overflow-hidden border-socratic-grey/30"
                >
                  <CardContent className="p-4">
                    {stat.isEditing ? (
                      // 편집 모드
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`stat-id-${index}`}>스탯 ID (영문)</Label>
                            <Input
                              id={`stat-id-${index}`}
                              value={stat.id}
                              onChange={(e) =>
                                updateStat(index, 'id', e.target.value.replace(/\s/g, ''))
                              }
                              placeholder="cityChaos"
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`stat-name-${index}`}>표시 이름 (한글)</Label>
                            <Input
                              id={`stat-name-${index}`}
                              value={stat.name}
                              onChange={(e) => updateStat(index, 'name', e.target.value)}
                              placeholder="도시 혼란도"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`stat-desc-${index}`}>설명</Label>
                          <Input
                            id={`stat-desc-${index}`}
                            value={stat.description}
                            onChange={(e) => updateStat(index, 'description', e.target.value)}
                            placeholder="도시의 무법 상태와 위협 수준."
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`stat-min-${index}`}>최소값</Label>
                            <Input
                              id={`stat-min-${index}`}
                              type="number"
                              value={stat.min}
                              onChange={(e) => updateStat(index, 'min', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`stat-max-${index}`}>최대값</Label>
                            <Input
                              id={`stat-max-${index}`}
                              type="number"
                              value={stat.max}
                              onChange={(e) => updateStat(index, 'max', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`stat-initial-${index}`}>초기값</Label>
                            <Input
                              id={`stat-initial-${index}`}
                              type="number"
                              value={stat.initialValue ?? stat.current}
                              onChange={(e) => updateStat(index, 'initialValue', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`stat-current-${index}`}>현재값</Label>
                            <Input
                              id={`stat-current-${index}`}
                              type="number"
                              value={stat.current}
                              onChange={(e) => updateStat(index, 'current', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => removeStat(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-100"
                          >
                            삭제
                          </Button>
                          <Button onClick={() => saveStat(index)} size="sm">
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 보기 모드
                      <div className="flex items-center justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-socratic-grey">
                              {stat.id}
                            </span>
                            <span className="font-semibold text-kairos-gold">
                              {stat.name}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-socratic-grey">
                            {stat.description}
                          </p>
                          <div className="mt-2 flex gap-4 text-xs text-socratic-grey">
                            <span>범위: {stat.min} ~ {stat.max}</span>
                            <span>초기값: {stat.initialValue ?? stat.current}</span>
                            <span>현재값: {stat.current}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => editStat(index)}
                            size="sm"
                            variant="outline"
                          >
                            수정
                          </Button>
                          <Button
                            onClick={() => removeStat(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-100"
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={addStat} className="w-full border-2 border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              스탯 추가
            </Button>
          </CardContent>
        </Card>

        {/* ========== 특성 풀 관리 섹션 ========== */}
        <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-xl text-kairos-gold">
              캐릭터 특성 풀 관리
              <span className="text-sm font-normal text-socratic-grey">
                (버프 {scenario.traitPool?.buffs?.length || 0}개, 디버프 {scenario.traitPool?.debuffs?.length || 0}개)
              </span>
            </CardTitle>
            <p className="text-sm text-socratic-grey">
              캐릭터에게 부여할 수 있는 버프/디버프 특성을 관리합니다. 캐스팅 보드에서 랜덤으로 배정됩니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 버프 (긍정적 특성) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-green-600">✨ 버프 (긍정적 특성)</span>
                <span className="text-sm text-socratic-grey">
                  ({scenario.traitPool?.buffs?.length || 0}개)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {scenario.traitPool?.buffs?.map((trait, index) =>
                  renderTraitCard(trait, index, 'positive')
                )}
              </div>
              <Button
                onClick={() => addTrait('positive')}
                className="w-full border-2 border-dashed border-green-300 bg-green-50/50 text-green-700 hover:bg-green-100"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                버프 특성 추가
              </Button>
            </div>

            {/* 디버프 (부정적 특성) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-red-600">💔 디버프 (부정적 특성)</span>
                <span className="text-sm text-socratic-grey">
                  ({scenario.traitPool?.debuffs?.length || 0}개)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {scenario.traitPool?.debuffs?.map((trait, index) =>
                  renderTraitCard(trait, index, 'negative')
                )}
              </div>
              <Button
                onClick={() => addTrait('negative')}
                className="w-full border-2 border-dashed border-red-300 bg-red-50/50 text-red-700 hover:bg-red-100"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                디버프 특성 추가
              </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
