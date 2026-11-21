/**
 * ShopStock Backend Entry Point
 * Express.js + MongoDB + Prisma + Socket.io
 */
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { setupWebSocket } from './websocket';
export declare const prisma: PrismaClient<{
    log: ("error" | "warn" | "query")[];
    errorFormat: "pretty";
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare let io: ReturnType<typeof setupWebSocket> | null;
export { app, httpServer, io };
//# sourceMappingURL=index.d.ts.map