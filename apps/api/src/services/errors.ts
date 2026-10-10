/** 服務層錯誤 → app.onError 對應 HTTP 狀態與 envelope。 */
export class AppError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details?: unknown;

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export class NotFoundError extends AppError {
    constructor(what: string) {
        super(404, 'NOT_FOUND', `${what} not found`);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, 'CONFLICT', message);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, issues?: unknown) {
        super(400, 'VALIDATION', message, issues);
    }
}

export class KillSwitchError extends AppError {
    constructor() {
        super(503, 'KILL_SWITCH', 'config.killSwitch is on; all Claude calls are refused');
    }
}

export class BudgetExceededError extends AppError {
    constructor(scope: string, spent: number, limit: number) {
        super(429, 'BUDGET_EXCEEDED', `${scope} budget exceeded: spent ${spent.toFixed(4)} of ${limit}`, { scope, spent, limit });
    }
}
