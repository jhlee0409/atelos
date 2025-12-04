'use client';

import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      title: 'AI-Powered Narrative',
      desc: '정해진 스크립트는 없습니다. AI가 당신의 선택에 반응하여 매번 새로운 스토리와 딜레마를 실시간으로 생성합니다.',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      title: 'Dynamic Stats System',
      desc: '시나리오마다 다른 스탯과 조건들. 당신의 선택이 수치를 변화시키고, 그 변화가 이야기의 방향을 결정합니다.',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      title: 'Meaningful Choices',
      desc: '쉬운 정답은 없습니다. 모든 선택에는 대가가 따르고, 때로는 최선의 결정도 예상치 못한 결과를 낳습니다.',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="features"
      className="relative border-t border-zinc-900 bg-zinc-950 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-red-500">
            Core System
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-white md:text-4xl">
            INTERACTIVE NARRATIVE
          </h2>
          <div className="mx-auto h-1 w-20 bg-red-900" />
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group border border-zinc-800 bg-zinc-900/20 p-8 transition-colors duration-300 hover:bg-zinc-900/50"
            >
              <div className="mb-6 text-red-500 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="mb-4 font-serif text-xl font-bold text-zinc-100">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
