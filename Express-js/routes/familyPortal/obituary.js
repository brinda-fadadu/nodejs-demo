const { sendErrorResponse } = require('../../lib/errorResponse')
const ObituaryController = require('../../controllers/refactorControllers/familyPortalController/obituaryController')

const getObituary = async (req, res, next) => {
    try {
        const onePortalId = req.params.opi
        const obituaryController = new ObituaryController(onePortalId)
        const result = await obituaryController.getObituary()
        res.status(200).json({
            success: true,
            result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

const saveOrEditObituary = async (req, res, next) => {
    try {
        const onePortalId = req.params.opi
        const obituaryController = new ObituaryController(onePortalId)
        const reqBody = {
            ...req.body
        }
        const result = await obituaryController.saveOrEditObituary(reqBody)
        res.status(200).json({
            success: true,
            result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

const getObituaryStatus = async (req, res, next) => {
    try {
        const personId = req.params.decedentId
        let result = await ObituaryController.getObituaryLockStatus(personId)
        if (result) {
            result.dataValues.isFamilyArrangerExist = true
        } else {
            result = {
                isObituaryLocked: null,
                isFamilyArrangerExist: false
            }
        }
        res.status(200).json({
            success: true,
            result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getObituary,
    saveOrEditObituary,
    getObituaryStatus
}
