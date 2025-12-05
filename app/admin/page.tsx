'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ScenarioListPage from '@/components/admin/ScenarioListPage';

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || '인증에 실패했습니다.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 p-8 rounded-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold text-white">
            ADMIN
          </h1>
          <p className="text-sm text-zinc-400">
            관리자 계정으로 로그인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-900 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-900 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full rounded-md bg-red-900 py-3 font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-telos-black dark">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <ScenarioListPage onLogout={logout} userEmail={user?.email} />;
}
