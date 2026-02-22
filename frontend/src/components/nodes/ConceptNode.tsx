import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useStore } from '@/store/useStore';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Type definitions for our node data
export type ConceptNodeData = {
    id: string;
    label: string;
    masteryLevel: 'MASTERED' | 'LEARNING' | 'UNSEEN';
    emotion?: string;
    crisis?: string;
    description?: string;
    metaTags?: string[];
    links?: string[];
    onDelete?: (id: string) => void;
    onTagClick?: (tag: string) => void;
};

export function ConceptNode({ id, data }: NodeProps) {
    const nodeData = data as ConceptNodeData;
    const { setSelectedNode } = useStore();
    const [isHovered, setIsHovered] = useState(false);
    const [isDeleteHovered, setIsDeleteHovered] = useState(false);
    const [isLinkExpanded, setIsLinkExpanded] = useState(false);
    const [newLink, setNewLink] = useState('');
    const [isSavingLink, setIsSavingLink] = useState(false);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const latestNodes = useStore.getState().nodes;
        const thisNode = latestNodes.find(n => n.id === id) ?? null;
        setSelectedNode(thisNode);
    };


    // Determine borders based on mastery level
    let borderClass = 'border-2 border-slate-300';
    if (nodeData.masteryLevel === 'MASTERED') {
        borderClass = 'border-2 border-green-300';
    } else if (nodeData.masteryLevel === 'LEARNING') {
        borderClass = 'border-2 border-yellow-300';
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (nodeData.onDelete) {
            nodeData.onDelete(id);
        }
    };

    const handleAddLink = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.stopPropagation();
        if (!newLink.trim()) return;
        setIsSavingLink(true);
        try {
            const updatedLinks = [...(nodeData.links || []), newLink.trim()];
            const res = await fetch(`http://localhost:4000/api/concepts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: updatedLinks }),
            });
            const data = await res.json();
            if (data.success) {
                const currentNodes = useStore.getState().nodes;
                useStore.getState().setNodes(currentNodes.map(n =>
                    n.id === id ? { ...n, data: { ...n.data, links: updatedLinks } } : n
                ));
                setNewLink('');
            }
        } catch (error) {
            console.error('Failed to add link:', error);
        } finally {
            setIsSavingLink(false);
        }
    };

    const handleDeleteLink = async (idxToRemove: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!nodeData.links) return;
        setIsSavingLink(true);

        const currentNodes = useStore.getState().nodes;
        const updatedLinks = nodeData.links.filter((_, idx) => idx !== idxToRemove);

        // Optimistic UI Update: remove immediately from frontend
        useStore.getState().setNodes(currentNodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, links: updatedLinks } } : n
        ));

        // Sync with backend
        try {
            await fetch(`http://localhost:4000/api/concepts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: updatedLinks }),
            });
        } catch (error) {
            console.error('Failed to update deleted link on backend:', error);
            // Optionally, we could revert the optimistic update here.
        } finally {
            setIsSavingLink(false);
        }
    };

    // The delete button now uses a static light blue design by default
    const deleteBtnBaseClass = 'bg-[#dce9f8] text-slate-800';

    return (
        <>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-500" />
            <Card
                className={`w-80 shadow-none hover:shadow-md hover:shadow-slate-300/50 relative transition-all duration-300 cursor-pointer ${borderClass}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setIsDeleteHovered(false); }}
                onDoubleClick={handleDoubleClick}
            >
                {/* Delete Button (Visible on Hover) */}
                {isHovered && nodeData.onDelete && (
                    <button
                        onClick={handleDelete}
                        onMouseEnter={() => setIsDeleteHovered(true)}
                        onMouseLeave={() => setIsDeleteHovered(false)}
                        className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all z-20 shadow-sm
                            ${isDeleteHovered
                                ? 'bg-[#c5d6eb] text-slate-800 scale-110 opacity-100'
                                : `${deleteBtnBaseClass} opacity-100`
                            }`}
                        title="노드 삭제"
                    >
                        ✕
                    </button>
                )}

                {/* Mastery Status Badge */}
                <div
                    className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-md flex items-center justify-center text-[11px] font-bold tracking-wider shadow-sm border z-20 transition-all uppercase ${nodeData.masteryLevel === 'UNSEEN' ? 'bg-slate-100 border-slate-300 text-slate-500' :
                        nodeData.masteryLevel === 'LEARNING' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                            'bg-green-100 border-green-300 text-green-700'
                        }`}
                    title={`상태: ${nodeData.masteryLevel}`}
                >
                    {nodeData.masteryLevel === 'UNSEEN' ? 'Unseen' : nodeData.masteryLevel === 'LEARNING' ? 'Learning' : 'Mastered'}
                </div>

                <CardHeader className="pb-3 pt-6">
                    <CardTitle className="text-xl font-bold tracking-tight text-center">
                        {nodeData.label}
                    </CardTitle>
                </CardHeader>

                <CardContent className="pb-2">
                    {nodeData.description && (
                        <p className="text-sm text-slate-600 mb-3 text-center px-2">{nodeData.description}</p>
                    )}
                    {/* Crisis Story Accordion */}
                    {nodeData.crisis && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="crisis" className="border-0">
                                <AccordionTrigger className="text-sm font-semibold text-destructive py-2 hover:no-underline hover:text-red-700 transition">
                                    수학자의 위기 (Crisis)
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-slate-600 leading-relaxed bg-red-50 p-3 rounded-md mt-1 border border-red-100">
                                    {nodeData.crisis}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>

                {/* Philosophy Meta Tags */}
                {nodeData.metaTags && nodeData.metaTags.length > 0 && (
                    <CardFooter className="flex flex-wrap gap-2 pt-2 pb-4">
                        {nodeData.metaTags.map((tag, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs transition-all"
                            >
                                🔖 {tag}
                            </Badge>
                        ))}
                    </CardFooter>
                )}
                {/* Link Attachment Menu / Bottom Expandable Section */}
                <div className="relative flex justify-center items-center pb-2 pt-1 z-10">
                    <div className="absolute w-full h-[1px] bg-slate-100 top-0 left-0"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsLinkExpanded(!isLinkExpanded); }}
                        className="p-1 rounded-full hover:bg-slate-100 transition-colors z-20 bg-white"
                        title={isLinkExpanded ? "메뉴 닫기" : "링크 첨부"}
                    >
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isLinkExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLinkExpanded ? 'max-h-48 opacity-100 pb-4 px-4' : 'max-h-0 opacity-0 px-4'}`}>
                    {nodeData.links && nodeData.links.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-3">
                            {nodeData.links.map((link, idx) => {
                                let faviconUrl = '';
                                try {
                                    faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=32`;
                                } catch (e) {
                                    faviconUrl = '';
                                }

                                return (
                                    <div key={idx} className="group relative flex items-center justify-between bg-slate-50 rounded-md px-2 py-1.5 overflow-hidden">
                                        {/* Hover sweep animation */}
                                        <div className="absolute inset-y-0 left-0 bg-slate-100 transition-all duration-300 ease-out w-0 group-hover:w-full pointer-events-none"></div>

                                        <div className="relative z-10 flex items-center flex-1 min-w-0 pr-6">
                                            {faviconUrl && <img src={faviconUrl} alt="favicon" className="w-[14px] h-[14px] mr-2 flex-shrink-0 rounded-sm" />}
                                            <a
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[13px] text-slate-800 truncate block flex-1 hover:no-underline"
                                                onClick={e => e.stopPropagation()}
                                                title={link}
                                            >
                                                {link}
                                            </a>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteLink(idx, e)}
                                            className="absolute right-2 text-[11px] opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5 z-10"
                                            title="링크 삭제"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Input
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddLink(e);
                                }
                            }}
                            placeholder="https:// example..."
                            className="h-8 text-[5px] px-2.5 bg-slate-50 focus-visible:ring-1 focus-visible:ring-blue-400"
                            onClick={e => e.stopPropagation()}
                            onDoubleClick={e => e.stopPropagation()}
                        />
                        <Button
                            size="sm"
                            className="h-8 px-4 text-[10px] bg-slate-800 hover:bg-slate-700 text-white"
                            onClick={(e) => { e.stopPropagation(); handleAddLink(e); }}
                            disabled={isSavingLink}
                        >
                            {isSavingLink ? '...' : '추가'}
                        </Button>
                    </div>
                </div>
            </Card>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-500" />
        </>
    );
}
