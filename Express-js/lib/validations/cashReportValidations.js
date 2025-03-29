const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')

function cashReportValidation (req, res, next) {
    const data = req.query
    const sortOrders = ['asc', 'desc']
    const schema = Joi.object().keys({
        cashReceiptId: Joi.string().label('Cash Receipt Id').error(validationCommonErrHandler),
        agreementNumber: Joi.string().label('Agreement Number').error(validationCommonErrHandler),
        agreementStatus: Joi.string().label('Contact Status').error(validationCommonErrHandler),
        agreementType: Joi.string().label('Agreement Type').error(validationCommonErrHandler),
        arranger: Joi.string().label('Arranger').error(validationCommonErrHandler),
        paymentType: Joi.string().label('Payment Type').error(validationCommonErrHandler),
        amount: Joi.number().label('Amount').error(validationCommonErrHandler),
        paymentDateFrom: Joi.date().label('Date Time').error(validationCommonErrHandler),
        paymentDateTo: Joi.date().label('Date Time').error(validationCommonErrHandler),
        receiptNumber: Joi.string().label('Receipt Number').error(validationCommonErrHandler),
        receivedBy: Joi.string().label('Redeived By').error(validationCommonErrHandler),
        page: Joi.number().required('Page number is required').min(1).label('Page').error(validationCommonErrHandler),
        limit: Joi.number().required('Limit is required').min(5).label('Limit').error(validationCommonErrHandler),
        sortOrder: Joi.string().required('Sort order is required').valid(sortOrders).label('Sort Order').error(validationCommonErrHandler),
        timezone: Joi.string().required('Timezone is required').label('Timezone').error(validationCommonErrHandler)
    })
    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = cashReportValidation
