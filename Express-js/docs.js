// region Call
// TODO: changes list calls response (check if all the persons are verified and send the call isVerified status on that)
// TODO: remove is Verified column from call table
// TODO: add logging in the apis

// region authentication

/**
 * @class Auth
 */

// endregion

/**
 * Create a call
 * @class Call
 */

//  * TODO: change db columns from pascal case to camel case
// * Create a call
// * every call has a reason.
// * There are 6 types of reasons.
// * 1. Some one has passed away (At Need).
// * 2. Pre-Arrangement (Pre Need).
// * 3. Genealogy request.
// * 4. Maintanence Request.
// * 5. Memorial restoration.
// * 6. Other request.
// * Set a reason for the call

/**
 * Sets the source type of the call to either call or walk-in
 * @function addNote
 * @memberof Call
 * @param {string} level One of CALL || REASON
 */

/**
 * Sets the status, location, appointment date and time, caller's prefered language, callType
 * @function setBasicInfo
 * @memberof Call
 * @param {object} data apart from caller object all other basic data of the call need to be sent
 */

/**
 * Assign a call to a specific staff
 * @function assignTo
 * @memberof Call
 * @param {integer} staffId id of the staff for whom the call is assignedTo
 */

/**
 * @function relatePerson
 * @memberof Call
 * @param {integer} personId id of the created person
 * @param {string} relation relation of the person to the call. ex: Caller, Decedent, Informant, Beneficiary
 */

// FIXME: Caller can be a person or organization right? It should a person
// directly or a person through an organization.
/**
 * Set a caller to a call. This is adding a person as caller
 * @function addCaller
 * @memberof Call
 * @param {integer} callerId id of the created person as caller.
 * caller can be from organization or a normal person
 */

/**
 * Get all the notes added for a call
 * @function getNotes
 * @memberof Call
 * @instance
 * @param {string} level it will return notes based on resourceType(call or callReason)
 */

/**
 * get list of calls.
 * List of all the calls added.
 * @function getListOfCalls
 * @memberof Call
 * @param {integer} callStatus status of the call. ex: converted, no contact etc
 * @param {integer} perPage limit og the calls to be displayed in a page
 * @param {integer} page the page number to fetch data
 * @param {string} callId search the call through callId (which is identifier in table)
 * @param {string} callerName search the call through caller name
 * @param {integer[]} callStatus get the calls list based on the call status. call status is an integer[] of integers
 * @param {integer[]} callReason get the calls list based on the callReason. call reason is an integer[] of integers
 * @param {date[]}  createdAt get the calls list based on the createdAt. createdAt is an integer[] of date of length 2
 * @param {string} phoneNumber get the calls list based on the phoneNumberbundleRenderer.renderToStream
 * @param {integer} assignedTo get the calls list based on the staffId.
 * @param {string} modifiedAt get the calls list based on the first modified or last modified
 */

/**
 * @function copyCall
 * @memberof Call
 * @instance
 * @param {integer} callId id of the call to copy
 * copy call functionality is for copying only the call data( not reason) to another new call.
 */

/**
 * @function editCall
 * @memberof Call
 * @instance
 * @param {integer} callId id of the call to edit
 */
/**
 * @function bulkDeleteCalls
 * @memberof Call
 * @instance
 * @param {Array.Object.<string, number>} data callId and reason to delete the call
 */

/**
 * @function exportCalls
 * @memberof Call
 */

// end region

// region reason

/**
 * @class Reason
 */

/**
  * multiple entries are added for only 3 reasons which are someone has passed, pre-arrangement and genealogy
  * @function addMultipleEntries
  * @memberof Reason
  */

/**
 * @function deleteEntry
 * @memberof Reason
 */

// endregion

// region ANCall
/**
 * @class ANCall
 * @augments Call
 * @classdesc ANCall is the call with the reason AN(At Need or some one has passed away).
 */
/**
 * Add decedent.
 * decedents can be multiple. decedent will be added only when the reason is someone has passed or genealogy
 * @function addDecedent
 * @memberof ANCall
 * @param {integer} decedentId id of the person.
 */

