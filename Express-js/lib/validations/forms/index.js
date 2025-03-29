
const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

const recipeintSchema = Joi.array().items(Joi.object().keys({
    id: Joi.number().required(),
    formRecipientRoleId: Joi.number().required()
}))

const queryParamsSchema = {
    personId: Joi.number().required().label('personId').error(validationCommonErrHandler),
    formId: Joi.number().required().label('formId').error(validationCommonErrHandler)
}

async function previewForm (req, res, next) {
    Joi.validate(req.params, queryParamsSchema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            if (Object.keys(req.body).length) {
                const previewFormSchema = Joi.object().keys({
                    employees: recipeintSchema,
                    contacts: recipeintSchema
                })
                Joi.validate(req.body, previewFormSchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            errors: err.details.map((d) => {
                                return { message: d.message, path: d.path }
                            }),
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
        }
    })
}

async function sendForms (req, res, next) {
    const sendFormsParamsSchema = {
        personId: Joi.number().required().label('personId').error(validationCommonErrHandler)
    }

    Joi.validate(req.params, sendFormsParamsSchema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            const sendFormSchema = Joi.array().items(Joi.object().keys({
                formId: Joi.number().required(),
                employees: recipeintSchema,
                contacts: recipeintSchema
            }))
            Joi.validate(req.body, sendFormSchema, { abortEarly: false }, (err) => {
                if (err) {
                    res.status(422).json({
                        errors: err.details.map((d) => {
                            return { message: d.message, path: d.path }
                        }),
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

async function voidForm (req, res, next) {
    Joi.validate(req.params, queryParamsSchema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            const voidFormSchema = Joi.object().keys({
                envelopeId: Joi.string().min(36).max(36).required()
            })
            Joi.validate(req.body, voidFormSchema, { abortEarly: false }, (err) => {
                if (err) {
                    res.status(422).json({
                        errors: err.details.map((d) => {
                            return { message: d.message, path: d.path }
                        }),
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

async function deleteForms (req, res, next) {
    const deleteFormSchema = {
        personId: Joi.number().required().label('personId').error(validationCommonErrHandler)
    }

    Joi.validate(req.params, deleteFormSchema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function downloadForm (req, res, next) {
    const downloadFormSchema = {
        personId: Joi.number().required().label('personId').error(validationCommonErrHandler),
        envelopeId: Joi.string().min(36).max(36).required()
    }

    Joi.validate(req.params, downloadFormSchema, { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    previewForm,
    sendForms,
    voidForm,
    deleteForms,
    downloadForm
}
