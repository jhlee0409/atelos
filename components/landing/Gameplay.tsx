'use client';

import React from 'react';

const Gameplay: React.FC = () => {
  const gameplaySteps = [
    {
      step: '01',
      title: '시나리오 선택',
      description: '스릴러, 드라마, SF 등 다양한 장르의 시나리오에서 당신만의 이야기를 시작하세요.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      step: '02',
      title: '캐릭터 캐스팅',
      description: '매 플레이마다 랜덤하게 부여되는 특성이 캐릭터의 성격과 행동을 바꿉니다.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      step: '03',
      title: '선택과 결과',
      description: '매 순간 두 가지 선택지. AI가 당신의 결정에 반응하여 새로운 이야기를 만들어갑니다.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      ),
    },
    {
      step: '04',
      title: '엔딩 달성',
      description: '시나리오별 다양한 조건과 플래그를 충족시켜 여러 엔딩을 발견하세요.',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="gameplay" className="relative border-t border-zinc-900 bg-telos-black py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-red-500">
            How to Play
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-white md:text-4xl">
            GAMEPLAY
          </h2>
          <div className="mx-auto h-1 w-20 bg-red-900" />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {gameplaySteps.map((item, idx) => (
            <div
              key={idx}
              className="group relative border border-zinc-800 bg-zinc-900/20 p-8 transition-colors duration-300 hover:border-red-900/50 hover:bg-zinc-900/40"
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-6 border border-red-900/50 bg-red-950/50 px-3 py-1 text-xs font-bold text-red-500">
                STEP {item.step}
              </div>

              {/* Icon */}
              <div className="mb-6 mt-4 text-red-500 transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>

              {/* Content */}
              <h3 className="mb-3 font-serif text-xl font-bold text-zinc-100">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-zinc-800 pt-16 md:grid-cols-4">
          {[
            { value: '∞', label: 'Unique Stories' },
            { value: '10+', label: 'Endings per Scenario' },
            { value: 'N', label: 'Custom Characters' },
            { value: '100%', label: 'AI Generated' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="font-serif text-4xl font-bold text-red-500 md:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm uppercase tracking-wider text-zinc-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gameplay;
