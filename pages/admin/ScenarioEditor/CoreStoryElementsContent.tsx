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
  // Dilemma management
  const addDilemma = () => {
    const newDilemma: Dilemma = {
      dilemmaId: '',
      title: '',
      description: '',
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: [...prev.coreDilemmas, newDilemma],
    }));
  };

  const saveDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, isEditing: false } : dilemma,
      ),
    }));
  };

  const editDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, isEditing: true } : dilemma,
      ),
    }));
  };

  const removeDilemma = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.filter((_, i) => i !== index),
    }));
  };

  const updateDilemma = (
    index: number,
    field: keyof Dilemma,
    value: string,
  ) => {
    setScenario((prev) => ({
      ...prev,
      coreDilemmas: prev.coreDilemmas.map((dilemma, i) =>
        i === index ? { ...dilemma, [field]: value } : dilemma,
      ),
    }));
  };

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
  return (
    <Card className="border-socratic-grey/20 bg-parchment-white shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl text-kairos-gold">
          핵심 서사 요소
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 핵심 딜레마 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-medium text-gray-800">핵심 딜레마</h4>
            <Button
              onClick={addDilemma}
              variant="outline"
              size="sm"
              className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
            >
              <Plus className="mr-2 h-4 w-4" />
              딜레마 추가
            </Button>
          </div>

          <div className="space-y-4">
            {scenario.coreDilemmas.map((dilemma, index) => (
              <Card
                key={index}
                className="relative border-socratic-grey/30 bg-white/50"
              >
                <button
                  onClick={() => removeDilemma(index)}
                  className="absolute right-3 top-3 text-socratic-grey hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardContent className="pt-6">
                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-800">
                        딜레마 ID
                      </label>
                      <Input
                        value={dilemma.dilemmaId}
                        onChange={(e) =>
                          updateDilemma(index, 'dilemmaId', e.target.value)
                        }
                        className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="HOSPITAL_SCREAM"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-800">
                        제목
                      </label>
                      <Input
                        value={dilemma.title}
                        onChange={(e) =>
                          updateDilemma(index, 'title', e.target.value)
                        }
                        className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                        placeholder="병원의 비명"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      설명
                    </label>
                    <Textarea
                      value={dilemma.description}
                      onChange={(e) =>
                        updateDilemma(index, 'description', e.target.value)
                      }
                      className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                      placeholder="딜레마 상황을 자세히 설명하세요"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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

          <div className="space-y-4">
            {scenario.endingArchetypes.map((ending, index) => (
              <Card
                key={index}
                className="relative border-socratic-grey/30 bg-white/50"
              >
                <button
                  onClick={() => removeEnding(index)}
                  className="absolute right-3 top-3 text-socratic-grey hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
                <CardContent className="pt-6">
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
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      설명
                    </label>
                    <Textarea
                      value={ending.description}
                      onChange={(e) =>
                        updateEnding(index, 'description', e.target.value)
                      }
                      className="border-socratic-grey bg-white focus:border-kairos-gold focus:ring-kairos-gold/20"
                      placeholder="엔딩 시나리오를 설명하세요"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-800">
                        시스템 조건
                      </label>
                      <Button
                        onClick={() => {
                          const newCondition: SystemCondition = {
                            type: '필수 스탯',
                          };
                          updateEnding(index, 'systemConditions', [
                            ...ending.systemConditions,
                            newCondition,
                          ]);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-kairos-gold text-kairos-gold hover:bg-kairos-gold hover:text-telos-black"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        조건 추가
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {ending.systemConditions.map((condition, condIndex) => (
                        <div
                          key={condIndex}
                          className="flex items-center gap-2 rounded bg-gray-50 p-3"
                        >
                          <Select
                            value={condition.type}
                            onValueChange={(
                              value: '필수 스탯' | '필수 플래그' | '생존자 수',
                            ) => {
                              const newConditions = [
                                ...ending.systemConditions,
                              ];
                              newConditions[condIndex] = {
                                type: value,
                              };
                              updateEnding(
                                index,
                                'systemConditions',
                                newConditions,
                              );
                            }}
                          >
                            <SelectTrigger className="w-32 border-socratic-grey bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="필수 스탯">
                                필수 스탯
                              </SelectItem>
                              <SelectItem value="필수 플래그">
                                필수 플래그
                              </SelectItem>
                              <SelectItem value="생존자 수">
                                생존자 수
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {condition.type === '필수 스탯' && (
                            <>
                              <Select
                                value={condition.statId || ''}
                                onValueChange={(value) => {
                                  const newConditions = [
                                    ...ending.systemConditions,
                                  ];
                                  newConditions[condIndex] = {
                                    ...condition,
                                    statId: value,
                                  };
                                  updateEnding(
                                    index,
                                    'systemConditions',
                                    newConditions,
                                  );
                                }}
                              >
                                <SelectTrigger className="w-32 border-socratic-grey bg-white">
                                  <SelectValue placeholder="스탯 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  {scenario.scenarioStats.map((stat) => (
                                    <SelectItem key={stat.id} value={stat.id}>
                                      {stat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={condition.comparison || '>='}
                                onValueChange={(value: '>=' | '<=' | '==') => {
                                  const newConditions = [
                                    ...ending.systemConditions,
                                  ];
                                  newConditions[condIndex] = {
                                    ...condition,
                                    comparison: value,
                                  };
                                  updateEnding(
                                    index,
                                    'systemConditions',
                                    newConditions,
                                  );
                                }}
                              >
                                <SelectTrigger className="w-20 border-socratic-grey bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=">=">{'>='}</SelectItem>
                                  <SelectItem value="<=">{`<=`}</SelectItem>
                                  <SelectItem value="==">==</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={condition.value || ''}
                                onChange={(e) => {
                                  const newConditions = [
                                    ...ending.systemConditions,
                                  ];
                                  newConditions[condIndex] = {
                                    ...condition,
                                    value: Number.parseInt(e.target.value),
                                  };
                                  updateEnding(
                                    index,
                                    'systemConditions',
                                    newConditions,
                                  );
                                }}
                                className="w-20 border-socratic-grey bg-white"
                                placeholder="값"
                              />
                            </>
                          )}

                          {condition.type === '필수 플래그' && (
                            <Input
                              value={condition.flagName || ''}
                              onChange={(e) => {
                                const newConditions = [
                                  ...ending.systemConditions,
                                ];
                                newConditions[condIndex] = {
                                  ...condition,
                                  flagName: e.target.value,
                                };
                                updateEnding(
                                  index,
                                  'systemConditions',
                                  newConditions,
                                );
                              }}
                              className="flex-1 border-socratic-grey bg-white"
                              placeholder="플래그 이름"
                            />
                          )}

                          {condition.type === '생존자 수' && (
                            <>
                              <Select
                                value={condition.comparison || '>='}
                                onValueChange={(value: '>=' | '<=' | '==') => {
                                  const newConditions = [
                                    ...ending.systemConditions,
                                  ];
                                  newConditions[condIndex] = {
                                    ...condition,
                                    comparison: value,
                                  };
                                  updateEnding(
                                    index,
                                    'systemConditions',
                                    newConditions,
                                  );
                                }}
                              >
                                <SelectTrigger className="w-20 border-socratic-grey bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=">=">{'>='}</SelectItem>
                                  <SelectItem value="<=">{`<=`}</SelectItem>
                                  <SelectItem value="==">==</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={condition.value || ''}
                                onChange={(e) => {
                                  const newConditions = [
                                    ...ending.systemConditions,
                                  ];
                                  newConditions[condIndex] = {
                                    ...condition,
                                    value: Number.parseInt(e.target.value),
                                  };
                                  updateEnding(
                                    index,
                                    'systemConditions',
                                    newConditions,
                                  );
                                }}
                                className="w-20 border-socratic-grey bg-white"
                                placeholder="수"
                              />
                            </>
                          )}

                          <button
                            onClick={() => {
                              const newConditions =
                                ending.systemConditions.filter(
                                  (_, i) => i !== condIndex,
                                );
                              updateEnding(
                                index,
                                'systemConditions',
                                newConditions,
                              );
                            }}
                            className="text-socratic-grey hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
