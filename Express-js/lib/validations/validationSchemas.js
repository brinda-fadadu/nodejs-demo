const Joi = require('@hapi/joi')
const ValidationCommonErrHandler = require('./commonValidations').validationCommonErrHandler
const { addressValidation } = require('./commonValidations')

var getCategoryRequestSchema = {
    itemTypeId: Joi.number().required().error(ValidationCommonErrHandler),
    itemIndustryId: Joi.number().required().error(ValidationCommonErrHandler),
    agreementId: Joi.number().error(ValidationCommonErrHandler)
}

var getItemsRequestSchema = {
    locationId: Joi.number().required().error(ValidationCommonErrHandler),
    itemTypeId: Joi.number().when(
        'itemCategoryId',
        { is: Joi.exist(),
            then: Joi.number().error(ValidationCommonErrHandler),
            otherwise: Joi.number().required().error(ValidationCommonErrHandler)
        }),
    itemIndustryId: Joi.when(
        'itemCategoryId',
        { is: Joi.exist(),
            then: Joi.number().error(ValidationCommonErrHandler),
            otherwise: Joi.number().required().error(ValidationCommonErrHandler)
        }),
    itemCategoryId: Joi.number().error(ValidationCommonErrHandler),
    miscDecedentId: Joi.number().allow(false).error(ValidationCommonErrHandler),
    agreementId: Joi.number().error(ValidationCommonErrHandler),
    searchTerm: Joi.string().error(ValidationCommonErrHandler),
    attributes: Joi.object().error(ValidationCommonErrHandler),
    limit: Joi.number().error(ValidationCommonErrHandler),
    offset: Joi.number().error(ValidationCommonErrHandler),
    vendorId: Joi.number().error(ValidationCommonErrHandler)
}

var getCategoryAttributesRequestSchema = {
    itemCategoryId: Joi.number().required().error(ValidationCommonErrHandler)
}

var getMemorialCategoriesRequestSchema = {
    agreementId: Joi.number().required().error(ValidationCommonErrHandler)
}

var getMonumentItemsRequestSchema = {
    memorialTypeId: Joi.number().required().error(ValidationCommonErrHandler),
    memorialSizeIds: Joi.string().required().error(ValidationCommonErrHandler),
    agreementId: Joi.number().required().error(ValidationCommonErrHandler)
}

var getMonumentExceptionItemsRequestSchema = {
    memorialTypeId: Joi.number().required().error(ValidationCommonErrHandler),
    agreementId: Joi.number().required().error(ValidationCommonErrHandler),
    propertyIds: Joi.string().allow(null, '').error(ValidationCommonErrHandler),
    isSideBySide: Joi.number().allow(null, '').error(ValidationCommonErrHandler)
}

var getMemorialItemsRequestSchema = {
    monumentItemId: Joi.number().required().error(ValidationCommonErrHandler),
    agreementId: Joi.number().required().error(ValidationCommonErrHandler),
    propertyIds: Joi.string().allow(null).error(ValidationCommonErrHandler)
}

var getPackagesRequestSchema = {
    packageCategoryId: Joi.number().error(ValidationCommonErrHandler),
    limit: Joi.number().error(ValidationCommonErrHandler),
    offset: Joi.number().error(ValidationCommonErrHandler),
    searchTerm: Joi.string().error(ValidationCommonErrHandler),
    locationId: Joi.number().required().error(ValidationCommonErrHandler)
}

var getPackageItemsRequestSchema = {
    limit: Joi.number().error(ValidationCommonErrHandler),
    offset: Joi.number().error(ValidationCommonErrHandler),
    packageId: Joi.number().error(ValidationCommonErrHandler)
}

// Forms Request Validations
const recipientSchema = Joi.array().items(Joi.object().keys({
    id: Joi.number().required(),
    inPersonHostId: Joi.number().optional(),
    formRecipientRoleId: Joi.number().required(),
    usedDefaultEmail: Joi.string().optional()
    // availableInPerson: Joi.bool().required()
}))

const otherRecipientSchema = Joi.array().items(Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().allow(null).error(ValidationCommonErrHandler),
    inPersonHostId: Joi.number().optional(),
    // availableInPerson: Joi.boolean().required(),
    formRecipientRoleId: Joi.number().required(),
    usedDefaultEmail: Joi.string().optional()
}))

const getListOfCaseInfoFormsRequestParamsSchema = {
    personId: Joi.number().required().error(ValidationCommonErrHandler),
    formName: Joi.string().error(ValidationCommonErrHandler),
    agreementId: Joi.number().error(ValidationCommonErrHandler),
    addendumId: Joi.number().allow(null).error(ValidationCommonErrHandler),
    apiType: Joi.string()
}

var previewCaseInfoFormRequestParamsSchema = {
    personId: Joi.number().required().error(ValidationCommonErrHandler),
    formId: Joi.number().required().error(ValidationCommonErrHandler)
}

