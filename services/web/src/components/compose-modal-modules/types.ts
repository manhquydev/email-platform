/**
 * Types for ComposeModal
 */
import type { Inbox } from "../../types";

export interface ComposeModalProps {
    token: string;
    inboxes: Inbox[];
    onClose: () => void;
    initialSubject?: string;
    initialBody?: string;
    initialTo?: string;
    initialFrom?: string;
}

export interface ComposeFormState {
    composeFrom: string;
    composeTo: string;
    composeCc: string;
    composeBcc: string;
    showCcBcc: boolean;
    composeSubject: string;
    composeBody: string;
    files: File[];
    busy: boolean;
    error: string;
}
