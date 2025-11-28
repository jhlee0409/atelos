'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-black/80 py-4 backdrop-blur-md'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="cursor-pointer font-serif text-2xl font-black tracking-tighter"
        >
          ATELOS
        </button>
        <div className="hidden gap-8 text-sm font-medium text-zinc-300 md:flex">
          <button
            onClick={() => scrollToSection('features')}
            className="transition-colors hover:text-white"
          >
            SYSTEM
          </button>
          <button
            onClick={() => scrollToSection('demo')}
            className="transition-colors hover:text-white"
          >
            PROLOGUE
          </button>
          <Link
            href="/lobby"
            className="text-red-500 transition-colors hover:text-red-400"
          >
            PLAY NOW
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