var previewCaseInfoFormRequestBodySchema = Joi.object().keys({
    agreementId: Joi.number(),
    employees: recipientSchema,
    contacts: recipientSchema,
    otherRecipients: otherRecipientSchema,
    agreementPersons: recipientSchema,
    agreementPropertyOwners: recipientSchema,
    metaData: Joi.string(),
    certifiers: recipientSchema,
    carbonCopyEmail: recipientSchema,
    envelopeName: Joi.string().optional()
})

var sendCaseInfoFormsRequestParamsSchema = {
    personId: Joi.number().required().label('personId').error(ValidationCommonErrHandler)
}

var sendCaseInfoFormsRecipientRequestParamsSchema = {
    personId: Joi.number().required().label('personId').error(ValidationCommonErrHandler),
    recipientId: Joi.number().required().label('recipientId').error(ValidationCommonErrHandler),
    signingType: Joi.string().required().label('Signing Type').error(ValidationCommonErrHandler)
}

var sendCaseInfoFormsRequestBodySchema = Joi.array().items(Joi.object({
    formId: Joi.number().required(),
    agreementId: Joi.number(),
    addendumId: Joi.number().allow(null),
    employees: recipientSchema,
    contacts: recipientSchema,
    otherRecipients: otherRecipientSchema,
    agreementPersons: recipientSchema,
    agreementPropertyOwners: recipientSchema,
    metaData: Joi.string(),
    certifiers: recipientSchema,
    carbonCopyEmail: recipientSchema,
    envelopeName: Joi.string().optional()
}))

var voidCaseInfoFormRequestParamsSchema = {
    personId: Joi.number().required().error(ValidationCommonErrHandler),
    caseInfoFormId: Joi.number().required().error(ValidationCommonErrHandler)
}

var deleteCaseInfoFormsRequestParamsSchema = {
    personId: Joi.number().required().label('personId').error(ValidationCommonErrHandler)
}

// var deleteCaseInfoFormsRequestBodySchema = {
// }

var downloadCaseInfoFormRequestParamsSchema = {
    personId: Joi.number().required().label('personId').error(ValidationCommonErrHandler),
    envelopeId: Joi.string().min(36).max(36).required()
}

// var downloadCaseInfoFormRequestBodySchema = {
// }

const uploadItemImagesBodyParamsSchema = {
    itemId: Joi.number().required().error(ValidationCommonErrHandler),
    itemType: Joi.string().error(ValidationCommonErrHandler)
}

const uploadItemImagesQueryParamsSchema = {
    itemId: Joi.number().required().error(ValidationCommonErrHandler),
    imageId: Joi.number().required().error(ValidationCommonErrHandler),
    itemType: Joi.string().error(ValidationCommonErrHandler)
}

const createUpdatePartnerBodyParamsSchema = {
    partnerName: Joi.string().max(80).required(),
    isActive: Joi.boolean().required().error(ValidationCommonErrHandler),
    contact: {
        id: Joi.number().error(ValidationCommonErrHandler),
        firstName: Joi.string().required().error(ValidationCommonErrHandler),
        middleName: Joi.string().required().error(ValidationCommonErrHandler),
        lastName: Joi.string().required().error(ValidationCommonErrHandler),
        phoneNumber: Joi.string().required().error(ValidationCommonErrHandler),
        email: Joi.string().required().error(ValidationCommonErrHandler)
    },
    addressPlace: {
        id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
        addressId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
        address: {
            ...addressValidation()
        }
    },
    discountType: Joi.number().required().error(ValidationCommonErrHandler),
    discountValue: Joi.string().regex(/^\d{1,8}(\.\d{1,5})?$/).required().error(ValidationCommonErrHandler)
}

const syncedAgreementReportSchema = {
    startDate: Joi.date().required().error(ValidationCommonErrHandler),
    endDate: Joi.date().required().error(ValidationCommonErrHandler),
    timezone: Joi.string().required().error(ValidationCommonErrHandler)
}

const getMemorialPropertyParamsSchema = {
    agreementId: Joi.number().required().error(ValidationCommonErrHandler)
}

const cashAdvanceItemsParamsSchema = {
    itemId: Joi.number().required().error(ValidationCommonErrHandler)
}
const managerReportSchema = {
    limit: Joi.number().max(20).error(ValidationCommonErrHandler),
    page: Joi.number().error(ValidationCommonErrHandler),
    timezone: Joi.string().error(ValidationCommonErrHandler),
    createdTo: Joi.date().label('createdTo').allow(null).error(ValidationCommonErrHandler),
    createdFrom: Joi.date().label('createdFrom').allow(null).error(ValidationCommonErrHandler),
    businessUnitIds: Joi.array().items(Joi.number()).allow(null).label('BusinessUnitId').error(ValidationCommonErrHandler),
    managerIds: Joi.array().items(Joi.number()).allow(null).label('ManagerId').error(ValidationCommonErrHandler)
}

