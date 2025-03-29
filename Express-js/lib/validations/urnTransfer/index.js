const Joi = require('@hapi/joi')
const { sendErrorResponse } = require('../../errorResponse')

const ValidationCommonErrHandler = require('../commonValidations').validationCommonErrHandler

const urnTransferStatus = ['Open', 'Completed']

async function getUrnTransferValidation (req, res, next) {
    try {
        const data = req.query
        const schema = {
            status: Joi.string().valid(urnTransferStatus).error(ValidationCommonErrHandler),
            limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
            page: Joi.number().error(new Error('page must be a number')),
            timezone: Joi.string().label('Timezone').required('Timezone is required').error(ValidationCommonErrHandler)
        }

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

async function urnTransferStatusChangeValidation (req, res, next) {
    try {
        const data = req.params
        const schema = {
            urnTransferId: Joi.number().label('urnTransferId').required().error(ValidationCommonErrHandler)
        }

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

module.exports = {
    getUrnTransferValidation,
    urnTransferStatusChangeValidation
}
