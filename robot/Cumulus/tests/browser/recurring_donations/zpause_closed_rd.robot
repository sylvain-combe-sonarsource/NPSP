*** Settings ***

Resource        robot/Cumulus/resources/NPSP.robot
Library         cumulusci.robotframework.PageObjects
...             robot/Cumulus/resources/NPSPSettingsPageObject.py
...             robot/Cumulus/resources/ContactPageObject.py
...             robot/Cumulus/resources/RecurringDonationsPageObject.py
...             robot/Cumulus/resources/OpportunityPageObject.py
Suite Setup     Run keywords
...             Enable RD2
...             Open Test Browser
...             Setup Test Data
Suite Teardown  Capture Screenshot and Delete Records and Close Browser

*** Keywords ***

Setup Test Data
        ${NS} =             Get NPSP Namespace Prefix
        Set Suite Variable  ${NS}

        #Create a Recurring Donation
        &{contact1_fields}=   Create Dictionary                     Email=rd2tester@example.com
        &{recurringdonation_fields} =	Create Dictionary           Name=ERD Open Recurring Donation
        ...                                                         npe03__Installment_Period__c=Yearly
        ...                                                         npe03__Amount__c=100
        ...                                                         npe03__Open_Ended_Status__c=Open
        ...                                                         npe03__Date_Established__c=2019-07-08
        ...                                                         ${NS}Status__c=Active
        ...                                                         ${NS}Day_of_Month__c=15
        ...                                                         ${NS}InstallmentFrequency__c=1
        ...                                                         ${NS}PaymentMethod__c=Check

        Setupdata   contact         ${contact1_fields}             recurringdonation_data=${recurringdonation_fields}


*** Test Cases ***

Edit An Enhanced Recurring donation record of type open
    [Documentation]               After creating an open recurring donation using API, The test ensures that the record
     ...                          is closed by applying the reason for closure as financial difficulty.
     ...                          A pause action is then performed on the closed recurring donation to verify
     ...                          The warning message that user cannot pause a closed recurring donation is displayed.


    [tags]                                  unstable               W-040346           feature:RD2

    Go To Page                              Listing                                   npe03__Recurring_Donation__c

    Click Object Button                     New
    Wait For Modal                          New                                       Recurring Donation
    Reload Page

    Go To Page                              Details
    ...                                     npe03__Recurring_Donation__c
    ...                                     object_id=${data}[contact_rd][Id]
    Wait Until Loading Is Complete
    Current Page Should be                  Details                                  npe03__Recurring_Donation__c
    Edit Recurring Donation Status
    ...                                     Status=Closed
    ...                                     Status Reason=Financial Difficulty

    Current Page Should be                  Details                                  npe03__Recurring_Donation__c
    Pause_Recurring Donation
    Validate Warning Text                   You can't Pause a Closed Recurring Donation