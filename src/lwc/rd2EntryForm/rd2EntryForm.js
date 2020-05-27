import { LightningElement, api, track, wire } from 'lwc';
import { fireEvent } from 'c/pubsubNoPageRef';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { isNull } from 'c/utilCommon';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getRecord } from 'lightning/uiRecordApi';

import RECURRING_DONATION_OBJECT from '@salesforce/schema/npe03__Recurring_Donation__c';
import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import CONTACT_OBJECT from '@salesforce/schema/Contact';

import FIELD_NAME from '@salesforce/schema/npe03__Recurring_Donation__c.Name';
import FIELD_ACCOUNT from '@salesforce/schema/npe03__Recurring_Donation__c.npe03__Organization__c';
import FIELD_CONTACT from '@salesforce/schema/npe03__Recurring_Donation__c.npe03__Contact__c';
import FIELD_DATE_ESTABLISHED from '@salesforce/schema/npe03__Recurring_Donation__c.npe03__Date_Established__c';
import FIELD_CAMPAIGN from '@salesforce/schema/npe03__Recurring_Donation__c.npe03__Recurring_Donation_Campaign__c';

import cancelButtonLabel from '@salesforce/label/c.stgBtnCancel';
import saveButtonLabel from '@salesforce/label/c.stgBtnSave';
import unknownErrorLabel from '@salesforce/label/c.commonUnknownError';
import newHeaderLabel from '@salesforce/label/c.RD2_EntryFormHeader';
import editHeaderLabel from '@salesforce/label/c.commonEdit';
import donorSectionHeader from '@salesforce/label/c.RD2_EntryFormDonorSectionHeader';
import otherSectionHeader from '@salesforce/label/c.RD2_EntryFormOtherSectionHeader';
import insertSuccessMessage from '@salesforce/label/c.RD2_EntryFormInsertSuccessMessage';
import updateSuccessMessage from '@salesforce/label/c.RD2_EntryFormUpdateSuccessMessage';

import getSetting from '@salesforce/apex/RD2_entryFormController.getSetting';

export default class rd2EntryForm extends LightningElement {

    listenerEvent = 'rd2EntryFormEvent';

    customLabels = Object.freeze({
        cancelButtonLabel,
        saveButtonLabel,
        donorSectionHeader,
        otherSectionHeader
    });

    @api parentId;
    @api recordId;

    @track record;
    @track fields = {};
    fieldInfos;

    @track header = newHeaderLabel;

    @track isAutoNamingEnabled;
    @track isMultiCurrencyEnabled;

    @track contactId;
    @track accountId;

    @track isLoading = true;
    @track isRecordReady = false;
    isSettingReady = false;

    @track hasError = false;
    @track errorMessage = {};

    /***
    * @description Dynamic render edit form CSS to show/hide the edit form 
    */
    get cssEditForm() {
        return (!this.isLoading && this.isSettingReady && this.isRecordReady)
            ? ''
            : 'slds-hide';
    }

    /***
    * @description Retrieve Recurring Donation Object info
    */
    @wire(getObjectInfo, { objectApiName: RECURRING_DONATION_OBJECT.objectApiName })
    wiredRecurringDonationObjectInfo(response) {
        if (response.data) {
            let rdObjectInfo = response.data;
            this.setFields(rdObjectInfo.fields);
            this.fieldInfos = this.buildFieldDescribes(
                rdObjectInfo.fields,
                rdObjectInfo.apiName
            );

            if (this.recordId == null) {
                this.isRecordReady = true;
            }
        }

        if (response.error) {
            this.isRecordReady = true;
            handleError(response.error);
        }
    }

    /***
    * @description Method converts field describe info into objects that the
    * getRecord method can accept into its 'fields' parameter.
    */
    buildFieldDescribes(fields, objectApiName) {
        return Object.keys(fields).map((fieldApiName) => {
            return {
                fieldApiName: fieldApiName,
                objectApiName: objectApiName
            }
        });
    }

    /***
    * @description Construct field describe info from the Recurring Donation SObject info
    */
    setFields(fieldInfos) {
        this.fields.name = this.extractFieldInfo(fieldInfos[FIELD_NAME.fieldApiName]);
        this.fields.account = this.extractFieldInfo(fieldInfos[FIELD_ACCOUNT.fieldApiName]);
        this.fields.contact = this.extractFieldInfo(fieldInfos[FIELD_CONTACT.fieldApiName]);
        this.fields.dateEstablished = this.extractFieldInfo(fieldInfos[FIELD_DATE_ESTABLISHED.fieldApiName]);
        this.fields.campaign = this.extractFieldInfo(fieldInfos[FIELD_CAMPAIGN.fieldApiName]);
    }

    /***
    * @description Method converts field describe info into a object that is easily accessible from the front end
    */
    extractFieldInfo(field) {
        return {
            apiName: field.apiName,
            label: field.label,
            inlineHelpText: field.inlineHelpText,
            dataType: field.dataType
        };
    }

