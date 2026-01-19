/**
 * Types and constants for LabelsTab
 */
import type { Label, Inbox } from "../../../types";

export interface LabelsTabProps {
    inboxId?: string; // Kept for backward compat or direct usage
    inboxes?: Inbox[];
    selectedInboxId?: string;
    onInboxChange?: (id: string) => void;
}

/** Default label color */
export const DEFAULT_LABEL_COLOR = "#6366f1";

/** Available color palette for labels */
export const LABEL_COLORS = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
    "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
    "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"
];

export type { Label };
