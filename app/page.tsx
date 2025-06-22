'use client';

import { useState } from 'react';

import type { ScenarioData } from '@/types';
import BaseContent from '@/pages/admin/ScenarioEditor/BaseContent';
import CharacterContent from '@/pages/admin/ScenarioEditor/CharacterContent';
import SystemRulesContent from '@/pages/admin/ScenarioEditor/SystemRulesContent';
import CoreStoryElementsContent from '@/pages/admin/ScenarioEditor/CoreStoryElementsContent';
import StickySidebar from '@/pages/admin/ScenarioEditor/StickySidebar';
import ScenarioHeader from '@/pages/admin/ScenarioEditor/ScenarioHeader';
import { toast } from 'sonner';

const initialScenario: ScenarioData = {
  scenarioId: '',
  title: '',
  genre: [],
  coreKeywords: [],
  posterImageUrl: '',
  synopsis: '',
  playerGoal: '',
  characters: [],
  initialRelationships: [],
  endCondition: { type: '시간제한' },
  scenarioStats: [],
  traitPool: { buffs: [], debuffs: [] },
  coreDilemmas: [],
  endingArchetypes: [],
  status: '작업 중',
};

export default function AtelosScenarioEditor() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    const savedScenario = localStorage.getItem('atelos_scenario');
    return savedScenario ? JSON.parse(savedScenario) : initialScenario;
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Validation function
  const validateScenario = (): string[] => {
    const errors: string[] = [];

    if (!scenario.scenarioId) errors.push('시나리오 ID');
    if (!scenario.title) errors.push('시나리오 제목');
    if (scenario.genre.length === 0) errors.push('장르');
    if (scenario.coreKeywords.length < 3) errors.push('핵심 키워드 (최소 3개)');
    if (!scenario.posterImageUrl) errors.push('시나리오 포스터 이미지');
    if (!scenario.synopsis) errors.push('시나리오 시놉시스');
    if (!scenario.playerGoal) errors.push('플레이어 목표');

    return errors;
  };

  // Save functions
  const handleTempSave = () => {
    localStorage.setItem(`atelos_scenario`, JSON.stringify(scenario));
    toast.success('임시 저장되었습니다.');
  };

  const handleSaveAndActivate = () => {
    const validationErrors = validateScenario();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error(
        `다음 필수 항목을 입력해주세요:\n${validationErrors.join(', ')}`,
      );
      return;
    }

    const finalScenario = { ...scenario, status: '활성' as const };
    localStorage.setItem(`atelos_scenario`, JSON.stringify(finalScenario));
    setScenario(finalScenario);
    setErrors([]);
    toast.success('시나리오가 저장되고 활성화되었습니다.');
  };

  return (
    <div className="min-h-screen bg-telos-black">
      <div className="flex">
        {/* Main Content */}
        <div className="mx-auto max-w-5xl flex-1 px-8 py-12">
          <ScenarioHeader />
          <div className="space-y-8">
            {/* Section 1: 시나리오 기본 정보 */}
            <BaseContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 2: 등장인물 및 관계 설정 */}
            <CharacterContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 3: 시나리오 시스템 규칙 */}
            <SystemRulesContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
            {/* Section 4: 핵심 서사 요소 */}
            <CoreStoryElementsContent
              scenario={scenario}
              setScenario={setScenario}
              errors={errors}
            />
          </div>
        </div>

        {/* Sticky Sidebar */}
        <StickySidebar
          scenario={scenario}
          setScenario={setScenario}
          handleSaveAndActivate={handleSaveAndActivate}
          handleTempSave={handleTempSave}
          errors={errors}
        />
      </div>
    </div>
  );
}
