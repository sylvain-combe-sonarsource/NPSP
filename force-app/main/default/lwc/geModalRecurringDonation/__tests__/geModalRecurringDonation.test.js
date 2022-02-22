import { createElement } from 'lwc';
import GeModalRecurringDonation from 'c/geModalRecurringDonation';
import { Rd2Service } from "c/rd2Service";
import getInitialView from "@salesforce/apex/RD2_EntryFormController.getInitialView";
import OPPORTUNITY_IMPORTED from '@salesforce/schema/DataImport__c.DonationImported__c';
import PAYMENT_IMPORTED from '@salesforce/schema/DataImport__c.PaymentImported__c';

const initialViewResponse = require("../../../../../../tests/__mocks__/apex/data/getInitialView.json");

jest.mock("@salesforce/apex/RD2_EntryFormController.getInitialView", () => ({ default: jest.fn() }), { virtual: true });

jest.mock(
    "@salesforce/apex/RD2_EntryFormController.getRecurringSettings",
    () => {
        return { default: jest.fn() };
    },
    { virtual: true }
);

describe('c-ge-modal-recurring-donation', () => {
    afterEach(() => {
        clearDOM();
    });

    const setup = (cancelCallback, createRecurrenceCallback) => {
        const modalElement = createElement('c-ge-modal-recurring-donation', {
            is: GeModalRecurringDonation
        });
        modalElement.cancelCallback = cancelCallback;
        modalElement.createRecurrenceCallback = createRecurrenceCallback;
        document.body.appendChild(modalElement);
        return modalElement;
    }

    describe('render behavior', () => {

        it('renders warning message when gift has net new soft credits being added', async () => {
            const modalElement = setup();
            modalElement.giftInView = {
                fields: {},
                softCredits: '[{"Role":"Decision Maker","ContactId":"0030R00001MY10qQAD","key":0},{"Role":"Donor","ContactId":"0030R00001MY10kQAD","key":1},{"Role":"Soft Credit","ContactId":"0030R00001MY10lQAD","key":2}]'
            };

            await flushPromises();

            const warning = modalElement.shadowRoot.querySelector('c-util-inline-text');
            expect(warning).not.toBeNull();
            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            expect(buttons.length).toBe(1);
            const cancelButton = buttons[0];
            expect(cancelButton).toBeDefined();
            expect(cancelButton.label).toBe('c.commonCancel');
        });

        it('does not render warning message when gift does not have soft credits', async () => {
            const modalElement = setup();
            modalElement.giftInView = {
                fields: {},
                softCredits: null
            };

            await flushPromises();

            const warning = modalElement.shadowRoot.querySelector('c-util-inline-text');
            expect(warning).toBeNull();
        });

        it('renders warning message when gift is reviewing an open donation', async () => {
            const modalElement = setup();
            modalElement.giftInView = {
                fields: {
                    [OPPORTUNITY_IMPORTED.fieldApiName]: 'DUMMY_ID',
                    [PAYMENT_IMPORTED.fieldApiName]: 'DUMMY_ID'
                },
                softCredits: null
            };

            await flushPromises();

            const warning = modalElement.shadowRoot.querySelector('c-util-inline-text');
            expect(warning).not.toBeNull();
            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            expect(buttons.length).toBe(1);
            const cancelButton = buttons[0];
            expect(cancelButton).toBeDefined();
            expect(cancelButton.label).toBe('c.commonCancel');
        });

        it('does not render warning message when gift is not reviewing an open donation', async () => {
            const modalElement = setup();
            modalElement.giftInView = {
                fields: {
                    [OPPORTUNITY_IMPORTED.fieldApiName]: null,
                    [PAYMENT_IMPORTED.fieldApiName]: null
                },
                softCredits: null
            };

            await flushPromises();

            const warning = modalElement.shadowRoot.querySelector('c-util-inline-text');
            expect(warning).toBeNull();
        });

        it('renders warning messages when gift is both reviewing an open donation and adding soft credits', async () => {
            const modalElement = setup();
            modalElement.giftInView = {
                fields: {
                    [OPPORTUNITY_IMPORTED.fieldApiName]: 'DUMMY_ID',
                    [PAYMENT_IMPORTED.fieldApiName]: 'DUMMY_ID'
                },
                softCredits: '[{"Role":"Decision Maker","ContactId":"0030R00001MY10qQAD","key":0},{"Role":"Donor","ContactId":"0030R00001MY10kQAD","key":1},{"Role":"Soft Credit","ContactId":"0030R00001MY10lQAD","key":2}]'
            };

            await flushPromises();

            const warnings = modalElement.shadowRoot.querySelectorAll('c-util-inline-text');
            expect(warnings.length).toBe(2);

            const softCreditsWarning = warnings[0];
            expect(softCreditsWarning).not.toBeNull();

            const reviewDonationsWarning = warnings[1];
            expect(reviewDonationsWarning).not.toBeNull();

            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            expect(buttons.length).toBe(1);
            const cancelButton = buttons[0];
            expect(cancelButton).toBeDefined();
            expect(cancelButton.label).toBe('c.commonCancel');
        });

        it('renders rd2EntryFormScheduleSection component', async () => {
            const modalElement = setup();
            await flushPromises();

            const scheduleComponent = modalElement.shadowRoot.querySelector('[data-id="scheduleComponent"]');

            expect(scheduleComponent).toBeDefined();
        });

        it('renders cancel and add schedule buttons', async () => {
            const modalElement = setup();
            await flushPromises();

            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            const cancelButton = buttons[0];
            const createRecurrenceButton = buttons[1];

            expect(buttons.length).toBe(2);
            expect(cancelButton).toBeDefined();
            expect(cancelButton.label).toBe('c.commonCancel');
            expect(createRecurrenceButton).toBeDefined();
            expect(createRecurrenceButton.label).toBe('c.geAddSchedule');
        });

        it('renders update schedule button', async () => {
            const rd2Service = new Rd2Service();
            getInitialView.mockResolvedValue(initialViewResponse);
            const modalElement = setup();
            modalElement.schedule = {
                RecurringType__c: 'Open',
                StartDate__c: '2020-01-01',
                npe03__Installment_Period__c: 'Monthly',
            }
            await flushPromises();

            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            const updateScheduleButton = buttons[1];

            expect(buttons.length).toBe(2);
            expect(updateScheduleButton).toBeDefined();
            expect(updateScheduleButton.label).toBe('c.geUpdateSchedule');
        });
    });

    describe('callback behavior', () => {
        it('calls provided callback for cancel button', async () => {
            const mockCancelButtonCallback = jest.fn();
            const modalElement = setup(mockCancelButtonCallback);
            await flushPromises();

            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            const cancelButton = buttons[0];
            cancelButton.click();

            expect(mockCancelButtonCallback).toHaveBeenCalled();
        });

        it('calls provided callback for create recurrence button', async () => {
            const mockCreateRecurrenceCallback = jest.fn();
            const modalElement = setup(jest.fn(), mockCreateRecurrenceCallback);

            const scheduler = modalElement.shadowRoot.querySelector('[data-id="scheduleComponent"]');
            scheduler.isValid = jest.fn(() => true);
            scheduler.returnValues = jest.fn(() => ({
                dummyField: 'dummyValue'
            }));
            await flushPromises();

            const buttons = modalElement.shadowRoot.querySelectorAll('lightning-button');
            const createRecurrenceButton = buttons[1];
            createRecurrenceButton.click();

            expect(mockCreateRecurrenceCallback).toHaveBeenCalled();
            expect(mockCreateRecurrenceCallback).toHaveBeenCalledWith({
                dummyField: 'dummyValue'
            });
        });
    });
});