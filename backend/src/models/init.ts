import { driver } from '../config/neo4j';

export const initializeDatabase = async () => {
    const session = driver.session();
    try {
        console.log('Initializing Neo4j Schema & Constraints...');

        // 1. Concept Node Constraints
        await session.run(`
            CREATE CONSTRAINT concept_id IF NOT EXISTS 
            FOR (c:Concept) REQUIRE c.id IS UNIQUE
        `);

        // 2. User Node Constraints
        await session.run(`
            CREATE CONSTRAINT user_id IF NOT EXISTS 
            FOR (u:User) REQUIRE u.id IS UNIQUE
        `);

        // 3. User Concept State Constraints
        await session.run(`
            CREATE CONSTRAINT user_concept_state IF NOT EXISTS 
            FOR ()-[s:HAS_STATE]-() REQUIRE s.id IS UNIQUE
        `);

        console.log('Schema & Constraints initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize Neo4j Schema:', error);
    } finally {
        await session.close();
    }
};

// If run directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Done.');
            process.exit(0);
        })
        .catch(console.error);
}
