import { useWindowDimensions } from 'react-native';

/**
 * Responsive utilities for tablet + phone support.
 *
 * Breakpoints:
 *   Phone   < 768 px
 *   Tablet  ≥ 768 px
 *
 * Base design width: 375 px (iPhone 14 / SE-3).
 */

const BASE_WIDTH = 375;

export function useResponsive() {
    const { width, height } = useWindowDimensions();

    const isTablet = width >= 768;
    const isSmallPhone = width < 380;

    /** Scale a pixel value proportionally to screen width (capped at 1.4×). */
    const scale = (size: number) => {
        const factor = Math.min(width / BASE_WIDTH, 1.4);
        return Math.round(size * factor);
    };

    /**
     * Maximum width for main content on tablets so it doesn't stretch
     * edge-to-edge. On phones this returns undefined (full width).
     */
    const contentMaxWidth: number | undefined = isTablet
        ? Math.min(width >= 1024 ? 1000 : 860, Math.max(0, width - 32))
        : undefined;

    /**
     * How many grid columns fit given a minimum column width and
     * available horizontal space (after accounting for padding + gaps).
     *
     * @param minColWidth  Minimum width per column (default 150)
     * @param hPadding     Total horizontal padding on the container (default 48)
     * @param gap          Gap between columns (default 12)
     */
    const gridColumns = (
        minColWidth = 150,
        hPadding = 48,
        gap = 12,
    ): number => {
        const available = (contentMaxWidth ?? width) - hPadding;
        const cols = Math.floor((available + gap) / (minColWidth + gap));
        return Math.max(2, cols);
    };

    /**
     * Calculate KPI grid card width.
     * On phones: 2 columns.  On tablets: 4 columns.
     */
    const kpiColumns = isTablet ? 4 : 2;
    const kpiCardWidth = (hPadding = 48, gap = 12) => {
        const containerW = contentMaxWidth ?? width;
        return (containerW - hPadding - gap * (kpiColumns - 1)) / kpiColumns;
    };

    /**
     * Calculate discovery grid column count.
     * Phones: 3.  Small tablets: 4.  Large tablets: 6.
     */
    const discoveryColumns = isTablet ? (width >= 1024 ? 6 : 4) : 3;

    return {
        width,
        height,
        isTablet,
        isSmallPhone,
        scale,
        contentMaxWidth,
        gridColumns,
        kpiColumns,
        kpiCardWidth,
        discoveryColumns,
    };
}
