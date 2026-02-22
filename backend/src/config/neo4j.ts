import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Utility to verify connection on startup
export const initNeo4j = async () => {
    try {
        await driver.verifyConnectivity();
        console.log('Successfully connected to Neo4j Database.');
    } catch (error) {
        console.error('Failed to connect to Neo4j Database:', error);
        process.exit(1);
    }
};

// Graceful shutdown helper
export const closeNeo4j = async () => {
    await driver.close();
    console.log('Neo4j connection closed.');
};
