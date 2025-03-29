const DecedentController = require('../../controllers/refactorControllers/familyPortalController/decedentController')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const advisorMail = req.params.advisor
        const result = await DecedentController.getDecedentList({
            email: advisorMail
        })
        res.status(200).json({
            success: true,
            data: result
        })
    } catch (err) {
        if (err.message === 'INVALID_EMAIL') {
            err.message = 'Invalid email'
            customResponse(400, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}
