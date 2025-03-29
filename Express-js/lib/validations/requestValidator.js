const Joi = require('@hapi/joi')
const { sendErrorResponse } = require('../errorResponse')

/**
 * This function returns a function which takes an API request and validates the schema provided below as arguments.
 * @param {Object} querySchema request's query params schema
 * @param {Object} bodySchema request's body schema
 */
function requestValidator (querySchema, bodySchema) {
    return (req, res, next) => {
        let error
        if (querySchema) {
            let queryParams = { ...req.query, ...req.params }
            Joi.validate(queryParams, querySchema, { abortEarly: false }, (err, value) => {
                if (err) {
                    let errDetails = []
                    if (err.details) {
                        errDetails = err.details
                    }
                    error = {
                        errors: errDetails.map((d) => {
                            return { message: d.message, path: d.path }
                        }),
                        message: err.message,
                        name: 'Validation Error'
                    }
                }
            })
        }
        if (!error && bodySchema) {
            Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                if (err) {
                    error = {
                        errors: err.details && err.details.length ? err.details.map((d) => {
                            return { message: d.message, path: d.path }
                        }) : [],
                        message: err.message
                    }
                }
            })
        }
        if (error) {
            sendErrorResponse({
                statusCode: 422,
                message: error,
                name: 'VALIDATION_ERROR'
            }, res)
        } else {
            next()
        }
    }
}

module.exports = {
    requestValidator
}
