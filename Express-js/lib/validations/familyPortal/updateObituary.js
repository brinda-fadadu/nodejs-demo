const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

function updateObituaryValidation (req, res, next) {
    const schema = {
        obituary: Joi.string().max(12000).allow(null).label('obituary').error(validationCommonErrHandler),
        audioFileUrl: Joi.string().allow(null).label('audio file').error(validationCommonErrHandler),
        pictureUrl: Joi.string().allow(null).label('profile picture').error(validationCommonErrHandler),
        obituaryBy: Joi.string().allow(null).label('obituary by').error(validationCommonErrHandler),
        savePictureUrl: Joi.any().allow(null).label('picture url').error(validationCommonErrHandler),
        saveFileUrl: Joi.any().allow(null).label('file url').error(validationCommonErrHandler)
    }
    Joi.validate(req.body, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = updateObituaryValidation