var embeddedSigningCaseInfoFormRequestBodySchema = Joi.object().keys({
    agreementId: Joi.number(),
    employees: recipientSchema,
    contacts: recipientSchema,
    otherRecipients: otherRecipientSchema,
    agreementPersons: recipientSchema,
    agreementPropertyOwners: recipientSchema,
    metaData: Joi.string(),
    certifiers: recipientSchema,
    carbonCopyEmail: recipientSchema,
    signingType: Joi.string().required()
})

const sepulcherCertificateSchema = {
    teamId: Joi.number().error(ValidationCommonErrHandler),
    startDate: Joi.date().label('startDate').error(ValidationCommonErrHandler),
    endDate: Joi.date().label('endDate').error(ValidationCommonErrHandler),
    timezone: Joi.string().error(ValidationCommonErrHandler)
}

const envelopeIdRequestParamsSchema = {
    envelopeId: Joi.string().required().error(ValidationCommonErrHandler)
}

const changeRoutingOrderEnvelopeRequestBodySchema = {
    caseInfoFormId: Joi.number().required().error(ValidationCommonErrHandler),
    recipients: Joi.array().items(Joi.object().keys({
        recipientId: Joi.number().required().error(ValidationCommonErrHandler),
        clientUserId: Joi.string().optional().error(ValidationCommonErrHandler),
        routingOrder: Joi.number().required().error(ValidationCommonErrHandler)
    }).options({ stripUnknown: true }))
}
const validateEmailSchema = {
    email: Joi.string().email().required().error(ValidationCommonErrHandler)
}

var sendCaseInfoFormsRequestBodyNewSchema = {
    compositeTemplates: Joi.boolean().required(),
    metaData: Joi.string().when('compositeTemplates', { is: true, then: Joi.required(), otherwise: Joi.forbidden() }).error(ValidationCommonErrHandler),
    forms: Joi.array().items(Joi.object({
        formId: Joi.number().required().error(ValidationCommonErrHandler),
        agreementId: Joi.number().error(ValidationCommonErrHandler),
        addendumId: Joi.number().allow(null).error(ValidationCommonErrHandler),
        employees: recipientSchema,
        contacts: recipientSchema,
        otherRecipients: otherRecipientSchema,
        agreementPersons: recipientSchema,
        agreementPropertyOwners: recipientSchema,
        metaData: Joi.string().error(ValidationCommonErrHandler),
        certifiers: recipientSchema,
        carbonCopyEmail: recipientSchema,
        envelopeName: Joi.string().optional().error(ValidationCommonErrHandler)
    }).when('compositeTemplates', { is: false, then: { 'metaData': Joi.required() }, otherwise: { 'metaData': Joi.forbidden() } }))
}

const mergeRecipientsRequestBodySchema = {
    caseInfoFormId: Joi.number().required().error(ValidationCommonErrHandler),
    envelopeId: Joi.string().required().error(ValidationCommonErrHandler)
}

module.exports = {
    getCategoryRequestSchema,
    getPackagesRequestSchema,
    getPackageItemsRequestSchema,
    getItemsRequestSchema,
    getCategoryAttributesRequestSchema,
    getMemorialCategoriesRequestSchema,
    getMonumentItemsRequestSchema,
    getMonumentExceptionItemsRequestSchema,
    getMemorialItemsRequestSchema,
    getListOfCaseInfoFormsRequestParamsSchema,

    previewCaseInfoFormRequestParamsSchema,
    previewCaseInfoFormRequestBodySchema,

    sendCaseInfoFormsRequestParamsSchema,
    sendCaseInfoFormsRequestBodySchema,

    voidCaseInfoFormRequestParamsSchema,

    deleteCaseInfoFormsRequestParamsSchema,
    // deleteCaseInfoFormsRequestBodySchema,

    downloadCaseInfoFormRequestParamsSchema,
    // downloadCaseInfoFormRequestBodySchema
    uploadItemImagesBodyParamsSchema,
    uploadItemImagesQueryParamsSchema,

    createUpdatePartnerBodyParamsSchema,
    syncedAgreementReportSchema,
    getMemorialPropertyParamsSchema,
    cashAdvanceItemsParamsSchema,
    embeddedSigningCaseInfoFormRequestBodySchema,
    sendCaseInfoFormsRecipientRequestParamsSchema,
    managerReportSchema,
    sepulcherCertificateSchema,
    envelopeIdRequestParamsSchema,
    changeRoutingOrderEnvelopeRequestBodySchema,
    validateEmailSchema,
    sendCaseInfoFormsRequestBodyNewSchema,
    mergeRecipientsRequestBodySchema
}
