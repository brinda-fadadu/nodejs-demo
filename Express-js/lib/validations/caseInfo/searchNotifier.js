const Joi = require('@hapi/joi')
const { getOrganizationIds } = require('../../../utils/dbGetFunctions')

async function searchNotifierValidation (req, res, next) {
    try {
        if (Object.keys(req.query).length) {
            const organizationIds = await getOrganizationIds()
            const querySchema = Joi.object().keys({
                searchText: Joi.string().required(),
                organizationId: Joi.number().required().valid(organizationIds)
            })
            Joi.validate(req.query, querySchema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (error) {
        res.status(404).json({
            error: error
        })
    }
}

module.exports = exports = searchNotifierValidation
