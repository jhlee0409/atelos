'use client';

import { useState } from 'react';
import type { ScenarioData } from '@/types';
import BaseContent from '@/components/admin/ScenarioEditor/BaseContent';
import CharacterContent from '@/components/admin/ScenarioEditor/CharacterContent';
import SystemRulesContent from '@/components/admin/ScenarioEditor/SystemRulesContent';
import CoreStoryElementsContent from '@/components/admin/ScenarioEditor/CoreStoryElementsContent';
import StickySidebar from '@/components/admin/ScenarioEditor/StickySidebar';
import ScenarioHeader from '@/components/admin/ScenarioEditor/ScenarioHeader';
import { toast } from 'sonner';
import { STORAGE_KEY } from '@/constants/scenario';
import { validateScenario } from '@/lib/validations';
import { getScenarioData } from '@/mocks';
import GeminiTest from '@/components/ui/gemini-test';

export default function AtelosScenarioEditor() {
  const [scenario, setScenario] = useState<ScenarioData>(() => {
    const mockScenario = getScenarioData('ZERO_HOUR');
    if (!mockScenario) {
      throw new Error('ZERO_HOUR scenario not found');
    }
    return mockScenario;
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

          {/* Gemini API Test Section */}
          <div className="mb-8 flex justify-center">
            <GeminiTest />
          </div>

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
