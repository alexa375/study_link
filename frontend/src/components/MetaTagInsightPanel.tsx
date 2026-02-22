import { useState, useEffect } from 'react';

interface MetaTagInsightPanelProps {
    tag: string;
    onClose: () => void;
}

export function MetaTagInsightPanel({ tag, onClose }: MetaTagInsightPanelProps) {
    const [loading, setLoading] = useState(true);
    const [insight, setInsight] = useState<string | null>(null);
    const [matchingLabels, setMatchingLabels] = useState<string[]>([]);

    useEffect(() => {
        fetch(`http://localhost:4000/api/ai/meta-pattern?tag=${encodeURIComponent(tag)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setInsight(data.insight);
                    setMatchingLabels(data.matchingLabels || []);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [tag]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-blue-100 p-6 mx-4">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-2">
                            🔖 철학 메타 태그
                        </span>
                        <h2 className="text-lg font-bold text-slate-800">{tag}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {matchingLabels.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 mb-2">이 패턴을 공유하는 개념들</p>
                        <div className="flex flex-wrap gap-1.5">
                            {matchingLabels.map((label, i) => (
                                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 font-medium">
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 mb-2">🔍 AI 메타 패턴 통찰</p>
                    {loading ? (
                        <p className="text-sm text-blue-400 animate-pulse">철학의 연결고리를 분석하는 중...</p>
                    ) : (
                        <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
