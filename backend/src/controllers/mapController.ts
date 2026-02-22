import { Request, Response } from 'express';
import { driver } from '../config/neo4j';

// GET /api/maps — 모든 맵 목록 반환
export const getMaps = async (req: Request, res: Response) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Map) RETURN m ORDER BY coalesce(m.sortOrder, 9999), m.createdAt ASC`
        );
        const maps = result.records.map(r => {
            const props = r.get('m').properties;
            return { ...props, createdAt: props.createdAt?.toString() ?? '' };
        });
        res.json({ success: true, data: maps });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
};

// POST /api/maps — 새 맵 생성
export const createMap = async (req: Request, res: Response) => {
    const { id, name, description, emoji } = req.body;
    if (!id || !name) return res.status(400).json({ success: false, error: 'id and name are required' });

    const session = driver.session();
    try {
        const result = await session.run(
            `CREATE (m:Map {
                id: $id,
                name: $name,
                description: $description,
                emoji: $emoji,
                createdAt: datetime()
            }) RETURN m`,
            { id, name, description: description ?? '', emoji: emoji ?? '🧠' }
        );
        const raw = result.records[0].get('m').properties;
        const map = { ...raw, createdAt: raw.createdAt?.toString() ?? '' };
        res.json({ success: true, data: map });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
};

// DELETE /api/maps/:id — 맵 및 소속 개념 전체 삭제
export const deleteMap = async (req: Request, res: Response) => {
    const { id } = req.params;
    const session = driver.session();
    try {
        // Delete all concepts in this map first, then the map node
        await session.run(
            `MATCH (c:Concept {mapId: $id}) DETACH DELETE c`,
            { id }
        );
        await session.run(
            `MATCH (m:Map {id: $id}) DELETE m`,
            { id }
        );
        res.json({ success: true, message: 'Map and all its concepts deleted.' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
};

// PATCH /api/maps/:id — 맵 수정
export const updateMap = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Map {id: $id})
             SET m.name = COALESCE($name, m.name),
                 m.description = COALESCE($description, m.description)
             RETURN m`,
            { id, name: name ?? null, description: description ?? null }
        );
        const raw = result.records[0]?.get('m').properties;
        if (!raw) return res.status(404).json({ success: false, error: 'Map not found' });
        const map = { ...raw, createdAt: raw.createdAt?.toString() ?? '' };
        res.json({ success: true, data: map });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
};

// POST /api/maps/reorder — 맵 정렬 순서 저장
export const reorderMaps = async (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ success: false, error: 'orderedIds required' });
    const session = driver.session();
    try {
        await session.run(
            `UNWIND $pairs AS pair
             MATCH (m:Map {id: pair.id})
             SET m.sortOrder = pair.order`,
            { pairs: orderedIds.map((id: string, idx: number) => ({ id, order: idx })) }
        );
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
};
