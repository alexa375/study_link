import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
} from '@xyflow/react';

import type { ConceptNodeData } from '@/components/nodes/ConceptNode';

export type AppNode = Node<ConceptNodeData>;

type AppState = {
    nodes: AppNode[];
    edges: Edge[];
    zoomLevel: number;
    activePanel: 'add' | 'path' | 'detail' | 'search' | null;
    selectedNode: AppNode | null;
    onNodesChange: OnNodesChange<AppNode>;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: AppNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    setZoomLevel: (zoom: number) => void;
    setSelectedNode: (node: AppNode | null) => void;
    setActivePanel: (panel: 'add' | 'path' | 'detail' | 'search' | null) => void;
};

export const useStore = create<AppState>((set, get) => ({
    nodes: [],
    edges: [],
    zoomLevel: 1,
    activePanel: null,
    selectedNode: null,

    setSelectedNode: (node) => set({ selectedNode: node }),
    setActivePanel: (panel) => set({ activePanel: panel }),

    onNodesChange: (changes: NodeChange<AppNode>[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection: Connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },

    setNodes: (nodes: AppNode[]) => {
        set({ nodes });
    },

    setEdges: (edges: Edge[]) => {
        set({ edges });
    },

    setZoomLevel: (zoom: number) => {
        const currentZoom = get().zoomLevel;
        // Only update and re-render if we cross the 0.5 threshold
        const thresholdCrossed = (currentZoom >= 0.5 && zoom < 0.5) || (currentZoom < 0.5 && zoom >= 0.5);

        if (thresholdCrossed) {
            set({ zoomLevel: zoom });
            // Toggle visibility based on new zoom level
            const isZoomedOut = zoom < 0.5;

            set({
                nodes: get().nodes.map((node) => {
                    // Water Drop Nodes (Macro concepts) remain visible
                    // Micro concepts (e.g. LEARNING or UNSEEN) are hidden
                    if (node.data.masteryLevel !== 'MASTERED') {
                        return { ...node, hidden: isZoomedOut };
                    }
                    return node;
                })
            });
        } else {
            // Just quietly update zoom without triggering full node map if not crossing threshold
            useStore.setState({ zoomLevel: zoom }, false);
        }
    }
}));
