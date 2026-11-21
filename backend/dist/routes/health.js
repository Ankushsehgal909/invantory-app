"use strict";
/**
 * Health Check Routes
 * System health, readiness, liveness probes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// ============================================
// Liveness Probe
// ============================================
router.get('/live', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
    });
}));
// ============================================
// Readiness Probe
// ============================================
router.get('/ready', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Check database connection
        await index_1.prisma.$executeRawUnsafe('SELECT 1');
        res.json({
            success: true,
            data: {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'healthy',
                },
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            data: {
                status: 'not ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'unhealthy',
                },
            },
        });
    }
}));
// ============================================
// Detailed Health Check
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    // Check database
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
        const dbStart = Date.now();
        await index_1.prisma.$executeRawUnsafe('SELECT 1');
        dbLatency = Date.now() - dbStart;
    }
    catch {
        dbStatus = 'unhealthy';
    }
    // Check memory
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
    };
    // Check disk space (simplified)
    const diskStatus = 'healthy'; // Would need actual check
    const totalLatency = Date.now() - startTime;
    const health = {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config_1.config.app.version,
        environment: config_1.config.app.env,
        checks: {
            database: { status: dbStatus, latencyMs: dbLatency },
            memory: { status: memoryUsageMB.heapUsed < 500 ? 'healthy' : 'warning', usage: memoryUsageMB },
            disk: { status: diskStatus },
            totalLatencyMs: totalLatency,
        },
    };
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({ success: true, data: health });
}));
// ============================================
// Metrics Endpoint (Prometheus-style)
// ============================================
router.get('/metrics', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const metrics = [
        `# HELP process_uptime_seconds Process uptime in seconds`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds ${process.uptime()}`,
        ``,
        `# HELP process_memory_bytes Memory usage in bytes`,
        `# TYPE process_memory_bytes gauge`,
        `process_memory_bytes{type="rss"} ${memoryUsage.rss}`,
        `process_memory_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
        `process_memory_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
        `process_memory_bytes{type="external"} ${memoryUsage.external}`,
        ``,
        `# HELP process_cpu_seconds_total CPU usage in seconds`,
        `# TYPE process_cpu_seconds_total counter`,
        `process_cpu_seconds_total{type="user"} ${cpuUsage.user / 1000000}`,
        `process_cpu_seconds_total{type="system"} ${cpuUsage.system / 1000000}`,
        ``,
        `# HELP nodejs_version Node.js version`,
        `# TYPE nodejs_version gauge`,
        `nodejs_version{version="${process.version}"} 1`,
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
}));
exports.default = router;
//# sourceMappingURL=health.js.map