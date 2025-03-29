const chai = require('chai')
const faker = require('faker')
const _ = require('lodash')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const { findOrCreateUser } = require('../../helper')
const models = require('../../../../models')
chai.use(chaiAsPromised);
chai.should();

describe('Quotation Agreement Property Reservation', () => {
    let quotationId, agreement, currentUser, agreementProperty, propertyData, agreementSchema = {
        apiType: 'quotation',
        locationId: 2
    }

    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Cemetry']
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        currentUser = await findOrCreateUser()
        agreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
        const query = `SELECT Property.id from Property`

        const properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })

        propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property",
            apiType: 'quotation',
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus,
            null,
            'quotation'
        )
    })

    after(async () => {
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
    })

    it('should add property with reservation type as non-guranteed when pn case', async () => {
        agreementProperty.should.have.property('id')
        agreementProperty.should.have.property('reservationType').and.to.be.equal("Non-Guaranteed")
    })

    it('should have expiry date of after 7 days', async () => {
        agreementProperty.should.have.property('expiryDate')
        agreementProperty.should.have.property('reservedDate')
        let daysDiff = Math.round(moment(agreementProperty.expiryDate).diff(moment(agreementProperty.reservedDate), 'hours')/24)
        daysDiff.should.equal(7)
    })
})

describe('Release Agreement Property', () => {
    let quotationId, agreement, currentUser, properties, agreementSchema = {
        apiType: 'quotation',
        locationId: 2
    }

    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Cemetry']
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        currentUser = await findOrCreateUser()
        agreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
        const query = `SELECT Property.id from Property`

        properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
    })

    after(async () => {
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
        await models.AgreementPropertyAdditionalRight.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
        await models.SideBySideProperty.destroy({
            where: {
                agreementId: agreement.id
            }
        })
    })

    it('should not release property if property is not reserved', async () => {
        try {
            const propertyController = new AgreementPropertyController(agreement.id)
            await propertyController.releaseProperty(properties[0].id, currentUser)
        } catch (error) {
            error.should.equal('RESERVATION_NOT_FOUND')
        }
    })

    it('should release property if property is reserved', async () => {
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus,
            null,
            'quotation'
        )
        const result = await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        result.should.be.an('array').of.length.greaterThan(0)
        result[0].should.equal(1)
    })
})