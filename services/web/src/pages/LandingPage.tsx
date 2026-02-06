import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BootSequence } from '@/components/landing/BootSequence';
import { HeroScene } from '@/components/landing/HeroScene';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { TerminalFrame } from '@/components/ui/layout/TerminalFrame';
import { ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isBooted, setIsBooted] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="relative min-h-screen pb-20">
        {!isBooted && <BootSequence onComplete={() => setIsBooted(true)} />}

        <main className={`transition-opacity duration-1000 ${isBooted ? 'opacity-100' : 'opacity-0'}`}>
            {/* Hero Section */}
            <section className="relative pt-20 pb-10">
                <HeroScene />

                <div className="flex justify-center mt-[-50px] relative z-20">
                    <button
                        onClick={() => navigate('/login')}
                        className="group relative px-8 py-3 bg-neon-green/10 border border-neon-green text-neon-green font-display tracking-widest hover:bg-neon-green/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all duration-300 active:translate-y-1 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            INITIALIZE SESSION <ChevronRight className="w-4 h-4" />
                        </span>
                        <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
                    </button>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4">
                <div className="text-center mb-12">
                    <h2 className="text-2xl font-display text-phosphor-bright mb-2">SYSTEM CAPABILITIES</h2>
                    <div className="h-px w-24 bg-neon-green mx-auto shadow-[0_0_10px_#39ff14]" />
                </div>
                <FeatureGrid />
            </section>

            {/* CTA / Footer */}
            <section className="py-20 flex justify-center px-4">
                <TerminalFrame title="SYSTEM_MESSAGE" className="max-w-2xl h-auto" glow>
                    <div className="p-6 text-center space-y-6">
                        <p className="font-mono text-neon-amber">
                            WARNING: UNAUTHORIZED ACCESS MONITORING ACTIVE.
                        </p>
                        <p className="text-phosphor-dim">
                            Ephemera provides secure, temporary communication channels.
                            All data is automatically purged after retention period expires.
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <a href="/docs" className="text-sm font-mono text-phosphor-faint hover:text-neon-cyan underline decoration-dotted">
                                [VIEW DOCUMENTATION]
                            </a>
                            <a href="https://github.com/manhquy/ephemera" className="text-sm font-mono text-phosphor-faint hover:text-neon-cyan underline decoration-dotted">
                                [SOURCE CODE]
                            </a>
                        </div>
                    </div>
                </TerminalFrame>
            </section>
        </main>
      </div>
    </>
  );
};
