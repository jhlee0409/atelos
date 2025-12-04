'use client';

import { useState, useEffect } from 'react';
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

const ADMIN_AUTH_KEY = 'atelos_admin_auth';

function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '인증에 실패했습니다.');
        return;
      }

      // 인증 성공 - 세션 스토리지에 저장
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      onAuthenticated();
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-telos-black">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold text-white">
            ADMIN
          </h1>
          <p className="text-sm text-zinc-500">
            관리자 비밀번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-900 focus:outline-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-red-900 py-3 font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '확인 중...' : '접속'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ScenarioEditor() {
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

export default function AtelosScenarioEditor() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 세션 스토리지에서 인증 상태 확인
    const authStatus = sessionStorage.getItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // 초기 로딩 상태
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 화면
  if (!isAuthenticated) {
    return <AdminLogin onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // 인증된 경우 에디터 화면
  return <ScenarioEditor />;
}
