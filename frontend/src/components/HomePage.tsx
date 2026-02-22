import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type MapEntry = {
    id: string;
    name: string;
    description: string;
    createdAt: string;
};

interface HomePageProps {
    onEnterMap: (mapId: string) => void;
}

// ─── Sortable Card Wrapper ────────────────────────────────────────────────────
function SortableMapCard({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HomePage({ onEnterMap }: HomePageProps) {
    const [maps, setMaps] = useState<MapEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [editingMapId, setEditingMapId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const fetchMaps = async () => {
        try {
            const res = await fetch('${import.meta.env.VITE_API_URL}/api/maps');
            const data = await res.json();
            if (data.success) setMaps(data.data);
        } catch {
            console.error('Failed to fetch maps');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMaps(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        setCreating(true);
        try {
            const isEditing = !!editingMapId;
            const id = isEditing ? editingMapId! : crypto.randomUUID();
            const method = isEditing ? 'PATCH' : 'POST';
            const url = isEditing ? `${import.meta.env.VITE_API_URL}/api/maps/${id}` : '${import.meta.env.VITE_API_URL}/api/maps';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...form }),
            });
            const data = await res.json();
            if (data.success) {
                setShowForm(false);
                setEditingMapId(null);
                setForm({ name: '', description: '' });
                fetchMaps();
            } else alert((isEditing ? '수정' : '생성') + ' 실패: ' + data.error);
        } catch { alert('서버 연결 실패'); }
        finally { setCreating(false); }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('이 마인드맵과 모든 개념을 삭제하시겠습니까?')) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/maps/${id}`, { method: 'DELETE' });
            fetchMaps();
        } catch { alert('삭제 실패'); }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIdx = maps.findIndex(m => m.id === active.id);
        const newIdx = maps.findIndex(m => m.id === over.id);
        const reordered = arrayMove(maps, oldIdx, newIdx);
        setMaps(reordered);

        try {
            await fetch('${import.meta.env.VITE_API_URL}/api/maps/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds: reordered.map(m => m.id) }),
            });
        } catch {
            console.error('Failed to persist reorder');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const clean = dateStr.replace(/\[.*\]$/, '').split('+')[0];
            const d = new Date(clean);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🧠</span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">지식망 플랫폼</h1>
                        <p className="text-sm text-slate-400">Knowledge Graph Platform</p>
                    </div>
                </div>
                <Button onClick={() => {
                    setEditingMapId(null);
                    setForm({ name: '', description: '' });
                    setShowForm(true);
                }} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5">
                    + 새 마인드맵
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-8 py-8" onClick={() => setActiveMenuId(null)}>
                <h2 className="text-lg font-semibold text-slate-600 mb-6">나의 마인드맵</h2>

                {loading ? (
                    <div className="text-slate-400 text-sm">불러오는 중...</div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={maps.map(m => m.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {maps.map(map => (
                                    <SortableMapCard key={map.id} id={map.id}>
                                        <div
                                            onClick={() => setSelectedId(prev => prev === map.id ? null : map.id)}
                                            onDoubleClick={() => onEnterMap(map.id)}
                                            className={`relative bg-white rounded-2xl border-2 p-5 transition-all select-none group cursor-pointer
                                                ${selectedId === map.id
                                                    ? 'border-violet-400 shadow-lg shadow-violet-100 ring-2 ring-violet-200'
                                                    : 'border-slate-200 hover:border-violet-300 hover:shadow-md'
                                                }`}
                                        >
                                            {/* Options button (three dots) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === map.id ? null : map.id);
                                                }}
                                                className={`absolute top-2 right-2 p-1 rounded-full text-slate-500 hover:text-slate-700 transition-all z-10
                                                    ${activeMenuId === map.id ? 'opacity-100 bg-slate-200' : 'opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-slate-200'}`}
                                                title="옵션"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {activeMenuId === map.id && (
                                                <div
                                                    className="absolute top-10 right-2 w-36 bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden z-50 py-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuId(null);
                                                            setEditingMapId(map.id);
                                                            setForm({ name: map.name, description: map.description || '' });
                                                            setShowForm(true);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        세부정보 수정
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            setActiveMenuId(null);
                                                            handleDelete(e, map.id);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        마인드맵 삭제
                                                    </button>
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex flex-col min-h-[80px]">
                                                <h3 className="font-bold text-slate-800 text-2xl leading-tight mb-1">{map.name}</h3>
                                                {map.description && (
                                                    <p className="text-slate-400 text-[20px] line-clamp-3 flex-1">{map.description}</p>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEnterMap(map.id); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 py-1.5 px-3 bg-violet-100 text-violet-600 hover:bg-violet-600 hover:text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                                                >
                                                    열기
                                                </button>
                                                <p className="text-slate-300 text-[10px] whitespace-nowrap text-right ml-auto">{formatDate(map.createdAt)}</p>
                                            </div>
                                        </div>
                                    </SortableMapCard>
                                ))}

                                {/* Empty state */}
                                {maps.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-slate-400">
                                        <p className="text-4xl mb-3">📭</p>
                                        <p className="font-medium">아직 마인드맵이 없습니다</p>
                                        <p className="text-sm mt-1">+ 새 마인드맵을 만들어보세요</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </main>

            {/* Hint */}
            <footer className="px-8 py-4 text-center text-slate-300 text-xs">
                카드를 <strong>드래그</strong>하면 순서 변경 · <strong>한 번</strong> 클릭하면 선택 · <strong>두 번</strong> 클릭하면 마인드맵 열기
            </footer>

            {/* New / Edit Map Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
                        <h2 className="text-base font-bold text-slate-800 mb-4">{editingMapId ? '마인드맵 수정' : '새 마인드맵 만들기'}</h2>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">이름</Label>
                                <Input placeholder="나의 수학 지도" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">설명 (선택)</Label>
                                <Input placeholder="무엇을 담을 마인드맵인가요?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => {
                                    setShowForm(false);
                                    setEditingMapId(null);
                                }}>취소</Button>
                                <Button type="submit" disabled={creating} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white">
                                    {creating ? '저장 중...' : (editingMapId ? '수정하기' : '만들기')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
