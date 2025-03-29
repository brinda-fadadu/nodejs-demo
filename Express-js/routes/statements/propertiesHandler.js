const controller = require('../../controllers/statement/manageProperties')
const logger = require('../../lib/logger')
const { sendErrorResponse } = require('../../lib/errorResponse')

exports.manageReservations = async (req, res, next) => {
    let result = {}
    try {
        const user = req.currentUser
        const stmtId = req.params.statementId
        const {
            propertyId
        } = req.body
        switch (req.body.reservationStatus) {
        case 'reserved':
            result = await controller.reserveProperty(stmtId, propertyId, user, 'reserved')
            break

        case 'confirmed':
            result = await controller.confirmProperty(stmtId, propertyId, 'confirmed', user)
            break

        case 'released':
            result = await controller.releaseProperty(stmtId, propertyId)
            break

        default:
            break
        }

        res.status(200).json({
            success: true,
            result
        })
    } catch (err) {
        logger.log('error', err)
        res.status(400).send({ message: err.message || err })
    }
}

exports.getProperties = async (req, res, next) => {
    try {
        const stmtId = req.params.statementId
        let properties = await controller.reviewProperties(stmtId)
        res.status(200).json({
            success: true,
            properties
        })
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}
