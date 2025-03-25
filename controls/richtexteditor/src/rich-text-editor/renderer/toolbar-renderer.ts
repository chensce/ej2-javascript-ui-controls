import { addClass, Browser, L10n, removeClass, formatUnit, isNullOrUndefined, isNullOrUndefined as isNOU, EventHandler, detach } from '@syncfusion/ej2-base';
import { getInstance, closest, MouseEventArgs, selectAll } from '@syncfusion/ej2-base';
import { Toolbar, ClickEventArgs, BeforeCreateArgs, OverflowMode } from '@syncfusion/ej2-navigations';
import { DropDownButton, MenuEventArgs, BeforeOpenCloseMenuEventArgs, OpenCloseMenuEventArgs } from '@syncfusion/ej2-splitbuttons';
import { Popup, Tooltip, TooltipEventArgs } from '@syncfusion/ej2-popups';
import * as classes from '../base/classes';
import * as events from '../base/constant';
import { CLS_TOOLBAR, CLS_DROPDOWN_BTN, CLS_RTE_ELEMENTS, CLS_TB_BTN, CLS_INLINE_DROPDOWN,
    CLS_COLOR_CONTENT, CLS_FONT_COLOR_DROPDOWN, CLS_BACKGROUND_COLOR_DROPDOWN, CLS_COLOR_PALETTE,
    CLS_FONT_COLOR_PICKER, CLS_BACKGROUND_COLOR_PICKER, CLS_CUSTOM_TILE, CLS_NOCOLOR_ITEM,
    CLS_BULLETFORMATLIST_TB_BTN, CLS_NUMBERFORMATLIST_TB_BTN, CLS_LIST_PRIMARY_CONTENT } from '../base/classes';
import { IRenderer, IRichTextEditor, IToolbarOptions, IDropDownModel, IColorPickerModel, IColorPickerEventArgs, IDropDownItemModel, ActionBeginEventArgs } from '../base/interface';
import { ColorPicker, PaletteTileEventArgs, ModeSwitchEventArgs } from '@syncfusion/ej2-inputs';
import { hasClass } from '../base/util';
import { ServiceLocator } from '../services/service-locator';
import { ToolbarStatus } from '../../editor-manager/plugin/toolbar-status';
import { IToolbarStatus } from '../../common/interface';
import { defaultLocale } from '../models/default-locale';

/**
 * `Toolbar renderer` module is used to render toolbar in RichTextEditor.
 *
 * @hidden
 * @deprecated
 */
export class ToolbarRenderer implements IRenderer {
    private mode: OverflowMode;
    private toolbarPanel: Element;
    /**
     *
     * @hidden
     * @private
     */
    public parent: IRichTextEditor;
    private currentElement: HTMLElement;
    private currentDropdown: DropDownButton;
    private tooltip: Tooltip;
    private l10n: L10n;
    private tooltipTargetEle: Element;
    public isDestroyed: boolean;
    public isEscapeKey: boolean = false;

    /**
     * Constructor for toolbar renderer module
     *
     * @param {IRichTextEditor} parent - specifies the parent element.
     * @param {ServiceLocator} serviceLocator - specifies the serviceLocator
     */
    public constructor(parent?: IRichTextEditor, serviceLocator?: ServiceLocator) {
        this.parent = parent;
        this.isDestroyed = false;
        if (serviceLocator){
            this.l10n = serviceLocator.getService<L10n>('rteLocale');
        }
        this.wireEvent();
    }

    private wireEvent(): void {
        this.parent.on(events.destroy, this.destroy, this);
        this.parent.on(events.destroyTooltip, this.destroyTooltip, this);
        this.parent.on(events.closeTooltip, this.closeTooltip, this);
    }

    private destroyTooltip(): void {
        const currentDocument: Document = this.parent.iframeSettings.enable ? this.parent.contentModule.getPanel().ownerDocument :
            this.parent.contentModule.getDocument();
        if (!isNullOrUndefined(currentDocument.querySelector('.e-tooltip-wrap')) && !isNullOrUndefined(currentDocument.querySelector( '[data-tooltip-id]'))) {
            const tooltipTargetEle: HTMLElement = currentDocument.querySelector('[data-tooltip-id]');
            const event: MouseEvent = new MouseEvent('mouseleave', {bubbles: true, cancelable: true});
            tooltipTargetEle.dispatchEvent(event);
        }
    }

    private unWireEvent(): void {
        this.parent.off(events.destroy, this.destroy);
        this.parent.off(events.destroyTooltip, this.destroyTooltip);
        this.parent.off(events.closeTooltip, this.closeTooltip);
    }

    private toolbarBeforeCreate(e: BeforeCreateArgs): void {
        if (this.mode === 'Extended') {
            e.enableCollision = false;
        }
    }

    private toolbarCreated(): void {
        this.parent.notify(events.toolbarCreated, this);
        if (this.mode === 'Extended') {
            const extendedToolbarElement: HTMLElement = this.toolbarPanel.querySelector(`#${CSS.escape(this.parent.element.id)}_toolbar_nav`);
            if (extendedToolbarElement) {
                EventHandler.add(extendedToolbarElement, 'mousedown', this.extendedToolbarMouseDownHandler, this);
            }
        }
    }

    private extendedToolbarMouseDownHandler(): void {
        if (this.parent.userAgentData.isSafari()) {
            this.parent.notify(events.selectionSave, {});
        }
    }