/**
  * @function deleteDecedent
  * @memberof ANCall
  * @instance
  * @param {integer} decedentId id of the person
  */

/**
   * @function updateDecedent
   * @memberof ANCall
   * @instance
  * @param {integer} decedentId id of the person
   */

/**
 * Add Informant
 * Informant can be same as caller. Informant is added only when the reason is someone has passed
 * @function addInformant
 * @memberof ANCall
 * @param {integer} informantId id of the person.
 * @param {integer} decedentId id of the person added as decedent
 */
/**
 * Add required services
 * @function addRequiredService
 * @memberof ANCall
 */

/**
 * add other basic infor for AN call
 * @function addBasicInfo
 * @memberof ANCall
 */

/**
 * Set a given address as an LOR
 * LOR is location of remains (where the dead body of the person is)
 * It can a organization address or residential address
 * @function setLOR
 * @memberof ANCall
 * TODO: data base refactor
 */

/**
 * Set a given person as NOK
 * we can set if the caller is NOK (next of kin) for the decedent
 * @function setNOK
 * @memberof ANCall
 * @param {boolean} isNok indicates if the caller is NOK to decedent
 */

/**
 * Set a funeral arrangement assistant
 * @function setFuneralArrangementAssistant
 * @memberof ANCall
 * TODO: need product team confirmation if FAA would be CL staff. if true then db refactor
 */

/**
 * @function editANReason
 * @memberof ANCall
 * @instance
 * @param {integer} reasonId id of the reason to edit
 */

// end region

/**
 * @class PNCall
 * @augments Call
 * @classdesc PNCall is a call with reason PN (Pre need or Pre arrangement)
 */

/**
 * @function addBeneficary
 * @memberof PNCall
 * @param {integer} beneficiaryId id of the person.
 */

/**
  * @function deleteBeneficiary
  * @memberof PNCall
  * @instance
  * @param {integer} BeneficiaryId id of the person
  */

/**
   * @function updateBeneficiary
   * @memberof PNCall
   * @instance
  * @param {integer} BeneficiaryId id of the person
   */

/**
 * Add required services
 * @function addRequiredService
 * @memberof PNCall
 * @param {string} requiredService service required
 */

/**
 * @function editPNReason
 * @memberof PNCall
 * @instance
 * @param {integer} reasonId id of the reason to edit
 */

// endregion

// region GenealogyRequest
/**
 * Create a GenealogyRequest
 * @class GenealogyRequestCall
 * @augments Call
 * @classdesc Genealogycall is a call with genealogy reason. If the customer calls the CL to know the details of a dead person who is there in the CL Data then it is considered as Genealogy Call
 */
/**
 * @function addDecedent
 * @memberof GenealogyRequestCall
 *  @param {integer} decedentId id of the person.
 */

/**
  * @function deleteDecedent
  * @memberof PNCall
  * @instance
  * @param {integer} DecedentId id of the person
  */

/**
   * @function updateDecedent
   * @memberof PNCall
   * @instance
  * @param {integer} DecedentId id of the person
   */
/**
 * @function setNOK
 * @memberof GenealogyRequestCall
 * @param {boolean} isNok indicates if the caller is NOK to decedent
 */

/**
 * @function editGenealogyReason
 * @memberof GenealogyRequestCall
 * @instance
 * @param {integer} reasonId id of the reason to edit
 */

// endregion

// region MaintenanceRequest
/**
 * Create a MaintenanceRequest. add basic information for maintenance request types
 * @class MaintenanceRequestCall
 * @augments Call
 * @classdesc Maintenance request is call made to CL to ask for some maintenance for the Graves or something of the Decedent
 */

/**
 * Set basic information for maintenanceRequest
 * @function setBasicInfo
 * @memberof MaintenanceRequestCall
 */
/**
 * Set a maintenanceRequestReason
 * @function setMaintenanceRequestReasons
 * @memberof MaintenanceRequestCall
 */

