'use client';

import React from 'react';

const Endings: React.FC = () => {
  const endingCategories = [
    {
      type: 'ESCAPE',
      title: '탈출 루트',
      description: '무너진 도시를 뒤로하고 새로운 희망을 향해 떠나는 결말',
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
    },
    {
      type: 'DEFENSE',
      title: '항전 루트',
      description: '최후까지 도시를 지키며 생존자들의 보루가 되는 결말',
      color: 'text-red-400',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      type: 'NEGOTIATE',
      title: '협상 루트',
      description: '적과 동맹을 맺고 공존의 길을 모색하는 결말',
      color: 'text-green-400',
      borderColor: 'border-green-500/30',
      bgColor: 'bg-green-950/20',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
            당신의 선택이 만들어가는 세 가지 운명의 갈래길.
            <br />각 루트마다 다양한 세부 엔딩이 기다립니다.
          </p>
        </div>

        {/* Ending Routes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {endingCategories.map((ending, idx) => (
            <div
              key={idx}
              className={`group border ${ending.borderColor} ${ending.bgColor} p-8 transition-all duration-300 hover:bg-opacity-40`}
            >
              {/* Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className={ending.color}>{ending.icon}</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${ending.color}`}>
                  {ending.type}
                </span>
              </div>

              {/* Content */}
              <h3 className="mb-3 font-serif text-2xl font-bold text-zinc-100">
                {ending.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {ending.description}
              </p>

              {/* Divider */}
              <div className={`my-6 h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent`} />

              {/* Hint */}
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>직접 플레이하여 발견하세요</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 border border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Dynamic Narrative System
            </span>
          </div>
          <p className="text-zinc-400">
            같은 선택을 해도 캐릭터의 특성, 자원 상태, 이전 결정에 따라
            <br className="hidden md:inline" />
            <span className="text-zinc-200"> 전혀 다른 결과</span>가 펼쳐집니다.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Endings;