    private toolbarClicked(args: ClickEventArgs): void {
        if ( !this.parent.enabled) {
            return;
        }
        const toolbarClickEventArgs: ClickEventArgs = { item: args.item, originalEvent: args.originalEvent, cancel: false };
        this.parent.trigger('toolbarClick', toolbarClickEventArgs, (clickEventArgs: ClickEventArgs) => {
            if ((!this.parent.readonly || isNullOrUndefined(args.item)) && !clickEventArgs.cancel) {
                this.parent.notify(events.toolbarClick, clickEventArgs);
            }
        });
    }

    private dropDownSelected(args: MenuEventArgs): void {
        this.parent.notify(events.dropDownSelect, { element: args.element, item: args.item, originalEvent: args.event });
        this.destroyTooltip();
    }

    private beforeDropDownItemRender(args: MenuEventArgs): void {
        if (this.parent.readonly || !this.parent.enabled) {
            return;
        }
        this.parent.notify(events.beforeDropDownItemRender, args);
    }

    private tooltipBeforeRender(args: TooltipEventArgs): void {
        if (!isNOU(args.target.getAttribute('title'))) {
            const tooltipTarget: string = args.target.getAttribute('title');
            let tooltipText: string;
            switch (tooltipTarget) {
            case 'Minimize':
                tooltipText = this.l10n.getConstant('minimize');
                args.target.setAttribute('title', tooltipText + ' (Esc)');
                break;
            case 'Maximize':
                tooltipText = this.l10n.getConstant('maximize');
                args.target.setAttribute('title', tooltipText + ' (Ctrl+Shift+F)');
                break;
            }
        }
        if (args.target.querySelector('.e-active')) {
            args.cancel = true;
            if (!isNOU(args.target.getAttribute('title'))) {
                this.closeTooltip({ target: args.target, isTitle: true });
            }
        }
    }

    private dropDownOpen(args: MenuEventArgs): void {
        if (args.element.parentElement.getAttribute('id').indexOf('TableCell') > -1 && !isNOU(args.element.parentElement.querySelector('.e-cell-merge'))) {
            const listEle: NodeListOf<HTMLElement> = args.element.querySelectorAll('li');
            const selectedEles: NodeListOf<HTMLElement> = this.parent.inputElement.querySelectorAll('.e-cell-select');
            if (selectedEles.length === 1) {
                addClass([listEle[0]], 'e-disabled');
                removeClass([listEle[1], listEle[2]], 'e-disabled');
            } else if (selectedEles.length > 1) {
                if (!Array.from(selectedEles).every((element: HTMLElement) =>
                    element.tagName.toLowerCase() === selectedEles[0].tagName.toLowerCase()
                )) {
                    addClass([listEle[0]], 'e-disabled');
                } else {
                    removeClass([listEle[0]], 'e-disabled');
                }
                addClass([listEle[1], listEle[2]], 'e-disabled');
            }
        }
        this.parent.notify(events.selectionSave, args);
    }

    private dropDownClose(args: MenuEventArgs): void {
        if (!this.isEscapeKey)
        {
            this.parent.notify(events.selectionRestore, args);
        }
        this.isEscapeKey = false;
    }

