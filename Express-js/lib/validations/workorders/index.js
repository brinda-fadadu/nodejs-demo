const Joi = require('@hapi/joi')
const { sendErrorResponse } = require('../../errorResponse')

const ValidationCommonErrHandler = require('../commonValidations')
    .validationCommonErrHandler

const orderTypes = ['ASC', 'DESC']
const workOrderStatus = ['unassigned', 'assigned', 'closed']
const serviceCategories = ['Funeral', 'Cemetry', 'Wholesale Cremation', 'All', 'Miscellaneous Sales']
const staffTypes = ['staff', 'leadIn', 'backUp', 'apc']
const resourceTypes = ['Chapel', 'Reception', 'Crematory_Retort']

async function getWorkOrderValidation (req, res, next) {
    const data = req.query
    const schema = {
        status: Joi.string()
            .valid(workOrderStatus)
            .error(ValidationCommonErrHandler),
        deleted: Joi.boolean(),
        limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
        page: Joi.number().error(new Error('page must be a number')),
        searchTerm: Joi.string().error(new Error('Must be a string')),
        order: Joi.string()
            .valid(orderTypes)
            .error(ValidationCommonErrHandler),
        startDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'Start Date format must be YYYY-MM-DD'),
        endDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'End Date format must be YYYY-MM-DD'),
        serviceCategory: Joi.string()
            .valid(serviceCategories)
            .error(ValidationCommonErrHandler),
        resourceTypeId: Joi.string().allow('', null).error(ValidationCommonErrHandler),
        resourceCategory: Joi.string().allow('', null).valid(resourceTypes).error(ValidationCommonErrHandler),
        timezone: Joi.string().required().error(new Error('Must be a string'))
    }

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            console.log(err)
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function getWorkOrderExceptionReportValidation (req, res, next) {
    const data = req.query
    const schema = {
        limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
        page: Joi.number().error(new Error('page must be a number')),
        workOrderId: Joi.string().error(new Error('Must be a string')),
        timezone: Joi.string().required().error(new Error('Must be a string')),
        agreementType: Joi.string().error(new Error('Must be a string')),
        workOrderStatus: Joi.string().error(new Error('Must be a string')),
        workOrderFor: Joi.string().error(new Error('Must be a string')),
        contractNumber: Joi.string().error(new Error('Must be a string')),
        locationId: Joi.number().error(new Error('Must be a number')),
        arrangerId: Joi.number().error(new Error('Must be a number')),
        caseStartDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'Start Date format must be YYYY-MM-DD'),
        caseEndDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'End Date format must be YYYY-MM-DD'),
        callStartDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'Start Date format must be YYYY-MM-DD'),
        callEndDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'End Date format must be YYYY-MM-DD'),
        workOrderCreatedAtStartDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'Start Date format must be YYYY-MM-DD'),
        workOrderCreatedAtEndDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
            .error(() => 'End Date format must be YYYY-MM-DD')
    }

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            console.log(err)
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function assignEmployeeValidation (req, res, next) {
    const params = req.params
    const body = req.body
    const paramSchema = {
        workOrderId: Joi.string().alphanum().label('workOrderId').required().error(ValidationCommonErrHandler)
    }
    const bodySchema = Joi.object().keys({
        serviceType: Joi.string()
            .valid(serviceCategories)
            .error(ValidationCommonErrHandler),
        funeralDirectorId: Joi.number().required().error(ValidationCommonErrHandler),
        employees: Joi.array().items(Joi.object().keys({
            id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            employeeId: Joi.number().required().error(ValidationCommonErrHandler),
            task: Joi.string().max(254).allow('', null)
                .error(ValidationCommonErrHandler),
            startTime: Joi.date().iso().required().error(err => err),
            endTime: Joi.date().iso().required().error(err => err),
            staffType: Joi.string().valid(staffTypes).error(ValidationCommonErrHandler)
        })
        ),
        resources: Joi.array().items(Joi.object().keys({
            id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            vehicleId: Joi.number().required().error(ValidationCommonErrHandler),
            assignedEmployeeId: Joi.number().required().error(ValidationCommonErrHandler),
            startTime: Joi.date().iso().required().error(err => err),
            endTime: Joi.date().iso().required().error(err => err)
        })
        ),
        isWarningShown: Joi.boolean().label('isWarningShown').error(ValidationCommonErrHandler),
        notes: Joi.array().items(Joi.object().keys({
            id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            content: Joi.string().allow('', null).max(500).error(ValidationCommonErrHandler)
        })),
        completedOn: Joi.date().iso().error(err => err),
        workOrderDetail: Joi.object().keys({
            id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            needsOffciant: Joi.boolean().label('needsOfficiant').error(ValidationCommonErrHandler),
            serviceIssue: Joi.string().allow('', null).error(ValidationCommonErrHandler),
            disIntermentAuthorization: Joi.string().allow('', null).max(500).error(ValidationCommonErrHandler),
            isLocationVerifiedByForeman: Joi.boolean().label('isLocationVerifiedByForeman').error(ValidationCommonErrHandler),
            isIntermentAuthorizationCompleted: Joi.boolean().label('isIntermentAuthorizationCompleted').error(ValidationCommonErrHandler),
            cremationPlaceId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            isPaidInFullForAN: Joi.boolean().label('isPaidInFullForAN').error(ValidationCommonErrHandler),
            isPreBuried: Joi.boolean().label('isPreBuried').error(ValidationCommonErrHandler),
            cremationStatusId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            crematoryRetortId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            isTentRequired: Joi.boolean().allow('', null).label('isTentRequired').error(ValidationCommonErrHandler)
        }),
        casketInfo: Joi.object().keys({
            id: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            height: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            width: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            depth: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        received: Joi.object().allow('', null).keys({
            logDate: Joi.date().iso().allow('', null).error(err => err),
            weight: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            operator: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            chamberId: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        chamberPlacement: Joi.object().allow('', null).keys({
            logDate: Joi.date().iso().allow('', null).error(err => err),
            weight: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            operator: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            chamberId: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        chamberRemoval: Joi.object().allow('', null).keys({
            logDate: Joi.date().iso().allow('', null).error(err => err),
            weight: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            operator: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            chamberId: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        processed: Joi.object().allow('', null).keys({
            logDate: Joi.date().iso().allow('', null).error(err => err),
            weight: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            operator: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            chamberId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            urnSelection: Joi.string().allow('', null).error(ValidationCommonErrHandler),
            urnDeliveryDate: Joi.date().iso().allow('', null).error(err => err)
        }),
        released: Joi.object().allow('', null).keys({
            logDate: Joi.date().iso().allow('', null).error(err => err),
            weight: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            operator: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            chamberId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            clFacilityLocationId: Joi.number().allow('', null).error(ValidationCommonErrHandler),
            serviceLocationId: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        decedentAndCremationDetails: Joi.object().allow('', null).keys({
            weightOver: Joi.boolean().label('Weight Over').error(ValidationCommonErrHandler),
            witness: Joi.boolean().label('Witness').error(ValidationCommonErrHandler),
            expedite: Joi.string().label('Expedite').error(ValidationCommonErrHandler),
            witnessCount: Joi.number().allow('', null).error(ValidationCommonErrHandler)
        }),
        timezone: Joi.string().label('timezone').required().error(ValidationCommonErrHandler)
    })
    Joi.validate(params, paramSchema, (err, value) => {
        if (err) {
            console.log(err)
            res.status(422).json({
                message: err.message
            })
        } else {
            Joi.validate(body, bodySchema, (err, value) => {
                if (err) {
                    console.log(err)
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

async function getWorkOrderDetailsValidation (req, res, next) {
    try {
        const paramSchema = {
            workOrderId: Joi.number().label('workOrderId').required().error(ValidationCommonErrHandler)
        }

        Joi.validate(req.params, paramSchema, (err, value) => {
            if (err) {
                throw err
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

async function getWorkOrderCountValidation (req, res, next) {
    try {
        const schema = {
            serviceCategory: Joi.string()
                .valid(serviceCategories)
                .error(ValidationCommonErrHandler)
        }

        Joi.validate(req.query, schema, (err, value) => {
            if (err) {
                throw err
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}
async function duplicateWorkOrderValidation (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']
    const schema = {
        limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
        page: Joi.number().error(new Error('page must be a number')),
        workOrderId: Joi.string().error(new Error('Must be a string')),
        timezone: Joi.string().required().error(new Error('Must be a string')),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(ValidationCommonErrHandler),
        contractNumber: Joi.string().error(new Error('Must be a string')),
        arrangerId: Joi.number().error(new Error('Must be a number')),
        opi: Joi.string().error(new Error('Must be a string'))
    }

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            console.log(err)
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}
module.exports = {
    getWorkOrderValidation,
    assignEmployeeValidation,
    getWorkOrderDetailsValidation,
    getWorkOrderCountValidation,
    getWorkOrderExceptionReportValidation,
    duplicateWorkOrderValidation
}
