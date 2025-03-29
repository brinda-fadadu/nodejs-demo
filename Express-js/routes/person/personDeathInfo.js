const getPersonDeathInfo = require('../../controllers/persons/caseOverview/caseInfo/personDeathInfo/getPersonDeathInfo')
const updatePersonDeathInfo = require('../../controllers/persons/caseOverview/caseInfo/personDeathInfo/updatePersonDeathInfo')
const sendResponse = require('../../lib/custom-response')
const models = require('../../models')

exports.getPersonDeathInfoHandler = async (req, res, next) => {
    try {
        const onePortalId = req.params ? req.params.onePortalId : req
        const validOPI = await models.Person.findOne({ where: { onePortalId }, attributes: ['id', 'onePortalId'] })
        if (validOPI) {
            const result = await getPersonDeathInfo.getInfo(validOPI.onePortalId)
            res.status(200).send({
                result
            })
        } else {
            res.status(404).send({
                message: 'No Person found for the given OPI..'
            })
        }
    } catch (error) {
        next(error)
        sendResponse(404, error, res)
    }
}

exports.updatePersonDeathInfoHandler = async (req, res, next) => {
    const onePortalId = req.params.onePortalId
    try {
        const updateDeathDetailsResponse = await updatePersonDeathInfo.updateDeathInfo(onePortalId, req.body, req.currentUser.id, res)
        sendResponse(200, updateDeathDetailsResponse, res)
    } catch (err) {
        next(err)
        sendResponse(400, err, res)
    }
}
