/**
 * Types for AdminSystem
 */

export interface SystemStats {
    userCount: number;
    domainCount: number;
    messageCount: number;
    recentLogins24h: number;
    serverTime: string;
    resources?: {
        cpuLoad: number;
        memUsed: number;
        memTotal: number;
        diskUsed: number;
        diskAvailable: number;
    };
}

export interface Setting {
    key: string;
    value: string;
}

export interface HistoryPoint {
    time: string;
    cpu: number | undefined;
    mem: number;
}
