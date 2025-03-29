const models = require('../../models')
const moment = require('moment')

async function deleteDiscount (userId, discountId) {
    try {
        const result = await models.Discount.update({
            DeletedBy: userId,
            DeletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
        }, {
            where: {
                id: discountId,
                DeletedAt: null
            }
        })
        if (result && result[0] > 0) {
            return true
        } else {
            throw new Error('RECORD_NOT_FOUND')
        }
    } catch (err) {
        let errorMessage = err.message || err
        throw new Error(errorMessage)
    }
}
module.exports = deleteDiscount