    private dropDownBeforeClose(args: BeforeOpenCloseMenuEventArgs): void {
        if (!isNOU(args.event) && (args.event as KeyboardEvent).key === 'Escape' && (args.event as KeyboardEvent).keyCode === 27) {
            this.isEscapeKey = true;
            this.parent.notify(events.preventQuickToolbarClose, args);
        }
    }
    /**
     * renderToolbar method
     *
     * @param {IToolbarOptions} args - specifies the arguments.
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderToolbar(args: IToolbarOptions): void {
        this.setPanel(args.target);
        this.renderPanel();
        this.mode = args.overflowMode;
        args.rteToolbarObj.toolbarObj = new Toolbar({
            items: args.items,
            width: '100%',
            overflowMode: args.overflowMode,
            beforeCreate: this.toolbarBeforeCreate.bind(this),
            created: this.toolbarCreated.bind(this),
            clicked: this.toolbarClicked.bind(this),
            enablePersistence: args.enablePersistence,
            enableRtl: args.enableRtl,
            cssClass: args.cssClass
        });
        args.rteToolbarObj.toolbarObj.isStringTemplate = true;
        args.rteToolbarObj.toolbarObj.createElement = this.parent.createElement;
        args.rteToolbarObj.toolbarObj.appendTo(args.target);
        if (this.parent.showTooltip && args.type === 'toolbar') {
            this.tooltip = new Tooltip({
                target: '#' + this.parent.getID() + '_toolbar_wrapper [title]',
                showTipPointer: true,
                openDelay: 400,
                opensOn: 'Hover',
                beforeRender: this.tooltipBeforeRender.bind(this),
                beforeOpen: this.tooltipBeforeOpen.bind(this),
                cssClass: this.parent.getCssClass(),
                windowCollision: true,
                position: 'BottomCenter'
            });
            this.tooltip.appendTo(args.target.parentElement);
        }
    }

    public tooltipBeforeOpen(args: TooltipEventArgs): void {
        if (args.element) {
            args.element.setAttribute('data-rte-id', this.parent.getID());
        }
    }

    /**
     * renderDropDownButton method
     *
     * @param {IDropDownModel} args - specifies the the arguments.
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderDropDownButton(args: IDropDownModel): DropDownButton {
        let css: string;
        const targetEle: HTMLElement = args.activeElement;
        args.element.classList.add(CLS_DROPDOWN_BTN);
        css = args.cssClass + ' ' + CLS_RTE_ELEMENTS + ' ' + CLS_TB_BTN;
        if (this.parent.inlineMode.enable && Browser.isDevice) {
            css = css + ' ' + CLS_INLINE_DROPDOWN;
        }
        // eslint-disable-next-line
        let proxy: this = this;
        const dropDown: DropDownButton = new DropDownButton({
            items: args.items,
            iconCss: args.iconCss,
            cssClass: css,
            content: args.content,
            enablePersistence: this.parent.enablePersistence,
            enableRtl: this.parent.enableRtl,
            select: this.dropDownSelected.bind(this),
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                if (proxy.parent.readonly || !proxy.parent.enabled) {
                    args.cancel = true;
                    return;
                }
                if (this.parent.userAgentData.isSafari() && args.event.type === 'keydown' && this.parent.formatter.editorManager.nodeSelection &&
                    !this.parent.inputElement.contains(this.parent.getRange().startContainer)) {
                    this.parent.notify(events.selectionRestore, args);
                }
                // Table styles dropdown preselect
                if (proxy.parent.editorMode !== 'Markdown') {
                    const startNode: HTMLElement = proxy.parent.getRange().startContainer.parentElement;
                    const tableEle: HTMLElement = startNode.closest('table');
                    const trow: HTMLElement = startNode.closest('tr');
                    if (!isNOU(tableEle) && tableEle.classList.contains('e-dashed-border')) {
                        for (let index: number = 0; index < args.element.childNodes.length; index++) {
                            if ((args.element.childNodes[index as number] as HTMLElement).classList.contains('e-dashed-borders')) {
                                addClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                            }
                        }
                    }
                    if (!isNOU(tableEle) && tableEle.classList.contains('e-alternate-rows') && window.getComputedStyle(trow).backgroundColor !== '') {
                        for (let index: number = 0; index < args.element.childNodes.length; index++) {
                            if ((args.element.childNodes[index as number] as HTMLElement).classList.contains('e-alternate-rows')) {
                                addClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                            }
                        }
                    }
                    //Alignments preselect
                    let alignEle: Node = proxy.parent.getRange().startContainer;
                    while (alignEle !== proxy.parent.inputElement && !isNOU(alignEle.parentElement)) {
                        if (alignEle.nodeName === '#text') {
                            alignEle = alignEle.parentElement;
                        }
                        const alignStyle: string = window.getComputedStyle(alignEle as HTMLElement).textAlign;
                        if (!isNOU(args.items[0 as number]) && (args.items[0 as number] as IDropDownItemModel).command === 'Alignments') {
                            if ((args.items[0 as number].text === 'Align Left' && (alignStyle === 'left') || alignStyle === 'start')) {
                                addClass([args.element.childNodes[0 as number]] as Element[], 'e-active');
                                break;
                            }
                            else if (args.items[1 as number].text === 'Align Center' && alignStyle === 'center') {
                                addClass([args.element.childNodes[1 as number]] as Element[], 'e-active');
                                break;
                            }
                            else if (args.items[2 as number].text === 'Align Right' && alignStyle === 'right') {
                                addClass([args.element.childNodes[2 as number]] as Element[], 'e-active');
                                break;
                            }
                            else if (args.items[3 as number].text === 'Align Justify' && alignStyle === 'justify') {
                                addClass([args.element.childNodes[3 as number]] as Element[], 'e-active');
                                break;
                            }
                        }
                        alignEle = alignEle.parentElement;
                    }
                    //image preselect
                    const closestNode: HTMLElement = startNode.closest('img');
                    const imageEle: HTMLElement = closestNode ? closestNode : (targetEle ? targetEle : startNode.querySelector('img'));
                    if (!isNOU(args.items[0 as number]) && (args.items[0 as number] as IDropDownItemModel).command === 'Images') {
                        if (!isNOU(imageEle)) {
                            let index: number;
                            if (imageEle.classList.contains('e-imgleft') || imageEle.classList.contains('e-imginline')) {
                                index = 0;
                            } else if (imageEle.classList.contains('e-imgcenter') || imageEle.classList.contains('e-imgbreak')) {
                                index = 1;
                            } else if (imageEle.classList.contains('e-imgright')) {
                                index = 2;
                            }
                            if (!isNOU(args.element.childNodes[index as number] as HTMLElement)) {
                                addClass([args.element.childNodes[index as number] as Element], 'e-active');
                            }
                        }
                    }
                    //Video preselect
                    const videoClosestNode: HTMLElement = startNode.closest('.e-video-wrap') as HTMLElement | null;
                    const videoEle: HTMLElement = videoClosestNode ? videoClosestNode : (targetEle ? targetEle : startNode.querySelector('video') as HTMLElement | null);
                    if (!isNOU(args.items[0 as number]) && (args.items[0 as number] as IDropDownItemModel).command === 'Videos') {
                        if (!isNOU(videoEle)) {
                            let index: number;
                            if (videoEle.classList.contains('e-video-left') || videoEle.classList.contains('e-video-inline')) {
                                index = 0;
                            } else if (videoEle.classList.contains('e-video-center') || videoEle.classList.contains('e-video-break')) {
                                index = 1;
                            } else if (videoEle.classList.contains('e-video-right')) {
                                index = 2;
                            }
                            if (!isNOU(args.element.childNodes[index as number] as HTMLElement)) {
                                addClass([args.element.childNodes[index as number] as Element], 'e-active');
                            }
                        }
                    }
                    //Formats preselect
                    if (!isNOU(args.items[0 as number]) && ((args.items[0 as number] as IDropDownItemModel).command === 'Formats' || (args.items[0 as number] as IDropDownItemModel).command === 'Font')) {
                        const fontName: string[] = [];
                        const formats: string[] = [];
                        let hasUpdatedActive: boolean = false;
                        this.parent.format.types.forEach((item: IDropDownItemModel): void => {
                            formats.push(item.value.toLocaleLowerCase());
                        });
                        this.parent.fontFamily.items.forEach((item: IDropDownItemModel): void => {
                            fontName.push(item.value);
                        });
                        const toolbarStatus: IToolbarStatus = ToolbarStatus.get(
                            this.parent.contentModule.getDocument(),
                            this.parent.contentModule.getEditPanel(),
                            formats,
                            null,
                            fontName
                        );
                        for (let index: number = 0; index < args.element.childNodes.length; index++) {
                            const htmlString: string = dropDown.content.trim();
                            const styleMatch: string[] = htmlString.match(/style="([^"]*)"/);
                            let styleValue: string = '';
                            if (styleMatch) {
                                styleValue = styleMatch[1];
                            }
                            const updatedHtml: string = htmlString.replace(/ style="([^"]*)"/, '');
                            const divNode: HTMLDivElement = this.parent.createElement('div') as HTMLDivElement;
                            divNode.innerHTML = updatedHtml;
                            const spanElement: HTMLSpanElement = divNode.querySelector('span');
                            spanElement.style.cssText = styleValue;
                            if (!hasUpdatedActive && ((divNode.textContent.trim() !== ''
                                && args.element.childNodes[index as number].textContent.trim() === divNode.textContent.trim()) ||
                                (((args.items[0 as number] as IDropDownItemModel).command === 'Formats' && !isNOU(toolbarStatus.formats) && this.parent.format.types[index as number].value.toLowerCase() === toolbarStatus.formats.toLowerCase() && (args.element.childNodes[index as number] as Element).classList.contains(this.parent.format.types[index as number].cssClass))
                                    || ((args.items[0 as number] as IDropDownItemModel).subCommand === 'FontName' && (args.items[0 as number] as IDropDownItemModel).command === 'Font' && !isNOU(toolbarStatus.fontname) && !isNOU(this.parent.fontFamily.items[index as number]) && this.parent.fontFamily.items[index as number].value.toLowerCase() === toolbarStatus.fontname.toLowerCase() && (args.element.childNodes[index as number] as Element).classList.contains(this.parent.fontFamily.items[index as number].cssClass)))
                                || ((((args.items[0 as number] as IDropDownItemModel).subCommand === 'FontName') && this.parent.fontFamily.items[index as number].value === '' && isNullOrUndefined(toolbarStatus.fontname) && (args.element.childNodes[index as number] as Element).classList.contains(this.parent.fontFamily.items[index as number].cssClass)) ||
                                    (((args.items[0 as number] as IDropDownItemModel).subCommand === 'FontSize') && args.element.childNodes[index as number].textContent === 'Default' && divNode.textContent === 'Font Size' && this.parent.fontSize.items[index as number].value === '' && !isNullOrUndefined(toolbarStatus.fontsize))))
                            ) {
                                if (!(args.element.childNodes[index as number] as HTMLElement).classList.contains('e-active')) {
                                    addClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                                    hasUpdatedActive = true;
                                }
                            } else {
                                removeClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                            }
                        }
                    }
                }
                else if (proxy.parent.editorMode === 'Markdown') {
                    if ((args.items[0 as number] as IDropDownItemModel).command === 'Formats') {
                        const formats: string[] = [];
                        let hasUpdatedActive: boolean = false;
                        this.parent.format.types.forEach((item: IDropDownItemModel): void => {
                            formats.push(item.value.toLocaleLowerCase());
                        });
                        const childNodes: NodeListOf<ChildNode> = args.element.childNodes;
                        for (let index: number = 0; index < childNodes.length; index++) {
                            const divNode: HTMLDivElement = this.parent.createElement('div') as HTMLDivElement;
                            divNode.innerHTML = dropDown.content.trim();
                            if (!hasUpdatedActive && ((divNode.textContent.trim() !== '' && childNodes[index as number].textContent.trim() === divNode.textContent.trim()))) {
                                if (!(childNodes[index as number] as HTMLElement).classList.contains('e-active')) {
                                    addClass([childNodes[index as number]] as Element[], 'e-active');
                                    hasUpdatedActive = true;
                                }
                            } else {
                                removeClass([childNodes[index as number]] as Element[], 'e-active');
                            }
                        }
                    }
                }
                proxy.parent.notify(events.beforeDropDownOpen, args);
            },
            close: this.dropDownClose.bind(this),
            beforeClose: this.dropDownBeforeClose.bind(this),
            open: this.dropDownOpen.bind(this),
            beforeItemRender: this.beforeDropDownItemRender.bind(this)
        });
        dropDown.isStringTemplate = true;
        dropDown.createElement = proxy.parent.createElement;
        dropDown.appendTo(args.element);
        args.element.tabIndex = -1;
        const popupElement: Element = document.getElementById(dropDown.element.id + '-popup');
        popupElement.setAttribute('aria-owns', this.parent.getID());
        return dropDown;
    }
    private mouseOutHandler (): void {
        if (!isNOU(this.tooltipTargetEle)){
            this.tooltipTargetEle.setAttribute('title', this.tooltipTargetEle.getAttribute('data-title'));
        } else {
            const currentDocument: Document = this.parent.iframeSettings.enable ? this.parent.contentModule.getPanel().ownerDocument :
                this.parent.contentModule.getDocument();
            this.tooltipTargetEle = currentDocument.querySelector('[data-title]');
            this.tooltipTargetEle.setAttribute('title', this.tooltipTargetEle.getAttribute('data-title'));
        }
        this.tooltipTargetEle.removeAttribute('data-title');
        EventHandler.remove(this.tooltipTargetEle, 'mouseout', this.mouseOutHandler);
    }
    private closeTooltip(args: { [key: string]: HTMLElement | boolean }): void {
        if (args.isTitle as boolean) {
            this.tooltipTargetEle = args.target as HTMLElement;
            this.tooltipTargetEle.setAttribute('data-title', this.tooltipTargetEle.getAttribute('title'));
            this.tooltipTargetEle.removeAttribute('title');
            EventHandler.add(this.tooltipTargetEle, 'mouseout', this.mouseOutHandler, this);
        } else {
            const currentDocument: Document = this.parent.iframeSettings.enable ? this.parent.contentModule.getPanel().ownerDocument :
                this.parent.contentModule.getDocument();
            this.tooltipTargetEle = closest(args.target as HTMLElement, '[data-tooltip-id]');
            if (!isNOU(this.tooltipTargetEle) && this.parent.showTooltip && !isNOU(currentDocument.querySelector('.e-tooltip-wrap'))) {
                this.destroyTooltip();
                this.tooltipTargetEle.setAttribute('data-title', this.tooltipTargetEle.getAttribute('title'));
                this.tooltipTargetEle.removeAttribute('title');
                EventHandler.add(this.tooltipTargetEle, 'mouseout', this.mouseOutHandler, this);
            }
        }
    }
    /**
     * renderListDropDown method
     *
     * @param {IDropDownModel} args - specifies the the arguments.
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderListDropDown(args: IDropDownModel): DropDownButton {
        // eslint-disable-next-line
        const proxy: this = this;
        let css: string = CLS_RTE_ELEMENTS + ' ' + CLS_TB_BTN + ((this.parent.inlineMode) ? (' ' + CLS_INLINE_DROPDOWN) : '');
        css += (' ' + ((args.itemName === 'NumberFormatList') ? CLS_NUMBERFORMATLIST_TB_BTN : CLS_BULLETFORMATLIST_TB_BTN));
        const content: HTMLElement = proxy.parent.createElement('span', { className: CLS_LIST_PRIMARY_CONTENT });
        const inlineEle: HTMLElement = proxy.parent.createElement('span', { className: args.cssClass });
        content.appendChild(inlineEle);
        const dropDown: DropDownButton = new DropDownButton({
            items: args.items,
            cssClass: css,
            content: args.content,
            enablePersistence: this.parent.enablePersistence,
            enableRtl: this.parent.enableRtl,
            select: this.dropDownSelected.bind(this),
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                if (Browser.info.name === 'safari' && !proxy.parent.inputElement.contains(proxy.parent.getRange().startContainer)) {
                    proxy.parent.notify(events.selectionRestore, {});
                }
                if (proxy.parent.editorMode !== 'Markdown' ) {
                    const startNode: HTMLElement = proxy.parent.getRange().startContainer.parentElement;
                    const listElem: Element = startNode.closest('LI');
                    const currentLiElem: HTMLElement = !isNOU(listElem) ? listElem.parentElement : null;
                    const currentAction: string = (args.items[0 as number] as IDropDownItemModel).subCommand;
                    if (!isNOU(currentLiElem)) {
                        const validNumberFormatAction: boolean  = (currentAction === 'NumberFormatList' && currentLiElem.nodeName === 'OL');
                        const validBulletFormatAction: boolean  = (currentAction === 'BulletFormatList' && currentLiElem.nodeName === 'UL');
                        if (validNumberFormatAction || validBulletFormatAction) {
                            let currentListStyle: string = currentLiElem.style.listStyleType.split('-').join('').toLocaleLowerCase();
                            currentListStyle = currentListStyle === 'decimal' ? 'number' : currentListStyle;
                            for (let index: number = 0; index < args.element.childNodes.length; index++) {
                                if (currentListStyle === (args.element.childNodes[index as number] as HTMLElement).innerHTML.split(' ').join('').toLocaleLowerCase()) {
                                    addClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                                    break;
                                } else if (currentListStyle === '' && (args.element.childNodes[index as number] as HTMLElement).innerHTML !== 'None') {
                                    addClass([args.element.childNodes[index as number]] as Element[], 'e-active');
                                    break;
                                }
                            }
                        }
                    }
                }
                this.closeTooltip({target: args.event.target as HTMLElement});
                if (proxy.parent.readonly || !proxy.parent.enabled) {
                    args.cancel = true;
                    return;
                }
                const element: HTMLElement = (args.event) ? (args.event.target as HTMLElement) : null;
                proxy.currentElement = dropDown.element;
                proxy.currentDropdown = dropDown;
                if (args.event && args.event.type === 'click' && (element.classList.contains(CLS_LIST_PRIMARY_CONTENT)
                    || element.parentElement.classList.contains(CLS_LIST_PRIMARY_CONTENT))) {
                    args.cancel = true;
                    return;
                }
                proxy.parent.notify(events.beforeDropDownOpen, args);
            },
            close: this.dropDownClose.bind(this),
            open: this.dropDownOpen.bind(this),
            beforeItemRender: this.beforeDropDownItemRender.bind(this)
        });
        dropDown.isStringTemplate = true;
        dropDown.createElement = proxy.parent.createElement;
        dropDown.appendTo(args.element);
        args.element.tabIndex = -1;
        args.element.setAttribute('role', 'button');
        const popupElement: Element = document.getElementById(dropDown.element.id + '-popup');
        popupElement.setAttribute('aria-owns', this.parent.getID());
        if (args.element.childElementCount === 1) {
            dropDown.element.insertBefore(content, dropDown.element.querySelector('.e-caret'));
        }
        args.element.tabIndex = -1;
        dropDown.element.removeAttribute('type');
        dropDown.element.onmousedown = (): void => {
            if (Browser.info.name === 'safari') {
                proxy.parent.notify(events.selectionSave, {});
            }
        };
        dropDown.element.onkeydown = (): void => {
            if (Browser.info.name === 'safari') {
                proxy.parent.notify(events.selectionSave, {});
            }
        };
        return dropDown;
    }
    private paletteSelection(dropDownArgs: BeforeOpenCloseMenuEventArgs, currentElement: HTMLElement): void {
        const ele: Element = dropDownArgs.element.querySelector('.e-control.e-colorpicker');
        const colorbox: HTMLElement[] = [].slice.call(selectAll('.e-tile', ele.parentElement));
        removeClass(colorbox, 'e-selected');
        const style: string = (currentElement.querySelector('.' + CLS_RTE_ELEMENTS) as HTMLElement).style.borderBottomColor;
        (colorbox.filter((colorbox: HTMLElement) => {
            if ( colorbox.style.backgroundColor === style) {
                addClass([colorbox], 'e-selected');
            }
        }));
    }
    /**
     * renderColorPickerDropDown method
     *
     * @param {IColorPickerModel} args - specifies the arguments.
     * @param {string} item - specifies the item.
     * @param {ColorPicker} colorPicker - specifies the colorpicker.
     * @param {string} defaultColor -specifies the defaultColor.
     * @param {string} toolbarType - Specifies the type of toolbar triggering the color picker.
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderColorPickerDropDown(args: IColorPickerModel, item: string, colorPicker: ColorPicker,
                                     defaultColor: string, toolbarType?: string): DropDownButton {
        // eslint-disable-next-line
        const proxy: this = this;
        let css: string = CLS_RTE_ELEMENTS + ' ' + CLS_TB_BTN + ((this.parent.inlineMode) ? (' ' + CLS_INLINE_DROPDOWN) : '');
        css += (' ' + ((item === 'backgroundcolor') ? CLS_BACKGROUND_COLOR_DROPDOWN : CLS_FONT_COLOR_DROPDOWN));
        css += this.parent.getCssClass(true);
        const content: HTMLElement = proxy.parent.createElement('span', { className: CLS_COLOR_CONTENT });
        const inlineEle: HTMLElement = proxy.parent.createElement('span', { className: args.cssClass });
        let range: Range;
        const initialBackgroundColor : string = (isNullOrUndefined(defaultColor)) ? proxy.parent.backgroundColor.default : defaultColor;
        inlineEle.style.borderBottomColor = (item === 'backgroundcolor') ?
            initialBackgroundColor  : proxy.parent.fontColor.default;
        content.appendChild(inlineEle);
        const dropDown: DropDownButton = new DropDownButton({
            target: colorPicker.element.parentElement, cssClass: css,
            enablePersistence: this.parent.enablePersistence, enableRtl: this.parent.enableRtl,
            beforeOpen: (dropDownArgs: BeforeOpenCloseMenuEventArgs): void => {
                if (proxy.parent.readonly || !proxy.parent.enabled) {
                    dropDownArgs.cancel = true; return;
                }
                const element: HTMLElement = (dropDownArgs.event) ? (dropDownArgs.event.target as HTMLElement) : null;
                proxy.currentElement = dropDown.element; proxy.currentDropdown = dropDown;
                proxy.paletteSelection(dropDownArgs, proxy.currentElement);
                if (dropDownArgs.event && dropDownArgs.event.type === 'click' && (element.classList.contains(CLS_COLOR_CONTENT)
                        || element.parentElement.classList.contains(CLS_COLOR_CONTENT))) {
                    dropDownArgs.cancel = true;
                    const colorpickerValue: string = element.classList.contains(CLS_RTE_ELEMENTS) ? element.style.borderBottomColor :
                        (element.querySelector('.' + CLS_RTE_ELEMENTS) as HTMLElement).style.borderBottomColor;
                    proxy.parent.notify(events.selectionRestore, {});
                    range = proxy.parent.formatter.editorManager.nodeSelection.getRange(proxy.parent.contentModule.getDocument());
                    const parentNode: Node = range.startContainer.parentNode;
                    const closestElement: Element = closest(range.startContainer.parentNode, 'table');
                    const isMACSelection: boolean = this.parent.userAgentData.getPlatform() === 'macOS' && !range.collapsed;
                    const allowSelectionRange: boolean = isMACSelection ? true : range.collapsed;
                    if ((range.startContainer.nodeName === 'TD' || range.startContainer.nodeName === 'TH' ||
                            (closest(range.startContainer.parentNode, 'td,th')) ||
                            (proxy.parent.iframeSettings.enable && !hasClass(parentNode.ownerDocument.querySelector('body'), 'e-lib')))
                            && allowSelectionRange && args.subCommand === 'BackgroundColor' && (closest(closestElement, '.' + classes.CLS_RTE) || proxy.parent.iframeSettings.enable) && toolbarType === 'quick') {
                        const colorPickerArgs: ActionBeginEventArgs = { name: 'tableColorPickerChanged', item: { command: 'Table', subCommand: 'BackgroundColor', value: colorpickerValue  }, ...args };
                        proxy.parent.formatter.process(this.parent, colorPickerArgs, null, colorpickerValue);
                        proxy.parent.notify(events.hideTableQuickToolbar, {});
                    } else {
                        proxy.parent.notify(events.colorPickerChanged, { item: { command: args.command, subCommand: args.subCommand,
                            value: colorpickerValue }
                        });
                    }
                    return;
                } else {
                    const ele: HTMLElement = (dropDownArgs.element.querySelector('.e-control.e-colorpicker') as HTMLElement);
                    const inst: ColorPicker = getInstance(ele, ColorPicker) as ColorPicker;
                    inst.showButtons = (dropDownArgs.element.querySelector('.e-color-palette')) ? false : true; inst.dataBind();
                }
                dropDownArgs.element.onclick = (args: MouseEventArgs): void => {
                    if ((args.target as HTMLElement).classList.contains('e-cancel')) {
                        dropDown.toggle();
                    }
                };
            },
            open: (dropDownArgs: OpenCloseMenuEventArgs): void => {
                this.setColorPickerContentWidth(colorPicker); let focusEle: HTMLElement;
                const ele: HTMLElement = (dropDownArgs.element.querySelector('.e-control.e-colorpicker') as HTMLElement);
                if (dropDownArgs.element.querySelector('.e-color-palette')) {
                    focusEle = (ele.parentElement.querySelector('.e-palette') as HTMLElement);
                } else {
                    focusEle = (ele.parentElement.querySelector('e-handler') as HTMLElement);
                }
                if (focusEle) {
                    focusEle.focus();
                }
                this.pickerRefresh(dropDownArgs);
            },
            beforeClose: (dropDownArgs: BeforeOpenCloseMenuEventArgs): void => {
                const element: HTMLElement = (dropDownArgs.event) ? (dropDownArgs.event.target as HTMLElement) : null;
                this.dropDownBeforeClose(dropDownArgs);
                if (dropDownArgs.event && dropDownArgs.event.type === 'click' && (element.classList.contains(CLS_COLOR_CONTENT)
                        || element.parentElement.classList.contains(CLS_COLOR_CONTENT))) {
                    const colorpickerValue: string = element.classList.contains(CLS_RTE_ELEMENTS) ? element.style.borderBottomColor :
                        (element.querySelector('.' + CLS_RTE_ELEMENTS) as HTMLElement).style.borderBottomColor;
                    range = proxy.parent.formatter.editorManager.nodeSelection.getRange(proxy.parent.contentModule.getDocument());
                    if ((range.startContainer.nodeName === 'TD' || range.startContainer.nodeName === 'TH' ||
                            closest(range.startContainer.parentNode, 'td,th')) && range.collapsed && toolbarType === 'quick') {
                        const colorPickerArgs: ActionBeginEventArgs = { name: 'tableColorPickerChanged', item: { command: 'Table', subCommand: 'BackgroundColor', value: colorpickerValue  }, ...args };
                        proxy.parent.formatter.process(this.parent, colorPickerArgs, null, colorpickerValue);
                        proxy.parent.notify(events.hideTableQuickToolbar, {});
                    } else {
                        proxy.parent.notify(events.colorPickerChanged, { item: { command: args.command, subCommand: args.subCommand,
                            value: colorpickerValue }
                        });
                    }
                    return;
                }
            },
            close: (): void => {
                if (!this.isEscapeKey)
                {
                    proxy.parent.notify(events.selectionRestore, {});
                }
            }
        });
        dropDown.isStringTemplate = true; dropDown.createElement = proxy.parent.createElement; args.element.setAttribute('role', 'button');
        dropDown.appendTo(args.element);
        const popupElement: Element = document.getElementById(dropDown.element.id + '-popup');
        popupElement.setAttribute('aria-owns', this.parent.getID());
        args.element.setAttribute('aria-label', item === 'backgroundcolor' ? defaultLocale.backgroundColor : defaultLocale.fontColor);
        dropDown.element.insertBefore(content, dropDown.element.querySelector('.e-caret'));
        args.element.tabIndex = -1; dropDown.element.removeAttribute('type');
        dropDown.element.onmousedown = (): void => {
            proxy.parent.notify(events.selectionSave, {});
        };
        dropDown.element.onkeydown = (): void => {
            if (!this.parent.userAgentData.isSafari() || this.parent.userAgentData.isSafari()
                && proxy.parent.inputElement.contains(proxy.parent.getRange().startContainer)) {
                proxy.parent.notify(events.selectionSave, {});
            }
        };
        return dropDown;
    }
    private pickerRefresh(dropDownArgs: OpenCloseMenuEventArgs): void {
        if (this.parent.backgroundColor.mode === 'Picker') {
            const popupElem: HTMLElement = dropDownArgs.element.parentElement;
            popupElem.style.width = (popupElem.offsetWidth + 5).toString() + 'px';
            (getInstance(popupElem, Popup) as Popup).refreshPosition(popupElem);
            popupElem.style.width = (popupElem.offsetWidth - 5).toString() + 'px';
        }
    }
    private setColorPickerContentWidth(colorPicker: ColorPicker): void {
        const colorPickerContent: HTMLElement = (colorPicker.element.nextSibling as HTMLElement);
        if (colorPickerContent.style.width === '0px') {
            colorPickerContent.style.width = '';
            const borderWidth: number = parseInt(getComputedStyle(colorPickerContent).borderBottomWidth, 10);
            colorPickerContent.style.width = formatUnit((colorPickerContent.children[0] as HTMLElement).offsetWidth
                + borderWidth + borderWidth);
        }
    }
    /**
     * renderColorPicker method
     *
     * @param {IColorPickerModel} args - specifies the arguments
     * @param {string} item - specifies the string values
     * @param {string} toolbarType - Specifies the type of toolbar triggering the color picker.
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderColorPicker(args: IColorPickerModel, item: string, toolbarType?: string): ColorPicker {
        // eslint-disable-next-line
        let proxy: this = this;
        let value: string;
        const colorPicker: ColorPicker = new ColorPicker({
            enableRtl: this.parent.enableRtl,
            inline: true,
            value: null,
            cssClass : ((item === 'backgroundcolor') ? CLS_BACKGROUND_COLOR_PICKER : CLS_FONT_COLOR_PICKER) + ' ' + args.cssClass,
            created: () => {
                const value: string = (item === 'backgroundcolor') ? proxy.parent.backgroundColor.default : proxy.parent.fontColor.default;
                colorPicker.setProperties({ value: value });
            },
            mode: ((item === 'backgroundcolor') ? proxy.parent.backgroundColor.mode : proxy.parent.fontColor.mode),
            modeSwitcher: ((item === 'backgroundcolor') ? proxy.parent.backgroundColor.modeSwitcher : proxy.parent.fontColor.modeSwitcher),
            presetColors: (item === 'backgroundcolor') ? this.parent.backgroundColor.colorCode : this.parent.fontColor.colorCode,
            columns: (item === 'backgroundcolor') ? this.parent.backgroundColor.columns : this.parent.fontColor.columns,
            beforeTileRender: (args: PaletteTileEventArgs) => {
                args.element.classList.add(CLS_COLOR_PALETTE);
                args.element.classList.add(CLS_CUSTOM_TILE);
                if (!isNullOrUndefined(this.parent.cssClass)) {
                    const allClassName: string[] = this.parent.getCssClass().split(' ');
                    for (let i: number = 0; i < allClassName.length; i++) {
                        if (allClassName[i as number].trim() !== '') {
                            args.element.classList.add(allClassName[i as number]);
                        }
                    }
                }
                if (args.value === '') {
                    args.element.classList.add(CLS_NOCOLOR_ITEM);
                }
            },
            change: (colorPickerArgs: IColorPickerEventArgs): void => {
                const colorpickerValue: string = colorPickerArgs.currentValue.rgba;
                colorPickerArgs.item = {
                    command: args.command,
                    subCommand: args.subCommand,
                    value: colorpickerValue
                };
                proxy.parent.notify(events.selectionRestore, {});
                if (proxy.currentElement) {
                    (proxy.currentElement.querySelector('.' + CLS_RTE_ELEMENTS) as HTMLElement).style.borderBottomColor = colorpickerValue;
                }
                const range: Range = proxy.parent.formatter.editorManager.nodeSelection.getRange(proxy.parent.contentModule.getDocument());
                const closestElement: Element = closest(range.startContainer.parentNode, 'table');
                if ((range.startContainer.nodeName === 'TD' || range.startContainer.nodeName === 'TH' || range.startContainer.nodeName === 'BODY' ||
                    (range.startContainer.parentNode && closest(range.startContainer.parentNode, 'td,th'))) && range.collapsed && args.subCommand === 'BackgroundColor' && (closestElement && closest(closestElement, '.' + classes.CLS_RTE) || proxy.parent.iframeSettings.enable)
                    && toolbarType === 'quick') {
                    colorPickerArgs.name = 'tableColorPickerChanged';
                    colorPickerArgs.item.command = 'Table';
                    proxy.parent.formatter.process(this.parent, colorPickerArgs, colorPickerArgs.event, colorPickerArgs.item.value);
                    proxy.parent.notify(events.hideTableQuickToolbar, {});
                } else {
                    proxy.parent.notify(events.colorPickerChanged, colorPickerArgs);
                }
                if (proxy.currentDropdown) {
                    proxy.currentDropdown.toggle();
                }
            },
            beforeModeSwitch: (args: ModeSwitchEventArgs): void => {
                value = colorPicker.value;
                if (value === '') {
                    colorPicker.setProperties({ value: ((args.mode === 'Picker') ? '#008000ff' : '') }, true);
                }
                colorPicker.showButtons = args.mode === 'Palette' ? false : true;
            }
        });
        colorPicker.isStringTemplate = true;
        colorPicker.createElement = this.parent.createElement;
        colorPicker.appendTo(document.getElementById(args.target) as HTMLElement);
        return colorPicker;
    }

    /**
     * The function is used to render Rich Text Editor toolbar
     *
     * @returns {void}
     * @hidden
     * @deprecated
     */
    public renderPanel(): void {
        this.getPanel().classList.add(CLS_TOOLBAR);
    }