/**
 * @function editMaintenanceReason
 * @memberof MaintenanceRequestCall
 * @instance
 * @param {integer} reasonId id of the reason to edit
 */

// endregion

/**
 * @class OtherRequestCall
 * @augments Call
 * @classdesc Other Request call is the call made for queries to the CL
 */

/**
  * check if follow up is required
  * @function isFollowUpRequired
  * @memberof OtherRequestCall
  */
/**
 * add basicInfo for other request
 * @function addFollowUpRequiredFor
 * @memberof OtherRequestCall
 */

/**
 * @function editOtherRequest
 * @memberof OtherRequestCall
 * @instance
 * @param {integer} reasonId id of the reason to edit
 */

// endregion

// region Contract
/**
 * Create a ContractOrStatement
 * @class Statement
 * @classdesc Statement is for funeral where we add items needed for the funeral process. for cemetry they are called contracts. in the backend there is only one table which is mentioned as statements for both statements and contracts. a person can have multiple statements or contracts
 */

/**
 * @function createStatement
 * @memberof Statement
 */

 /**
  * edit statement
  * @function editStatement
  * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement which is to be edited
  */

/**
 * Adding the items needed for the funeral or cemetry process
 * @function addItems
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement to which the items are added
 */

/**
 * @function deleteItems
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement from which the items are removed
 */
/**
 * @function updateItems
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement from which the items are updated
 */

/**
 * Apply discounts
 * @function applyDiscounts
 * @memberof Statement
 */

/**
 * Payors are the persons who pay for the statement or contract. we can add multiple payors
 * @function addPayer
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement id for which the payors are added
 */

/**
 * List of payors added for that paritcular statement
 * @function getListOfPayors
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement
 */

/**
 * It gives the items added for the statement
 * @function getListOfSelectedItems
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement for which the items are added
 */

/**
 * It gives the transaction of the statement
 * @function getTransactionHistoryOfStatement
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement for which the payment is made
 */

/**
 *  a payor can make the payment multiple times.
 * @function addPayment
 * @memberof Statement
 * @instance
 * @param {integer} payorId id of the payor who is making the payment
 * @param {integer} statementId id of the statement against which the payment is made
 */
/**
 * It gives the list of items available for the funeral or cemetry location of the statement.
 * Note: CL has only one cemetry location
 * @function getListOfItems
 * @memberof Statement
 * @param {integer} itemIndustryId id of the itemIndustry( funeral or cemetery)
 * @param {integer} itemTypeId id of the itemType( packages, services, merchandises etc)
 * @param {integer} locationId id of the location where the statement or contract is added
 */
/**
 * cash payment or money order payment
 * @function manualPayments
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement for which the payment is being made
 * @param {integer} payorId id of the payor who is making the payment
 * @param {integer} paymentType id of the paymnetType(cash or money order)
 */

/**
 * card payments using stripe
 * @function cardPayments
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement for which the payment is being made
 * @param {integer} payorId id of the payor who is making the payment
 * @param {integer} paymentType id of the paymnetType(card)
 */

/**
 * payment through stripe link sent in email
 * @function digitalPayment
 * @memberof Statement
 * @instance
 * @param {integer} statementId id of the statement for which the payment is being made
 * @param {integer} payorId id of the payor who is making the payment
 * @param {integer} paymentType id of the paymnetType(digital)
 */
// TODO: add a method to send the enum to identify the status of the statement.

// endregion

// region funeral Statements
/**
 * @class funeralStatement
 */
/**
 * @function cashAdvanceItems
 * @memberof funeralStatement
 */

// end region

// region Contract

/**
 * @class Contract
 * @classdesc Contract are for cemetry. It has every thing same as statement but for few functionalities
 * @extends Statement
 */

/**
 * we have to select the property where the cremation process needs to be done
 * @function SelectProperty
 * @memberof Contract
 * @instance
 * @param {integer} statementId id of the statement for which the property id being added
 */

/**
 * we have to first reserve the property in the contract
 * @function reserveProperty
 * @memberof Contract
 * @instance
 * @param {integer} statementId id of the statement for which the property id being reserved
 */

