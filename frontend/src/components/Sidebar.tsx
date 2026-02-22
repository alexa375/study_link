import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { useReactFlow } from '@xyflow/react';
import { MoreVertical, Trash2 } from 'lucide-react';

type PanelId = 'add' | 'path' | 'detail' | 'search' | null;

interface SidebarProps {
    mapId: string;
    onConceptAdded: () => void;
    onPathFound: (nodes: any[]) => void;
    onClearPath: () => void;
    onNavigateHome: () => void;
}

// ─── Add Concept Panel ────────────────────────────────────────────────
function AddConceptPanel({ onConceptAdded, mapId }: { onConceptAdded: () => void; mapId: string }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({ label: '', description: '' });
    const { screenToFlowPosition } = useReactFlow();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.label) return;
        const id = crypto.randomUUID();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/api/concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...formData, mapId }),
            });
            const data = await res.json();
            if (data.success) {
                // Calculate viewport center and save it to localStorage before refetching
                let spawnPos = { x: 300, y: 100 };
                try {
                    spawnPos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                } catch { }

                const posKey = `node-positions-${mapId}`;
                const savedPositions = JSON.parse(localStorage.getItem(posKey) ?? '{}');
                savedPositions[id] = spawnPos;
                localStorage.setItem(posKey, JSON.stringify(savedPositions));

                setFormData({ label: '', description: '' });
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2000);
                onConceptAdded();
            } else {
                alert('추가 실패: ' + data.error);
            }
        } catch {
            alert('서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 h-full">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">개념 이름</Label>
                <Input placeholder="예: 극한 (Limit)" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">설명</Label>
                <Textarea placeholder="개념에 대한 간단한 설명..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="resize-none h-24" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-auto">
                {loading ? '기록 중...' : success ? '✓ 추가 완료!' : '+ 지식망에 추가하기'}
            </Button>
        </form>
    );
}

