const models = require('../../../models')
const esOrganization = require('../../../es_models/organization')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
class OrganizationController {
    constructor (placeId) {
        this.placeId = placeId
    }

    /**
     *
     * @param {Object<{phoneNumber: String, name: String, organizationType: Number }>} data
     */
    static async search (data) {
        let organizations = []
        let bool = {}
        if (data.phoneNumber) {
            bool = {
                'must': { 'match_phrase_prefix': { 'phoneNumber': data.phoneNumber } }
            }
        } else {
            bool = {
                'must': [{ 'match_phrase_prefix': { 'name': data.name } }],
                'filter': { 'term': { 'organizationTypeId': parseInt(data.organizationType) } }
            }
        }
        let result = await esOrganization.client.search({
            index: esOrganization.indexName,
            body: { query: { bool } }
        })
        if (result.hits.hits && result.hits.hits.length) {
            result.hits.hits.forEach(ele => {
                organizations.push(ele._source)
            })
        }
        return {
            results: organizations,
            totalResults: result.hits.total
        }
    }

    // searching callers of the organization
    async searchCallers () {
        let result = await models.Person.findAll({
            where: {
                addressPlaceId: this.placeId,
                deletedAt: null,
                deletedBy: null
            },
            attributes: ['firstName', 'lastName', 'prefix', 'middleName', 'id', 'email', 'phoneNumber']
        })
        return result
    }

    static async removeDuplicateOrgAndUpdateWithPrimaryOrg (data) {
        try {
            // below are the tables that has used organization model (fieldname --> modelname)
            // organizationId --> Place
            // organizationId --> AnticipatedPayment
            // serviceLocationId --> SchedulingSection
            // cemeteryLocationId --> CemeteryInformationSection
            // organizationId --> Payment
            const transaction = await models.sequelize.transaction()
            const newOrgIdToUpdate = data.primaryOrganizationId
            const duplicateIdsWherequery = { [Op.in]: data.duplicateOrganizationIds }
            const tableNames = [
                // { model: 'Place', updateQyery: { 'organizationId': newOrgIdToUpdate }, whereQuery: { 'organizationId': duplicateIdsWherequery } },
                { model: 'AnticipatedPayment', updateQyery: { 'organizationId': newOrgIdToUpdate }, whereQuery: { 'organizationId': duplicateIdsWherequery } },
                { model: 'SchedulingSection', updateQyery: { 'serviceLocationId': newOrgIdToUpdate }, whereQuery: { 'serviceLocationId': duplicateIdsWherequery } },
                { model: 'CemeteryInformationSection', updateQyery: { 'cemeteryLocationId': newOrgIdToUpdate }, whereQuery: { 'cemeteryLocationId': duplicateIdsWherequery } },
                { model: 'Payment', updateQyery: { 'organizationId': newOrgIdToUpdate }, whereQuery: { 'organizationId': duplicateIdsWherequery } }
            ]
            try {
                Promise.all(tableNames.map(async t => {
                    await models[t.model].update(t.updateQyery, { where: t.whereQuery }, transaction)
                }))
                const placeData = await models.Place.findOne({ where: { organizationId: newOrgIdToUpdate } })
                await models.Place.update({ 'organizationId': newOrgIdToUpdate, addressId: placeData.addressId }, { where: { 'organizationId': duplicateIdsWherequery } }, transaction)
                await models.Organization.destroy({ where: { id: duplicateIdsWherequery } })
                await transaction.commit()
                return { message: 'Duplicate Organizations deleted and replaced with given primary organization' }
            } catch (err) {
                await transaction.rollback()
                throw err
            }
        } catch (err) {
            throw err
        }
    }
}
module.exports = OrganizationController
