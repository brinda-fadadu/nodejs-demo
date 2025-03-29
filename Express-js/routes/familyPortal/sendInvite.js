const logger = require('../../lib/logger')
const InvitationController = require('../../controllers/refactorControllers/familyPortalController/invitationController')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const familyArrangerDetails = req.body
        const onePortalId = req.params.onePortalId
        const result = await InvitationController.sendInvitation({
            onePortalId
        }, familyArrangerDetails, req.currentUser)
        res.status(200).json({
            success: true,
            message: 'Invite Sent',
            result: result
        })
    } catch (err) {
        logger.error(err)
        switch (err.message) {
        case 'INVALID_ONE_PORTAL_ID':
            err.message = 'Invalid one Portal Id'
            customResponse(400, err, res)
            break
        case 'INVALID_FIRST_NAME':
            err.message = 'Invalid First Name'
            customResponse(400, err, res)
            break
        case 'INVALID_LAST_NAME':
            err.message = 'Invalid Last Name'
            customResponse(400, err, res)
            break
        case 'INVALID_EMAIL':
            err.message = 'Invalid Email'
            customResponse(400, err, res)
            break
        case 'DECEDENT_NOT_FOUND':
            err.message = 'Decedent Info not found'
            customResponse(404, err, res)
            break
        default:
            customResponse(400, err, res)
            break
        }
    }
}
