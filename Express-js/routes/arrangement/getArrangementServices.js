const getArrangmentServices = require('../../controllers/arrangement/getArrangementServices')

async function getArrangmentServicesHandler (req, res, next) {
    try {
        const result = await getArrangmentServices(req.params.arrangementId)
        res.status(201).send({ result: result, totalCount: result.length })
    } catch (err) {
        if (err.message === 'Arrangement not found') {
            res.status(404).send(err.message)
        }
        next(err)
    }
}

module.exports = exports = getArrangmentServicesHandler
