const CertifierController = require('../../controllers/refactorControllers/certifierController/certifierController')
const { customResponse } = require('../../lib/custom-response')

async function getCertifierHandler (req, res, next) {
    try {
        const queryLength = Object.keys(req.query).length
        if ((queryLength === 1 && !!req.query['license-no']) ||
            queryLength === 0) {
            const result = await CertifierController.getCertifiers(req.query['license-no'])
            return res.status(200).json(result)
        }
        res.status(422).json({
            error: 'Invalid query parameters'
        })
    } catch (err) {
        return customResponse(400, err, res)
    }
}

module.exports = exports = getCertifierHandler
