import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initNeo4j, closeNeo4j } from './config/neo4j';
import conceptRoutes from './routes/conceptRoutes';
import graphRoutes from './routes/graphRoutes';
import aiRoutes from './routes/aiRoutes';
import mapRoutes from './routes/mapRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/concepts', conceptRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/maps', mapRoutes);

// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Knowledge Graph Platform API is running.' });
});

// Start Server
const startServer = async () => {
    // Initialize Database
    await initNeo4j();

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
};

startServer();

// Handle process termination cleanly
process.on('SIGINT', async () => {
    await closeNeo4j();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeNeo4j();
    process.exit(0);
});
