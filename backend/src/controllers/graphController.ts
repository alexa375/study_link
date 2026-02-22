import { Request, Response } from 'express';
import { driver } from '../config/neo4j';

// Get a concept by ID including its immediate relationships
export const getConceptWithRelations = async (req: Request, res: Response) => {
    const { id } = req.params;
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (n:Concept {id: $id})
            // Find outgoing relations
            OPTIONAL MATCH (n)-[r]->(target:Concept)
            WITH n, collect({type: type(r), target: target.id, weight: r.weight}) as outgoing
            // Find incoming relations
            OPTIONAL MATCH (source:Concept)-[r]->(n)
            WITH n, outgoing, collect({type: type(r), source: source.id, weight: r.weight}) as incoming
            RETURN n, outgoing, incoming
        `, { id });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, error: 'Concept not found' });
        }

        const record = result.records[0];
        const node = record.get('n').properties;
        const outgoing = record.get('outgoing').filter((r: any) => r.type !== null);
        const incoming = record.get('incoming').filter((r: any) => r.type !== null);

        res.json({
            success: true,
            data: {
                ...node,
                relations: { outgoing, incoming }
            }
        });
    } catch (error) {
        console.error('Error fetching concept details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch concept.' });
    } finally {
        await session.close();
    }
};

// Calculate learning path between two concepts using native Cypher shortestPath
export const findAccessiblePath = async (req: Request, res: Response) => {
    const { startId, endId } = req.query;

    if (!startId || !endId) {
        return res.status(400).json({ success: false, error: 'startId and endId are required' });
    }

    const session = driver.session();
    try {
        // Use native shortestPath to avoid requiring the APOC plugin on free AuraDB instances.
        // It matches any relationship up to 10 hops away.
        const result = await session.run(`
            MATCH (start:Concept {id: $startId}), (end:Concept {id: $endId})
            MATCH path = shortestPath((start)-[*..10]-(end))
            WITH path,
                 nodes(path) AS nodes,
                 [r in relationships(path) | type(r)] AS relTypes
            RETURN nodes, relTypes
        `, { startId, endId });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, error: 'No accessible path found between these concepts.' });
        }

        const pathData = {
            nodes: result.records[0].get('nodes').map((n: any) => n.properties),
            relationships: result.records[0].get('relTypes'),
            totalCost: result.records[0].get('relTypes').length // basic cost is hop count
        };

        res.json({ success: true, data: pathData });
    } catch (error: any) {
        console.error('Pathfinding Error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate path.' });
    } finally {
        await session.close();
    }
};
