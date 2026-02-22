import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';

export function ExtractPromptModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { nodes } = useStore();
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const generatePrompt = () => {
        const mastered = nodes.filter(n => n.data.masteryLevel === 'MASTERED').map(n => `- ${n.data.label} (${n.data.description})`).join('\n');
        const learning = nodes.filter(n => n.data.masteryLevel === 'LEARNING').map(n => `- ${n.data.label} (${n.data.description})`).join('\n');
        const unseen = nodes.filter(n => n.data.masteryLevel === 'UNSEEN').map(n => `- ${n.data.label}`).join('\n');

        return `현재까지의 학습 마인드맵 상태입니다.

[학습 완료 (MASTERED)]
${mastered || '- 없음'}

[학습 중 (LEARNING)]
${learning || '- 없음'}

[학습하지 않음 (UNSEEN)]
${unseen || '- 없음'}

위 학습 상태를 바탕으로, 내가 앞으로 어떤 방향으로 학습을 확장해 나가면 좋을지, 혹은 현재 학습 중인 개념을 완벽하게 이해하기 위해 꼭 던져봐야 할 철학적/수학적 질문 하나를 소크라테스처럼 던져주세요.`;
    };

    const promptText = generatePrompt();

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">학습 상태 프롬프트 추출</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200">✕</button>
                </div>
                <p className="text-sm text-slate-500">
                    현재 마인드맵의 학습 상태를 AI에게 전달하기 좋은 프롬프트 형태로 추출했습니다. 복사하여 ChatGPT 등에 붙여넣어 학습 방향성을 물어보세요.
                </p>
                <Textarea
                    readOnly
                    value={promptText}
                    className="h-[300px] font-mono text-sm resize-none bg-slate-50 border-slate-200 text-slate-700"
                />
                <div className="flex justify-end gap-3 mt-2">
                    <Button variant="outline" onClick={onClose}>닫기</Button>
                    <Button onClick={handleCopy} className="bg-violet-600 hover:bg-violet-700 text-white">
                        {copied ? '✓ 복사됨!' : '클립보드에 복사'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
