const Joi = require('@hapi/joi')
const { getEmployees } = require('../../../utils/dbGetFunctions')
const { getContactsIdsForAnRemains } = require('../../../utils/helpers/getListHelpers')
const { embalmingApprovedByValidation, cremationApprovedByValidation, embalmerValidations } = require('./customisedValidations')

async function updateAnremains (req, res, next) {
    const paramsSchema = {
        personId: Joi.number().required().error(new Error('PersonId must be a number')),
        anRemainsInfoId: Joi.number().required().error(new Error('AnRemainsInfoId must be a number'))
    }
    const queryParamsSchema = Joi.object().keys(paramsSchema)
    try {
        let embalmerIds = await getEmployees([4])
        let contactsIds = await getContactsIdsForAnRemains(req.params.personId)
        if (Object.keys(req.body).length) {
            Joi.validate(req.params, queryParamsSchema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    const bodySchema = Joi.object().keys({
                        embalmingSelfApproved: Joi.boolean().required(),
                        cremationSelfApproved: Joi.boolean().required(),
                        embalmerId: embalmerValidations(embalmerIds)
                    })
                    let appendedSchema = bodySchema.append({})
                    if (!req.body.embalmingSelfApproved) {
                        appendedSchema = bodySchema.append({
                            embalmingApprovedByContactIds: embalmingApprovedByValidation(contactsIds)
                        })
                    }
                    if (!req.body.cremationSelfApproved) {
                        appendedSchema = appendedSchema.append({
                            cremationApprovedByContactIds: cremationApprovedByValidation(contactsIds)
                        })
                    }
                    Joi.validate(req.body, appendedSchema, (err, value) => {
                        if (err) {
                            res.status(422).json({
                                error: err.message
                            })
                        } else {
                            next()
                        }
                    })
                }
            })
        }
    } catch (error) {
        res.status(422).json({
            message: error.message ? error.message : error
        })
    }
}

module.exports = {
    updateAnremains
}
