const Joi = require('@hapi/joi')
const seedData = require('../../../config/seed').seed
const { addressValidation } = require('../commonValidations')

async function anRemainsTransferValidation (req, res, next) {
    try {
        const body = req.body
        const transferLocationTypes = Object.keys(seedData.TransferLocationTypes).map(Number)
        const transferTypes = Object.keys(seedData.TransferType).map(Number)
        const anRemainsTransferSchema = {
            primaryDriverId: Joi.number().required().error(new Error('Primary driver information is required and only number allows')),
            secondaryDriverId: Joi.number().allow(null, '').error(new Error('Only number allows for secondary driver ')),
            personId: Joi.number(),
            fromLocationTypeId: Joi.any().required().valid(...transferLocationTypes).error(new Error('Location type must either Organization, Residence, Location')),
            toLocationTypeId: Joi.any().required().valid(...transferLocationTypes).error(new Error('Location type must either Organization, Residence, Location')),
            isTransferReady: Joi.boolean().required().error(new Error('Transfer ready or not details required and must be boolean')),
            isTransferCompleted: Joi.boolean().required().error(new Error('Transfer Completed or not details required and must be boolean')),
            neededByDateTime: Joi.date().required().error(new Error('Needed by details required')),
            transferDateTime: Joi.date().required().error(new Error('Transfer date and time details required')),
            fromLocation: Joi.number().required().error(new Error('From location is required')),
            toLocation: Joi.number().required().error(new Error('To location is required')),
            transferType: Joi.any().valid(...transferTypes).error(new Error('Transfer type value is invalid'))
        }

        if (typeof body.fromLocation === 'object') {
            if (body.fromLocationTypeId === 2) {
                anRemainsTransferSchema.fromLocation = Joi.object().keys({
                    name: Joi.string(),
                    organizationTypeId: Joi.number(),
                    address: await addressValidation()
                })
            }
            if (body.fromLocationTypeId === 3) {
                anRemainsTransferSchema.fromLocation = await addressValidation()
            }
        }

        if (typeof body.toLocation === 'object') {
            if (body.toLocationTypeId === 2) {
                anRemainsTransferSchema.toLocation = Joi.object().keys({
                    name: Joi.string(),
                    organizationTypeId: Joi.number(),
                    address: await addressValidation()
                })
            }
            if (body.toLocationTypeId === 3) {
                anRemainsTransferSchema.toLocation = await addressValidation()
            }
        }

        Joi.validate(body, anRemainsTransferSchema, (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    anRemainsTransferValidation
}