    /**
     * Get the toolbar element of RichTextEditor
     *
     * @returns {Element} - specifies the element.
     * @hidden
     * @deprecated
     */
    public getPanel(): Element {
        return this.toolbarPanel;
    }

    /**
     * Set the toolbar element of RichTextEditor
     *
     * @returns {void}
     * @param  {Element} panel - specifies the element.
     * @hidden
     * @deprecated
     */
    public setPanel(panel: Element): void {
        this.toolbarPanel = panel;
    }

    public destroy(): void {
        if (this.isDestroyed) { return; }
        if (this.tooltip && !this.tooltip.isDestroyed) {
            this.tooltip.destroy();
            const tooltipElements: NodeListOf<Element> = document.querySelectorAll('[data-rte-id="' + this.parent.getID() + '"]');
            for (let i: number = 0; i < tooltipElements.length; i++) {
                const tooltipEle: Element = tooltipElements[i as number] as Element;
                if (this.parent.getID() === tooltipEle.getAttribute('data-rte-id') as string) {
                    detach(tooltipEle);
                }
            }
        }
        this.unWireEvent();
        this.mode = null;
        this.toolbarPanel = null;
        this.currentElement = null;
        this.currentDropdown = null;
        this.tooltip = null;
        this.tooltipTargetEle = null;
        this.isDestroyed = true;
    }
}
