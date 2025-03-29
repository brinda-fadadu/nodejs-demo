const Joi = require('@hapi/joi')
const seedData = require('../../../config/seed').seed
const { getEmployees } = require('../../../utils/dbGetFunctions')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateDuplicateCalls (req, res, next) {
    const data = req.query
    let usersIds = await getEmployees()
    let callTypes = Object.keys(seedData.CallReasons)
    let sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        callId: Joi.string().label('Call Id').error(validationCommonErrHandler),
        createdFrom: Joi.date().label('Created From').error(validationCommonErrHandler),
        createdTo: Joi.date().label('Created To').error(validationCommonErrHandler),
        assigned: Joi.number().valid(usersIds).allow(0).label('Assigned').error(validationCommonErrHandler),
        callType: Joi.string().label('Type').valid(callTypes).error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler)
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

module.exports = exports = validateDuplicateCalls
