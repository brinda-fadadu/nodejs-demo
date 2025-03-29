const models = require('../../models')

async function checkIfCodeExists (code) {
    try {
        const isExists = await models.Discount.findOne({
            where: {
                Code: code,
                DeletedAt: null,
                DeletedBy: null
            }
        })
        if (isExists) {
            // if there is already a discount code existing and is not deleted
            throw new Error('Code must be Unique')
        } else {
            // if there is no existing coupon with the same code
            return true
        }
    } catch (error) {
        throw error
    }
}

module.exports = {
    checkIfCodeExists
}
