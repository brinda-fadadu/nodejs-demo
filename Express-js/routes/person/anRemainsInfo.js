const getAnRemainsInfo = require('../../controllers/persons/caseOverview/anRemains/anRemainsInfo')
const updateAnRemainsInfo = require('../../controllers/persons/caseOverview/anRemains/updateAnRemainsInfo')
const sendResponse = require('../../lib/custom-response')

exports.getAnremainsInfo = async (req, res, next) => {
    const personId = req.params.personId
    try {
        const result = await getAnRemainsInfo(personId)
        res.status(200).send({
            result
        })
    } catch (error) {
        next(error)
        sendResponse(404, error, res)
    }
}

exports.updateAnRemainsInfoHandler = async (req, res, next) => {
    const anRemainsInfoId = req.params.anRemainsInfoId
    const personId = req.params.personId
    try {
        const updateAnremainsResponse = await updateAnRemainsInfo(personId, anRemainsInfoId, req.body, req.currentUser)
        if (updateAnremainsResponse[0] === 1) {
            sendResponse(200, null, res)
        } else {
            sendResponse(400, { message: `Person not found` }, res)
        }
    } catch (err) {
        // next(err)
        sendResponse(400, err, res)
    }
}
