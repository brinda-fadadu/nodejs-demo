const Joi = require('@hapi/joi')
const _ = require('underscore')
const seed = require('../../../config/seed').seed

async function createStatement (req, res, next) {
    const schema = {
        arrangerId: Joi.number().required().label('Arranger').error(new Error('Arranger is required and must be integer')),
        locationId: Joi.number().required().label('Location').error(new Error('Location is required and must be integer')),
        saleType: Joi.number().allow(null, '').label('SaleType').error(new Error('Invalid Sale type value')),
        agreementPersons: Joi.array().items(Joi.object().keys({
            personId: Joi.number().required(),
            roleId: Joi.number().required(),
            primaryAgreementPerson: Joi.boolean().required(),
            relationId: Joi.number()
        })).required(),
        // agreementPersons: Joi.array().required().error(new Error('Statement must have atleast one agreement person')),
        isFinanced: Joi.boolean().error(new Error('IsFinanced must be a boolean')),
        agreementType: Joi.string().valid('funeral', 'cemetery').required()
    }
    Joi.validate(req.body, schema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function validateSaleType (req, res, next) {
    try {
        let arrangmentTypes = seed.ArrangementType
        arrangmentTypes = _.invert(arrangmentTypes)
        const schema = {
            onePortalId: Joi.string().required().error(new Error('OnePortalId is required.')),
            agreementType: Joi.number().required().valid(arrangmentTypes['AN'], arrangmentTypes['PN']).error(new Error('AgreementType is required.'))
        }
        const data = {
            ...req.params,
            ...req.query
        }
        Joi.validate(data, schema, { abortEarly: false }, (err) => {
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
        res.status(500)
            .send(err)
    }
}

module.exports = {
    createStatement,
    validateSaleType
}
