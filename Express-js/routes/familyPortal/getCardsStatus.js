const { sendErrorResponse } = require('../../lib/errorResponse')
const ProgramController = require('../../controllers/refactorControllers/familyPortalController/programController')
const PrayerCardController = require('../../controllers/refactorControllers/familyPortalController/prayerCardController')
const _ = require('lodash')

module.exports = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const prayerCard = await PrayerCardController.getPrayerCard({ onePortalId })
        const program = await ProgramController.getProgram({ onePortalId })
        let prayerCardObj = {
            isSubmitted: false,
            isLocked: false
        }
        let programObj = {
            isSubmitted: false,
            isLocked: false
        }
        if (_.get(prayerCard, 'prayerCard')) {
            prayerCardObj.isSubmitted = true
            prayerCardObj.isLocked = _.get(prayerCard, 'prayerCard.isLocked')
        }
        if (_.get(program, 'program')) {
            programObj.isSubmitted = true
            programObj.isLocked = _.get(program, 'program.isLocked')
        }
        const result = {
            prayerCard: prayerCardObj,
            program: programObj
        }
        res.status(200).json({
            success: true,
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