/**
 * after reserving the property we have to confirm it. only after confirming the property will be added to the contract
 * @function confirmProperty
 * @memberof Contract
 * @instance
 * @param {integer} statementId id of the statement for which the property id being confirmed
 * @param {integer} propertyId id of the property which is being confirmed
 */
// end region

// region Payer
/**
 * Create a Payer
 * @class Payer
 * @classdesc Payor is a person who makes the payment for the statement or contract
 */

/**
 * @function addCard
 * @memberof Payer
 * @instance
 * @param {integer} payorId id of the payor to which the card is added
 */

/**
 * @function listCards
 * @memberof Payer
 * @instance
 * @param {integer} payorId id of the payor
 */

/**
 * @function removeCard
 * @memberof Payer
 * @instance
 * @param {integer} payorId id of the payor
 * @param {string} cardId id of the card to be removed
 */
/**
 * @function paymentThroughCard
 * @memberof Payer
 * @instance
 * @param {integer} payorId id of the payor who is making the payment
 * @param {integer} statementId id of the statement against which the payment is being made
 * @param {string} cardId id of the card through which the payment is being made
 * @param {integer} amount amount being payed by the payor
 */

// endregion

// region Payment
/**
 * Create a Payment
 * @class Payment
 */

// endregion

// region DigitalPayments

/**
 * @class DigitalPayment
 * @extends Payment
 */

/**
 * @function sendEmailToPayer
 * @memberof DigitalPayment
 * @instance
 * @param {string} emailId email of the payor to which the payment link should be sent
 */

/**
 * @function updateStatusOfPayment
 * @memberof DigitalPayment
 * @instance
 * @param {boolean} status status of the payment
 * @param {integer} amount amount paid
 */

// end region

// region Address
/**
 * Create a Address
 * @class Address
 */

/**
 * @function addAddress
 * @memberof Address
 */
/**
 * @function editAddress
 * @memberof Address
 * @instance
 * @param {integer} addressId id of the address to be updated
 */

// endregion

// region Caller
/**
 * Create a caller
 * @class Caller
 */

/**
 * This occurs only in someone has passed and genealogy reason
 * @function setCallerRelationToDecedent
 * @memberof Caller
 * @param {integer} callerId id of the caller
 * @param {integer} decedentid id of the decedent
 */

// endregion

// region Discounts

/**
 * @class PromoCodes
 * @classdesc PromoCodes are basically Discount coupons
 */

/**
 * @function addPromoCodes
 * @memberof PromoCodes
 */

/**
 * @function getListOfPromoCodes
 * @memberof PromoCodes
 */

/**
 * @function editpromoCode
 * @memberof PromoCodes
 * @instance
 * @param {integer} promoCodeId id of the promoCode to edit
 */

/**
  * @function deletePromoCode
  * @memberof PromoCodes
  * @instance
  * @param {integer} promoCodeId id of the promoCode to delete
  */

// end region

// region Person
/**
 * Create a person
 * @class Person
 */

/**
 * Verifying a person means creating the one portalId for the person
 * @function verifyPerson
 * @memberof Person
 * @instance
 */

/**
 * Search functionality of person is based on the name, phone number, onePortalId of the person
 * @function search
 * @memberof Person
 */

/**
 * @function addAddress
 * @memberof Person
 * @instance
 * @param {integer} personId id of the person to which the address is to be added
 */

/**
 * Update Details
 * @function updateDetails
 * @memberof Person
 * @instance
 * @param {integer} personId id of the person to update
 */
// endregion

// region VerifiedPerson
/**
 * Create a VerifiedPerson
 * @class VerifiedPerson
 * @extends Person
 */

/**
  * @function generateOPI
  * @memberof VerifiedPerson
  * @instance
  */

