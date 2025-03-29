const logger = require('../../../../lib/logger')
const models = require('../../../../models/index')

async function checkOPIMiddleware (req, res, next) {
    try {
        const onePortalId = req.params.onePortalId ||
            req.query.onePortalId
        if (!onePortalId) {
            throw new Error('OnePortalId not found')
        }
        const person = await models.Person.findOne({
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation'
                }
            ],
            where: {
                onePortalId
            }
        })
        if (!person) {
            throw new Error('OnePortalId not found')
        }
        req.person = person
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

module.exports = exports = checkOPIMiddleware
