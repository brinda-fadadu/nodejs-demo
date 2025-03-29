const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')

function createObituaryValidation (req, res, next) {
    const schema = {
        obituary: Joi.string().max(12000).required().allow(null).label('obituary').error(validationCommonErrHandler)
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

function createObituaryFileValidation (req, res, next) {
    const schema = {
        saveFileUrl: Joi.object({
            url: Joi.string().required().error(new Error('audio file url is must')),
            folderName: Joi.string().required().error(new Error('Folder name required')),
            originalFileName: Joi.string().required().error(new Error('Original file name required'))
        }),
        fileUrl: Joi.string().allow(null).label('audio file').error(validationCommonErrHandler),
        fileType: Joi.string()
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

function uploadPersonPictureValidation (req, res, next) {
    const schema = {
        savePictureUrl: Joi.object({
            url: Joi.string().required().error(new Error('Url is must')),
            folderName: Joi.string().required().error(new Error('Folder name required')),
            originalFileName: Joi.string().required().error(new Error('Original file name required'))
        }),
        pictureUrl: Joi.string().allow(null).label('profile picture').error(validationCommonErrHandler)
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

module.exports = exports = {
    createObituaryValidation,
    createObituaryFileValidation,
    uploadPersonPictureValidation
}
