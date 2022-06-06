import { LightningElement, api, wire } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';
import { constructErrorMessage, showToast} from "c/utilCommon";
import refundPaymentTitle from "@salesforce/label/c.pmtRefundPaymentTitle";
import refundAmount from "@salesforce/label/c.pmtRefundAmount";
import refundPaymentDate from "@salesforce/label/c.pmtRefundPaymentDate";
import refundPaymentConfirmButton from "@salesforce/label/c.pmtRefundPaymentConfirmedButton";
import cancelButtonLabel from "@salesforce/label/c.stgBtnCancel";
import commonRefreshPage from "@salesforce/label/c.commonRefreshPage";
import noRefundPermissionMessage from "@salesforce/label/c.pmtNoRefundPermissionMessage";
import refundPaymentErrorMessage from "@salesforce/label/c.pmtRefundPaymentErrorMessage";
import refundPaymentMessage from "@salesforce/label/c.pmtRefundPaymentMessage";
import refundProcessing from "@salesforce/label/c.pmtRefundProcessing";
import loadingMessage from "@salesforce/label/c.labelMessageLoading";
import spinnerAltText from "@salesforce/label/c.geAssistiveSpinner";
import getInitialView from "@salesforce/apex/PMT_RefundController.getInitialView";
import processRefund from "@salesforce/apex/PMT_RefundController.processRefund";

export default class refundPayment extends NavigationMixin(LightningElement) {
    _recordId;
    hasError = false;
    isLoading = true;
    errorMessage;
    labels = Object.freeze({
        refundPaymentTitle,
        refundPaymentConfirmButton,
        cancelButtonLabel,
        commonRefreshPage,
        noRefundPermissionMessage,
        refundPaymentMessage,
        refundAmount,
        refundPaymentDate,
        refundProcessing,
        refundPaymentErrorMessage,
        loadingMessage,
        spinnerAltText
    });
    refundView;
    paymentAmount;
    paymentDate;
    currencyCode;

    @api set recordId(value) {
        this._recordId = value;
        getInitialView({
            paymentId: this.recordId
        }) 
            .then((response) => {
                if (response.hasRequiredPermissions === false) {
                    this.displayErrorMessage(this.labels.noRefundPermissionMessage);
                    return;
                }
                this.paymentAmount = response.originalPayment.npe01__Payment_Amount__c;
                this.paymentDate = response.originalPayment.npe01__Payment_Date__c;
                this.currencyCode = response.originalPayment.CurrencyIsoCode;
                this.isLoading = false;
        })
        .catch((error) => {
            this.displayErrorMessage(constructErrorMessage(error).detail);
        });
    }

    get recordId() {
        return this._recordId;
    }

    handleRefund() {
        this.isLoading = true;
        processRefund({
            paymentId: this.recordId
        }) 
            .then((response) => {
                this.processResponse(response);
                this.isLoading = false;
        })
        .catch((error) => {
            this.displayErrorMessage(constructErrorMessage(error).detail);
            this.isLoading = false;
        });



    }

    handleClose(){
        this.dispatchEvent( new CloseActionScreenEvent() );
    }

    processResponse(response) {
        if (response.hasRequiredPermissions === false) {
            this.displayErrorMessage(this.labels.noRefundPermissionMessage);
            return;

        } else if (response.isSuccess === true) {
            if (this.recordId === response.redirectToPaymentId) {
                showToast('', this.labels.refundProcessing + ' {0}', 'info', '', [
                    {
                        url: '/' + response.redirectToPaymentId,
                        label: this.labels.commonRefreshPage,
                    }]
                );
            } else {
                this.navigateToRecordPage(response.redirectToPaymentId);
            }

        } else if (response.isSuccess === false) {
            showToast(this.labels.refundPaymentErrorMessage, response.errorMessage, 'error');
        }
        
        this.handleClose();
    }

    navigateToRecordPage(rediectToId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: rediectToId,
                actionName: 'view'
            }
        });
}

    displayErrorMessage(errorMessage) {
        this.hasError = true;
        this.errorMessage = errorMessage;
    }
}