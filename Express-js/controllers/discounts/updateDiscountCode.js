const models = require('../../models')
const { getDiscountById } = require('./getDiscounts')

exports.updateDiscount = async (data) => {
    try {
        const result = await models.Discount.update({
            Title: data.title,
            Description: data.description,
            IsActive: data.isActive,
            StartDate: data.startDate,
            EndDate: data.endDate
        }, {
            where: {
                id: data.id
            }
        })
        if (result && result.length) {
            const discount = await getDiscountById(data.id)
            return discount
        } else {
            throw new Error('Error in updating Promotional discount')
        }
    } catch (err) {
        throw err
    }
}
