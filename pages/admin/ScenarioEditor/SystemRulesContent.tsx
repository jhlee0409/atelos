'use client';

import { SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScenarioData, ScenarioFlag } from '@/types';

type Props = {
  scenario: ScenarioData;
  setScenario: (value: SetStateAction<ScenarioData>) => void;
  errors: string[];
};

export default function SystemRulesContent({ scenario, setScenario }: Props) {
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
        <Card className="border-kairos-gold/30 bg-white/70 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-sans text-xl text-kairos-gold">
              시나리오 플래그 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {scenario.flagDictionary.map((flag, index) => (
                <Card
                  key={index}
                  className="overflow-hidden border-socratic-grey/30"
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-grow space-y-2">
                      <Input
                        value={flag.flagName}
                        onChange={(e) =>
                          updateFlag(
                            index,
                            'flagName',
                            e.target.value.toUpperCase(),
                          )
                        }
                        placeholder="플래그 이름 (예: FLAG_...)"
                        disabled={!flag.isEditing}
                        className="font-mono"
                      />
                      <Input
                        value={flag.description}
                        onChange={(e) =>
                          updateFlag(index, 'description', e.target.value)
                        }
                        placeholder="관리자용 설명"
                        disabled={!flag.isEditing}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {flag.isEditing ? (
                        <Button onClick={() => saveFlag(index)} size="sm">
                          저장
                        </Button>
                      ) : (
                        <Button
                          onClick={() => editFlag(index)}
                          size="sm"
                          variant="outline"
                        >
                          수정
                        </Button>
                      )}
                      <Button
                        onClick={() => removeFlag(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-100"
                      >
                        삭제
                      </Button>
                    </div>
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
