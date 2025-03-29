const Joi = require('@hapi/joi')
const { getNoteCategories } = require('../../utils/dbGetFunctions')

async function validateNote (req, res, next) {
    const categoryIds = await getNoteCategories()
    const data = req.body

    // schema object
    const schema = Joi.array().items(
        Joi.object().keys({
            content: Joi.string().required(),
            resourceType: Joi.string(),
            categoryId: Joi.number().valid(categoryIds),
            level: Joi.string()
        })
    )

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = validateNote
