import { useEffect, useState, useCallback } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    type Viewport,
    useOnViewportChange,
    ReactFlowProvider,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode } from '@/components/nodes/ConceptNode';
import { Sidebar } from '@/components/Sidebar';
import { WaterDropOverlay } from '@/components/WaterDropOverlay';
import { HomePage } from '@/components/HomePage';
import { ExtractPromptModal } from '@/components/ExtractPromptModal';
import { useStore, type AppNode } from '@/store/useStore';

const nodeTypes = {
    concept: ConceptNode,
};

// ─── Flow Map (마인드맵 캔버스) ────────────────────────────────────────
function FlowMap({ mapId }: { mapId: string }) {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges, setZoomLevel, zoomLevel, setActivePanel, setSelectedNode } = useStore();
    const [loading, setLoading] = useState(true);
    const [isExtractOpen, setIsExtractOpen] = useState(false);

    const posKey = `node-positions-${mapId}`;
    const viewKey = `graph-viewport-${mapId}`;
    const { screenToFlowPosition } = useReactFlow();

    const savedViewport: Viewport = JSON.parse(
        localStorage.getItem(viewKey) ?? 'null'
    ) ?? { x: 0, y: 0, zoom: 0.8 };

    const handleDeleteConcept = useCallback(async (id: string) => {
        if (!window.confirm('정말 이 개념을 삭제하시겠습니까? 연결된 모든 경로도 함께 지워집니다.')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/concepts/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                const { nodes: currentNodes, edges: currentEdges, setNodes, setEdges } = useStore.getState();
                setNodes(currentNodes.filter(n => n.id !== id));
                setEdges(currentEdges.filter(e => e.source !== id && e.target !== id));
            } else {
                alert('삭제 실패: ' + data.error);
            }
        } catch {
            alert('삭제 중 오류가 발생했습니다.');
        }
    }, []);

    const fetchGraphData = useCallback(async () => {
        setLoading(true);
        try {
            const nodeRes = await fetch(`${import.meta.env.VITE_API_URL}/api/concepts?mapId=${mapId}`);
            const nodeJson = await nodeRes.json();

            if (nodeJson.success) {
                const savedPositions: Record<string, { x: number; y: number }> =
                    JSON.parse(localStorage.getItem(posKey) ?? '{}');

                let fallbackCenter = { x: 300, y: 100 };
                try {
                    fallbackCenter = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                } catch {
                    // Fallback if unable to calculate
                }

                const fetchedNodes: AppNode[] = nodeJson.data.map((c: any, index: number) => ({
                    id: c.id,
                    type: 'concept',
                    position: savedPositions[c.id] ?? {
                        x: fallbackCenter.x - 150 + (index % 3) * 50,
                        y: fallbackCenter.y - 100 + (index % 3) * 50
                    },
                    data: {
                        id: c.id,
                        label: c.label,
                        description: c.description,
                        masteryLevel: c.masteryLevel || 'UNSEEN',
                        emotion: c.emotion || '✨',
                        crisis: c.crisis,
                        metaTags: c.metaTags,
                        links: c.links,
                        onDelete: handleDeleteConcept,
                    }
                }));
                setNodes(fetchedNodes);
            }
            setEdges([]);
        } catch (error) {
            console.error('Failed to load graph data:', error);
        } finally {
            setLoading(false);
        }
    }, [mapId, posKey, setNodes, setEdges, handleDeleteConcept, screenToFlowPosition]);

    useEffect(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    // Listen for concept-added events from the Sidebar to re-fetch immediately
    useEffect(() => {
        const handler = () => fetchGraphData();
        window.addEventListener('refetch-graph', handler);
        return () => window.removeEventListener('refetch-graph', handler);
    }, [fetchGraphData]);

    // Persist node positions per map
    useEffect(() => {
        if (nodes.length === 0) return;
        const positions: Record<string, { x: number; y: number }> = {};
        nodes.forEach(n => { positions[n.id] = n.position; });
        localStorage.setItem(posKey, JSON.stringify(positions));
    }, [nodes, posKey]);

    useOnViewportChange({
        onChange: (viewport) => {
            setZoomLevel(viewport.zoom);
            localStorage.setItem(viewKey, JSON.stringify(viewport));
        },
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-500 font-medium">
                <p>지식망을 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="relative flex-1 h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                defaultViewport={savedViewport}
                onPaneClick={() => {
                    setActivePanel(null);
                    setSelectedNode(null);
                }}
                onNodeClick={() => {
                    // Close other panels when clicking a node (unless it's a double click which opens detail)
                    setActivePanel(null);
                }}
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
            <WaterDropOverlay isVisible={zoomLevel < 0.5} />

            {/* Extract Prompt Button */}
            <button
                onClick={() => setIsExtractOpen(true)}
                className="absolute bottom-6 right-6 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold transition-all hover:-translate-y-1 z-40"
            >
                <span className="text-xl">✨</span>
                학습 프롬프트 추출
            </button>

            <ExtractPromptModal isOpen={isExtractOpen} onClose={() => setIsExtractOpen(false)} />
        </div>
    );
}

// ─── App (홈 ↔ 마인드맵 라우팅) ──────────────────────────────────────
export default function App() {
    const [currentMapId, setCurrentMapId] = useState<string | null>(null);

    const handleEnterMap = (mapId: string) => {
        // Reset nodes when switching maps
        useStore.getState().setNodes([]);
        useStore.getState().setEdges([]);
        setCurrentMapId(mapId);
    };

    const handleNavigateHome = () => {
        useStore.getState().setNodes([]);
        useStore.getState().setEdges([]);
        setCurrentMapId(null);
    };

    if (currentMapId === null) {
        return <HomePage onEnterMap={handleEnterMap} />;
    }

    return (
        <div style={{ width: '100vw', height: '100vh' }} className="flex bg-slate-50">
            <ReactFlowProvider>
                <Sidebar
                    mapId={currentMapId}
                    onConceptAdded={() => {
                        // Re-fetch is handled inside FlowMap via the mapId dep
                        window.dispatchEvent(new CustomEvent('refetch-graph'));
                    }}
                    onPathFound={(pathNodes) => {
                        alert(`경로 발견! ${pathNodes.length}개 개념\n${pathNodes.map((n: any) => n.label).join(' ➔ ')}`);
                    }}
                    onClearPath={() => { }}
                    onNavigateHome={handleNavigateHome}
                />
                <FlowMap mapId={currentMapId} />
            </ReactFlowProvider>
        </div>
    );
}
