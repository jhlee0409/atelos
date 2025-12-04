'use client';

import { useState, useEffect } from 'react';
import ScenarioListPage from '@/components/admin/ScenarioListPage';

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

export default function AdminPage() {
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

  return <ScenarioListPage />;
}
