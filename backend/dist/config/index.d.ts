/**
 * Backend Configuration
 * Centralized configuration management
 */
export declare const config: {
    readonly app: {
        readonly name: string;
        readonly version: string;
        readonly env: string;
        readonly port: number;
        readonly apiPrefix: string;
        readonly frontendUrl: string;
        readonly mobileUrl: string;
    };
    readonly database: {
        readonly url: string;
    };
    readonly jwt: {
        readonly accessSecret: string;
        readonly refreshSecret: string;
        readonly accessExpiry: string;
        readonly refreshExpiry: string;
        readonly issuer: string;
        readonly audience: string;
    };
    readonly redis: {
        readonly url: string;
        readonly enabled: boolean;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
        readonly authMaxRequests: number;
    };
    readonly cors: {
        readonly origin: string[];
        readonly credentials: true;
    };
    readonly upload: {
        readonly maxFileSize: number;
        readonly uploadDir: string;
        readonly allowedImageTypes: readonly ["image/jpeg", "image/png", "image/webp"];
        readonly allowedDocumentTypes: readonly ["application/pdf", "text/csv"];
    };
    readonly email: {
        readonly host: string;
        readonly port: number;
        readonly secure: boolean;
        readonly user: string;
        readonly pass: string;
        readonly from: string;
    };
    readonly sms: {
        readonly provider: string;
        readonly accountSid: string;
        readonly authToken: string;
        readonly fromNumber: string;
    };
    readonly push: {
        readonly vapidPublicKey: string;
        readonly vapidPrivateKey: string;
        readonly vapidSubject: string;
    };
    readonly logging: {
        readonly level: string;
        readonly prettyPrint: boolean;
    };
    readonly security: {
        readonly bcryptRounds: number;
        readonly helmetEnabled: boolean;
        readonly corsEnabled: boolean;
    };
    readonly websocket: {
        readonly enabled: boolean;
        readonly pingInterval: number;
        readonly pingTimeout: number;
    };
    readonly sync: {
        readonly batchSize: number;
        readonly maxRetries: number;
        readonly retryDelayMs: number;
    };
    readonly backup: {
        readonly enabled: boolean;
        readonly schedule: string;
        readonly retentionDays: number;
        readonly storagePath: string;
    };
};
export type Config = typeof config;
export type AppConfig = typeof config.app;
export type DatabaseConfig = typeof config.database;
export type JwtConfig = typeof config.jwt;
export type RedisConfig = typeof config.redis;
export type RateLimitConfig = typeof config.rateLimit;
export type CorsConfig = typeof config.cors;
export type UploadConfig = typeof config.upload;
export type EmailConfig = typeof config.email;
export type SmsConfig = typeof config.sms;
export type PushConfig = typeof config.push;
export type LoggingConfig = typeof config.logging;
export type SecurityConfig = typeof config.security;
export type WebsocketConfig = typeof config.websocket;
export type SyncConfig = typeof config.sync;
export type BackupConfig = typeof config.backup;
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map