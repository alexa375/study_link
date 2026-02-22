import { Request, Response } from 'express';
import { driver } from '../config/neo4j';

// Get all concepts for a specific map
export const getConcepts = async (req: Request, res: Response) => {
    const mapId = (req.query.mapId as string) || 'default';
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (c:Concept)
            WHERE c.mapId = $mapId OR (c.mapId IS NULL AND $mapId = 'default')
            RETURN c
            LIMIT 100
        `, { mapId });

        const concepts = result.records.map((record) => {
            const node = record.get('c').properties;
            return {
                id: node.id,
                label: node.label,
                description: node.description,
                masteryLevel: node.masteryLevel,
                emotion: node.emotion,
                crisis: node.crisis,
                metaTags: node.metaTags ?? [],
                links: node.links ?? [],
                mapId: node.mapId ?? 'default',
            };
        });

        res.json({ success: true, data: concepts });
    } catch (error) {
        console.error('Error fetching concepts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch concepts.' });
    } finally {
        await session.close();
    }
};

// Create a basic concept for testing
export const createConcept = async (req: Request, res: Response) => {
    const { id, label, description, mapId } = req.body;

    if (!id || !label) {
        return res.status(400).json({ success: false, error: 'id and label are required.' });
    }

    const session = driver.session();
    try {
        const result = await session.run(`
            MERGE (c:Concept {id: $id})
            SET c.label = $label,
                c.description = $description,
                c.mapId = $mapId,
                c.updatedAt = datetime()
            RETURN c
        `, { id, label, description, mapId: mapId ?? 'default' });

        const node = result.records[0].get('c').properties;
        res.status(201).json({ success: true, data: node });
    } catch (error) {
        console.error('Error creating concept:', error);
        res.status(500).json({ success: false, error: 'Failed to create concept.' });
    } finally {
        await session.close();
    }
};

// Delete a concept and all connected relationships
export const deleteConcept = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, error: 'id is required' });
    }

    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (c:Concept {id: $id})
            DETACH DELETE c
            RETURN count(c) as deletedCount
        `, { id });

        const deletedCount = result.records[0].get('deletedCount').toNumber();

        if (deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Concept not found' });
        }

        res.json({ success: true, message: 'Concept deleted successfully' });
    } catch (error) {
        console.error('Error deleting concept:', error);
        res.status(500).json({ success: false, error: 'Failed to delete concept.' });
    } finally {
        await session.close();
    }
};

// Update concept properties
export const updateConcept = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { label, description, emotion, crisis, masteryLevel, metaTags, links } = req.body;

    if (!id) return res.status(400).json({ success: false, error: 'id is required' });

    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (c:Concept {id: $id})
            SET c.label        = COALESCE($label, c.label),
                c.description  = COALESCE($description, c.description),
                c.emotion      = COALESCE($emotion, c.emotion),
                c.crisis       = COALESCE($crisis, c.crisis),
                c.masteryLevel = COALESCE($masteryLevel, c.masteryLevel),
                c.metaTags     = COALESCE($metaTags, c.metaTags),
                c.links        = COALESCE($links, c.links),
                c.updatedAt    = datetime()
            RETURN c
        `, {
            id,
            label: label ?? null,
            description: description ?? null,
            emotion: emotion ?? null,
            crisis: crisis ?? null,
            masteryLevel: masteryLevel ?? null,
            metaTags: metaTags ?? null,
            links: links ?? null
        });

        if (result.records.length === 0)
            return res.status(404).json({ success: false, error: 'Concept not found' });

        const node = result.records[0].get('c').properties;
        res.json({ success: true, data: node });
    } catch (error: any) {
        console.error('Error updating concept:', error);
        res.status(500).json({ success: false, error: 'Failed to update concept: ' + error.message });
    } finally {
        await session.close();
    }
};
