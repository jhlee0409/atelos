'use client';

import {
  Dilemma,
  EndingArchetype,
  ScenarioData,
  SystemCondition,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SetStateAction } from 'react';
import { Badge } from '@/components/ui/badge';

const EndingConditionBuilder = ({
  conditions,
  onConditionsChange,
  scenarioStats,
  scenario,
}: {
  conditions: SystemCondition[];
  onConditionsChange: (newConditions: SystemCondition[]) => void;
  scenarioStats: ScenarioData['scenarioStats'];
  scenario: ScenarioData;
}) => {
  const addCondition = () => {
    const newCondition: SystemCondition = {
      type: '필수 스탯',
      statId: scenarioStats[0]?.id || '',
      comparison: '>=',
      value: 0,
      isEditing: true,
    };
    onConditionsChange([...conditions, newCondition]);
  };

  const updateCondition = (
    index: number,
    updatedCondition: SystemCondition,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = updatedCondition;
    onConditionsChange(newConditions);
  };

  const handleTypeChange = (index: number, type: SystemCondition['type']) => {
    let newCondition: SystemCondition;
    switch (type) {
      case '필수 플래그':
        newCondition = { type, flagName: '', isEditing: true };
        break;
      case '생존자 수':
        newCondition = { type, comparison: '==', value: 1, isEditing: true };
        break;
      case '필수 스탯':
      default:
        newCondition = {
          type: '필수 스탯',
          statId: scenarioStats[0]?.id || '',
          comparison: '>=',
          value: 0,
          isEditing: true,
        };
        break;
    }
    updateCondition(index, newCondition);
  };

  const removeCondition = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-md border border-socratic-grey/20 bg-gray-50/50 p-3">
      <h5 className="text-sm font-semibold text-gray-700">시스템 조건</h5>
      {conditions.map((condition, index) => (
        <div
          key={index}
          className="space-y-2 rounded-md border border-socratic-grey/20 bg-white p-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Select
              value={condition.type}
              onValueChange={(value: SystemCondition['type']) =>
                handleTypeChange(index, value)
              }
            >
              <SelectTrigger className="w-full border-socratic-grey/50 bg-white">
                <SelectValue placeholder="조건 유형" />
              </SelectTrigger>
              <SelectContent className="border-socratic-grey bg-parchment-white">
                <SelectItem value="필수 스탯">필수 스탯</SelectItem>
                <SelectItem value="필수 플래그">필수 플래그</SelectItem>
                <SelectItem value="생존자 수">생존자 수</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(index)}
              className="shrink-0 text-gray-400 hover:bg-red-100 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {condition.type === '필수 스탯' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select
                value={condition.statId}
                onValueChange={(statId) =>
                  updateCondition(index, { ...condition, statId })
                }
              >
                <SelectTrigger className="border-socratic-grey/50 bg-white">
                  <SelectValue placeholder="대상 스탯" />
                </SelectTrigger>
                <SelectContent className="border-socratic-grey bg-parchment-white">
                  {scenarioStats.map((stat) => (
                    <SelectItem key={stat.id} value={stat.id}>
                      {stat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={condition.comparison}
                onValueChange={(comparison) =>
                  updateCondition(index, {
                    ...condition,
                    comparison: comparison as '>=' | '<=' | '==',
                  })
                }
              >
                <SelectTrigger className="border-socratic-grey/50 bg-white">
                  <SelectValue placeholder="비교" />
                </SelectTrigger>
                <SelectContent className="border-socratic-grey bg-parchment-white">
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="==">==</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={condition.value}
                onChange={(e) =>
                  updateCondition(index, {
                    ...condition,
                    value: parseInt(e.target.value, 10),
                  })
                }
                className="border-socratic-grey/50"
              />
            </div>
          )}
          {condition.type === '필수 플래그' && (
            <Select
              value={condition.flagName}
              onValueChange={(flagName) =>
                updateCondition(index, { ...condition, flagName })
              }
            >
              <SelectTrigger className="border-socratic-grey/50 bg-white">
                <SelectValue placeholder="필수 플래그 선택" />
              </SelectTrigger>
              <SelectContent className="border-socratic-grey bg-parchment-white">
                {scenario.flagDictionary
                  .filter((flag) => flag.flagName)
                  .map((flag) => (
                    <SelectItem key={flag.flagName} value={flag.flagName}>
                      {flag.flagName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {condition.type === '생존자 수' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                value={condition.comparison}
                onValueChange={(comparison) =>
                  updateCondition(index, {
                    ...condition,
                    comparison: comparison as '>=' | '<=' | '==',
                  })
                }
              >
                <SelectTrigger className="border-socratic-grey/50 bg-white">
                  <SelectValue placeholder="비교" />
                </SelectTrigger>
                <SelectContent className="border-socratic-grey bg-parchment-white">
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                  <SelectItem value="==">==</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={condition.value}
                onChange={(e) =>
                  updateCondition(index, {
                    ...condition,
                    value: parseInt(e.target.value, 10),
                  })
                }
                className="border-socratic-grey/50"
              />
            </div>
          )}
        </div>
      ))}
      <Button
        onClick={addCondition}
        variant="outline"
        className="mt-2 w-full border-2 border-dashed border-socratic-grey/30 bg-transparent text-socratic-grey shadow-none transition-all hover:border-kairos-gold/50 hover:bg-kairos-gold/10 hover:text-kairos-gold"
      >
        <Plus className="mr-2 h-4 w-4" />
        조건 추가
      </Button>
    </div>
  );
};

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
};

export default function CoreStoryElementsContent({
  scenario,
  setScenario,
  errors,
}: Props) {
  // Ending management
  const addEnding = () => {
    const newEnding: EndingArchetype = {
      endingId: '',
      title: '',
      description: '',
      systemConditions: [],
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: [...prev.endingArchetypes, newEnding],
    }));
  };

  const saveEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, isEditing: false } : ending,
      ),
    }));
  };

  const editEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, isEditing: true } : ending,
      ),
    }));
  };

  const removeEnding = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.filter((_, i) => i !== index),
    }));
  };

  const updateEnding = (
    index: number,
    field: keyof EndingArchetype,
    value: any,
  ) => {
    setScenario((prev) => ({
      ...prev,
      endingArchetypes: prev.endingArchetypes.map((ending, i) =>
        i === index ? { ...ending, [field]: value } : ending,
      ),
    }));
  };

  const updateEndingConditions = (
    endingIndex: number,
    newConditions: SystemCondition[],
  ) => {
    updateEnding(endingIndex, 'systemConditions', newConditions);
  };

  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl text-kairos-gold">
          핵심 서사 요소
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 엔딩 원형 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-medium text-gray-800">엔딩 원형</h4>
            <Button
              onClick={addEnding}
              variant="outline"
              size="sm"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            >
              <Plus className="mr-2 h-4 w-4" />
              엔딩 추가
            </Button>
          </div>

          {scenario.endingArchetypes.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                엔딩 원형이 없습니다
              </h3>
              <p className="mb-4 text-sm text-socratic-grey">
                시나리오의 다양한 엔딩 원형을 추가해보세요.
              </p>
              <Button
                onClick={addEnding}
                className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
              >
                <Plus className="mr-2 h-4 w-4" />첫 번째 엔딩 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scenario.endingArchetypes.map((ending, index) => (
                <Card
                  key={index}
                  className={`${ending.isEditing ? 'border-kairos-gold/50 bg-white/50' : 'border-socratic-grey/30 bg-gray-50/50'} relative`}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {ending.isEditing ? (
                      <>
                        <Button
                          onClick={() => saveEnding(index)}
                          size="sm"
                          className="bg-kairos-gold text-telos-black hover:bg-kairos-gold/90"
                        >
                          저장
                        </Button>
                        <button
                          onClick={() => removeEnding(index)}
                          className="text-socratic-grey hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Badge className="border-green-300 bg-green-100 text-green-800">
                          추가됨
                        </Badge>
                        <Button
                          onClick={() => editEnding(index)}
                          size="sm"
                          variant="outline"
                          className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                        >
                          수정
                        </Button>
                        <button
                          onClick={() => removeEnding(index)}
                          className="text-socratic-grey hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <CardContent className="pt-12">
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          엔딩 ID
                        </label>
                        <Input
                          value={ending.endingId}
                          onChange={(e) =>
                            updateEnding(index, 'endingId', e.target.value)
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          placeholder="A_CITY_ESCAPE"
                          disabled={!ending.isEditing}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-800">
                          제목
                        </label>
                        <Input
                          value={ending.title}
                          onChange={(e) =>
                            updateEnding(index, 'title', e.target.value)
                          }
                          className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                          placeholder="시티 이스케이프"
                          disabled={!ending.isEditing}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-800">
                        설명
                      </label>
                      <Textarea
                        value={ending.description}
                        onChange={(e) =>
                          updateEnding(index, 'description', e.target.value)
                        }
                        className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="군대가 도착하기 직전, 혼란의 도시를 성공적으로 탈출한다."
                        disabled={!ending.isEditing}
                      />
                    </div>
                    {/* System Conditions Builder */}
                    <EndingConditionBuilder
                      conditions={ending.systemConditions}
                      onConditionsChange={(newConditions) =>
                        updateEndingConditions(index, newConditions)
                      }
                      scenarioStats={scenario.scenarioStats}
                      scenario={scenario}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
