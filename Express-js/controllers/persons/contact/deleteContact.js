const getContactDetail = require('./getContactDetail')
const logger = require('../../../lib/logger')
const moment = require('moment')

async function deleteContact (data) {
    try {
        const contact = await getContactDetail(data.personId, data.contactId)
        if (contact) {
            contact.deletedBy = data.userId
            contact.deletedAt = moment().format('MM/DD/YYYY HH:mm:ss')
            const deletedContact = await contact.save()
            return deletedContact
        } else {
            throw new Error('Contact Not Found or deleted already')
        }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = deleteContact
