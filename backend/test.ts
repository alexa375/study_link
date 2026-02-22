import { driver } from './src/config/neo4j';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const session = driver.session();
    try {
        const res = await session.run(`
            MATCH path = shortestPath((start:Concept {id: 'c1'})-[*..10]-(end:Concept {id: 'c3'}))
            WITH path,
                 nodes(path) AS nodes,
                 [r in relationships(path) | type(r)] AS relTypes
            RETURN nodes, relTypes
        `);
        const nodes = res.records[0].get('nodes');
        console.log("Is Array?", Array.isArray(nodes));
        console.log("Nodes length:", nodes.length);
        console.dir(nodes, { depth: null });

        console.log("Mapped properties:");
        console.dir(nodes.map((n: any) => n.properties));
    } finally {
        await session.close();
        await driver.close();
    }
}
test();
