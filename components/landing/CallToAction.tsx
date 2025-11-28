'use client';

import React from 'react';
import Link from 'next/link';
import LandingButton from './LandingButton';

const CallToAction: React.FC = () => {
  return (
    <section className="bg-gradient-to-t from-red-950/20 to-black px-6 py-32 text-center">
      <h2 className="mb-6 font-serif text-3xl font-bold md:text-5xl">
        생존을 시작하십시오
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-zinc-400">
        ATELOS의 세계가 당신을 기다립니다.
        <br />
        지금 바로 당신만의 생존 서사를 시작하세요.
      </p>
      <Link href="/lobby">
        <LandingButton variant="primary">게임 시작하기</LandingButton>
      </Link>
    </section>
  );
};

export default CallToAction;
