/**
 * Barrel export for inbox-manager hooks
 */
export { useInboxData } from './use-inbox-data';
export type { UseInboxDataReturn } from './use-inbox-data';

export { useInboxFilters, useFilteredInboxes } from './use-inbox-filters';
export type { SortOption, FilterOption, UseInboxFiltersReturn } from './use-inbox-filters';

export { useInboxActions } from './use-inbox-actions';
export type { UseInboxActionsProps, UseInboxActionsReturn } from './use-inbox-actions';

export { useInboxSearch } from './use-inbox-search';
export type { UseInboxSearchReturn } from './use-inbox-search';

export { useInboxManagerData } from './use-inbox-manager-data';
export type { UseInboxManagerDataReturn } from './use-inbox-manager-data';

export { useInboxManagerActions } from './use-inbox-manager-actions';
export type { UseInboxManagerActionsProps, UseInboxManagerActionsReturn } from './use-inbox-manager-actions';
