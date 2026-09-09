import { NavBar } from '@/components/landing/NavBar';
import { Hero } from '@/components/landing/Hero';
import { ValueProps } from '@/components/landing/ValueProps';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950">
      <NavBar />
      <main className="flex-1 pt-16">
        <Hero />
        <ValueProps />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
}