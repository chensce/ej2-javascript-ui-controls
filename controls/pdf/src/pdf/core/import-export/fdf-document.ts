import { PdfDocument } from './../pdf-document';
import { _PdfDictionary, _PdfName, _PdfReference } from './../pdf-primitives';
import { _PdfParser, _PdfLexicalOperator } from '../pdf-parser';
import { _PdfContentStream, _PdfStream } from '../base-stream';
import { _PdfCommand } from './../pdf-primitives';
import { _ExportHelper } from './xfdf-document';
import { PdfForm } from './../form/form';
import { PdfAnnotation, PdfUriAnnotation, PdfRubberStampAnnotation, PdfFileLinkAnnotation, PdfTextWebLinkAnnotation, PdfRectangleAnnotation, PdfDocumentLinkAnnotation, PdfPopupAnnotation } from './../annotations/annotation';
import { PdfAnnotationCollection } from './../annotations/annotation-collection';
import { PdfField } from './../form/field';
import { _bytesToString, _getNewGuidString, _byteArrayToHexString, _stringToBytes, _isNullOrUndefined } from './../utils';
import { PdfCheckBoxField, PdfComboBoxField, PdfListBoxField, PdfRadioButtonListField, PdfTextBoxField } from './../form/field';
import { PdfPage } from '../pdf-page';
import { _StringTokenizer} from './../fonts/string-layouter';
import { _PdfFlateStream } from '../flate-stream';
import { CompressedStreamWriter } from '@syncfusion/ej2-compression';
export class _FdfDocument extends _ExportHelper {
    _annotationObjects: Map<any, any> = new Map<any, any>(); // eslint-disable-line
    _specialCharacters: string = 'âãÏÓ';
    constructor(fileName?: string) {
        super();
        if (fileName !== null && typeof fileName !== 'undefined') {
            this._fileName = fileName;
        }
    }
    _exportAnnotations(document: PdfDocument): Uint8Array {
        this._document = document;
        this._crossReference = document._crossReference;
        this._isAnnotationExport = true;
        this._exportAnnotationData(document, document.pageCount);
        return this._save();
    }
    _exportFormFields(document: PdfDocument): Uint8Array {
        this._document = document;
        this._crossReference = document._crossReference;
        this._isAnnotationExport = false;
        this._key = _getNewGuidString();
        return this._save();
    }
    _save(): Uint8Array {
        let objectID: number = 0;
        const objectArray: number[] = [];
        if (!this._isAnnotationExport) {
            if (this._asPerSpecification) {
                this.fdfString += '%FDF-1.2\n%' + this._specialCharacters + '\r\n1 0 obj\r<</FDF<</F(';
                this.fdfString += this._fileName + ')';
                this.fdfString += '/Fields[';
            } else {
                this.fdfString += '%FDF-1.2\n';
            }
            const form: PdfForm = this._document.form;
            if (form !== null && typeof form !== 'undefined') {
                this._exportEmptyFields = form.exportEmptyFields;
                const count: number = this._document.form.count;
                for (let i: number = 0; i < count; i++) {
                    const field: PdfField = this._document.form.fieldAt(i);
                    const value: string | string[] = this._exportFormFieldsData(field);
                    if (field instanceof PdfTextBoxField || field instanceof PdfListBoxField || field instanceof PdfComboBoxField
                            || field instanceof PdfRadioButtonListField || field instanceof PdfCheckBoxField) {
                        objectID++;
                    }
                    if (!this._asPerSpecification) {
                        if (field instanceof PdfTextBoxField || field instanceof PdfListBoxField || field instanceof PdfComboBoxField) {
                            objectArray.push(objectID);
                            this.fdfString += objectID + ' 0 obj<</T <' + this._stringToHexString(field.name) + '> /V ';
                            if (typeof value === 'string' || (Array.isArray(value) && value.length === 1)) {
                                this.fdfString += '<' + this._stringToHexString((Array.isArray(value) ? value[0] : value)) + '>';
                            } else if (Array.isArray(value)) {
                                this.fdfString += '[';
                                value.forEach((val: string, index: number) => {
                                    this.fdfString += '<' + this._stringToHexString(val) + '>';
                                    if (index !== value.length - 1) {
                                        this.fdfString += ' ';
                                    }
                                });
                                this.fdfString += ']';
                            }
                            this.fdfString += ' >>endobj\n';
                        } else if (field instanceof PdfRadioButtonListField || field instanceof PdfCheckBoxField) {
                            objectArray.push(objectID);
                            this.fdfString += objectID + ' 0 obj<</T <' + this._stringToHexString(field.name) + '> /V /';
                            this.fdfString += value + ' >>endobj\n';
                        }
                    } else {
                        if (field instanceof PdfTextBoxField || field instanceof PdfListBoxField || field instanceof PdfComboBoxField) {
                            objectArray.push(objectID);
                            this.fdfString += '<</T(' + field.name + ')/V';
                            if (typeof value === 'string' || (Array.isArray(value) && value.length === 1)) {
                                this.fdfString += '(' + (Array.isArray(value) ? value[0] : value) + ')';
                            } else if (Array.isArray(value)) {
                                this.fdfString += '[';
                                value.forEach((val: string, index: number) => {
                                    this.fdfString += '(' + val + ')';
                                    if (index !== value.length - 1) {
                                        this.fdfString += ' ';
                                    }
                                });
                                this.fdfString += ']';
                            }
                            this.fdfString += '>>';
                        } else if (field instanceof PdfRadioButtonListField || field instanceof PdfCheckBoxField) {
                            objectArray.push(objectID);
                            this.fdfString += '<</T(' + field.name + ')/V/' +  value + '>>';
                        }
                    }
                }
            }
            if (this._asPerSpecification) {
                this.fdfString += ']';
                this.fdfString += '/ID[]/UF(' + this._fileName + ')>>/Type/Catalog>>\rendobj\rtrailer\r\n<</Root 1 0 R>>\r\n';
                this.fdfString += '%%EOF\r\n';
            } else {
                this.fdfString += (this._table.size + 1) + ' 0 obj<</F <' + this._stringToHexString(this._fileName) + '>  /Fields [';
                for (let i: number = 0; i < this._table.size; i++) {
                    const field: PdfField = this._document.form.fieldAt(i);
                    if (field !== null && typeof field !== 'undefined' && field.export) {
                        this.fdfString += objectArray[<number>i] + ' 0 R ';
                    }
                }
                this.fdfString += ']>>endobj\n';
                this.fdfString += (objectArray.length + 2) + ' 0 obj<</Version /1.4 /FDF ' + (objectArray.length + 1) + ' 0 R>>endobj\n';
                this.fdfString += 'trailer\n<</Root ' + (objectArray.length + 2) + ' 0 R>>';
            }
        }
        const arrayBuffer: ArrayBuffer = new ArrayBuffer(this.fdfString.length * 1);
        const result: Uint8Array = new Uint8Array(arrayBuffer);
        result.forEach((val: any, i: any) => { // eslint-disable-line
            result[i] = this.fdfString.charCodeAt(i); // eslint-disable-line
        });
        return result;
    }
    _importAnnotations(document: PdfDocument, data: Uint8Array): void {
        this._document = document;
        this._crossReference = document._crossReference;
        this._isAnnotationExport = false;
        this._checkFdf(_bytesToString(data));
        const stream: _PdfStream = new _PdfStream(data);
        this._isAnnotationImport = true;
        const parser: _PdfParser = new _PdfParser(new _PdfLexicalOperator(stream, true), null, true, false);
        this._readFdfData(parser);
        if (_isNullOrUndefined(this._annotationObjects) && this._annotationObjects.size > 0) {
            this._annotationObjects.clear();
        }
        if (_isNullOrUndefined(this._table) && this._table.size > 0) {
            this._table.clear();
        }
    }
    _importFormData(document: PdfDocument, data: Uint8Array): void {
        this._document = document;
        this._crossReference = document._crossReference;
        this._isAnnotationExport = false;
        this._checkFdf(_bytesToString(data));
        const stream: _PdfStream = new _PdfStream(data);
        const parser: _PdfParser = new _PdfParser(new _PdfLexicalOperator(stream, true), null, false, false);
        this._readFdfData(parser);
    }
    _readFdfData(parser: any): void { // eslint-disable-line
        let token: any = parser.getObject(); // eslint-disable-line
        if (this._isAnnotationImport) {
            let key: string = '';
            while (token !== null && typeof token !== 'undefined' && token !== 'EOF') {
                if (token instanceof _PdfDictionary) {
                    this._table.set(key, token);
                    key = '';
                } else if (token instanceof _PdfStream || token instanceof _PdfFlateStream) {
                    this._table.set(key, token);
                    key = '';
                } else if (token instanceof _PdfName || Array.isArray(token)) {
                    this._table.set(key, token);
                    key = '';
                } else if (token !== null && Number.isInteger(token) && token !== 0) {
                    if (parser.first >= 0) {
                        key = token.toString() + ' ' + parser.first.toString();
                    }
                } else if (token instanceof _PdfCommand && token.command !== null && typeof token.command !== 'undefined' &&
                           token.command === 'trailer') {
                    key = token.command;
                }
                token = parser.getObject();
            }
            this._annotationObjects = this._parseAnnotationData();
            this._annotationObjects.forEach((value: any, key: any) => { // eslint-disable-line
                const dictionary: _PdfDictionary = value as _PdfDictionary;
                this._parseDictionary(dictionary);
                dictionary._crossReference = this._crossReference;
                dictionary._updated = true;
                if (dictionary && dictionary.has('Page')) {
                    const pageNumber: number = dictionary.get('Page');
                    if (pageNumber !== null && typeof pageNumber !== 'undefined') {
                        const pageIndex: number = pageNumber;
                        if (pageIndex < this._document.pageCount) {
                            const page: PdfPage = this._document.getPage(pageIndex);
                            const pageDictionary: _PdfDictionary = page._pageDictionary;
                            if (pageDictionary) {
                                const annotations: PdfAnnotationCollection = page.annotations;
                                const annotation: PdfAnnotation = annotations._parseAnnotation(dictionary);
                                if (annotation !== null && typeof annotation !== 'undefined') {
                                    annotation._isImported = true;
                                    const reference: _PdfReference = this._crossReference._getNextReference();
                                    this._crossReference._cacheMap.set(reference, dictionary);
                                    if (dictionary.has('NM') || dictionary.has('IRT')) {
                                        this._addReferenceToGroup(reference, dictionary);
                                    }
                                    annotation._ref = reference;
                                    const index: number = annotations._annotations.length;
                                    if (!annotation._dictionary.has('P') && annotation._dictionary.get('Subtype').name !== 'Popup') {
                                        const [objNum, genNum] = pageDictionary.objId.split(' ').map(Number);
                                        annotation._dictionary.update('P', _PdfReference.get(objNum, genNum));
                                    }
                                    delete annotation._dictionary._map.Page;
                                    annotations._annotations.push(reference);
                                    if (annotations._comments && annotations._comments.length > 0) {
                                        annotations._comments = [];
                                    }
                                    pageDictionary.set('Annots', annotations._annotations);
                                    pageDictionary._updated = true;
                                    annotations._parsedAnnotations.set(index, annotation);
                                    this._handlePopup(annotations, reference, dictionary, pageDictionary);
                                    if (annotation instanceof PdfPopupAnnotation && annotation._dictionary.has('Parent')) {
                                        const parent: _PdfReference = annotation._dictionary.getRaw('Parent') as _PdfReference;
                                        if (parent && parent instanceof _PdfReference) {
                                            const Parent: _PdfDictionary = this._crossReference._cacheMap.get(parent);
                                            if (Parent && Parent instanceof _PdfDictionary && Parent.has('Popup')) {
                                                const value: any = Parent.get('Popup'); // eslint-disable-line
                                                if (value instanceof _PdfDictionary && value.has('Parent')) {
                                                    Parent.update('Popup', reference);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (this._groupHolders && this._groupHolders.length > 0) {
                this._groupHolders.forEach((dictionary: _PdfDictionary) => {
                    if (dictionary && dictionary.has('IRT')) {
                        const inReplyTo: string = dictionary.get('IRT');
                        if (inReplyTo) {
                            if (this._groupReferences && this._groupReferences.has(inReplyTo)) {
                                dictionary.update('IRT', this._groupReferences.get(inReplyTo));
                            } else {
                                delete dictionary._map.IRT;
                            }
                        }
                    }
                });
            }
            this._groupHolders = [];
            this._groupReferences = new Map<string, _PdfReference>();
        }
        else {
            token = parser.getObject();
            if (!this._asPerSpecification) {
                token = parser.getObject();
                if (token instanceof _PdfCommand && token.command !== null) {
                    token = token.command;
                }
                while (token !== null && typeof token !== 'undefined' && token !== 'EOF') {
                    if (token instanceof _PdfDictionary) {
                        const t: any[] = token.getArray('T'); // eslint-disable-line
                        let v: any; // eslint-disable-line
                        if (token._map && token._map.V instanceof _PdfName) {
                            v = token.get('V').name;
                        } else {
                            v = token.getArray('V');
                        }
                        if (t !== null && t !== undefined && t.length > 0) {
                            this._table.set(t, v);
                        }
                    }
                    token = parser.getObject();
                }
            } else {
                while (token !== null && typeof token !== 'undefined' && token !== 'EOF') {
                    if (token instanceof _PdfDictionary && token !== null && token._map.FDF !== null && token._map.FDF !== undefined) {
                        token = token._map.FDF;
                        if (token instanceof _PdfDictionary && token._map.Fields !== null && token._map.Fields !== undefined) {
                            token = token._map.Fields;
                            if (token !== null && token !== undefined) {
                                token.forEach((field: _PdfDictionary) => {
                                    if (field instanceof _PdfDictionary && field !== null && field !== undefined) {
                                        const t: any[] = field.getArray('T'); // eslint-disable-line
                                        let v: any; // eslint-disable-line
                                        if (field._map && field._map.V instanceof _PdfName) {
                                            v = field.get('V').name;
                                        } else {
                                            v = field.getArray('V');
                                        }
                                        if (t !== null && t !== undefined && t.length > 0) {
                                            this._table.set(t, v);
                                        }
                                    }
                                });
                            }
                        }
                    }
                    token = parser.getObject();
                }
            }
            this._importField();
        }
    }
    _parseDictionary(dictionary: _PdfDictionary): void {
        if (dictionary != null && dictionary.size > 0)
        {
            dictionary.forEach((key: string, value: any) => { // eslint-disable-line
                if (key !== 'Parent' && key !== 'P' && key !== 'Page') {
                    this._parseDictionaryData(dictionary, key);
                }
            });
        }
    }
    _parseDictionaryData(dictionary: _PdfDictionary, key: string): void {
        const value: any = dictionary.get(key); // eslint-disable-line
        if (value instanceof _PdfDictionary) {
            this._parseDictionary(value as _PdfDictionary);
        } else if (value instanceof _PdfFlateStream) {
            this._parseDictionary(value.dictionary as _PdfDictionary);
        } else if (Array.isArray(value)) {
            this._parseArray(value as Array<any>); // eslint-disable-line
        } else if (value instanceof _PdfReference) {
            const reference: _PdfReference = value as _PdfReference;
            if (reference) {
                const objectKey: string = `${reference.objectNumber} ${reference.generationNumber}`;
                if (this._annotationObjects.has(objectKey)) {
                    dictionary.update(key, this._annotationObjects.get(objectKey));
                } else if (this._table.has(objectKey)) {
                    const objects: Map<any, any> = this._table; // eslint-disable-line
                    const object: any = objects.get(objectKey); // eslint-disable-line
                    if (object instanceof _PdfStream || object instanceof _PdfFlateStream) {
                        this._parseDictionary(object.dictionary);
                        const reference: _PdfReference = this._crossReference._getNextReference();
                        this._crossReference._cacheMap.set(reference, object);
                        object.dictionary._updated = true;
                        dictionary.update(key, reference);
                        objects.set(objectKey, reference);
                    } else if (object instanceof _PdfDictionary) {
                        this._parseDictionary(object);
                        const reference: _PdfReference = this._crossReference._getNextReference();
                        this._crossReference._cacheMap.set(reference, object);
                        dictionary.update(key, reference);
                        objects.set(objectKey, reference);
                    } else if (object instanceof _PdfReference) {
                        dictionary.update(key, object);
                    } else if (object instanceof _PdfName) {
                        const reference: _PdfReference = this._crossReference._getNextReference();
                        this._crossReference._cacheMap.set(reference, object);
                        dictionary.update(key, reference);
                        objects.set(objectKey, reference);
                    } else if (Array.isArray(object)) {
                        this._parseArray(object as Array<any>); // eslint-disable-line
                        const reference: _PdfReference = this._crossReference._getNextReference();
                        this._crossReference._cacheMap.set(reference, object);
                        dictionary.update(key, reference);
                        objects.set(objectKey, reference);
                    }
                } else {
                    delete dictionary._map[key.toString()];
                }
            }
        }
    }
    _parseArray(array: Array<any>): void { // eslint-disable-line
        if (Array.isArray(array) && array.length > 0) {
            const count: number = array.length;
            for (let i: number = 0; i < count; i++) {
                const referenceHolder: _PdfReference = array[Number.parseInt(i.toString(), 10)] as _PdfReference;
                if (referenceHolder && referenceHolder instanceof _PdfReference) {
                    const objectKey: string = `${referenceHolder.objectNumber} ${referenceHolder.generationNumber}`;
                    if (this._annotationObjects.has(objectKey)) {
                        array[Number.parseInt(i.toString(), 10)] = this._annotationObjects.get(objectKey);
                    } else if (this._table.has(objectKey)) {
                        const objects: Map<any, any> = this._table; // eslint-disable-line
                        const object: any = objects.get(objectKey); // eslint-disable-line
                        if (object instanceof _PdfReference) {
                            array[Number.parseInt(i.toString(), 10)] = object;
                        } else if (object instanceof _PdfDictionary || object instanceof _PdfStream) {
                            const reference: _PdfReference = this._crossReference._getNextReference();
                            this._crossReference._cacheMap.set(reference, object);
                            array[Number.parseInt(i.toString(), 10)] = reference;
                            objects.set(objectKey, reference);
                        }
                    }
                }
            }
        }
    }
    _parseAnnotationData(): Map<any, any> {  // eslint-disable-line
        let objects: Map<any, any> = new Map<any, any>(); // eslint-disable-line
        let mappedObjects: Map<any, any> = new Map<any, any>(); // eslint-disable-line  
        objects = this._table;
        if (objects !== null && typeof objects !== 'undefined' && objects.size > 0 && objects.has('trailer')) {
            const trailer: _PdfDictionary = objects.get('trailer');
            if (trailer instanceof _PdfDictionary && trailer !== null && typeof trailer !== 'undefined' && trailer.has('Root')) {
                const holder: _PdfReference = trailer.getRaw('Root');
                if (holder !== null && typeof holder !== 'undefined') {
                    const rootKey: string = holder.objectNumber.toString() + ' ' + holder.generationNumber.toString();
                    if (objects.has(rootKey)) {
                        const root: _PdfDictionary = objects.get(rootKey) as _PdfDictionary;
                        if (root !== null && typeof root !== 'undefined' && root.has('FDF')) {
                            const fdf: _PdfDictionary = root.get('FDF') as _PdfDictionary;
                            if (fdf !== null && typeof fdf !== 'undefined' && fdf.has('Annots')) {
                                const annots: _PdfReference[] = fdf.get('Annots') || [];
                                for (const annot of annots) {
                                    const key: string = `${ annot.objectNumber } ${ annot.generationNumber }`;
                                    const storedAnnot: any = objects.get(key); // eslint-disable-line
                                    if (storedAnnot) {
                                        if (storedAnnot instanceof _PdfDictionary && storedAnnot.has('Parent')
                                            && storedAnnot.has('Subtype')) {
                                            const subtype: _PdfName = storedAnnot.get('Subtype');
                                            const parentReference: _PdfReference = storedAnnot._get('Parent');
                                            if (subtype.name === 'Popup' && parentReference.objectNumber === annot.objectNumber) {
                                                continue;
                                            }
                                        }
                                        mappedObjects.set(key, storedAnnot);
                                    }
                                    objects.delete(key);
                                }
                            }
                        }
                    }
                    objects.delete(rootKey);
                }
            }
            objects.delete('trailer');
        }
        return mappedObjects;
    }
    _importField(): void {
        const form: PdfForm = this._document.form;
        const count: number = form.count;
        if (count) {
            this._table.forEach((value: any, key: any) => { // eslint-disable-line
                let textValue: string;
                if (this._table.size > 0 && this._table.has(key)) {
                    textValue = this._table.get(key);
                }
                const index: number = form._getFieldIndex(key);
                if (index !== -1 && index < count) {
                    const field: PdfField = form.fieldAt(index);
                    if (field) {
                        if (textValue && textValue !== '') {
                            field._dictionary.update('RV', textValue);
                        }
                        let param: string[] = [];
                        if (Array.isArray(value)) {
                            param = value;
                        } else {
                            param.push(value);
                        }
                        this._importFieldData(field, param);
                    }
                }
            });
        }
    }
    //#region Export Annotations
    _exportAnnotationData(document: PdfDocument, pageCount: number): void {
        const genNumber: string = _StringTokenizer._whiteSpace + '0' + _StringTokenizer._whiteSpace;
        const startDictionary: string = '<<' + '/';
        this.fdfString += '%FDF-1.2' + '\r\n';
        let index: number = 2;
        let annot: Array<string> = new Array<string>();
        const appearance: boolean = this.exportAppearance;
        for (let i: number = 0; i < pageCount; i++) {
            const page: PdfPage = document.getPage(i);
            if (page !== null && typeof page !== 'undefined' && page.annotations.count > 0) {
                for (let k: number = 0; k < page.annotations.count; k++) {
                    const annotation: PdfAnnotation = page.annotations.at(k);
                    if (annotation !== null && typeof annotation !== 'undefined' && !(annotation instanceof PdfFileLinkAnnotation ||
                        annotation instanceof PdfTextWebLinkAnnotation || annotation instanceof PdfDocumentLinkAnnotation ||
                        annotation instanceof PdfUriAnnotation)) {
                        if (annotation instanceof PdfPopupAnnotation && annotation._dictionary.has('Parent')) {
                            continue;
                        }
                        if (annotation instanceof PdfRubberStampAnnotation || annotation instanceof PdfRectangleAnnotation) {
                            const value: _FdfHelper = this._exportAnnotation(annotation, this.fdfString, index, annot, i, true);
                            index = value.index;
                            annot = value.annot;
                        } else {
                            const value: _FdfHelper = this._exportAnnotation(annotation, this.fdfString, index, annot, i,
                                                                             appearance);
                            index = value.index;
                            annot = value.annot;
                        }
                    }
                }
            }
        }
        if (index !== 2) {
            const root: string = '1' + genNumber;
            this.fdfString += root + 'obj' + '\r\n' + startDictionary + 'FDF' + startDictionary + 'Annots' + '[';
            for (let i: number = 0; i < annot.length - 1; i++) {
                this.fdfString += annot[<number>i] + genNumber + 'R' + ' ';
            }
            this.fdfString += annot[annot.length - 1] + genNumber + 'R' + ']' + '/' + 'F' + '(' + this._fileName + ')' + '/' + 'UF' + '(';
            this.fdfString += this._fileName + ')>>' + '/' + 'Type' + '/' + 'Catalog' + '>>' + '\r\n' + 'endobj' + '\r\n';
            this.fdfString += 'trailer' + '\r\n' + startDictionary + 'Root' + ' ' + root + 'R' + '>>' + '\r\n' + '%%EOF' + '\r\n';
        }
    }
    _exportAnnotation(annotation: PdfAnnotation, fdfString: string, index: number, annot: string[], pageIndex: number,
                      appearance: boolean): _FdfHelper {
        this.fdfString = fdfString;
        const helper: _FdfHelper = new _FdfHelper();
        let dictionary: _PdfDictionary = annotation._dictionary;
        const startObject: string = _StringTokenizer._whiteSpace + '0' + _StringTokenizer._whiteSpace + 'obj' + '\r\n';
        const endObject: string = '\r\n' + 'endobj' + '\r\n';
        this._annotationID = index.toString();
        this.fdfString += index + startObject + '<<';
        let list: Map<any, any> = new Map<any, any>(); // eslint-disable-line
        let streamReference: Array<number> = new Array<number>();
        annot.push(this._annotationID);
        dictionary.set('Page', pageIndex);
        const annotValue: _FdfHelper = this._getEntries(list, streamReference, index, dictionary, this.fdfString, appearance);
        index = annotValue.index;
        list = annotValue.list;
        streamReference = annotValue.streamReference;
        delete dictionary._map.Page;
        this.fdfString += '>>' + endObject;
        while (list.size > 0) {
            const keys: Array<number> = Array<number>();
            list.forEach((key: any, value : any) => { // eslint-disable-line
                keys.push(value);
            });
            for (let i: number = 0; i < keys.length; i++) {
                const key: number = keys[<number>i];
                if (list.get(key) instanceof _PdfDictionary || list.get(key) instanceof _PdfStream ||
                    list.get(key) instanceof _PdfContentStream || list.get(key) instanceof _PdfFlateStream) {
                    if (list.get(key) instanceof _PdfDictionary) {
                        dictionary = list.get(key);
                    } else {
                        dictionary = list.get(key).dictionary;
                    }
                    if (dictionary !== null && typeof dictionary !== 'undefined') {
                        if (dictionary instanceof _PdfDictionary && dictionary.has('Type')) {
                            const type: _PdfName = dictionary.get('Type');
                            if (type !== null && typeof type !== 'undefined' && type.name === 'Annot') {
                                annot.push(key.toString());
                                dictionary.set('Page', pageIndex);
                            }
                        }
                        this.fdfString += key + startObject + '<<';
                        const value: _FdfHelper = this._getEntries(list, streamReference, index, dictionary, this.fdfString, appearance);
                        list = value.list;
                        streamReference = value.streamReference;
                        index = value.index;
                        if (dictionary instanceof _PdfDictionary && dictionary.has('Page')) {
                            delete dictionary._map.Page;
                        }
                        this.fdfString += '>>';
                        if (streamReference !== null && typeof streamReference !== 'undefined' && streamReference.indexOf(key) !== -1) {
                            this._appendStream(list.get(key), this.fdfString);
                        }
                        this.fdfString += endObject;
                    }
                } else if (list.get(key) instanceof _PdfName) {
                    this.fdfString += key + startObject;
                    this.fdfString += '/' + list.get(key).name;
                    this.fdfString += endObject;
                } else if (Array.isArray(list.get(key))) {
                    this.fdfString += key + startObject;
                    let primitive: any[] = list.get(key) as any[]; // eslint-disable-line
                    const value: _FdfHelper = this._appendArray(primitive, this.fdfString, index, appearance, list, streamReference);
                    index = value.index;
                    this.fdfString += endObject;
                } else if (typeof list.get(key) === 'boolean') {
                    this.fdfString += key + startObject;
                    this.fdfString += ' ' + (((list.get(key) as boolean)) ? 'true' : 'false');
                    this.fdfString += endObject;
                } else if (typeof list.get(key) === 'string') {
                    this.fdfString += key + startObject;
                    this.fdfString += '(' + this._getFormattedString((list.get(key) as string)) + ')';
                    this.fdfString += endObject;
                }
                list.delete(key);
            }
        }
        index++;
        helper.index = index;
        helper.annot = annot;
        return helper;
    }
    _appendStream(value: any, fdfString: string) { // eslint-disable-line
        let stream: any = value; // eslint-disable-line
        this.fdfString = fdfString;
        if (value instanceof _PdfFlateStream || value instanceof _PdfStream || value instanceof _PdfContentStream) {
            if (value instanceof _PdfFlateStream) {
                stream = value.stream;
            } else {
                stream = value;
            }
        }
        if (value instanceof _PdfFlateStream || value instanceof _PdfStream || value instanceof _PdfContentStream) {
            let byteArray: number[];
            let compressString: string;
            let dataArray : Uint8Array;
            if (value instanceof _PdfContentStream) {
                compressString = stream.getString();
            } else if (value instanceof _PdfFlateStream || value instanceof _PdfStream) {
                byteArray = stream.getByteRange(stream.start, stream.end);
                dataArray = new Uint8Array(byteArray);
                compressString = _bytesToString(dataArray);
            } else {
                byteArray = stream.getBytes();
                dataArray = new Uint8Array(byteArray);
                const sw : CompressedStreamWriter = new CompressedStreamWriter();
                sw.write(dataArray, 0, dataArray.length);
                sw.close();
                compressString = sw.getCompressedString;
            }
            this.fdfString += 'stream' + '\r\n';
            this.fdfString += compressString;
            this.fdfString += '\r\n' + 'endstream';
        }
    }
    _getEntries(list: Map<any, any>, // eslint-disable-line
                streamReference: number[], index: number, dictionary: _PdfDictionary, fdfString: string,
                hasAppearance: boolean): _FdfHelper {
        let flag: boolean = false;
        const helper : _FdfHelper = new _FdfHelper();
        this.fdfString = fdfString;
        let listDictionary: Map<any, any> = list; // eslint-disable-line
        dictionary.forEach((key: string, value: any) => { // eslint-disable-line
            if (!((!hasAppearance && key === 'AP'))) {
                if (key !== 'P') {
                    this.fdfString += '/' + key;
                }
                if (key === 'Sound' || key === 'F' || hasAppearance) {
                    flag = true;
                }
                let primitive: any = value // eslint-disable-line
                if (typeof primitive === 'string') {
                    this.fdfString += '(' + this._getFormattedString((primitive as string )) + ')';
                } else if (primitive instanceof _PdfName ) {
                    this.fdfString += '/' + primitive.name;
                } else if (primitive instanceof Array) {
                    primitive = primitive as any[]; // eslint-disable-line
                    const value: _FdfHelper = this._appendArray(primitive, this.fdfString, index, flag, listDictionary, streamReference);
                    listDictionary = value.list;
                    streamReference = value.streamReference;
                    index = value.index;
                } else if (typeof primitive === 'number' ) {
                    this.fdfString += ' ' + primitive.toString();
                } else if (typeof primitive === 'boolean') {
                    this.fdfString += ' ' + (((primitive as boolean)) ? 'true' : 'false');
                } else if (primitive instanceof _PdfDictionary) {
                    this.fdfString += '<<';
                    primitive = primitive as _PdfDictionary;
                    const value: _FdfHelper = this._getEntries(listDictionary, streamReference, index, primitive, this.fdfString,
                                                               hasAppearance);
                    listDictionary = value.list;
                    streamReference = value.streamReference;
                    index = value.index;
                    this.fdfString += '>>';
                } else if (primitive instanceof _PdfReference) {
                    const pageNumber: number = dictionary.get('Page');
                    if (key === 'Parent') {
                        this.fdfString += ' ' + this._annotationID + ' 0 R';
                        this.fdfString += '/Page ' + pageNumber;
                    } else if (key === 'IRT') {
                        if (this._crossReference && this._crossReference._fetch && primitive) {
                            const inReplyToDictionary: _PdfDictionary = this._crossReference._fetch(primitive);
                            if (inReplyToDictionary && inReplyToDictionary.has('NM')) {
                                const input: string = inReplyToDictionary.get('NM');
                                if (input !== null && typeof input !== 'undefined') {
                                    this.fdfString += '(' + this._getFormattedString(input) + ')';
                                }
                            }
                        }
                    } else if (key !== 'P') {
                        const holder: _PdfReference = primitive as _PdfReference;
                        if (holder !== null && typeof holder !== 'undefined') {
                            index++;
                            this.fdfString += ' ' + index + ' 0 R';
                            if (flag) {
                                streamReference.push(index);
                            }
                            if (!dictionary._crossReference) {
                                dictionary.assignXref(this._crossReference);
                            }
                            listDictionary.set(index, dictionary.get(key));
                        }
                    }
                }
                flag = false;
            }
        });
        helper.list = listDictionary;
        helper.streamReference = streamReference;
        helper.index = index;
        return helper;
    }
    _appendArray(array: any[], // eslint-disable-line
                 fdfString: string, index: number, flag: boolean, list: Map<any, any>, // eslint-disable-line
                 streamReference: number[]): _FdfHelper {
        this.fdfString = fdfString;
        this.fdfString += '[';
        const helper: _FdfHelper = new _FdfHelper();
        let listDictionary: Map<any, any> = list; // eslint-disable-line
        if (_isNullOrUndefined(array) && array.length > 0) {
            const count: number = array.length;
            for (let i: number = 0; i < count; i++) {
                const element: any = array[<number>i]; // eslint-disable-line
                if (i !== 0 && (typeof element === 'number' || element instanceof _PdfReference || typeof element === 'boolean')) {
                    this.fdfString += ' ';
                }
                const value: _FdfHelper = this._appendElement(element, this.fdfString, index, flag, listDictionary, streamReference);
                listDictionary = value.list;
                streamReference = value.streamReference;
                index = value.index;
            }
        }
        this.fdfString += ']';
        helper.list = listDictionary;
        helper.streamReference = streamReference;
        helper.index = index;
        return helper;
    }
    _appendElement(element: any, // eslint-disable-line
                   fdfString: string, index: number, flag: boolean, list: Map<any, any>, // eslint-disable-line
                   streamReference: number[]): _FdfHelper {
        this.fdfString = fdfString;
        const helper: _FdfHelper = new _FdfHelper();
        let listDictionary: Map<any, any> = list; // eslint-disable-line
        if (typeof element === 'number') {
            this.fdfString += (element).toString();
        } else if (element instanceof _PdfName) {
            this.fdfString += '/' + (element.name.toString());
        } else if (element instanceof Array) {
            element = element as any[]; // eslint-disable-line
            const value: _FdfHelper = this._appendArray(element, this.fdfString, index, flag, listDictionary, streamReference);
            listDictionary = value.list;
            streamReference = value.streamReference;
            index = value.index;
        } else if (element instanceof _PdfDictionary) {
            this.fdfString += '<<';
            element = element as _PdfDictionary;
            const value: _FdfHelper = this._getEntries(listDictionary, streamReference, index, element, this.fdfString, flag);
            listDictionary = value.list;
            streamReference = value.streamReference;
            index = value.index;
            this.fdfString += '>>';
        } else if (element instanceof _PdfReference) {
            const holder: _PdfReference = element as _PdfReference;
            if (holder !== null && typeof holder !== 'undefined') {
                index++;
                this.fdfString += ' ' + index + ' 0 R';
                if (flag) {
                    streamReference.push(index);
                }
                listDictionary.set(index, this._crossReference._cacheMap.get(element));
            }
        } else if (typeof element === 'boolean') {
            this.fdfString += ' ' + (((element as boolean)) ? 'true' : 'false');
        } else if (typeof element === 'string') {
            this.fdfString += '(' + this._getFormattedString((element as string)) + ')';
        }
        helper.list = listDictionary;
        helper.streamReference = streamReference;
        helper.index = index;
        return helper;
    }
    _getFormattedString(value: string) : string {
        let result: string = '';
        for (let i: number = 0; i < value.length; i++) {
            const c: number = value.charCodeAt(i);
            if (c === 40 || c === 41) {
                result += '\'';
            }
            result += String.fromCharCode(c);
        }
        return result;
    }
    //#endregion
    _checkFdf(element: string): void {
        if (element.includes(this._specialCharacters) || element.includes('Ã¢Ã£Ã\u008fÃ\u0093')) {
            this._asPerSpecification = true;
        }
        if (element.startsWith('%')) {
            const token: string = element.substring(1, 5);
            if (token !== 'FDF-') { // eslint-disable-line
                throw new Error('Invalid FDF file.');
            }
        }
    }
    _stringToHexString(text: string): string {
        let hexString: string = '';
        if (text !== null && typeof text !== 'undefined' && text.length > 0) {
            const bytesValue: Uint8Array = _stringToBytes(text) as Uint8Array;
            hexString = _byteArrayToHexString(bytesValue);
        }
        return hexString;
    }
}
export class _FdfHelper {
    list: Map<any, any>; // eslint-disable-line
    streamReference: number[];
    index: number;
    annot: string[];
}
