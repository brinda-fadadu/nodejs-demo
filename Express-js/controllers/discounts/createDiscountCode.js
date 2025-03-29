const models = require('../../models')
const moment = require('moment')
const { checkIfCodeExists } = require('./checkExistingCode')

async function createPromoCode (req) {
    const data = req.body
    const currentTime = moment().format('MM/DD/YYYY HH:mm:ss')

    try {
        // checking if the coupon with the code already exists
        await checkIfCodeExists(data.code)
        const reqBody = {
            Title: data.title,
            Description: data.description,
            Code: data.code,
            ContractType: data.contractType,
            DiscountUnit: data.discountUnit,
            MaxDiscountValue: data.maxDiscountValue,
            DiscountValue: data.discountValue,
            StartDate: data.startDate,
            EndDate: data.endDate,
            ApplicableCategories: data.applicableCategories.join(),
            IsActive: data.isActive,
            CreatedBy: req.currentUser.id,
            UpdatedBy: req.currentUser.id,
            CreatedAt: currentTime,
            UpdatedAt: currentTime,
            ApprovalRoles: []
        }
        if (data.approvalRequiredFrom) {
            data.approvalRequiredFrom.forEach(e => {
                reqBody.ApprovalRoles.push({
                    UserRoleId: e
                })
            })
        }
        const createdDiscount = await models.Discount.create(reqBody, {
            include: [
                {
                    model: models.DiscountApprovalRole,
                    as: 'ApprovalRoles'
                }
            ]
        })
        if (createdDiscount) {
            return createdDiscount
        }
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error('Code should be unique')
        }
        throw error
    }
}
module.exports = exports = createPromoCode
