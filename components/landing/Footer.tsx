'use client';

import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="text-center md:text-left">
          <h3 className="mb-2 font-serif text-2xl font-bold text-white">
            ATELOS
          </h3>
          <p className="text-sm text-zinc-500">
            AI Procedural Narrative Survival Game.
            <br />
            Powered by Google Gemini.
          </p>
        </div>

        <div className="flex gap-6">
          <Link
            href="/lobby"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Play
          </Link>
          <Link
            href="/admin"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Admin
          </Link>
        </div>

        <div className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} Project ATELOS. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
