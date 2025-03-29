const models = require('../../../models')
const {
statementItemPackagesUpdate,
validatePackages,
validateItems
 } = require('../../../controllers/statement/items/addItemsToStatement')
 const _ = require('underscore')

async function addItemsToStatement (req, res, next) {
    let t
    try {
        const data = req.body
        data.userId = req.currentUser.id
        data.statementId = req.params.statementId
        const statementPropertyCheck = await models.StatementProperty.findOne({
            where: {
                statementId: req.params.statementId,
                reservationStatus: 'confirmed'
            }
        })
        if (req.body.industry === 'cemetery' && !statementPropertyCheck) {
            res.status(422).json({
                message: 'CONFIRMED_PROPERTIES_NOT_FOUND'
            })
        } else {
            const itemIds = _.pluck(data.items, 'locationItemId')
            const packageIds = _.pluck(data.packages, 'packageId')
            await validatePackages(packageIds, data.locationId)
            await validateItems(itemIds, data.locationId)
            const statementItems = await statementItemPackagesUpdate(data)
            res.status(200).json({
                statementItems
            })
        }
    } catch (error) {
        await t.rollback()
        res.status(500).json({
            error: error.message
        })
    }
}
module.exports = {
    addItemsToStatement
}
