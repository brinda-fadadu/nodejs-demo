const additionalInfo = require('../../controllers/persons/additionalInfo')

async function getAdditionalInfo (req, res, next) {
    try {
        const info = await additionalInfo(req.params.personId)
        res.status(200).json({
            success: true,
            info
        })
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getAdditionalInfo
