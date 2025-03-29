const Joi = require('@hapi/joi')
const { getEmployees } = require('../../../utils/dbGetFunctions')
const seedData = require('../../../config/seed').seed

const ticketStatus = Object.keys(seedData.TicketStatus).map(Number)
const ticketPriority = Object.keys(seedData.TicketPriority).map(Number)

async function ticketUpdateValidation (req, res, next) {
    try {
        let schema = {
            ticket: {
                title: Joi.string().required(),
                description: Joi.string().required(),
                priority: Joi.number()
                    .valid(ticketPriority)
                    .required()
                    .error(new Error('Ticket Priority is required')),
                dueDate: Joi.date().required(),
                documents: Joi.array().items(Joi.object().keys({
                    id: Joi.number().allow(null).error(new Error('Url should be string or null')),
                    url: Joi.string().allow(null).label('Url').error(new Error('Url should be string or null')),
                    folderName: Joi.string().label('foldername').error(new Error('Folder name should be string')),
                    originalFileName: Joi.string().label('original file name').error(new Error('Originalfilename should be string'))
                }))
            }
        }
        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

async function ticketStatusValidation (req, res, next) {
    try {
        let schema = {
            ticket: {
                status: Joi.number()
                    .valid(ticketStatus)
                    .required()
                    .error(new Error('Ticket Status is required')),
                comment: Joi.string()
            }
        }

        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (err) {
        res.status(422).json({
            message: err.message
        })
    }
}

async function assignTicketValidation (req, res, next) {
    try {
        const usersIds = await getEmployees()
        let schema = {
            ticket: {
                assignedTo: Joi.number()
                    .valid(usersIds)
                    .required()
                    .error(new Error('Valid Assignee is required to assign ticket'))
            }
        }
        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (err) {
        res.status(422).json({
            message: err.message
        })
    }
}

async function commentTicketValidation (req, res, next) {
    try {
        let schema = {
            ticket: {
                comment: Joi.string().required()
            }
        }
        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (err) {
        res.status(422).json({
            message: err.message
        })
    }
}

module.exports = {
    ticketUpdateValidation,
    ticketStatusValidation,
    assignTicketValidation,
    commentTicketValidation
}
