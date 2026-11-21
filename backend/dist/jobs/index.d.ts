/**
 * Cron Jobs Setup
 * Scheduled tasks for notifications, cleanup, backups
 */
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
export declare function setupCronJobs(prisma: PrismaClient, io: Server | null): void;
//# sourceMappingURL=index.d.ts.map