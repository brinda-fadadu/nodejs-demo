const Joi = require('@hapi/joi')

async function itemIndustryValidation (req, res, next) {
    const schema = {
        itemIndustryId: Joi.number().required().error(new Error('Item Industry is required and must be a number'))
    }

    Joi.validate(req.query, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    itemIndustryValidation
}
