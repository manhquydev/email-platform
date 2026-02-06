import React from 'react';
import { TerminalFrame } from '@/components/ui/layout/TerminalFrame';
import { Shield, Zap, Ghost, Globe, Code, Lock } from 'lucide-react';

const FEATURES = [
  {
    title: "ANONYMITY_PROTOCOL",
    icon: Ghost,
    desc: "Generate disposable identities instantly. No logs. No traces.",
    status: "active" as const
  },
  {
    title: "SECURE_INGEST",
    icon: Shield,
    desc: "TLS encryption for all inbound traffic. SMTP sanitized.",
    status: "active" as const
  },
  {
    title: "GLOBAL_DOMAINS",
    icon: Globe,
    desc: "Multi-domain support enabled. Custom routing available.",
    status: "processing" as const
  },
  {
    title: "API_ACCESS",
    icon: Code,
    desc: "RESTful endpoints for automation. Developer token required.",
    status: "active" as const
  },
  {
    title: "INSTANT_DELIVERY",
    icon: Zap,
    desc: "Real-time websocket connections. Zero latency.",
    status: "active" as const
  },
  {
    title: "DATA_RETENTION",
    icon: Lock,
    desc: "Auto-purge enabled. 24h retention cycle.",
    status: "active" as const
  }
];

export const FeatureGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 max-w-6xl mx-auto">
      {FEATURES.map((feature, idx) => (
        <TerminalFrame
          key={idx}
          title={feature.title}
          status={feature.status}
          className="h-48 group hover:scale-[1.02] transition-transform duration-200"
          glow={false}
        >
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-3">
                <feature.icon className="w-8 h-8 text-neon-green group-hover:animate-pulse" strokeWidth={1.5} />
                <div className="h-px flex-1 bg-terminal-border group-hover:bg-neon-green/30 transition-colors" />
            </div>
            <p className="text-phosphor-dim font-body leading-relaxed text-sm">
                {feature.desc}
            </p>
            <div className="mt-auto flex justify-end">
                <span className="text-[10px] text-phosphor-faint font-mono group-hover:text-neon-cyan transition-colors">
                    MOD_ID: {String(idx).padStart(3, '0')}
                </span>
            </div>
          </div>
        </TerminalFrame>
      ))}
    </div>
  );
};
