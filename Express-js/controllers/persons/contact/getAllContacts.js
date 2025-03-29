const models = require('../../../models/index')
const logger = require('../../../lib/logger')
const includedAssociations = require('./AssociatedObjects/FetchContactAssociation')
const { getRelations } = require('../../../utils/helpers/contactsHelpers')
async function getAllContacts (PersonId, queries) {
    try {
        if (isNaN(PersonId)) {
            throw new Error('Not a valid person ID')
        }
        let fetchParentDetail = !!(queries.getParentDetails && queries.getParentDetails === 'true')

        let whereConditions = { personId: PersonId, deletedAt: null, deletedBy: null, isOrganization: false, contactType: queries.contactType ? queries.contactType : [1, 2, 3] }
        if (fetchParentDetail) {
            const spouse = false
            const relationIds = await getRelations(spouse, 'listContacts')
            whereConditions.relationId = relationIds
        }
        const contacts = await models.ContactPerson.findAll({
            where: whereConditions,
            attributes: ['id', 'contactType', 'personId', 'updatedAt'],
            include: await includedAssociations(queries),
            order: [['updatedAt', 'desc']],
            json: true
        })
        return contacts
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = getAllContacts
