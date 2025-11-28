'use client';

import React from 'react';
import LandingButton from './LandingButton';

const Hero: React.FC = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      {/* Background with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-telos-black/90 to-telos-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <div className="opacity-0-initial animate-fade-in mb-6">
          <span className="mb-4 inline-block border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            System Online
          </span>
        </div>

        <h1 className="opacity-0-initial animate-fade-in-delay-1 mb-2 font-serif text-6xl font-black tracking-tighter text-white md:text-8xl">
          ATELOS
        </h1>
        <p className="opacity-0-initial animate-fade-in-delay-2 mb-8 text-xl font-light tracking-wide text-zinc-400 md:text-2xl">
          끝나버린 세상, 당신의 선택으로 쓰여지는 <br className="hidden md:inline" />
          <span className="font-medium text-red-500">유일한 생존 기록</span>
        </p>

        <div className="opacity-0-initial animate-fade-in-delay-3 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LandingButton variant="primary" onClick={() => scrollToSection('demo')}>
            생존 시작하기
          </LandingButton>
          <LandingButton
            variant="outline"
            onClick={() => scrollToSection('features')}
          >
            시스템 확인
          </LandingButton>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 transform animate-bounce opacity-50">
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