/**
 * @function getListOfOnGoingCases
 * @memberof VerifiedPerson
 * @param {integer} typeOfService get the calls based on the type of service selected
 * @param {integer} perPage limit of the calls to be displayed in a page
 * @param {integer} page the page number to fetch data
 * @param {string} callId search the call through callId (which is identifier in table)
 * @param {string} decedentOrBeneficaryName search the call through OnePortalId of person.
 * @param {string} callerName search the call through caller name
 * @param {integer[]} callReason get the calls list based on the callReason. call reason is an integer[] of integers
 * @param {string}  funeralOrCemetryNo get the calls based on the funeral or cemetry number
 * @param {integer[]} serviceDate get the calls based on the service date. it is an integer[] of dates
 * @param {integer[]} assignedTo get the calls list based on the staffId. it is an integer[] of integers
 * @param {string} modifiedAt get the calls list based on the first modified or last modified
 */
/**
 * Add a note
 * @function addNote
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the oerson against which the note is added
 */
// TODO: add get functionalities

/**
 * Set active arrangement. There can only be one active arrangement. Either AN / PN
 * @function setActiveArrangement
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to set his/her arrangement.
 * This function will create an arrangement for the person based on the person status (alive(PN)  or dead(AN))
 */

/**
 * Adds a funeral Statement.
 * @function addFuneralStatement
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the statement is to be added
 * This will only get enabled when arrangement is created
 */

/**
 * Adds a cemetery contract.
 * @function addCemeteryContract
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the contract is to be added
 * This will only get enabled when arrangement is created
 */

/**
 * Set primary details of the OPI person
 * @function setPrimaryDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set the residential address of the OPI person
 * @function setResidentialDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set ethnicity details of the OPI person
 * @function setEthnicityDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set education details of the opi person
 * @function setEducationDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set VeteranDetails of the OPI person
 * @function setVeteranDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set ParentDetails of the OPI person. adding parentDetails is adding contacts only
 * @function setParentDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * set DeathDetails of the OPI person only when OPI person is Decedent
 * @function setDeathDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * setCertifier. Only when VerifiedPerson is Decedent
 * @function setCertifier
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * setNotifier. Only when VerifiedPerson is Decedent. Takes a contact
 * @function setNotifier
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * setNOK. Only when VerifiedPerson is Decedent. Takes a contact
 * @function setNOK
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person  for whom the details are to be updated
 */

/**
 * a contact can have multiple roles. only some specific roles can not be given to multiple contacts
 * @function addOrUpdateContactsWithRoles
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * Update Details
 * @function updateContactPersonDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} contactId id of the contact to update
 */

/**
 * list contacts of the person
 * @function getListOfContacts
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * staff can also be added as a contact for the opi person
 * @function addStaffAsContact
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * @function deleteContact
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} contactId id of the contact to delete
 */

/**
 * @function getContactDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} contactId id of the contact
 */

/**
 * @function anRemainsInfo
 * @memberof VerifiedPerson
 */

/**
 * @function getPrimaryInfo
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getResidentialAddress
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getEthnicityDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getEducationDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getVeteranDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getParentsDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getDeathDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getCertifierDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getNotifierdetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

/**
 * @function getNokDetails
 * @memberof VerifiedPerson
 * @instance
 * @param {integer} personId id of the person to get his/her details
 */

// endregion

// region An remainsInfo

/**
 * @class AnRemainsInfo
 * @classdesc an remains exists only for the dead person (verified)
 */

/**
 * @function getAnRemainsInfo
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * setANRemains. Only when VerifiedPerson is Decedent
 * @function editAnRemains
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} anRemainsId id of the remains of the person
 */

/**
 * setRemainsTransfer. Only when VerifiedPerson is Decedent
 * @function addTransfer
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * @function listTransfers
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 */

/**
 * @function deleteTransfer
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} transferId id of the transfer of the person
 */

/**
 * @function editTransfer
 * @memberof AnRemainsInfo
 * @instance
 * @param {integer} personId id of the person
 * @param {integer} transferId id of the transfer of the person
 */

// end region
// region Organization
/**
 * Create an organization
 * @class Organization
 */

/**
 * Add a person to an organization
 * @function addPerson
 * @memberof Organization
 */

