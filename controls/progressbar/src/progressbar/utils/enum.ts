/**
 * progress bar type
 */
export type ProgressType =
    /** linear */
    'Linear' |
    /** circular */
    'Circular';

/**
 * Corner type
 */
export type CornerType =
    /** Auto will change based on theme */
    'Auto' |
    /** square */
    'Square' |
    /** Round */
    'Round' |
    /** Round4px */
    'Round4px';


/**
 * theme
 */
export type ProgressTheme =
    /** Material */
    'Material' |
    /** Fabric */
    'Fabric' |
    /** Bootstrap */
    'Bootstrap' |
    /** Bootstrap4 */
    'Bootstrap4' |
    /** HighContrast */
    'HighContrast'|
    /** Tailwind */
    'Tailwind' |
    /** TailwindDark */
    'TailwindDark' |
    /** Tailwind3 */
    'Tailwind3' |
    /** Tailwind3Dark */
    'Tailwind3Dark' |
    /** FabricDark */
    'FabricDark' |
    /** BootstrapDark */
    'BootstrapDark' |
    /** MaterialDark */
    'MaterialDark' |
    /** Bootstrap5 */
    'Bootstrap5' |
    /** Bootstrap5Dark */
    'Bootstrap5Dark'|
    /** Fluent */
    'Fluent' |
    /** FluentDark */
    'FluentDark' |
    /** Fluent2 */
    'Fluent2' |
    /** Fluent2Dark */
    'Fluent2Dark' |
    /** Fluent2HighContrast */
    'Fluent2HighContrast' |
    /** Material 3 */
    'Material3' |
    /** Material 3 dark */
    'Material3Dark';

/**
 * Text alignment
 */
export type TextAlignmentType =
    /** Near */
    'Near' |
    /** Center */
    'Center' |
    /** Far */
    'Far';

/**
 * Linear modes
 */
export type ModeType =
    'Auto' |
    'Success' |
    'Info' |
    'Danger' |
    'Warning';
