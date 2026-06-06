export interface ConsumedAction {
    action: string;
}
export declare function consumePendingAction(appKey: string): ConsumedAction | null;
export declare function installPendingActionWatcher(appKey: string, send: (action: string) => void): void;
