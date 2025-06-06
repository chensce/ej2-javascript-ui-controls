import { Property, ChildProperty } from '@syncfusion/ej2-base';
import { WrapMode } from '../enum';

/**
 * Configures the text wrapping behavior of the TreeGrid.
 */
export class TextWrapSettings extends ChildProperty<TextWrapSettings> {
    /**
     * Defines the `wrapMode` of the TreeGrid, controlling how text wrapping is applied to header and content.
     * Available wrap modes are:
     * * `Both`: Wraps both the header and the content of all columns.
     * * `Content`: Wraps only the content of the columns, allowing headers to remain unchanged.
     * * `Header`: Wraps only the header text of the columns, while content remains unwrapped.
     *
     * Text wrapping can improve readability when dealing with long text values or narrow column widths.
     *
     * @default Both
     */
    @Property('Both')
    public wrapMode: WrapMode;
}
