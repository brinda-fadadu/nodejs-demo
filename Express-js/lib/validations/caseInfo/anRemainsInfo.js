const Joi = require('@hapi/joi')
const { validationCommonErrHandler, validateFunction, addressPlaceValidation } = require('../commonValidations')
const { customResponse } = require('../../custom-response')
const seedData = require('../../../config/seed').seed
const { getEmployees, getEmployeeTypeId } = require('../../../utils/dbGetFunctions')

async function remainsInfoValidation (req, res, next) {
    const employeeTypeId = await getEmployeeTypeId('Embalmer')
    let embalmerIds = await getEmployees([employeeTypeId])
    const reqBodySchema = {
        isEmbalmingApproved: Joi.boolean().allow(null).label('isEmbalmingApproved').required().error(validationCommonErrHandler),
        isCremationApproved: Joi.boolean().allow(null).label('isCremationApproved').required().error(validationCommonErrHandler),
        isEmbalmingNotAssigned: Joi.boolean().allow(null).label('isEmbalmingNotAssigned').required().error(validationCommonErrHandler),
        isEmbalmingSelfApproved: Joi.when('isEmbalmingApproved', {
            is: true,
            then: Joi.when('embalmingApprovedBy', {
                is: Joi.number().greater(0),
                then: Joi.boolean().falsy('Y'),
                otherwise: Joi.boolean().truthy('Y')
            })
        }),
        isCremationSelfApproved: Joi.when('isCremationApproved', {
            is: true,
            then: Joi.when('cremationApprovedBy', {
                is: Joi.array().min(1),
                then: Joi.boolean().falsy('Y'),
                otherwise: Joi.boolean().truthy('Y')
            })
        }),
        embalmerId: Joi.when('isEmbalmingApproved', {
            is: true,
            then: Joi.number().allow(null).required().valid(embalmerIds).error(validationCommonErrHandler)
        }),
        finalDisposition: Joi.string().allow('', null).label('finalDisposition').required().error(validationCommonErrHandler),
        finalRestingPlace: Joi.string().allow('', null).label('finalRestingPlace').required().error(validationCommonErrHandler)
    }
    if (!req.body.isEmbalmingSelfApproved && req.body.isEmbalmingApproved) {
        reqBodySchema.embalmingApprovedBy = Joi.number().label('embalmingApprovedBy').required().error(validationCommonErrHandler)
    }
    if (!req.body.isCremationSelfApproved && req.body.isCremationApproved) {
        reqBodySchema.cremationApprovedBy = Joi.array().items(Joi.number().required()).label('cremationApprovedBy').required().error(validationCommonErrHandler)
    }
    if (req.method === 'PUT') {
        reqBodySchema.id = Joi.number().error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function addTransferValidation (req, res, next) {
    const transferTypes = Object.keys(seedData.TransferType).map(Number)
    const reqBodySchema = {
        transferType: Joi.number().required().label('transferType').valid(transferTypes).error(validationCommonErrHandler),
        neededByDate: Joi.date().required().label('neededByDate').error(validationCommonErrHandler),
        isTransferReady: Joi.boolean().label('isTransferReady').error(validationCommonErrHandler),
        transferDateTime: Joi.date().allow(null).label('transferDateTime').error(validationCommonErrHandler),
        transferReason: Joi.string().label('transferReason').error(validationCommonErrHandler),
        isTransferComplete: Joi.boolean().label('isTransferComplete').error(validationCommonErrHandler),
        transferFromLocationId: Joi.when('transferFromPlace', {
            is: Joi.exist(),
            otherwise: Joi.number().label('transferFromLocationId').required().error(validationCommonErrHandler)
        }),
        transferToLocationId: Joi.when('transferToPlace', {
            is: Joi.exist(),
            otherwise: Joi.number().label('transferToLocationId').required().error(validationCommonErrHandler)
        }),
        transferToPrepLocationId: Joi.when('transferToLocationId', {
            is: Joi.exist(),
            then: Joi.when('transferType', {
                is: Joi.valid([1, 5, 6]),
                then: Joi.number().label('transferToPrepLocationId').required().error(validationCommonErrHandler),
                otherwise: Joi.number().allow(null).label('transferToPrepLocationId').error(validationCommonErrHandler)
            })
        }),
        primaryDriverId: Joi.when('transferType', {
            is: 1,
            then: Joi.number().label('primaryDriverId').required().error(validationCommonErrHandler),
            otherwise: Joi.number().allow(null).label('primaryDriverId').error(validationCommonErrHandler)
        }),
        secondaryDriverId: Joi.number().allow('', null).label('secondaryDriverId').error(validationCommonErrHandler),
        documents: Joi.array().items(
            Joi.object().keys({
                id: Joi.number().allow('', null).error(validationCommonErrHandler),
                url: Joi.string().allow(null).label('Url').error(validationCommonErrHandler),
                folderName: Joi.string().label('foldername').error(validationCommonErrHandler),
                originalFileName: Joi.string().label('original file name').error(validationCommonErrHandler)
            })
        ).error(new Error('Documents Invalid'))
        // max(5).error(new Error('Maximum 5 Documents only allowed'))
    }
    if (req.body.isTransferComplete) {
        reqBodySchema.transferDateTime = Joi.date().required().label('transferDateTime').error(validationCommonErrHandler)
    }
    if (!req.body.transferFromLocationId) {
        reqBodySchema.transferFromPlace = Joi.object().keys({
            ...addressPlaceValidation()
        }).required().error(validationCommonErrHandler)
    }
    if (!req.body.transferToLocationId) {
        reqBodySchema.transferToPlace = Joi.object().keys({
            ...addressPlaceValidation()
        }).required().error(validationCommonErrHandler)
    }
    if (req.method === 'PUT') {
        reqBodySchema.id = Joi.number().allow('', null).error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}
module.exports = {
    remainsInfoValidation,
    addTransferValidation
}
