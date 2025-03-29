const Joi = require('@hapi/joi')
const { validationCommonErrHandler, familyArrangerValidation, personSchemaValidation, deathDetailsWithCertifierSchemaValidation, deathDetailsSchemaValidation, relationSchema } = require('../commonValidations')
const { getFollowUpTypeIds, getMaintenanceTypeIds, getRelationIds } = require('../../../utils/dbGetFunctions')

async function getReasonSchema (reasonId) {
    let reason = {}
    switch (reasonId) {
    case 1:
        reason = await atNeedReason()
        break
    case 2:
        reason = await preArrangementReason()
        break
    case 3:
        reason = await maintenanceRequestReason()
        break
    case 4:
        // reason = memorialRestoration()
        break
    case 5:
        reason = await geneologySearchReason()
        break
    case 6:
        reason = await otherReason()
        break
    default:
        break
    }
    return reason
}

async function maintenanceRequestReason () {
    let maintenanceTypeIds = await getMaintenanceTypeIds()

    let validate = Joi.object().keys({
        id: Joi.number().label('id').error(validationCommonErrHandler),
        cause: Joi.array().items(Joi.number().valid(maintenanceTypeIds)).min(1).required().error(validationCommonErrHandler),
        serviceLocation: Joi.string().regex(/^(?=.*[0-9])|(?=.*[a-zA-Z])|([a-zA-Z0-9]+)$/).required().error(validationCommonErrHandler),
        graveMarkerLocation: Joi.string().regex(/^(?=.*[0-9])|(?=.*[a-zA-Z])|([a-zA-Z0-9]+)$/).allow('', null).error(validationCommonErrHandler)
    })
    return validate
}

async function otherReason () {
    let followUpTypeIds = await getFollowUpTypeIds()
    let validate = Joi.object().keys({
        id: Joi.number().label('id').error(validationCommonErrHandler),
        isFollowUpRequired: Joi.boolean().label('isFollowUpRequired').error(validationCommonErrHandler),
        email: Joi.string().email().allow('').label('email').error(validationCommonErrHandler),
        followUpTypes: Joi.when('isFollowUpRequired', {
            is: true,
            then: Joi.array().required().min(1).label('followUpTypes')
                .items(Joi.number().valid(followUpTypeIds)).error(validationCommonErrHandler)
        })
    })
    return validate
}

async function geneologySearchReason () {
    const relationIds = await getRelationIds()
    let validate = Joi.array().items(Joi.object().keys({
        id: Joi.number().label('id').error(validationCommonErrHandler),
        isDeleted: Joi.boolean().label('isDeleted').error(validationCommonErrHandler),
        decedent: {
            id: Joi.number().error(validationCommonErrHandler),
            ...personSchemaValidation(),
            deathDetails: {
                ...deathDetailsSchemaValidation({ checkDob: true })
            }
        },
        isCallerNok: Joi.boolean().label('isCallerNok').error(validationCommonErrHandler),
        callerDecedentRelation: {
            id: Joi.number().label('relationId').valid(relationIds).error(validationCommonErrHandler),
            name: Joi.string().label('Relation Name').error(validationCommonErrHandler)
        },
        dateOfDeathOfDecedent: Joi.string().error(validationCommonErrHandler)
    }))
    return validate
}

async function preArrangementReason () {
    let validate = Joi.array().items(Joi.object().keys({
        id: Joi.number().label('id').error(validationCommonErrHandler),
        beneficiary: {
            ...personSchemaValidation()
        },
        isSameAsCaller: Joi.boolean().label('isSelf').error(validationCommonErrHandler),
        relation: await relationSchema(),
        isDeleted: Joi.boolean().label('isDeleted').error(validationCommonErrHandler),
        needFuneralService: Joi.boolean().label('Need funeral service').error(validationCommonErrHandler),
        needCemeteryService: Joi.boolean().label('Need cemetery service').error(validationCommonErrHandler),
        isExistingPreneed: Joi.boolean().label('is existing PN').error(validationCommonErrHandler),
        funeralContractNumber: Joi.string().label('Funeral contract number').error(validationCommonErrHandler),
        cemeteryContractNumber: Joi.string().label('Cemetery contract number').error(validationCommonErrHandler),
        isBeneficiarySameAsCaller: Joi.boolean().label('isBeneficiarySameAsCaller').error(validationCommonErrHandler)
    }))
    return validate
}

async function atNeedReason () {
    const relationValidation = await relationSchema()
    let validate = Joi.array().items(Joi.object().keys({
        id: Joi.number().label('id').error(validationCommonErrHandler),
        familyArranger: {
            ...familyArrangerValidation()
        },
        decedent: {
            ...personSchemaValidation(),
            deathDetails: {
                ...deathDetailsWithCertifierSchemaValidation({ checkDob: true })
            }
        },
        informant: {
            ...personSchemaValidation()
        },
        isReadyForPickup: Joi.boolean().label('is ready for pickup').error(validationCommonErrHandler),
        isCallerNok: Joi.boolean().label('is caller nok').error(validationCommonErrHandler),
        isDeleted: Joi.boolean().label('isDeleted').error(validationCommonErrHandler),
        funeralHomeChoice: Joi.string().label('Funeral home choice').error(validationCommonErrHandler),
        cemeteryHomeChoice: Joi.string().label('Funeral home choice').error(validationCommonErrHandler),
        haveFuneralPN: Joi.boolean().label('Have funeral PN').error(validationCommonErrHandler),
        haveCemeteryPN: Joi.boolean().label('Have cemetery PN').error(validationCommonErrHandler),
        requiredService: Joi.string().label('Required service').valid(['funeral', 'cemetery', 'Both']).error(validationCommonErrHandler),
        arrangerEmail: Joi.string().email().allow('').label('Arranger email').error(validationCommonErrHandler),
        isInformantSameAsCaller: Joi.boolean().label('is informant same as caller').error(validationCommonErrHandler),
        callerDecedentRelation: { ...relationValidation },
        informantDecedentRelation: { ...relationValidation }
    }))
    return validate
}

module.exports = {
    preArrangementReason,
    geneologySearchReason,
    maintenanceRequestReason,
    otherReason,
    atNeedReason,
    getReasonSchema
}
