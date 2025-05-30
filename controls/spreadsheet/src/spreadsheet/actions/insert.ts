import { Spreadsheet } from '../base/index';
import { completeAction, focus, insertSheetTab, refreshImagePosition, updateScrollValue } from '../common/index';
import { beforeInsert, insert, InsertDeleteEventArgs, triggerDataChange, getRowsHeight, ActionEventArgs, RowModel, ChartModel, getChartRowIdxFromClientY, getChartColIdxFromClientX, refreshChartCellOnInit, addDPRValue } from '../../workbook/index';
import { SheetModel, CellModel, getCell, getSheet, getCellIndexes, getCellAddress, getColumnsWidth } from '../../workbook/index';
import { skipHiddenIdx } from '../../workbook/index';

/**
 * The `Insert` module is used to insert cells, rows, columns and sheets in to the spreadsheet.
 */
export class Insert {
    private parent: Spreadsheet;
    /**
     * Constructor for the Spreadsheet insert module.
     *
     * @param {Spreadsheet} parent - Specify the spreadsheet instance.
     * @private
     */
    constructor(parent: Spreadsheet) {
        this.parent = parent;
        this.addEventListener();
    }
    private insert(actionArgs: ActionEventArgs): void {
        const args: InsertDeleteEventArgs = actionArgs.eventArgs;
        this.parent.notify(beforeInsert, args);
        const sheet: SheetModel = getSheet(this.parent, args.activeSheetIndex);
        switch (args.modelType) {
        case 'Sheet':
            this.parent.notify(
                insertSheetTab, { startIdx: args.index, endIdx: args.index + (args.model.length - 1), preventUpdate: !args.isAction });
            this.parent.renderModule.refreshSheet();
            break;
        case 'Row':
            if (args.activeSheetIndex === this.parent.activeSheetIndex) {
                const frozenRow: number = this.parent.frozenRowCount(sheet);
                if (!this.parent.scrollSettings.enableVirtualization ||
                    args.index <= this.parent.viewport.bottomIndex) {
                    if (args.freezePane) {
                        this.parent.renderModule.refreshSheet(false, false, true);
                    } else if (this.parent.scrollSettings.enableVirtualization) {
                        const frozenCol: number = this.parent.frozenColCount(sheet);
                        if (args.index >= this.parent.viewport.topIndex + frozenRow) {
                            const frozenIndexes: number[] = [];
                            let colIndex: number;
                            if (frozenCol) {
                                colIndex = getCellIndexes(sheet.topLeftCell)[1];
                                frozenIndexes.push(frozenRow);
                                frozenIndexes.push(this.parent.viewport.leftIndex + frozenCol);
                            } else {
                                colIndex = this.parent.viewport.leftIndex;
                            }
                            const prevColIdx: number = this.parent.viewport.leftIndex;
                            this.parent.renderModule.refreshUI(
                                {
                                    rowIndex: this.parent.viewport.topIndex, colIndex: colIndex, refresh: 'Row',
                                    frozenIndexes: frozenIndexes, skipUpdateOnFirst: this.parent.viewport.topIndex +
                                        frozenRow === skipHiddenIdx(sheet, frozenRow, true)
                                });
                            if (frozenCol) {
                                this.parent.viewport.leftIndex = prevColIdx;
                            }
                        }
                        const topIdx: number = getCellIndexes(sheet.paneTopLeftCell)[0];
                        if (args.index < topIdx) {
                            this.parent.notify(updateScrollValue, { scrollTop: getRowsHeight(sheet, frozenRow, topIdx - 1, true) });
                            this.parent.goTo(getCellAddress(args.index, skipHiddenIdx(sheet, frozenCol, true, 'columns')));
                        }
                        this.parent.selectRange(sheet.selectedRange);
                    } else {
                        this.parent.renderModule.refreshSheet(false, false, true);
                    }
                } else if (this.parent.scrollSettings.isFinite && (this.parent.viewport.topIndex + frozenRow ===
                    skipHiddenIdx(sheet, 0, true) || this.parent.viewport.bottomIndex === skipHiddenIdx(
                    sheet, sheet.rowCount - args.model.length - 1, false))) {
                    this.parent.renderModule.refreshSheet(false, false, true);
                }
            }
            break;
        case 'Column':
            if (args.activeSheetIndex === this.parent.activeSheetIndex) {
                const frozenCol: number = this.parent.frozenColCount(sheet);
                if (!this.parent.scrollSettings.enableVirtualization || args.index <= this.parent.viewport.rightIndex) {
                    if (args.freezePane) {
                        this.parent.renderModule.refreshSheet(false, false, true);
                    } else if (this.parent.scrollSettings.enableVirtualization) {
                        const frozenRow: number = this.parent.frozenRowCount(sheet);
                        if (args.index >= this.parent.viewport.leftIndex + frozenCol) {
                            let frozenIndexes: number[] = [];
                            if (frozenRow) {
                                frozenIndexes = [frozenRow + this.parent.viewport.topIndex, frozenCol];
                            }
                            const rowIndex: number = frozenRow ? getCellIndexes(sheet.topLeftCell)[0] : this.parent.viewport.topIndex;
                            const prevRowIdx: number = this.parent.viewport.topIndex;
                            this.parent.renderModule.refreshUI(
                                { skipUpdateOnFirst: this.parent.viewport.leftIndex + frozenCol === skipHiddenIdx(
                                    sheet, frozenCol, true, 'columns'), rowIndex: rowIndex, colIndex: this.parent.viewport.leftIndex,
                                refresh: 'Column', frozenIndexes: frozenIndexes });
                            if (frozenRow) {
                                this.parent.viewport.topIndex = prevRowIdx;
                            }
                        }
                        const leftIdx: number = getCellIndexes(sheet.paneTopLeftCell)[1];
                        if (args.index < leftIdx) {
                            this.parent.notify(updateScrollValue, { scrollLeft: getColumnsWidth(sheet, 0, leftIdx - 1, true) });
                            this.parent.goTo(getCellAddress(skipHiddenIdx(sheet, frozenRow, true), args.index));
                        }
                        this.parent.selectRange(sheet.selectedRange);
                    } else {
                        this.parent.renderModule.refreshSheet(false, false, true);
                    }
                } else if (this.parent.scrollSettings.isFinite && (this.parent.viewport.leftIndex + frozenCol ===
                    skipHiddenIdx(sheet, 0, true, 'columns') || this.parent.viewport.rightIndex === skipHiddenIdx(
                    sheet, sheet.colCount - args.model.length - 1, false, 'columns'))) {
                    this.parent.renderModule.refreshSheet(false, false, true);
                }
            }
            break;
        }
        this.refreshImgChartElement(args.model.length, this.parent.activeSheetIndex, args.modelType, args.index);
        if (args.isAction) {
            delete args.isAction;
            this.parent.notify(completeAction, actionArgs);
            focus(this.parent.element);
        } else if (!args.isUndoRedo) {
            args.isMethod = true;
            this.parent.notify(triggerDataChange, actionArgs);
        }
    }
    private refreshImgChartElement(count: number, sheetIdx: number, modelType: string, index: number): void {
        if (modelType === 'Sheet') { return; }
        const sheet: SheetModel = this.parent.sheets[sheetIdx as number];
        const rows: RowModel[] = sheet.rows;
        for (let i: number = 0, rowLen: number = rows.length; i < rowLen; i++) {
            const cells: CellModel[] = rows[i as number] && rows[i as number].cells;
            if (cells && cells.length) {
                for (let j: number = 0; j < cells.length; j++) {
                    const cellObj: CellModel = getCell(i, j, sheet);
                    if ((modelType === 'Row' && i >= index) || (modelType === 'Column' && j >= index)) {
                        if (cellObj && cellObj.image && cellObj.image.length > 0) {
                            this.parent.notify(refreshImagePosition, {
                                rowIdx: i, colIdx: j, sheetIdx: sheetIdx, type: modelType, count: count, status: 'insert'
                            });
                        }
                        if (cellObj && cellObj.chart && cellObj.chart.length > 0) {
                            for (let k: number = 0; k < cellObj.chart.length; k++) {
                                const chartModel: ChartModel = cellObj.chart[k as number];
                                const chartRowIdx: { clientY: number, isImage?: boolean } = {
                                    clientY: Number(addDPRValue(chartModel.top).toFixed(2)), isImage: true
                                };
                                const chartColIdx: { clientX: number, isImage?: boolean } = {
                                    clientX: Number(addDPRValue(chartModel.left).toFixed(2)), isImage: true
                                };
                                this.parent.notify(getChartRowIdxFromClientY, chartRowIdx);
                                this.parent.notify(getChartColIdxFromClientX, chartColIdx);
                                if (i !== chartRowIdx.clientY || j !== chartColIdx.clientX) {
                                    const eventArgs: Object = {
                                        prevTop: chartModel.top, prevLeft: chartModel.left, prevRowIdx: i, prevColIdx: j,
                                        prevHeight: chartModel.height, prevWidth: chartModel.width, currentTop: chartModel.top,
                                        currentLeft: chartModel.left, currentRowIdx: chartRowIdx.clientY,
                                        currentColIdx: chartColIdx.clientX, currentHeight: chartModel.height,
                                        currentWidth: chartModel.width, id: chartModel.id, requestType: 'chartRefreshOnInit'
                                    };
                                    this.parent.notify(refreshChartCellOnInit, eventArgs);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private addEventListener(): void {
        this.parent.on(insert, this.insert, this);
    }
    /**
     * Destroy insert module.
     *
     * @returns {void} - Destroy insert module.
     */
    public destroy(): void {
        this.removeEventListener();
        this.parent = null;
    }
    private removeEventListener(): void {
        if (!this.parent.isDestroyed) {
            this.parent.off(insert, this.insert);
        }
    }
    /**
     * Get the insert module name.
     *
     * @returns {string} - Get the insert module name.
     */
    public getModuleName(): string {
        return 'insert';
    }
}
