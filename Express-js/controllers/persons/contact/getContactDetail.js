const models = require('../../../models/index')
const logger = require('../../../lib/logger')
const includedAssociations = require('./AssociatedObjects/FetchContactAssociation')

async function getContactDetails (personId, contactId, type) {
    try {
        if (isNaN(personId)) {
            throw new Error('Not a valid Person ID')
        }
        if (isNaN(contactId)) {
            throw new Error('Not a valid Contact ID')
        }
        const contact = await models.ContactPerson.findOne({
            where: {
                personId: personId,
                id: contactId,
                deletedAt: null,
                deletedBy: null
            },
            include: await includedAssociations()
        })
        console.log(contact)
        if (contact) {
            if (type === 'json') {
                let contactData = contact.toJSON()
                return contactData
            }
            return contact
        } else {
            throw new Error('CONTACT_NOT_FOUND')
        }
    } catch (error) {
        logger.error(error.message)
        throw error
    }
}
module.exports = exports = getContactDetails
