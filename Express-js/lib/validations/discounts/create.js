const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const seedValues = require('../../../config/seed')
const { userRoles } = require('../../../config/seed')

async function createPromoCodeValidator (req, res, next) {
    const promoCodesApplicableTo = seedValues.seed.promoCodeApplicableTo
    const discountUnitValues = seedValues.seed.discountUnit
    const contractTypes = Object.keys(seedValues.seed.ContractType).map(e => { return Number(e) })
    const userRoleIds = await userRoles()
    const approvalRequiredFromIds = Object.values(userRoleIds)

    const bodySchema = Joi.object().keys({
        code: Joi.string().required().max(20).label('Code').error(validationCommonErrHandler),
        title: Joi.string().required().max(40).label('Title').error(validationCommonErrHandler),
        description: Joi.string().optional().max(100).allow('', null).label('Description').error(validationCommonErrHandler),
        contractType: Joi.number().required().valid(contractTypes).label('ContractType').error(validationCommonErrHandler),
        applicableCategories: Joi.array().items(Joi.string().valid(promoCodesApplicableTo)).required().label('ApplicableCategories').error(validationCommonErrHandler),
        discountUnit: Joi.string().required().valid(discountUnitValues).label('DiscountUnit').error(validationCommonErrHandler),
        maxDiscountValue: Joi.when('discountUnit', {
            is: '$ Discount',
            then: Joi.number().greater(0).required(),
            otherwise: Joi.number().optional()
        }).label('Max Discount Value').allow(null, '').error(errors => {
            return errors.map(err => {
                switch (err.type) {
                case 'number.base':
                    return new Error(`${err.context.label} must be a number`)
                case 'any.required':
                    return new Error(`${err.context.label} is required when discount unit is $ Discount`)
                case 'number.greater':
                    return new Error(`${err.context.label} must be greater than ${err.context.limit}`)
                default:
                    return new Error(`${err.context.label} must be a number`)
                }
            })
        }),
        discountValue: Joi.number().greater(0).error(validationCommonErrHandler),
        startDate: Joi.date().required().label('StartDate').error(validationCommonErrHandler),
        endDate: Joi.date().required().min(Joi.ref('startDate')).label('EndDate').error(validationCommonErrHandler),
        isActive: Joi.boolean().required().invalid(false).label('IsActive').error(validationCommonErrHandler),
        approvalRequiredFrom: Joi.array().items(Joi.number().valid(approvalRequiredFromIds)).optional().label('ApprovalRequiredFrom').error(validationCommonErrHandler)
    })
    Joi.validate(req.body, bodySchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = createPromoCodeValidator
