'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScenarioWizard } from '@/components/admin/ScenarioWizard';
import { createScenario, createEmptyScenario } from '@/lib/scenario-api';
import type { ScenarioData } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to admin page for login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
    return null;
  }

  return <NewScenarioContent />;
}
