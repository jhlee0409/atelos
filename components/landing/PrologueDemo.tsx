'use client';

import React, { useState } from 'react';
import LandingButton from './LandingButton';

const PrologueDemo: React.FC = () => {
  const [item, setItem] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/prologue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item: item.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '프롤로그 생성에 실패했습니다.');
      }

      setResult(data.prologue);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="demo" className="relative overflow-hidden bg-black py-24">
      {/* Abstract Background Element */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-zinc-900 to-transparent opacity-30" />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className="mb-12">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-red-500">
            Interactive Demo
          </span>
          <h2 className="mb-6 font-serif text-4xl font-bold text-white md:text-5xl">
            시작의 조각 <span className="font-light text-zinc-600">Prologue</span>
          </h2>
          <p className="max-w-2xl text-zinc-400">
            당신은 붕괴된 도시의 한복판에서 눈을 떴습니다. <br />
            손에 쥐고 있는 단 하나의 물건이 당신의 운명을 결정할지도 모릅니다.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
          {/* Input Area */}
          <div className="border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <form onSubmit={handleGenerate} className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="item"
                  className="mb-2 block text-sm font-bold text-zinc-300"
                >
                  손에 쥔 물건을 입력하세요
                </label>
                <input
                  type="text"
                  id="item"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="예: 낡은 회중시계, 탄환이 빈 권총, 가족사진..."
                  className="w-full border border-zinc-700 bg-zinc-950 px-4 py-3 text-white transition-colors focus:border-red-800 focus:outline-none"
                  maxLength={30}
                />
              </div>
              <LandingButton
                type="submit"
                disabled={isLoading || !item.trim()}
                fullWidth
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    스토리 생성 중...
                  </span>
                ) : (
                  '이야기 시작하기'
                )}
              </LandingButton>
            </form>
          </div>

          {/* Output Area */}
          <div className="relative flex min-h-[250px] items-center">
            {error ? (
              <div className="w-full rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-red-400">
                {error}
              </div>
            ) : result ? (
              <div className="animate-fade-in">
                <div className="absolute -left-4 top-0 font-serif text-6xl text-zinc-800 opacity-50">
                  &ldquo;
                </div>
                <p className="border-l-2 border-red-900/50 pl-6 font-serif text-xl italic leading-relaxed text-zinc-200 md:text-2xl">
                  {result}
                </p>
                <div className="mt-6 flex gap-2 pl-6">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="font-mono text-xs text-red-500">
                    LIVE AI GENERATED
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 p-8 text-zinc-600">
                <svg
                  className="mb-4 h-12 w-12 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p className="text-center">
                  왼쪽에서 아이템을 입력하여
                  <br />
                  당신의 이야기를 확인하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrologueDemo;
