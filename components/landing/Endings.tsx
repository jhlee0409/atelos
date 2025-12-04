'use client';

import React from 'react';

const Endings: React.FC = () => {
  const endingFactors = [
    {
      type: 'STATS',
      title: '스탯 조건',
      description: '시나리오마다 정의된 핵심 스탯들이 특정 수치에 도달하면 해당 엔딩 루트가 열립니다.',
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      type: 'FLAGS',
      title: '이벤트 플래그',
      description: '특정 선택이나 사건을 경험했는지 여부가 엔딩 조건으로 작용합니다.',
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
    },
    {
      type: 'RELATIONSHIPS',
      title: '관계 & 생존자',
      description: '캐릭터들과의 관계, 생존자 수 등 상황적 조건이 엔딩의 성격을 결정합니다.',
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgColor: 'bg-cyan-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="endings" className="relative border-t border-zinc-900 bg-zinc-950 py-24">
      {/* Background Accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-red-500">
            Multiple Paths
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-white md:text-4xl">
            ENDINGS
          </h2>
          <div className="mx-auto mb-6 h-1 w-20 bg-red-900" />
          <p className="mx-auto max-w-2xl text-zinc-400">
            시나리오마다 다양한 엔딩이 준비되어 있습니다.
            <br />세 가지 요소의 조합이 당신만의 결말을 결정합니다.
          </p>
        </div>

        {/* Ending Factors */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {endingFactors.map((factor, idx) => (
            <div
              key={idx}
              className={`group border ${factor.borderColor} ${factor.bgColor} p-8 transition-all duration-300 hover:bg-opacity-40`}
            >
              {/* Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className={factor.color}>{factor.icon}</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${factor.color}`}>
                  {factor.type}
                </span>
              </div>

              {/* Content */}
              <h3 className="mb-3 font-serif text-2xl font-bold text-zinc-100">
                {factor.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {factor.description}
              </p>

              {/* Divider */}
              <div className={`my-6 h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent`} />

              {/* Example */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>시나리오마다 다른 조건</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 border border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Branching Narrative
            </span>
          </div>
          <p className="text-zinc-400">
            같은 선택을 해도 캐릭터 특성, 현재 스탯, 누적된 플래그에 따라
            <br className="hidden md:inline" />
            <span className="text-zinc-200"> 전혀 다른 엔딩</span>으로 이어집니다.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Endings;
