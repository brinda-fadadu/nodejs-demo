const Joi = require('@hapi/joi')
const seedData = require('../../../config/seed').seed
const { getEmployees, getStatusIds } = require('../../../utils/dbGetFunctions')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateListCalls (req, res, next) {
    const data = req.query
    let usersIds = await getEmployees()
    let callStatus = await getStatusIds()
    const statusIds = callStatus.map(e => { return e.id })
    let reasonTypes = Object.keys(seedData.CallReasons)
    let callTypes = Object.keys(seedData.Type)
    let sortOrders = ['asc', 'desc']
    let receivedLocationIds = Object.keys(seedData.CallReceivedLocations)

    const schema = Joi.object().keys({
        status: Joi.array().items(Joi.number().valid(statusIds)).label('Status').error(validationCommonErrHandler), // Joi.array().min(1).max(10),
        createdFromDate: Joi.date().label('Created From Date').error(validationCommonErrHandler),
        createdToDate: Joi.date().label('Created To Date').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        contactNo: Joi.string().regex(/[0-9]$/).label('Phone number').error(validationCommonErrHandler),
        reason: Joi.array().items(Joi.number().valid(reasonTypes)).label('reason').error(validationCommonErrHandler),
        locationIds: Joi.array().items(Joi.number().valid(receivedLocationIds)).label('Location').error(validationCommonErrHandler),
        updatedAtTo: Joi.date().label('Updated From Date').error(validationCommonErrHandler),
        updatedAtFrom: Joi.date().label('Updated To Date').error(validationCommonErrHandler),
        callId: Joi.string().label('Call Id').error(validationCommonErrHandler),
        benficiaryName: Joi.string().label('Benficiary / Decedent Name').error(validationCommonErrHandler),
        callerName: Joi.string().label('Caller Name').error(validationCommonErrHandler),
        callType: Joi.string().label('Type').valid(callTypes).error(validationCommonErrHandler),
        assignedTo: Joi.number().valid(usersIds).allow(0).label('Assigned To').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        contactNoOrEmail: Joi.string().label('Contact No or Email').error(validationCommonErrHandler),
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

module.exports = exports = validateListCalls