// ─── Search Panel ────────────────────────────────────────────────
function SearchPanel() {
    const { nodes, edges, setNodes, setEdges, setSelectedNode } = useStore();
    const [query, setQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const filteredNodes = nodes.filter(n => n.data.label.toLowerCase().includes(query.toLowerCase()));

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);
        if (!window.confirm('정말 이 개념을 삭제하시겠습니까? 관련 경로도 모두 삭제됩니다.')) return;

        try {
            const res = await fetch(`http://localhost:4000/api/concepts/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                // Remove from frontend
                setNodes(nodes.filter(n => n.id !== id));
                setEdges(edges.filter(edge => edge.source !== id && edge.target !== id));
            } else {
                alert('삭제 실패: ' + data.error);
            }
        } catch {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-5 h-full overflow-y-auto w-full" onClick={() => setActiveMenuId(null)}>
            <div className="space-y-1.5 focus-within:text-slate-800">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">검색어</Label>
                <Input placeholder="개념 이름 검색..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2 mt-2 w-full">
                {filteredNodes.map(n => (
                    <div key={n.id} className="relative group w-full">
                        <button
                            className="text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors w-full pr-8"
                            onClick={() => setSelectedNode(n)}
                        >
                            <div className="font-medium text-slate-700 text-sm truncate">{n.data.emotion} {n.data.label}</div>
                            <div className="text-xs text-slate-400 mt-1 truncate">{n.data.description}</div>
                        </button>

                        {/* Options button (three dots) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === n.id ? null : n.id);
                            }}
                            className={`absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all ${activeMenuId === n.id ? 'opacity-100 bg-slate-200' : 'opacity-0 group-hover:opacity-100'}`}
                            title="옵션"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === n.id && (
                            <div className="absolute right-2 top-8 w-32 bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden z-50 py-1">
                                <button
                                    onClick={(e) => handleDelete(n.id, e)}
                                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    개념 삭제
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {filteredNodes.length === 0 && query && (
                    <div className="text-sm text-slate-400 text-center py-8">일치하는 개념이 없습니다.</div>
                )}
            </div>
        </div>
    );
}

// ─── Pathfinding Panel ────────────────────────────────────────────────
function PathfindingPanel({ onPathFound, onClearPath }: { onPathFound: (n: any[]) => void; onClearPath: () => void }) {
    const { nodes } = useStore();
    const [startId, setStartId] = useState('');
    const [endId, setEndId] = useState('');
    const [loading, setLoading] = useState(false);
    const [pathExists, setPathExists] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);
    const [waterDropStory, setWaterDropStory] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!startId || !endId) return;
        setLoading(true);
        setPathExists(false);
        setWaterDropStory(null);
        try {
            const res = await fetch(`http://localhost:4000/api/graph/path?startId=${startId}&endId=${endId}`);
            const data = await res.json();
            if (data.success) {
                setPathExists(true);
                onPathFound(data.data.nodes);
            } else {
                alert('경로를 찾을 수 없습니다: ' + data.error);
            }
        } catch {
            alert('경로 탐색 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setPathExists(false);
        setWaterDropStory(null);
        onClearPath();
    };

    const handleAiStory = async () => {
        if (!startId || !endId) return;
        setLoadingAi(true);
        try {
            const res = await fetch(`http://localhost:4000/api/ai/waterdrop?sourceId=${startId}&targetId=${endId}`);
            const data = await res.json();
            if (data.success) setWaterDropStory(data.answer);
            else alert('해설을 불러오지 못했습니다.');
        } catch {
            alert('AI 연결 실패.');
        } finally {
            setLoadingAi(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-5 h-full overflow-y-auto">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">출발 개념</Label>
                <Select value={startId} onValueChange={setStartId}>
                    <SelectTrigger><SelectValue placeholder="출발점 선택..." /></SelectTrigger>
                    <SelectContent>
                        {nodes.map(n => (
                            <SelectItem key={n.id} value={n.id}>{n.data.emotion} {n.data.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">도착 개념</Label>
                <Select value={endId} onValueChange={setEndId}>
                    <SelectTrigger><SelectValue placeholder="도착점 선택..." /></SelectTrigger>
                    <SelectContent>
                        {nodes.map(n => (
                            <SelectItem key={n.id} value={n.id}>{n.data.emotion} {n.data.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={loading || !startId || !endId} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                    {loading ? '탐색 중...' : '경로 찾기'}
                </Button>
                <Button onClick={handleClear} variant="outline">초기화</Button>
            </div>
            {pathExists && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                    <Button onClick={handleAiStory} disabled={loadingAi} variant="outline" className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-medium">
                        {loadingAi ? '물방울 생성 중 💧...' : '💧 AI 물방울 연결 해설'}
                    </Button>
                    {waterDropStory && (
                        <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-100 text-sm text-slate-700 leading-relaxed italic">
                            {waterDropStory}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Detail / Edit Panel ─────────────────────────────────────────────
function DetailPanel() {
    const { selectedNode, setSelectedNode, setNodes } = useStore();
    const nodeData = selectedNode?.data;
    const MASTERY_OPTIONS = ['MASTERED', 'LEARNING', 'UNSEEN'] as const;

    const [form, setForm] = useState({
        label: nodeData?.label ?? '',
        description: nodeData?.description ?? '',
        emotion: nodeData?.emotion ?? '',
        crisis: nodeData?.crisis ?? '',
        masteryLevel: nodeData?.masteryLevel ?? 'UNSEEN',
        metaTags: (nodeData?.metaTags ?? []).join(', '),
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync form when selected node changes
    useEffect(() => {
        if (nodeData) {
            setForm({
                label: nodeData.label ?? '',
                description: nodeData.description ?? '',
                emotion: nodeData.emotion ?? '',
                crisis: nodeData.crisis ?? '',
                masteryLevel: nodeData.masteryLevel ?? 'UNSEEN',
                metaTags: (nodeData.metaTags ?? []).join(', '),
            });
        }
    }, [selectedNode?.id]);

    if (!selectedNode || !nodeData) return (
        <div className="p-5 text-slate-400 text-sm text-center pt-16">
            개념 카드를 더블클릭하면<br />세부정보가 표시됩니다.
        </div>
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`http://localhost:4000/api/concepts/${selectedNode.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    metaTags: form.metaTags.split(',').map((t: string) => t.trim()).filter(Boolean),
                }),
            });
            const data = await res.json();
            if (data.success) {
                const updatedData = {
                    ...selectedNode.data,
                    label: form.label,
                    description: form.description,
                    emotion: form.emotion,
                    crisis: form.crisis,
                    masteryLevel: form.masteryLevel,
                    metaTags: data.data.metaTags || form.metaTags.split(',').map((t: string) => t.trim()).filter(Boolean),
                };

                // Update the global nodes array for React Flow using the freshest state
                const currentNodes = useStore.getState().nodes;
                setNodes(currentNodes.map(n => n.id === selectedNode.id ? { ...n, data: updatedData } : n));

                // Update the currently selected node to keep the form / internal state in sync
                setSelectedNode({ ...selectedNode, data: updatedData });

                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else alert('저장 실패: ' + data.error);
        } catch { alert('서버 연결 실패'); }
        finally { setSaving(false); }
    };

    return (
        <form onSubmit={handleSave} className="flex flex-col gap-4 p-5 h-full overflow-y-auto">
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-400 font-mono">
                ID: {selectedNode.id}
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">이름</Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">숙달 단계</Label>
                <Select value={form.masteryLevel} onValueChange={v => setForm({ ...form, masteryLevel: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {MASTERY_OPTIONS.map(o => <SelectItem key={o} value={o} className="cursor-pointer focus:bg-slate-200 hover:bg-slate-200">{o}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">설명</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="resize-none h-20" />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">수학자의 위기</Label>
                <Textarea value={form.crisis} onChange={e => setForm({ ...form, crisis: e.target.value })} className="resize-none h-20" placeholder="위기 스토리를 적어보세요..." />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">메타 태그 (쉼표 구분)</Label>
                <Input value={form.metaTags} onChange={e => setForm({ ...form, metaTags: e.target.value })} placeholder="Philosophy: Structure, ..." />
            </div>
            <div className="flex gap-2 mt-auto pt-2">
                <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                    {saving ? '저장 중...' : saved ? '✓ 저장됨!' : '변경사항 저장'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedNode(null)}>닫기</Button>
            </div>
        </form>
    );
}

// ─── Sidebar Icon Rail ────────────────────────────────────────────────
const PANELS = [
    {
        id: 'add' as PanelId,
        label: '개념 추가',
        icon: (
            // Plus in a box icon
            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
        ),
    },
    {
        id: 'path' as PanelId,
        label: '경로 탐색',
        icon: (
            // Route/path icon
            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="19" r="2" />
                <circle cx="18" cy="5" r="2" />
                <path d="M6 17V7a4 4 0 0 1 4-4h1" />
                <path d="M18 7v10a4 4 0 0 1-4 4h-1" />
            </svg>
        ),
    },
    {
        id: 'detail' as PanelId,
        label: '세부정보 / 편집',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
        ),
    },
    {
        id: 'search' as PanelId,
        label: '노드 검색',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
        ),
    },
];

export function Sidebar({ mapId, onConceptAdded, onPathFound, onClearPath, onNavigateHome }: SidebarProps) {
    const { activePanel, setActivePanel, selectedNode } = useStore();

    // Auto-open detail panel when a node is double-clicked
    useEffect(() => {
        if (selectedNode) setActivePanel('detail');
    }, [selectedNode, setActivePanel]);

    const togglePanel = (id: PanelId) => {
        setActivePanel(activePanel === id ? null : id);
    };

    const ALL_PANEL_LABELS: Record<string, string> = {
        add: '개념 추가',
        search: '노드 검색',
        path: '경로 탐색',
        detail: selectedNode ? `${selectedNode.data.emotion ?? ''} ${selectedNode.data.label}`.trim() : '세부정보 / 편집',
    };

    return (
        <div className="relative flex-shrink-0 z-20" style={{ width: '68px' }}>
            {/* Icon Rail — always visible, in normal flow */}
            <aside className="flex flex-col items-center w-[68px] h-full bg-white border-r border-slate-200 shadow-sm py-4 gap-1">
                {/* Logo — click to go home */}
                <button
                    onClick={onNavigateHome}
                    className="mb-4 text-2xl select-none hover:scale-110 transition-transform"
                    title="홈으로 돌아가기"
                >🧠</button>

                {PANELS.map((panel) => (
                    <button
                        key={panel.id}
                        onClick={() => togglePanel(panel.id)}
                        title={panel.label}
                        className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all
                            ${activePanel === panel.id
                                ? 'bg-violet-100 text-violet-700 shadow-sm'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {panel.icon}
                        {activePanel === panel.id && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[7px] w-1 h-6 bg-violet-500 rounded-full" />
                        )}
                    </button>
                ))}
            </aside>

            {/* Expanding Panel — absolutely positioned, overlays canvas */}
            <div
                className="absolute top-0 left-[68px] h-full bg-white border-r border-slate-200 shadow-xl flex flex-col overflow-hidden"
                style={{
                    width: activePanel ? '320px' : '0px',
                    opacity: activePanel ? 1 : 0,
                    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: activePanel ? 'auto' : 'none',
                }}
            >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                    <h2 className="text-base font-bold text-slate-700 truncate">
                        {activePanel ? ALL_PANEL_LABELS[activePanel] : ''}
                    </h2>
                    <button
                        onClick={() => setActivePanel(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Panel Body */}
                <div className="flex-1 overflow-y-auto">
                    {activePanel === 'add' && <AddConceptPanel onConceptAdded={onConceptAdded} mapId={mapId} />}
                    {activePanel === 'search' && <SearchPanel />}
                    {activePanel === 'path' && <PathfindingPanel onPathFound={onPathFound} onClearPath={onClearPath} />}
                    {activePanel === 'detail' && <DetailPanel />}
                </div>
            </div>
        </div>
    );
}
