const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')
async function openCasesListValidations (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']
    let workOrderStatus = ['In progress', 'Submitted']
    let booleanStatus = ['Y', 'N']
    let agreementType = ['Cemetery', 'Funeral']

    const schema = Joi.object().keys({
        statementNumber: Joi.string().label('Statement Number').error(validationCommonErrHandler),
        callDateFrom: Joi.date().label('Call Date From').error(validationCommonErrHandler),
        caseDateFrom: Joi.date().label('Case Date From').error(validationCommonErrHandler),
        callDateTo: Joi.date().label('Call Date To').error(validationCommonErrHandler),
        caseDateTo: Joi.date().label('Case Date To').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        locationId: Joi.number().label('Location').error(validationCommonErrHandler),
        type: Joi.string().valid(agreementType).label('Type').error(validationCommonErrHandler),
        name: Joi.string().label('Decedent Name').error(validationCommonErrHandler),
        arranger: Joi.number().allow(0).label('Arranger').error(validationCommonErrHandler),
        status: Joi.string().valid(workOrderStatus).label('Status').error(validationCommonErrHandler),
        itemAdded: Joi.string().valid(booleanStatus).label('Item Added').error(validationCommonErrHandler),
        schedulingStarted: Joi.string().valid(booleanStatus).label('Scheduling Started').error(validationCommonErrHandler),
        openWorkOrders: Joi.string().valid(booleanStatus).label('Open Work Orders').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler)
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
module.exports = exports = openCasesListValidations
