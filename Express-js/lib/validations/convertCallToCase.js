const Joi = require('@hapi/joi')
const moment = require('moment')

function validateCallToCase (req, res, next) {
    const data = req.body

    const schema = Joi.object().keys({
        Services: Joi.string(),
        Funeral: Joi.object().keys({
            AssignedTo: Joi.number(),
            AppointmentDate: Joi.date().min(moment().format('YYYY-MM-DD HH:mm'))
        }),
        Cemetry: Joi.object().keys({
            AssignedTo: Joi.number(),
            AppointmentDate: Joi.date().min(moment().format('YYYY-MM-DD HH:mm'))
        })
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: 'Invalid request data'
            })
        } else {
            next()
        }
    })
}
module.exports = exports = validateCallToCase
