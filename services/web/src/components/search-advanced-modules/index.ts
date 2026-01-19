/**
 * Barrel export for search-advanced-modules
 */
export type { SearchFilter, SearchAdvancedProps, SearchOperator } from "./search-types";
export { SEARCH_OPERATORS, RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from "./search-types";
export { useRecentSearches, useClickOutside, useSearchFilters, useSearchRefs } from "./search-hooks";
export {
    SearchIcon,
    ClearButton,
    FilterToggle,
    OperatorsPanel,
    RecentSearchesList,
    FiltersPanel
} from "./search-components";
