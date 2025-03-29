const arrangement = require('../../controllers/arrangement/getArrangement')
const sendResponse = require('../../lib/custom-response')

async function getArrangementHandler (req, res, next) {
    try {
        const arrangementId = req.params.arrangementId
        const arrangementResult = await arrangement.getArrangement(
            arrangementId,
            'caseInfo'
        )
        sendResponse(200, arrangementResult, res)
    } catch (error) {
        next(error)
    }
}

module.exports = exports = getArrangementHandler
