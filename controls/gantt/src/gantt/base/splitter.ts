import { createElement, isNullOrUndefined, addClass } from '@syncfusion/ej2-base';
import { Gantt } from '../base/gantt';
import * as cls from '../base/css-constants';
import { Splitter as SplitterLayout, ResizeEventArgs, ResizingEventArgs } from '@syncfusion/ej2-layouts';
import { ColumnModel, SplitterSettingsModel } from '../models/models';
import { ISplitterResizedEventArgs } from '../base/interface';
import { Deferred } from '@syncfusion/ej2-data';
/**
 * Splitter module is used to define the splitter position in Gantt layout.
 */
export class Splitter {
    private parent: Gantt;
    public splitterObject: SplitterLayout;
    public splitterPreviousPositionGrid: string;
    public splitterPreviousPositionChart: string;
    private isSplitterResized: boolean = false;
    constructor(ganttObj?: Gantt) {
        this.parent = ganttObj;
        this.parent.on('destroy', this.destroy, this);
    }
    /**
     * @returns {void} .
     * @private
     */
    public renderSplitter(): void {
        const splitterPosition: string = this.calculateSplitterPosition(this.parent.splitterSettings);
        this.parent.splitterElement = createElement('div', { className: cls.splitter });
        this.parent.treeGridPane = createElement('div', { className: cls.treeGridPane });
        this.parent.chartPane = createElement('div', { className: cls.ganttChartPane });
        addClass([this.parent.chartPane], 'e-droppable');
        if (this.parent.enableRtl) {
            this.parent.splitterElement.appendChild(this.parent.chartPane);
            this.parent.splitterElement.appendChild(this.parent.treeGridPane);
        }
        else {
            this.parent.splitterElement.appendChild(this.parent.treeGridPane);
            this.parent.splitterElement.appendChild(this.parent.chartPane);
        }

        this.splitterObject = new SplitterLayout({
            height: null,
            width: this.parent.ganttWidth.toString(),
            enableRtl: this.parent.enableRtl,
            separatorSize: this.parent.splitterSettings.separatorSize,
            paneSettings: [
                {
                    resizable: true,
                    size: splitterPosition,
                    min: this.getSpliterPositionInPercentage(this.parent.splitterSettings.minimum)
                },
                {
                    resizable: true
                }
            ],
            orientation: 'Horizontal',
            resizeStart: (args: ResizeEventArgs) => {
                if (this.parent.contextMenuModule && this.parent.contextMenuModule.isOpen) {
                    this.parent.contextMenuModule.contextMenu.close();
                }
                const leftPane: HTMLElement = args.pane[0];
                const rightPane: HTMLElement = args.pane[1];
                this.splitterPreviousPositionGrid = leftPane.scrollWidth + 1 + 'px';
                this.splitterPreviousPositionChart = rightPane.scrollWidth + 1 + 'px';
                const callBackPromise: Deferred = new Deferred();
                this.parent.trigger('splitterResizeStart', args, (resizeStartArgs: ResizeEventArgs) => {
                    callBackPromise.resolve(resizeStartArgs);
                });
                return callBackPromise;
            },
            resizing: (args: ResizingEventArgs) => {
                this.parent.trigger('splitterResizing', args);
                if (this.parent.timelineModule.isZoomToFit) {
                    this.parent.timelineModule.updateTimelineAfterZooming(this.parent.timelineModule.timelineEndDate, true);
                }
            },
            resizeStop: (args: ISplitterResizedEventArgs) => {
                this.parent['calculateDimensions']();
                this.isSplitterResized = true;
                const leftPane: HTMLElement = args.pane[0];
                this.splitterPreviousPositionGrid = leftPane.scrollWidth + 1 + 'px';
                this.splitterObject.paneSettings[0].size = this.getSpliterPositionInPercentage(this.splitterPreviousPositionGrid);
                this.parent.splitterSettings.position = this.splitterObject.paneSettings[0].size;
                const callBackPromise: Deferred = new Deferred();
                this.parent.trigger('splitterResized', args, (splitterResizedArgs: ISplitterResizedEventArgs) => {
                    if (splitterResizedArgs.cancel === true) {
                        this.splitterObject.paneSettings[0].size = null;
                        this.splitterObject.paneSettings[0].size = this.getSpliterPositionInPercentage(this.splitterPreviousPositionGrid);
                        this.parent.splitterSettings.position = this.splitterObject.paneSettings[0].size;
                        this.splitterObject.paneSettings[1].size = null;
                        this.splitterObject.paneSettings[1].size = this.getSpliterPositionInPercentage(this.splitterPreviousPositionChart);
                    }
                    if (isNullOrUndefined(this.parent.projectEndDate)) {
                        this.parent.timelineModule.updateTimelineAfterZooming(this.parent.timelineModule.timelineEndDate, true);
                    }
                    callBackPromise.resolve(splitterResizedArgs);
                });
                return callBackPromise;
            }
        });
        this.parent.element.appendChild(this.parent.splitterElement);
        this.splitterObject.appendTo(this.parent.splitterElement);
        const splitterLeftPane: HTMLElement = this.splitterObject.element.querySelector('.e-split-bar');
        if (splitterLeftPane) {
            const numericValue: number = parseFloat(splitterPosition.replace('%', ''));
            const ariaValueNow: number = Math.min(100, Math.max(0, numericValue));
            splitterLeftPane.setAttribute('aria-valuenow', ariaValueNow.toString());
        }
    }
    /**
     * @param {SplitterSettingsModel} splitter .
     * @returns {string} .
     * @private
     */
    public calculateSplitterPosition(splitter: SplitterSettingsModel): string {
        if (!isNullOrUndefined(this.splitterObject) && this.parent.enablePersistence) {
            return this.splitterObject.paneSettings[0].size;
        }
        if (splitter.view === 'Grid') {
            return this.parent.enableRtl ? '0%' : '100%';
        } else if (splitter.view === 'Chart') {
            return this.parent.enableRtl ? '100%' : '0%';
        } else {
            if (!isNullOrUndefined(splitter.position) && splitter.position !== '') {
                return this.getSpliterPositionInPercentage(splitter.position);
            } else if (!isNullOrUndefined(splitter.columnIndex) && splitter.columnIndex >= 0) {
                if ((splitter.columnIndex * 150) < this.parent.ganttWidth || !this.parent.element.classList.contains('e-device')) {
                    return this.getSpliterPositionInPercentage(
                        this.getTotalColumnWidthByIndex(splitter.columnIndex).toString() + 'px');
                } else {
                    return this.getSpliterPositionInPercentage((splitter.columnIndex * 130) + 'px');
                }
            } else {
                const ganttWidth: number = this.parent.ganttWidth;
                const width: number = ganttWidth - 250;
                const widthAsString: string = width + 'px';
                return (this.parent.enableRtl) ? this.getSpliterPositionInPercentage(widthAsString) : this.getSpliterPositionInPercentage('250px');
            }
        }
    }
    /**
     * @param {string} position .
     * @returns {string} .
     */
    private getSpliterPositionInPercentage(position: string): string {
        let value: string = !isNullOrUndefined(position) && position !== '' ? position : null;
        if (!isNullOrUndefined(value)) {
            if (position.indexOf('px') !== -1) {
                const intValue: number = parseInt(position, 10);
                value = (((intValue / this.parent.ganttWidth) * 100) <= 100 ? ((intValue / this.parent.ganttWidth) * 100) + '%' :
                    '25%');
            } else {
                if (this.parent.enableRtl) {
                    const newPosition: number = 100 - parseFloat(position);
                    value = newPosition + '%';
                } else {
                    value = position.indexOf('%') === -1 ?
                        position + '%' : position;
                }
            }
        }
        return value;
    }
    /**
     * @param {number} index .
     * @returns {number} .
     */
    private getTotalColumnWidthByIndex(index: number): number {
        let width: number = 0;
        const ganttWidth: number = this.parent.ganttWidth;
        const originalArray: ColumnModel[] = this.parent.ganttColumns;
        const newArray: ColumnModel[] = originalArray.filter((obj: ColumnModel) => obj.visible === undefined || obj.visible === true);
        const deepCopiedArray: ColumnModel[] = newArray.map((obj: ColumnModel) => Object.assign({}, obj));
        const tr: ColumnModel[] = deepCopiedArray;
        index = tr.length > index ? index : tr.length;
        if (this.parent.enableRtl) {
            for (let column: number = 0; column < index; column++) {
                width += parseInt(tr[column as number].width as string, 10);
            }
            width = ganttWidth - width;
        } else {
            for (let column: number = 0; column < index; column++) {
                width += parseInt(tr[column as number].width as string, 10);
            }
        }
        return width;
    }
    /**
     * @returns {void} .
     * @private
     */
    public updateSplitterPosition(): void {
        this.splitterObject.separatorSize = this.parent.splitterSettings.separatorSize;
        const splitterPosition: string = this.calculateSplitterPosition(this.parent.splitterSettings);
        this.splitterObject.paneSettings[0].min = this.getSpliterPositionInPercentage(this.parent.splitterSettings.minimum);
        this.splitterObject.dataBind();
        if (!this.isSplitterResized) {
            this.splitterObject.paneSettings[0].size = splitterPosition;
        }
        this.isSplitterResized = false;
        if (isNullOrUndefined(this.parent.projectEndDate)) {
            this.parent.timelineModule.updateTimelineAfterZooming(this.parent.timelineModule.timelineEndDate, true);
        }
    }
    /**
     * @returns {void} .
     * @private
     */
    public triggerCustomResizedEvent(): void {
        const pane1: HTMLElement = this.splitterObject.element.querySelectorAll('.e-pane')[0] as HTMLElement;
        const pane2: HTMLElement = this.splitterObject.element.querySelectorAll('.e-pane')[1] as HTMLElement;
        const eventArgs: ISplitterResizedEventArgs = {
            event: null,
            element: this.splitterObject.element,
            pane: [pane1, pane2],
            index: [0, 1],
            separator: this.splitterObject.element.querySelector('.e-split-bar'),
            paneSize: [pane1.offsetWidth, pane2.offsetWidth]
        };
        this.parent.trigger('splitterResized', eventArgs);
        if (eventArgs.cancel === true) {
            this.splitterObject.paneSettings[0].size = this.getSpliterPositionInPercentage(this.splitterPreviousPositionGrid);
            this.splitterObject.paneSettings[1].size = this.getSpliterPositionInPercentage(this.splitterPreviousPositionChart);
        }
    }
    private destroy(): void {
        this.splitterObject.destroy();
        this.parent.off('destroy', this.destroy);
    }
}
