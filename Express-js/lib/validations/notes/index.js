const Joi = require('@hapi/joi')
const ValidationCommonErrHandler = require('../commonValidations').validationCommonErrHandler
const { getNoteCategories } = require('../../../utils/dbGetFunctions')

const validResourceTypes = ['Call', 'Agreement', 'Person'] // Each item Should be a tableName
async function getNotesValidation (req, res, next) {
    const data = req.query
    const schema = {
        resourceType: Joi.string().required().valid(validResourceTypes).error(ValidationCommonErrHandler),
        resourceId: Joi.number().required().error(ValidationCommonErrHandler)
    }
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

async function postNoteValidation (req, res, next) {
    const categoryIds = await getNoteCategories()
    const data = req.body

    // schema object
    const schema = Joi.object().keys({
        content: Joi.string().max(255).required(),
        resourceType: Joi.string().valid(validResourceTypes).required(),
        resourceId: Joi.number().required(),
        categoryId: Joi.number().valid(categoryIds).required(),
        level: Joi.string()
    })

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

module.exports = {
    getNotesValidation,
    postNoteValidation
}
