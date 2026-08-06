export interface TelegramError {
    description?: string;
    message?: string;
    error_code?: number;
}

export function getErrorMessage(err: unknown): string {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object') {
        const telegramErr = err as TelegramError;
        return telegramErr.description || telegramErr.message || JSON.stringify(err);
    }
    return String(err);
}

export function isMessageNotFound(err: unknown): boolean {
    return getErrorMessage(err).includes("message to edit not found");
}

export function isMessageNotModified(err: unknown): boolean {
    return getErrorMessage(err).includes("message is not modified");
}