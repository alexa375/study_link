import { useEffect, useState } from 'react';

interface WaterDrop {
    title: string;
    summary: string;
    emoji: string;
    relatedIds: string[];
}

interface WaterDropOverlayProps {
    isVisible: boolean;
}

export function WaterDropOverlay({ isVisible }: WaterDropOverlayProps) {
    const [waterDrops, setWaterDrops] = useState<WaterDrop[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (isVisible && !hasFetched) {
            setLoading(true);
            fetch(`${import.meta.env.VITE_API_URL}/api/ai/waterdrop-zoom`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setWaterDrops(data.waterDrops);
                        setHasFetched(true);
                    }
                })
                .catch(err => console.error('WaterDrop zoom failed:', err))
                .finally(() => setLoading(false));
        }
    }, [isVisible, hasFetched]);

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
            {/* Dark blur backdrop */}
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

            <div className="relative z-10 flex flex-col items-center gap-2">
                <p className="text-white/60 text-sm font-medium mb-4 tracking-widest uppercase">
                    💧 물방울 뷰 — 지식의 거시적 흐름
                </p>

                {loading ? (
                    <div className="flex gap-3 flex-wrap justify-center">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="w-44 h-44 rounded-full bg-blue-400/20 border border-blue-300/30 animate-pulse"
                                style={{ animationDelay: `${i * 0.2}s` }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-6 flex-wrap justify-center px-8">
                        {waterDrops.map((drop, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-center w-52 h-52 rounded-full
                                           bg-gradient-to-br from-blue-500/30 to-indigo-600/40
                                           border-2 border-blue-300/50 shadow-2xl shadow-blue-500/20
                                           text-white text-center p-5 pointer-events-auto
                                           hover:scale-105 transition-transform duration-300 cursor-default"
                                style={{
                                    animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
                                    animationDelay: `${i * 0.4}s`
                                }}
                            >
                                <span className="text-4xl mb-2">{drop.emoji}</span>
                                <p className="font-bold text-sm leading-tight">{drop.title}</p>
                                <p className="text-xs text-blue-100/80 mt-1 leading-snug">{drop.summary}</p>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-white/40 text-xs mt-6">
                    확대하면 개별 개념으로 돌아옵니다
                </p>
            </div>

            <style>{`
                @keyframes float {
                    from { transform: translateY(0px) scale(1); }
                    to   { transform: translateY(-16px) scale(1.04); }
                }
            `}</style>
        </div>
    );
}
