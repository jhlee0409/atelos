'use client';

import { SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScenarioData, ScenarioStat, Trait } from '@/types';
import { Dilemma } from '@/types';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
};

export default function SystemRulesContent({
  scenario,
  setScenario,
  errors,
}: Props) {
  // Stat management
  const addStat = () => {
    const newStat: ScenarioStat = {
      id: '',
      name: '',
      description: '',
      initialValue: 0,
      range: [0, 100],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      scenarioStats: [...prev.scenarioStats, newStat],
    }));
  };

  const saveStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, isEditing: false } : stat,
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

  const removeStat = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.filter((_, i) => i !== index),
    }));
  };

  const updateStat = (index: number, field: keyof ScenarioStat, value: any) => {
    setScenario((prev) => ({
      ...prev,
      scenarioStats: prev.scenarioStats.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat,
      ),
    }));
  };

  // Trait management
  const addTrait = (type: 'buffs' | 'debuffs') => {
    const newTrait: Trait = {
      traitId: '',
      traitName: '',
      type: type === 'buffs' ? '긍정' : '부정',
      weightType: '',
      description: '',
      iconUrl: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: [...prev.traitPool[type], newTrait],
      },
    }));
  };

  const saveTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, isEditing: false } : trait,
        ),
      },
    }));
  };

  const editTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, isEditing: true } : trait,
        ),
      },
    }));
  };

  const removeTrait = (type: 'buffs' | 'debuffs', index: number) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].filter((_, i) => i !== index),
      },
    }));
  };

  const updateTrait = (
    type: 'buffs' | 'debuffs',
    index: number,
    field: keyof Trait,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      traitPool: {
        ...prev.traitPool,
        [type]: prev.traitPool[type].map((trait, i) =>
          i === index ? { ...trait, [field]: value } : trait,
        ),
      },
    }));
  };

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl text-kairos-gold">
          시나리오 시스템 규칙
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 종료 조건 - Enhanced Interactive Component */}
        <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-xl text-kairos-gold">
              종료 조건
              <div className="h-2 w-2 rounded-full bg-kairos-gold"></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-800">
                유형 선택
              </label>
              <Select
                value={scenario.endCondition.type}
                onValueChange={(
                  value: '시간제한' | '목표 달성' | '조건 충족',
                ) =>
                  setScenario((prev) => ({
                    ...prev,
                    endCondition: { type: value },
                  }))
                }
              >
                <SelectTrigger className="border-socratic-grey bg-parchment-white shadow-sm transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                  <SelectValue placeholder="종료 조건 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="border-socratic-grey bg-parchment-white">
                  <SelectItem
                    value="시간제한"
                    className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      시간제한
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="목표 달성"
                    className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      목표 달성
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="조건 충족"
                    className="hover:bg-kairos-gold/10 focus:bg-kairos-gold/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                      조건 충족
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional UI Area with smooth transitions */}
            <div className="min-h-[120px] transition-all duration-300 ease-in-out">
              {scenario.endCondition.type === '시간제한' && (
                <div className="duration-300 animate-in fade-in-50">
                  <div className="mb-4 rounded-lg border border-blue-200/50 bg-blue-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-blue-800">
                        시간 기반 종료 조건
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      지정된 시간이 경과하면 시나리오가 자동으로 종료됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        제한 시간
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={scenario.endCondition.value || ''}
                        onChange={(e) =>
                          setScenario((prev) => ({
                            ...prev,
                            endCondition: {
                              ...prev.endCondition,
                              value: Number.parseInt(e.target.value),
                            },
                          }))
                        }
                        className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20"
                        placeholder="예: 7"
                      />
                      <p className="text-xs text-socratic-grey">
                        최소 1 이상의 값을 입력하세요
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        단위
                      </label>
                      <Select
                        value={scenario.endCondition.unit || '일'}
                        onValueChange={(value: '일' | '시간') =>
                          setScenario((prev) => ({
                            ...prev,
                            endCondition: {
                              ...prev.endCondition,
                              unit: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-socratic-grey bg-parchment-white">
                          <SelectItem
                            value="일"
                            className="hover:bg-kairos-gold/10"
                          >
                            일(Days)
                          </SelectItem>
                          <SelectItem
                            value="시간"
                            className="hover:bg-kairos-gold/10"
                          >
                            시간(Hours)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-socratic-grey">
                        시간 단위를 선택하세요
                      </p>
                    </div>
                  </div>

                  {scenario.endCondition.value &&
                    scenario.endCondition.unit && (
                      <div className="mt-4 rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">설정된 조건:</span>{' '}
                          {scenario.endCondition.value}
                          {scenario.endCondition.unit === '일'
                            ? '일'
                            : '시간'}{' '}
                          후 시나리오 종료
                        </p>
                      </div>
                    )}
                </div>
              )}

              {scenario.endCondition.type === '목표 달성' && (
                <div className="duration-300 animate-in fade-in-50">
                  <div className="mb-4 rounded-lg border border-green-200/50 bg-green-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-800">
                        목표 기반 종료 조건
                      </span>
                    </div>
                    <p className="text-xs text-green-700">
                      특정 스탯이 목표 수치에 도달하면 시나리오가 종료됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        목표 스탯 ID
                      </label>
                      <Select
                        value={scenario.endCondition.statId || ''}
                        onValueChange={(value) =>
                          setScenario((prev) => ({
                            ...prev,
                            endCondition: {
                              ...prev.endCondition,
                              statId: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20">
                          <SelectValue placeholder="스탯을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent className="border-socratic-grey bg-parchment-white">
                          {scenario.scenarioStats.length > 0 ? (
                            scenario.scenarioStats.map((stat) => (
                              <SelectItem
                                key={stat.id}
                                value={stat.id}
                                className="hover:bg-kairos-gold/10"
                              >
                                <div className="flex w-full items-center justify-between">
                                  <span>{stat.name}</span>
                                  <span className="text-xs text-socratic-grey">
                                    ({stat.id})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-3 text-center text-sm text-socratic-grey">
                              먼저 시나리오 전용 스탯을 생성해주세요
                            </div>
                          )}
                        </SelectContent>
                        <p className="text-xs text-socratic-grey">
                          {scenario.scenarioStats.length > 0
                            ? '시나리오 전용 스탯 중에서 목표로 할 스탯을 선택하세요'
                            : "아래 '시나리오 전용 스탯' 섹션에서 스탯을 먼저 생성해주세요"}
                        </p>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        목표 수치
                      </label>
                      <Input
                        type="number"
                        value={scenario.endCondition.value || ''}
                        onChange={(e) =>
                          setScenario((prev) => ({
                            ...prev,
                            endCondition: {
                              ...prev.endCondition,
                              value: Number.parseInt(e.target.value),
                            },
                          }))
                        }
                        className="border-socratic-grey bg-parchment-white transition-all duration-200 hover:border-kairos-gold focus:border-kairos-gold focus:ring-2 focus:ring-kairos-gold/20"
                        placeholder="예: 80"
                      />
                      <p className="text-xs text-socratic-grey">
                        달성해야 할 목표 수치를 입력하세요
                      </p>
                    </div>
                  </div>

                  {scenario.endCondition.statId &&
                    scenario.endCondition.value && (
                      <div className="mt-4 rounded-lg border border-kairos-gold/30 bg-kairos-gold/10 p-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">설정된 조건:</span>{' '}
                          {scenario.endCondition.statId} 스탯이{' '}
                          {scenario.endCondition.value}에 도달하면 시나리오 종료
                        </p>
                      </div>
                    )}
                </div>
              )}

              {scenario.endCondition.type === '조건 충족' && (
                <div className="duration-300 animate-in fade-in-50">
                  <div className="rounded-lg border border-purple-200/50 bg-purple-50/50 p-6 text-center">
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium text-purple-800">
                        조건 기반 종료
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-socratic-grey">
                      엔딩 원형의 조건에 따라 종료됩니다.
                    </p>
                    <p className="mt-2 text-xs text-socratic-grey">
                      구체적인 종료 조건은 "핵심 서사 요소" 섹션의 엔딩 원형에서
                      설정됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 시나리오 전용 스탯 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-medium text-gray-800">시나리오 전용 스탯</h4>
            <Button
              onClick={addStat}
              variant="outline"
              size="sm"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            >
              <Plus className="mr-2 h-4 w-4" />
              스탯 추가
            </Button>
          </div>

          {scenario.scenarioStats.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                시나리오 스탯이 없습니다
              </h3>
              <p className="mb-4 text-sm text-socratic-grey">
                시나리오에서 사용할 전용 스탯을 추가해보세요.
              </p>
              <Button
                onClick={addStat}
                className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
              >
                <Plus className="mr-2 h-4 w-4" />첫 번째 스탯 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scenario.scenarioStats.map((stat, index) => (
                <Card
                  key={index}
                  className={`${stat.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                >
                  {stat.isEditing ? (
                    <div className="absolute right-3 top-3 flex gap-2">
                      <Button
                        onClick={() => saveStat(index)}
                        size="sm"
                        className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                      >
                        저장
                      </Button>
                      <button
                        onClick={() => removeStat(index)}
                        className="text-socratic-grey hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-3 top-3 flex gap-2">
                      <Badge className="mr-2 border-green-300 bg-green-100 text-green-800">
                        추가됨
                      </Badge>
                      <Button
                        onClick={() => editStat(index)}
                        size="sm"
                        variant="outline"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                      >
                        수정
                      </Button>
                      <button
                        onClick={() => removeStat(index)}
                        className="text-socratic-grey hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <CardContent className="pt-6">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          스탯 ID <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={stat.id}
                          onChange={(e) =>
                            updateStat(index, 'id', e.target.value)
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          placeholder="cityChaos"
                          disabled={!stat.isEditing}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          스탯 이름 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={stat.name}
                          onChange={(e) =>
                            updateStat(index, 'name', e.target.value)
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          placeholder="도시 혼란도"
                          disabled={!stat.isEditing}
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-800">
                        설명
                      </label>
                      <Textarea
                        value={stat.description}
                        onChange={(e) =>
                          updateStat(index, 'description', e.target.value)
                        }
                        className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="스탯에 대한 설명을 입력하세요"
                        maxLength={200}
                        rows={2}
                        disabled={!stat.isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          초기값 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={stat.initialValue}
                          onChange={(e) =>
                            updateStat(
                              index,
                              'initialValue',
                              Number.parseInt(e.target.value),
                            )
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          disabled={!stat.isEditing}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          최소값 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={stat.range[0]}
                          onChange={(e) =>
                            updateStat(index, 'range', [
                              Number.parseInt(e.target.value),
                              stat.range[1],
                            ])
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          disabled={!stat.isEditing}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          최대값 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={stat.range[1]}
                          onChange={(e) =>
                            updateStat(index, 'range', [
                              stat.range[0],
                              Number.parseInt(e.target.value),
                            ])
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          disabled={!stat.isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 시나리오 전용 특성 풀 */}
        <div>
          <h4 className="mb-4 font-medium text-gray-800">
            시나리오 전용 특성 풀
          </h4>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 긍정 특성 */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700">
                  긍정 특성 (BUFF)
                </h5>
                <Button
                  onClick={() => addTrait('buffs')}
                  variant="outline"
                  size="sm"
                  className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>

              {scenario.traitPool.buffs.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-green-200 bg-green-50/50 py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Plus className="h-6 w-6 text-green-400" />
                  </div>
                  <h4 className="text-md mb-2 font-medium text-gray-800">
                    긍정 특성이 없습니다
                  </h4>
                  <p className="mb-3 text-sm text-socratic-grey">
                    BUFF 효과를 주는 긍정 특성을 추가해보세요.
                  </p>
                  <Button
                    onClick={() => addTrait('buffs')}
                    size="sm"
                    className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    긍정 특성 추가
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scenario.traitPool.buffs.map((trait, index) => (
                    <Card
                      key={index}
                      className={`${trait.isEditing ? 'border-kairos-gold/50 bg-green-50' : 'border-green-200 bg-green-50/50'} relative`}
                    >
                      {trait.isEditing ? (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Button
                            onClick={() => saveTrait('buffs', index)}
                            size="sm"
                            className="bg-kairos-gold px-2 py-1 text-xs text-telos-black hover:bg-kairos-gold/90"
                          >
                            저장
                          </Button>
                          <button
                            onClick={() => removeTrait('buffs', index)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Badge className="border-green-300 bg-green-100 text-xs text-green-800">
                            추가됨
                          </Badge>
                          <Button
                            onClick={() => editTrait('buffs', index)}
                            size="sm"
                            variant="outline"
                            className="border-kairos-gold px-2 py-1 text-xs text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                          >
                            수정
                          </Button>
                          <button
                            onClick={() => removeTrait('buffs', index)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <CardContent className="pb-3 pt-4">
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-800">
                              특성 ID <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={trait.traitId}
                              onChange={(e) =>
                                updateTrait(
                                  'buffs',
                                  index,
                                  'traitId',
                                  e.target.value.toUpperCase(),
                                )
                              }
                              className="border-socratic-grey bg-white text-xs"
                              placeholder="LEADERSHIP"
                              disabled={!trait.isEditing}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-800">
                              특성 이름 <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={trait.traitName}
                              onChange={(e) =>
                                updateTrait(
                                  'buffs',
                                  index,
                                  'traitName',
                                  e.target.value,
                                )
                              }
                              className="border-socratic-grey bg-white text-xs"
                              placeholder="리더십"
                              disabled={!trait.isEditing}
                            />
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            가중치 유형 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={trait.weightType}
                            onChange={(e) =>
                              updateTrait(
                                'buffs',
                                index,
                                'weightType',
                                e.target.value,
                              )
                            }
                            className="border-socratic-grey bg-white text-xs"
                            placeholder="리더십, 통제, 이타심"
                            disabled={!trait.isEditing}
                          />
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            아이콘 URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={trait.iconUrl}
                              onChange={(e) =>
                                updateTrait(
                                  'buffs',
                                  index,
                                  'iconUrl',
                                  e.target.value,
                                )
                              }
                              className="flex-1 border-socratic-grey bg-white text-xs"
                              placeholder="아이콘 URL"
                              disabled={!trait.isEditing}
                            />
                            {trait.isEditing && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-kairos-gold px-2 text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      updateTrait(
                                        'buffs',
                                        index,
                                        'iconUrl',
                                        url,
                                      );
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                파일
                              </Button>
                            )}
                          </div>
                        </div>
                        {trait.iconUrl && (
                          <img
                            src={trait.iconUrl || '/placeholder.svg'}
                            alt="특성 아이콘"
                            className="mb-2 h-8 w-8 rounded border object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            설명
                          </label>
                          <Textarea
                            value={trait.description}
                            onChange={(e) =>
                              updateTrait(
                                'buffs',
                                index,
                                'description',
                                e.target.value,
                              )
                            }
                            className="border-socratic-grey bg-white text-xs"
                            placeholder="특성 설명"
                            rows={2}
                            maxLength={200}
                            disabled={!trait.isEditing}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 부정 특성 */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700">
                  부정 특성 (DEBUFF)
                </h5>
                <Button
                  onClick={() => addTrait('debuffs')}
                  variant="outline"
                  size="sm"
                  className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>

              {scenario.traitPool.debuffs.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Plus className="h-6 w-6 text-red-400" />
                  </div>
                  <h4 className="text-md mb-2 font-medium text-gray-800">
                    부정 특성이 없습니다
                  </h4>
                  <p className="mb-3 text-sm text-socratic-grey">
                    DEBUFF 효과를 주는 부정 특성을 추가해보세요.
                  </p>
                  <Button
                    onClick={() => addTrait('debuffs')}
                    size="sm"
                    className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    부정 특성 추가
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scenario.traitPool.debuffs.map((trait, index) => (
                    <Card
                      key={index}
                      className={`${trait.isEditing ? 'border-kairos-gold/50 bg-red-50' : 'border-red-200 bg-red-50/50'} relative`}
                    >
                      {trait.isEditing ? (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Button
                            onClick={() => saveTrait('debuffs', index)}
                            size="sm"
                            className="bg-kairos-gold px-2 py-1 text-xs text-telos-black hover:bg-kairos-gold/90"
                          >
                            저장
                          </Button>
                          <button
                            onClick={() => removeTrait('debuffs', index)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Badge className="border-green-300 bg-green-100 text-xs text-green-800">
                            추가됨
                          </Badge>
                          <Button
                            onClick={() => editTrait('debuffs', index)}
                            size="sm"
                            variant="outline"
                            className="border-kairos-gold px-2 py-1 text-xs text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                          >
                            수정
                          </Button>
                          <button
                            onClick={() => removeTrait('debuffs', index)}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <CardContent className="pb-3 pt-4">
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-800">
                              특성 ID <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={trait.traitId}
                              onChange={(e) =>
                                updateTrait(
                                  'debuffs',
                                  index,
                                  'traitId',
                                  e.target.value.toUpperCase(),
                                )
                              }
                              className="border-socratic-grey bg-white text-xs"
                              placeholder="CYNICISM"
                              disabled={!trait.isEditing}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-800">
                              특성 이름 <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={trait.traitName}
                              onChange={(e) =>
                                updateTrait(
                                  'debuffs',
                                  index,
                                  'traitName',
                                  e.target.value,
                                )
                              }
                              className="border-socratic-grey bg-white text-xs"
                              placeholder="냉소주의"
                              disabled={!trait.isEditing}
                            />
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            가중치 유형 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={trait.weightType}
                            onChange={(e) =>
                              updateTrait(
                                'debuffs',
                                index,
                                'weightType',
                                e.target.value,
                              )
                            }
                            className="border-socratic-grey bg-white text-xs"
                            placeholder="불신, 이기심"
                            disabled={!trait.isEditing}
                          />
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            아이콘 URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={trait.iconUrl}
                              onChange={(e) =>
                                updateTrait(
                                  'debuffs',
                                  index,
                                  'iconUrl',
                                  e.target.value,
                                )
                              }
                              className="flex-1 border-socratic-grey bg-white text-xs"
                              placeholder="아이콘 URL"
                              disabled={!trait.isEditing}
                            />
                            {trait.isEditing && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-kairos-gold px-2 text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      updateTrait(
                                        'debuffs',
                                        index,
                                        'iconUrl',
                                        url,
                                      );
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                파일
                              </Button>
                            )}
                          </div>
                        </div>
                        {trait.iconUrl && (
                          <img
                            src={trait.iconUrl || '/placeholder.svg'}
                            alt="특성 아이콘"
                            className="mb-2 h-8 w-8 rounded border object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-800">
                            설명
                          </label>
                          <Textarea
                            value={trait.description}
                            onChange={(e) =>
                              updateTrait(
                                'debuffs',
                                index,
                                'description',
                                e.target.value,
                              )
                            }
                            className="border-socratic-grey bg-white text-xs"
                            placeholder="특성 설명"
                            rows={2}
                            maxLength={200}
                            disabled={!trait.isEditing}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
