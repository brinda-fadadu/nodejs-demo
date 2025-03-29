const models = require('../../../models')
const _ = require('lodash')
const esOrganization = require('../../../es_models/organization')
const { upsert } = require('../utils')
const logger = require('../../../lib/logger')

class AddressController {
    constructor (id) {
        this.id = id
    }

    static formatPlaceReqBody (place, userId) {
        const reqBody = place
        if (_.get(reqBody, 'address') && !this.checkValuesOfAddress(reqBody.address)) {
            delete reqBody.address
        }
        if (_.get(reqBody, 'organization') && !this.checkValuesOfAddress(reqBody.organization)) {
            delete reqBody.organization
        }
        reqBody.userId = userId
        return reqBody
    }

    /**
     * @param {Object<{id: Number, addressId: Number, organizationId: Number, address: Object, organization:Object}>} place is the object of the address and organization details
     * @param {Object<{id: Number, line1: String, line2: String, country: String, state: String, county: String, city: String, zipcode: String}>} place.address
     * @param {Object<{id: Number, organizationTypeId: Number, name: String, phoneNumber: String}>} place.organization
     * @param {*} transaction
     */
    static async managePlace (place, transaction, userId) {
        const placeReqBody = this.formatPlaceReqBody(place, userId)
        if (_.get(placeReqBody, 'address') || _.get(placeReqBody, 'organization')) {
            await this._validatePlace(placeReqBody, transaction)
            return this._managePlace(placeReqBody, transaction)
        }
    }
    /**
     * @param {Object<{id: Number, addressId: Number, organizationId: Number, address: Object, organization:Object}>} place is the object of the address and organization details
     * @param {Object<{id: Number, line1: String, line2: String, country: String, state: String, county: String, city: String, zipcode: String}>} place.address
     * @param {Object<{id: Number, organizationTypeId: Number, name: String, phoneNumber: String}>} place.organization
     * @param {*} transaction
     */
    static async _validatePlace (place, transaction) {
        const placeId = _.get(place, 'id', null)
        const organizationId = _.get(place, 'organization.id', null)
        const addressId = _.get(place, 'address.id', null)

        if (!placeId) {
            // If placeId is null,
            // We are trying to create a place.
            //
            // We shouldn't be getting addressId, organizationId
            // as those oldIds must have already been linked to
            // an existing place

            if (!!addressId || !!organizationId) {
                throw new Error('Place for this organization already exists')
            }
        } else {
            // We are trying to edit a place.
            // By editing a place, the address details and
            // the organization details can be updated.
            //
            // We validate if the addressId, organizationId
            // provided belong to the placeId provided.
            //
            // This is done so that we don't edit address that don't
            // belong to the same organization
            //
            // Fetch the place from the DB with IDs provided from
            // the request
            const conditions = {
                id: placeId,
                addressId,
                organizationId
            }
            const existingPlace = await this.getDetails(conditions, transaction)

            if (!existingPlace) {
                // We are trying to edit a place which has different addressId
                // and organizationId than those provided in the request.
                throw new Error('Invalid Place')
            }
        }
    }

    /**
     *
     * @param {Object<{id: Number, line1: String, line2: String, country: String, state: String, county: String, city: String, zipcode: String}>} address
     */
    static checkValuesOfAddress (address) {
        const valuesOfObj = _.values(address)
        const notNullValues = _.without(valuesOfObj, null, '')
        if (notNullValues.length) {
            return true
        }
        return false
    }

    /**
     * @param {Object<{id: Number, addressId: Number, organizationId: Number, address: Object, organization:Object}>} place is the object of the address and organization details
     * @param {Object<{id: Number, line1: String, line2: String, country: String, state: String, county: String, city: String, zipcode: String}>} place.address
     * @param {Object<{id: Number, organizationTypeId: Number, name: String, phoneNumber: String}>} place.organization
     * @param {*} transaction
     */
    static async _managePlace (place, transaction) {
        try {
            let address = null
            let organization = null
            let context = {}
            if (_.get(place, 'address') && this.checkValuesOfAddress(place.address)) {
                // added this.checkValuesOfAddress(place.address) to check if the fields in the address object are empty or not. if not then only the address will be created
                address = await upsert('Address', place.address, transaction)
                place.addressId = address.id
            }
            if (_.get(place, 'organization')) {
                organization = await upsert('Organization', place.organization, transaction, { userId: place.userId })
                place.organizationId = organization.id
                context.afterUpdate = esOrganization.save
                context.afterCreate = esOrganization.save
            }
            /* Separate the functionality based on the place id. */
            if (address || organization) {
                place = await upsert('Place', place, transaction, context)
                place = await this.getDetails({ id: place.id }, transaction)
                return place
            } else {
                throw new Error('Invalid Place')
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Object<{id: Number, addressId: Number, organizationId: Number}>} conditions to query on the place
     * @param {*} transaction
     */
    static async getDetails (conditions, transaction) {
        return models.Place.findOne({
            include: [
                {
                    model: models.Address,
                    as: 'address'
                },
                {
                    model: models.Organization,
                    as: 'organization'
                }
            ],
            where: conditions,
            transaction
        })
    }
}
module.exports = AddressController
