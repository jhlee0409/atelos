'use client';

import {
  Navigation,
  Hero,
  Features,
  PrologueDemo,
  CallToAction,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-telos-black text-zinc-100">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <PrologueDemo />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
