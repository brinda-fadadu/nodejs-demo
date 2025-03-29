const Joi = require('@hapi/joi')

async function packageFilters (req, res, next) {
    const schema = {
        packageCategoryId: Joi.number().error(new Error('PackageCategoryId must be a number')),
        limit: Joi.number().error(new Error('Limit must be a number')),
        offset: Joi.number().error(new Error('Offset must be a number')),
        searchTerm: Joi.string().error(new Error('Must be a valid string'))
    }
    Joi.validate(req.query, schema, (err) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function validateLocation (req, res, next) {
    const schema = {
        locationId: Joi.number().required().error(new Error('LocationId must be a number'))
    }
    Joi.validate(req.params, schema, (err) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    packageFilters,
    validateLocation
}