/**
 * Sets a given address to an organization
 * @function setAddress
 * @memberof Organization
 */
// endregion

// region Notes

// endregion

/**
 * Create an agreement
 * @class Agreement
 */

/**
 * add a payor to the agreement
 * @function addPayment
 * @memberof Agreement
 * @param {object} payments by this payor
 * @instance
 */



/**
 * get balance amount from payments
 * @function getPaymentCalculations
 * @memberof Agreement
 * @param {integer} resourceId by this payor
 * @instance
 */

 /**
 * get agreement type and arrangement type
 * @function getArrangementType
 * @memberof Agreement
 * @param {object} payments by this payor
 * @instance
 */
// endregion


// region Payments
/**
 * Create an Payment
 * @class Payment
 */

/**
 * Generate a receipt number
 * @function getArrangementTypeAndCreateReceiptNo
 * @memberof Payment
 * @param {integer}resourceId 
 */
/**
 * Generate a receipt number
 * @function getRecipetPrefixCode
 * @memberof Payment
 * @param {object} agreementInfo
 */

/**
 * Create an Payor
 * @class Payor
 */


 /**
 * set Resuorce id 
 * @function setResource
 * @memberof Payor
 * @instance
 */

/**
 * find payor is exist or not
 * @function findPayor
 * @memberof Payor
 * @instance
 */

/**
 * find resourceId(agreement) is exist or not
 * @function loadResource
 * @memberof Payor
 * @instance
 */

/**
 * create cash payment
 * @function createCashPayment
 * @memberof Payor
 * @instance
 * @param {object} payments type of the payment
 */

/**
 * get list of payments
 * @function getListPayments
 * @memberof Payor
 * @instance
 */

/**
 * to craeate stripe account
 * @function createStripeCustomer
 * @memberof Payor
 * @instance
 */

/**
 * digital payment request
 * @function sendPaymentRequestEmail
 * @memberof Payor
 * @param {object} details amount
 * @instance
 */

/**
 * add card for cardpayments.
 * @function addCard
 * @memberof Payor
 * @param { string} cardToken 
 * @instance
 */

/**
 * list payments of cardpayments.
 * @function listPayorCards
 * @memberof Payor
 * @instance
 */

/**
 * remove payments of cardpayments.
 * @function removeCardOfPayor
 * @memberof Payor
 * @param  { string}cardId paymentId
 * @instance
 */

/**
 * add card Payment 
 * @function cardPayment
 * @memberof Payor
 * @param {object} payments
 * @instance
 */

// endregion Payments




// startregion property
/**  
 * @class Property
 */


 /**
 * set Resuorce id 
 * @function checkProperty
 * @memberof Property
 * @instance
 */

 /**
 * set Resuorce id 
 * @function getReservationStatus
 * @memberof Property
 *  * @param  { string} reservationStatus 
 * @instance
 */

 /**
 * set Resuorce id 
 * @function reserveProperty
 * @memberof Property
 * @param {object} property ,reservationStatus ,resourceType
 * @param {object} user ,id 
 * @instance
 */

 /**
 * set Resuorce id 
 * @function confirmProperty
 * @memberof Property
 * @param {object} property ,reservationStatus ,resourceType
 * @param {object} user ,id 
 * @instance
 */
 


 /**
 * set Resuorce id 
 * @function releaseProperty
 * @memberof Property
 * @instance
 */

 /**
 * set Resuorce id 
 * @function reviewProperties
 * @memberof Property
 * @instance
 */

 /**
 * set Resuorce id 
 * @function fetchListOfPropertys
 * @memberof Property
 * @instance
 */

 /**
 * set Resuorce id 
 * @function fetchListOfPropertyCampusesWithGardens
 * @memberof Property
 * @instance
 */

  /**
 * set Resuorce id 
 * @function fetchListOfPropertyTypes
 * @memberof Property
 * @instance
 */
//endregion property
// FIXME: Memorial Resto
// FIXME: Shouldn't verify organization person
// FIXME: Discounts
// FIXME: Ticketing
