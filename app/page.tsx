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
import {
  initialScenario,
  MAX_CORE_KEYWORDS,
  MIN_CORE_KEYWORDS,
  MIN_GENRE,
  STORAGE_KEY,
  VALIDATION_IDS,
} from '@/constants/scenario';
import { validateScenario } from '@/lib/validations';

export default function AtelosScenarioEditor() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    const savedScenario = localStorage.getItem(STORAGE_KEY);
    return savedScenario ? JSON.parse(savedScenario) : initialScenario;
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Save functions
  const handleTempSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
    toast.success('임시 저장되었습니다.');
  };

  const handleSaveAndActivate = () => {
    const validationErrors = validateScenario(scenario);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error(
        `다음 필수 항목을 입력해주세요:\n${validationErrors.join(', ')}`,
      );
      return;
    }

    const finalScenario = { ...scenario, status: '활성' as const };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalScenario));
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
