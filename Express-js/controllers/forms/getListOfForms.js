const models = require('../../models/index')
const logger = require('../../lib/logger')

async function fetchListOfCategoriesWithForms () {
    try {
        const result = await models.FormCategory.findAll({
            include: [
                {
                    model: models.Form,
                    as: 'forms',
                    include: [{
                        model: models.FormRecipientRole,
                        as: 'formRecipientRoles',
                        include: [{
                            model: models.FormRecipientContactRole,
                            as: 'formRecipientContactRoles',
                            include: [{
                                model: models.Role,
                                as: 'formContactRoles'
                            }]
                        }]
                    }]
                }
            ]
        })
        return result
    } catch (error) {
        let errorMessage
        console.log(error)
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchListOfCategoriesWithForms
