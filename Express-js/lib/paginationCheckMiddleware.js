const logger = require('./logger')

async function checkPaginationQuery (req, res, next) {
    try {
        const page = req.query.page
        const limit = req.query.limit
        const pageNumber = Number(page || 1)
        const limitNumber = Number(limit || 10)
        if (isNaN(pageNumber) || !pageNumber) {
            throw new Error('Not a valid page number')
        }
        if (isNaN(limitNumber) || !limitNumber) {
            throw new Error('Not a valid limit number')
        }
        req.query.page = pageNumber
        req.query.limit = limitNumber
        next()
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        res.status(404).json({
            error: errorMessage
        })
    }
}

module.exports = exports = checkPaginationQuery