    /***
    * @description Retrieve Recurring Donation record value
    */
    @wire(getRecord, { recordId: '$recordId', fields: '$fieldInfos' })
    wiredRecurringDonationRecord(response) {
        if (response.data) {
            this.record = response.data;
            this.modifyEditHeader();
            this.isRecordReady = true;
        }

        if (response.error) {
            this.isRecordReady = true;
            handleError(response.error);
        }
    }

    /***
    * @description Modify edit modal header
    */
    modifyEditHeader() {
        this.header = editHeaderLabel + ' ' + this.record.fields.Name.value;
    }

    /***
    * @description Get org setting on init of the component 
    */
    connectedCallback() {
        getSetting({ parentId: this.parentId })
            .then(response => {
                this.isAutoNamingEnabled = response.isAutoNamingEnabled;
                this.isMultiCurrencyEnabled = response.isMultiCurrencyEnabled;
                this.handleParentIdType(response.parentSObjectType);
                this.isSettingReady = true;
                this.isLoading = false;
            })
            .catch((error) => {
                this.isSettingReady = true;
                this.handleError(error);
            });
    }

    /***
    * @description Determine the parentId Sobject Type
    */
    handleParentIdType(parentSObjType) {
        if (parentSObjType == null) {
            return;
        }

        if (parentSObjType === ACCOUNT_OBJECT.objectApiName) {
            this.accountId = this.parentId;
        } else if (parentSObjType === CONTACT_OBJECT.objectApiName) {
            this.contactId = this.parentId;
        }
    }

    /***
    * @description Overrides the standard submit. 
    * Collects fields displayed on the form and any integrated LWC (for example Schedule section)
    * and submits them for the record insert or update.
    */
    handleSubmit(event) {
        this.isLoading = true;
        this.template.querySelector("[data-id='submitButton']").disabled = true;

        event.preventDefault();
        const fields = event.detail.fields;

        const scheduleSection = this.template.querySelector('c-rd2-entry-form-schedule-section');
        const scheduleFields = (scheduleSection === null || scheduleSection === undefined)
            ? {}
            : scheduleSection.returnValues();
        const allFields = {
            ...fields, ...scheduleFields
        };

        this.template.querySelector('[data-id="outerRecordEditForm"]').submit(allFields);
    }

    /***
    * @description Handle component display when an error occurs
    */
    handleError(error) {
        this.errorMessage = this.constructErrorMessage(error);
        this.hasError = true;
        this.isLoading = false;

        this.template.querySelector("[data-id='submitButton']").disabled = false;

        this.template.querySelector(".slds-modal__header").scrollIntoView();
    }

    /***
    * @description Fires an event to utilDedicatedListener with the cancel action
    */
    handleCancel() {
        fireEvent(this.pageRef, this.listenerEvent, { action: 'cancel', recordId: this.recordId });
    }

    /***
    * @description Fires an event to utilDedicatedListener with the success action
    */
    handleSuccess(event) {
        this.showSuccessToast(event.detail.fields.Name.value);
        fireEvent(this.pageRef, this.listenerEvent, { action: 'success', recordId: event.detail.id });
    }

    /***
    * @description Contruct error wrapper from the error event 
    *   error.body is the error from apex calls
    *   error.body.output.errors is for AuraHandledException messages
    *   error.body.message errors is the error from wired service
    *   error.detail.output.errors is the error from record-edit-forms
    */
    constructErrorMessage(error) {
        let header;
        let message;

        if (typeof error === 'string' || error instanceof String) {
            message = error;

        } else if (error.message) {
            message = error.message;

        } else if ((error.body && error.body.output)) {
            if (Array.isArray(error.body) &&
                !error.body.output.errors) {
                message = error.body.map(e => e.message).join(', ');

            } else if (typeof error.body.message === 'string' &&
                !error.body.output.errors) {
                message = error.body.message;

            } else if (error.body.output &&
                Array.isArray(error.body.output.errors)) {
                message = error.body.output.errors.map(e => e.message).join(', ');
            }

        } else if (error.detail && error.detail.output && Array.isArray(error.detail.output.errors)) {
            header = error.detail.message;
            message = error.detail.output.errors.map(e => e.message).join(', ');

        } else if (error.body && error.body.message) {
            message = error.body.message;
        }

        return {
            header: header || unknownErrorLabel,
            detail: message || unknownErrorLabel
        };
    }

    /***
    * @description Fires a toast event to display success message
    */
    showSuccessToast(recordName) {
        let message = (this.recordId)
            ? updateSuccessMessage.replace("{0}", recordName)
            : insertSuccessMessage.replace("{0}", recordName);

        const event = new ShowToastEvent({
            title: message,
            variant: 'success',
        });
        this.dispatchEvent(event);
    }
}