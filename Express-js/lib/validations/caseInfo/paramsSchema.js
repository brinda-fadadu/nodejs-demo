const Joi = require('@hapi/joi')
const ValidationCommonErrHandler = require('../commonValidations').validationCommonErrHandler

const personIdSchema = {
    personId: Joi.number().label('PersonId').required().error(ValidationCommonErrHandler)
}

const deathDetailsParamsSchema = {
    ...personIdSchema,
    deathDetailsId: Joi.number().label('DeathDetailsId').required().error(ValidationCommonErrHandler)
}

const certifierParamsSchema = {
    ...personIdSchema,
    certifierId: Joi.number().label('CertifierId').required().error(ValidationCommonErrHandler)
}

const veteranParamsSchema = {
    ...personIdSchema,
    veteranId: Joi.number().label('VeteranId').required().error(ValidationCommonErrHandler)
}

const ethnicityParamsSchema = {
    ...personIdSchema,
    ethnicityId: Joi.number().label('EthnicityId').required().error(ValidationCommonErrHandler)
}

const educationParamsSchema = {
    ...personIdSchema,
    educationId: Joi.number().label('EducationId').required().error(ValidationCommonErrHandler)
}

const nokParamsSchema = {
    ...personIdSchema,
    nokId: Joi.number().label('NokId').required().error(ValidationCommonErrHandler)
}

const notifierParamsSchema = {
    ...personIdSchema,
    notifierId: Joi.number().label('NotifierId').required().error(ValidationCommonErrHandler)
}

const parentsParamsSchema = {
    ...personIdSchema,
    parentId: Joi.number().label('ParentId').required().error(ValidationCommonErrHandler)
}

const contactsParamsSchema = {
    ...personIdSchema,
    contactId: Joi.number().label('ContactId').required().error(ValidationCommonErrHandler)
}

const anRemainsParamsSchema = {
    ...personIdSchema,
    remainsId: Joi.number().label('RemainsId').required().error(ValidationCommonErrHandler)
}

const anRemainsTransferParamsSchema = {
    ...personIdSchema,
    transferId: Joi.number().label('TransferId').required().error(ValidationCommonErrHandler)
}

const agreementsParamsSchema = {
    ...personIdSchema,
    agreementId: Joi.number().label('AgreementId').required().error(ValidationCommonErrHandler),
    apiType: Joi.string().valid('quotation').error(ValidationCommonErrHandler)
}

const agreementsQuerySchema = {
    ...personIdSchema,
    type: Joi.number().label('Type').error(ValidationCommonErrHandler)
}

const contactsQuerySchema = {
    ...personIdSchema,
    contactRoles: Joi.alternatives().try(Joi.array().items(Joi.number()), Joi.number()).error(ValidationCommonErrHandler),
    relationId: Joi.alternatives().try(Joi.array().items(Joi.number()), Joi.number()).error(ValidationCommonErrHandler),
    contactType: Joi.alternatives().try(Joi.array().items(Joi.number()), Joi.number()).error(ValidationCommonErrHandler)
}

const addendumQuerySchema = {
    addendumId: Joi.number().allow(null).label('Addendum Id').error(ValidationCommonErrHandler)
}

const obituaryPdfSchema = {
    personId: Joi.number().label('PersonId').required().error(ValidationCommonErrHandler),
    timezone: Joi.string().label('timezone').required().error(ValidationCommonErrHandler)
}

const quotationsParamsSchema = {
    quotationId: Joi.number().label('QuotationId').required().error(ValidationCommonErrHandler),
    agreementId: Joi.number().label('AgreementId').required().error(ValidationCommonErrHandler)
}

module.exports = {
    personIdSchema,
    deathDetailsParamsSchema,
    certifierParamsSchema,
    veteranParamsSchema,
    ethnicityParamsSchema,
    educationParamsSchema,
    nokParamsSchema,
    notifierParamsSchema,
    parentsParamsSchema,
    contactsParamsSchema,
    anRemainsParamsSchema,
    anRemainsTransferParamsSchema,
    agreementsParamsSchema,
    contactsQuerySchema,
    agreementsQuerySchema,
    addendumQuerySchema,
    obituaryPdfSchema,
    quotationsParamsSchema
}
