'use client';

import { SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScenarioData, ScenarioFlag, ScenarioStat } from '@/types';

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

  // ========== 플래그 관리 함수들 ==========
  const addFlag = () => {
    const newFlag: ScenarioFlag = {
      flagName: `NEW_FLAG_${Date.now()}`,
      description: '',
      type: 'boolean',
      initial: false,
      isEditing: true,
    };
    setScenario((prev) => ({
      ...prev,
      flagDictionary: [...prev.flagDictionary, newFlag],
    }));
  };

  const updateFlag = (
    index: number,
    field: keyof ScenarioFlag,
    value: string | boolean,
  ) => {
    setScenario((prev) => ({
      ...prev,
      flagDictionary: prev.flagDictionary.map((flag, i) =>
        i === index ? { ...flag, [field]: value } : flag,
      ),
    }));
  };

  const removeFlag = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      flagDictionary: prev.flagDictionary.filter((_, i) => i !== index),
    }));
  };

  const saveFlag = (index: number) => {
    if (
      !scenario.flagDictionary[index].flagName.trim() ||
      scenario.flagDictionary[index].flagName.startsWith('NEW_FLAG_')
    ) {
      alert('유효한 플래그 이름을 입력해주세요.');
      return;
    }
    setScenario((prev) => ({
      ...prev,
      flagDictionary: prev.flagDictionary.map((flag, i) =>
        i === index ? { ...flag, isEditing: false } : flag,
      ),
    }));
  };

  const editFlag = (index: number) => {
    setScenario((prev) => ({
      ...prev,
      flagDictionary: prev.flagDictionary.map((flag, i) =>
        i === index ? { ...flag, isEditing: true } : flag,
      ),
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

        {/* ========== 플래그 관리 섹션 ========== */}
        <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-xl text-kairos-gold">
              시나리오 플래그 관리
              <span className="text-sm font-normal text-socratic-grey">
                ({scenario.flagDictionary?.length || 0}개)
              </span>
            </CardTitle>
            <p className="text-sm text-socratic-grey">
              게임 이벤트를 추적하는 플래그를 관리합니다. (예: FLAG_ESCAPE_VEHICLE_SECURED)
            </p>
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {scenario.flagDictionary.map((flag, index) => (
                <Card
                  key={index}
                  className="overflow-hidden border-socratic-grey/30"
                >
                  <CardContent className="p-4">
                    {flag.isEditing ? (
                      // 편집 모드
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor={`flag-name-${index}`}>플래그 이름</Label>
                            <Input
                              id={`flag-name-${index}`}
                              value={flag.flagName}
                              onChange={(e) =>
                                updateFlag(
                                  index,
                                  'flagName',
                                  e.target.value.toUpperCase().replace(/\s/g, '_'),
                                )
                              }
                              placeholder="FLAG_ESCAPE_VEHICLE_SECURED"
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`flag-type-${index}`}>타입</Label>
                            <select
                              id={`flag-type-${index}`}
                              value={flag.type}
                              onChange={(e) =>
                                updateFlag(index, 'type', e.target.value)
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="boolean">Boolean (true/false)</option>
                              <option value="count">Count (숫자)</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`flag-desc-${index}`}>관리자용 설명</Label>
                          <Input
                            id={`flag-desc-${index}`}
                            value={flag.description}
                            onChange={(e) =>
                              updateFlag(index, 'description', e.target.value)
                            }
                            placeholder="탈출 수단을 확보했다. 트럭, 버스, 또는 다른 교통수단을 통해 도시를 떠날 준비가 완료되었다."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`flag-trigger-${index}`}>
                            AI 부여 조건
                            <span className="ml-2 text-xs text-socratic-grey">
                              (AI가 언제 이 플래그를 부여해야 하는지)
                            </span>
                          </Label>
                          <Input
                            id={`flag-trigger-${index}`}
                            value={flag.triggerCondition || ''}
                            onChange={(e) =>
                              updateFlag(index, 'triggerCondition', e.target.value)
                            }
                            placeholder="예: 탈출 차량 확보 선택 시, 동맹 협상 성공 시"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => removeFlag(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-100"
                          >
                            삭제
                          </Button>
                          <Button onClick={() => saveFlag(index)} size="sm">
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 보기 모드
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{flag.flagName}</span>
                            <span className="rounded bg-socratic-grey/20 px-2 py-0.5 text-xs">
                              {flag.type}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-socratic-grey">
                            {flag.description}
                          </p>
                          {flag.triggerCondition && (
                            <p className="mt-1 text-xs text-kairos-gold">
                              🎯 부여 조건: {flag.triggerCondition}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => editFlag(index)}
                            size="sm"
                            variant="outline"
                          >
                            수정
                          </Button>
                          <Button
                            onClick={() => removeFlag(index)}
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
            <Button onClick={addFlag} className="w-full border-2 border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              플래그 추가
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
