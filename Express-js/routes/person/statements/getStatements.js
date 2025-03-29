const getStatements = require('../../../controllers/persons/statements/getStatementsOfPerson')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function getPersonStatementsHandler (req, res, next) {
    const reqParams = {
        personId: req.params.personId
    }
    try {
        const list = await getStatements(reqParams)
        res.status(200).json({
            ...list
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getPersonStatementsHandler
}
