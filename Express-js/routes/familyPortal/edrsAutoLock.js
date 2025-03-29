const models = require('../../models')
const CallFaa = require('./callFaa')

module.exports = async (req, res, next) => {
    const transaction = await models.sequelize.transaction()
    try {
        const decedentId = req.params.decedentId
        await models.FamilyArranger.update({
            isFaaLocked: true
        }, {
            where: {
                decedentId
            },
            transaction
        })
        await CallFaa.lockBiographyAndDeathCertificates(decedentId)
        await transaction.commit()
        res.status(200).json({
            success: true,
            message: 'OK'
        })
    } catch (err) {
        await transaction.rollback()
        next(err)
    }
}
