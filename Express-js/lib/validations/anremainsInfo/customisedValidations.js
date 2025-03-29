const Joi = require('@hapi/joi')

exports.embalmingApprovedByValidation = function embalmingApprovedByValidation (contacts) {
    return Joi.number().valid(contacts).required().label('embalmingapprovedByContactIds').error(errors => {
        return errors.map(err => {
            switch (err.type) {
            case 'any.required':
                return new Error('Embalming approved by is required')
            case 'any.allowOnly':
                return new Error('Enter valid embalming approved by contact id and it should be a integer')
            case 'number.base':
                return new Error('Enter valid embalming approved by contact id and it should be a integer')
            default:
                return new Error(`${err.context.label} must be a integer`)
            }
        })
    })
}

exports.cremationApprovedByValidation = function cremationApprovedByValidation (contacts) {
    return Joi.array().items(Joi.number().valid(contacts)).required().label('cremationApprovedByContactIds').error(errors => {
        return errors.map(err => {
            switch (err.type) {
            case 'any.required':
                return new Error('Cremation approved by id is required')
            case 'any.allowOnly':
                return new Error('Enter valid cremation approved by ids')
            case 'array.includesOne':
                return new Error('Enter valid cremation approved by ids')
            case 'array.base':
                return new Error('Cremation approved by must be an array of integers')
            default:
                return new Error(`${err.context.label} must be ana rray of integers`)
            }
        })
    })
}

exports.embalmerValidations = function embalmerValidations (userIds) {
    return Joi.number().valid(userIds).required().label('EmbalmerId').error(errors => {
        return errors.map(err => {
            switch (err.type) {
            case 'any.required':
                return new Error('Embalmer Id is required')
            case 'any.allowOnly':
                return new Error(`Enter valid embalmer id from [${userIds}]`)
            case 'number.base':
                return new Error('Embalmer id must be a integer')
            default:
                return new Error(`${err.context.label} must be a integer`)
            }
        })
    })
}
