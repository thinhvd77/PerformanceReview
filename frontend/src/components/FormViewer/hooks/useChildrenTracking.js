/**
 * Custom Hook: useChildrenTracking
 * 
 * Consolidates child row tracking state management.
 * Manages virtual row numbers and child score address tracking for dynamically added rows.
 */

import { useState, useMemo } from "react";

/**
 * Custom hook for tracking child rows and their score addresses
 * 
 * Manages:
 * - virtualRowNo: Counter for generating unique row IDs for dynamically added rows
 * - childrenScoreAddrs: Map of parent row index to array of child score addresses
 * - childAddrToParentRow: Reverse map from child address to parent row index
 * 
 * @returns {Object} Children tracking state and setters:
 *   - virtualRowNo: Current virtual row number
 *   - setVirtualRowNo: Setter for virtual row number
 *   - childrenScoreAddrs: Map of parent row -> child addresses
 *   - setChildrenScoreAddrs: Setter for children score addresses
 *   - childAddrToParentRow: Reverse map of child address -> parent row
 */
export function useChildrenTracking() {
    // Counter for generating unique row IDs (starts at 1000 to avoid conflicts with template rows)
    const [virtualRowNo, setVirtualRowNo] = useState(1000);

    // Map: { [sectionRowIndex]: string[] } - stores score addresses of child rows for each parent
    const [childrenScoreAddrs, setChildrenScoreAddrs] = useState({});

    // Reverse map: { [childScoreAddr]: parentRowIndex } - for quick lookup of parent from child
    const childAddrToParentRow = useMemo(() => {
        const m = {};
        Object.entries(childrenScoreAddrs || {}).forEach(([pIdx, list]) => {
            (list || []).forEach((addr) => {
                m[addr] = Number(pIdx);
            });
        });
        return m;
    }, [childrenScoreAddrs]);

    return {
        virtualRowNo,
        setVirtualRowNo,
        childrenScoreAddrs,
        setChildrenScoreAddrs,
        childAddrToParentRow,
    };
}
