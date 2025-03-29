const models = require('../../models')

exports.getDiscounts = async (queryObj) => {
    try {
        if (!queryObj.limit) {
            queryObj.limit = 10
        } else if (queryObj.limit) {
            queryObj.limit = Number(queryObj.limit)
        }
        if (queryObj.page) {
            queryObj.page = Number(queryObj.page)
        }
        const discounts = await models.Discount.findAndCountAll({
            where: {
                DeletedAt: null
            },
            include: [{
                model: models.DiscountApprovalRole,
                as: 'ApprovalRoles',
                include: [{
                    model: models.UserRole
                }],
                attributes: {
                    exclude: ['id', 'DiscountId']
                }
            }],
            offset: queryObj.page ? ((queryObj.page - 1) * queryObj.limit) : 0,
            limit: Number(queryObj.limit),
            order: queryObj.order ? queryObj.order : [['UpdatedAt', 'DESC']],
            distinct: true
        })
        return discounts
    } catch (err) {
        throw new Error(err)
    }
}

exports.getDiscountById = async (discountId) => {
    try {
        const result = await models.Discount.findOne({
            where: {
                id: discountId,
                DeletedAt: null
            },
            raw: true,
            json: true
        })
        if (result) {
            return result
        } else {
            throw new Error('NOT_FOUND')
        }
    } catch (err) {
        throw err
    }
}
