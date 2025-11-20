import { createServer } from './index.js';

console.log('Starting standalone server...');

try {
    const port = 3002;
    const app = createServer();

    const server = app.listen(port, () => {
        console.log(`Standalone server listening on port ${port}`);
        console.log(`Test URL: http://localhost:${port}/api/subscriptions/plans`);
    });

    server.on('error', (err) => {
        console.error('Server error:', err);
    });

} catch (error) {
    console.error('Failed to start server:', error);
}

// Keep process alive
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
