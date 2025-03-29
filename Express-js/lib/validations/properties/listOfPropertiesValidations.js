const Joi = require('@hapi/joi')

async function listOfPropertiesValidation (req, res, next) {
    try {
        let schema = {
            minPrice: Joi.number(),
            maxPrice: Joi.number(),
            maxRights: Joi.number(),
            statementId: Joi.number(),
            agreementId: Joi.number(),
            propertyCampusId: Joi.number(),
            propertyGardenId: Joi.array().items(Joi.number()),
            propertyTypeId: Joi.array().items(Joi.number()),
            page: Joi.number(),
            limit: Joi.number()
        }
        Joi.validate(req.query, schema, err => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

module.exports = {
    listOfPropertiesValidation
}
