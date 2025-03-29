const errorCodes = require('../error-codes.json')
const logger = require('./logger')

exports.sendErrorResponse = (error, res) => {
    const errorObj = errorCodes[error.message] ? errorCodes[error.message] : { statusCode: error.statusCode || 500, error: error.message }
    logger.log('error', error)
    res.status(errorObj.statusCode)
        .send({
            success: false,
            error: errorObj.error || error,
            errorCode: error.message || error.name || error
        })
}
