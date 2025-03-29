const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')
const logger = require('../../lib/logger')

const financeTypeOptions = [
    'Finance',
    'Refinance',
    'Special-equal',
    'Special-unequal'
]

let schema = {
    agreementId: Joi.number().when('financeType', {
        is: 'Finance',
        then: Joi.number().required()
    }).label('Agreement ID').error(validationCommonErrHandler),
    downPaymentPercent: Joi.number().when('financeType', {
        is: 'Finance',
        then: Joi.number().required()
    }).label('Down Payment Percent').error(validationCommonErrHandler),
    isACHPayment: Joi.boolean().label('Is ACH Payment').error(validationCommonErrHandler),
    totalAmount: Joi.number().greater(0).label('Total Amount').error(validationCommonErrHandler),
    totalPrincipal: Joi.number().greater(0).required().label('Principal').error(validationCommonErrHandler),
    interestRate: Joi.number().min(0).required().label('Interest Rate').error(validationCommonErrHandler),
    tenureMonths: Joi.number().integer().greater(0).required().label('Tenure Months').error(validationCommonErrHandler),
    paymentsPerYear: Joi.number().integer().greater(0).label('Payments per year').error(validationCommonErrHandler),
    userTimeZone: Joi.string(),
    timezone: Joi.string().label('Time Zone').error(validationCommonErrHandler),
    financeType: Joi.string().required().valid(financeTypeOptions).error(validationCommonErrHandler)
}

async function repaymentScheduleValidation (req, res, next) {
    try {
        schema.paymentStartDate = Joi.date().greater('now').required().label('Payment start date').error(validationCommonErrHandler)
        Joi.validate(req.body, schema, (err, value) => {
            if (err) {
                res.status(422).send({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        logger.log('error', err)
        throw err
    }
}

async function downloadScheduleValidation (req, res, next) {
    try {
        schema.paymentStartDate = Joi.date().required().label('Payment start date').error(validationCommonErrHandler)
        Joi.validate(req.body, schema, (err, value) => {
            if (err) {
                res.status(422).send({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        logger.log('error', err)
        throw err
    }
}

async function finalizingFinanceValidation (req, res, next) {
    try {
        const schema = {
            totalPrincipal: Joi.number().greater(0).required().label('Principal').error(validationCommonErrHandler),
            interestRate: Joi.number().min(0).required().label('Interest Rate').error(validationCommonErrHandler),
            tenureMonths: Joi.number().greater(0).required().label('Tenure Months').error(validationCommonErrHandler),
            ppifAmount: Joi.number().min(0).default(0).required().label('PPIF Amount').error(validationCommonErrHandler),
            downPaymentAmount: Joi.number().min(0).required().label('Down payment Amount').error(validationCommonErrHandler),
            addendumId: Joi.number().min(1).allow(null).label('Addendum Id').error(validationCommonErrHandler),
            downPaymentPercent: Joi.number().min(0).required().label('Down payment Percent').error(validationCommonErrHandler),
            isACHPayment: Joi.boolean(),
            financeType: Joi.string().valid(financeTypeOptions).error(validationCommonErrHandler),
            paymentStartDate: Joi.date().greater('now').required().label('Payment Start Date').error(validationCommonErrHandler),
            notes: Joi.string().label('Notes').error(validationCommonErrHandler),
            timezone: Joi.string().label('Time Zone').error(validationCommonErrHandler),
            apiType: Joi.string().valid('quotation')
        }
        Joi.validate(req.body, schema, (err, value) => {
            if (err) {
                res.status(422).send({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        logger.log('error', err)
        throw err
    }
}

module.exports = {
    finalizingFinanceValidation,
    repaymentScheduleValidation,
    downloadScheduleValidation

}
