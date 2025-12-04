'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScenarioWizard } from '@/components/admin/ScenarioWizard';
import { createScenario, createEmptyScenario } from '@/lib/scenario-api';
import type { ScenarioData } from '@/types';
import { toast } from 'sonner';

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

      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      onAuthenticated();
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 p-8 rounded-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold text-white">
            ADMIN
          </h1>
          <p className="text-sm text-zinc-400">
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
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-900 focus:outline-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full rounded-md bg-red-900 py-3 font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '확인 중...' : '접속'}
          </button>
        </form>
      </div>
    </div>
  );
}

function NewScenarioContent() {
  const router = useRouter();

  const handleWizardComplete = async (partialScenario: Partial<ScenarioData>) => {
    try {
      // Merge with empty scenario template
      const emptyScenario = createEmptyScenario();
      const newScenario: ScenarioData = {
        ...emptyScenario,
        ...partialScenario,
        status: 'in_progress',
      };

      // Create the scenario
      const result = await createScenario(newScenario);
      toast.success('시나리오가 생성되었습니다.');

      // Navigate to the detail page for further editing
      router.push(`/admin/${result.scenarioId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '시나리오 생성에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-telos-black dark">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">
                새 시나리오 만들기
              </h1>
              <p className="text-sm text-zinc-400">
                AI 위저드를 통해 시나리오를 생성합니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ScenarioWizard
          onComplete={handleWizardComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

export default function NewScenarioPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authStatus = sessionStorage.getItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(authStatus === 'true');
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <NewScenarioContent />;
}
