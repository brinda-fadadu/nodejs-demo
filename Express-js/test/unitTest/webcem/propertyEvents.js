const chai = require('chai')
const faker = require('faker')
const _ = require('lodash')
const chaiAsPromised = require('chai-as-promised')
const { personSchema } = require('../schema')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const { findOrCreateUser } = require('../helper')
const models = require('../../../models')
const WebCemPropertyController = require('../../../controllers/refactorControllers/webCemController/webCemPropertyController')
chai.use(chaiAsPromised);
chai.should();

const getSaleTypeIds = async (type, personId) => {
    const verifiedPersonController = new VerifiedPersonController(personId)

    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type)
    return saleTypes.map(saleType => saleType.id)
}

describe('Events Triggered related to Properties', () => {
    let personId, agreement, currentUser, propertyId, lotSellUnitId
    let agreementSchema = {
        needType: 1,
        type: 2,
        locationId: 1
    }

    before(async () => {
        currentUser = await findOrCreateUser()
        let person = { ...personSchema() }
        person.isAlive = false
        let createdPerson = await PersonController.createOrUpdate(person, {}, {})
        personId = createdPerson.id
        const verifiedPersonController = new VerifiedPersonController(personId)
        await verifiedPersonController.verifyPerson(createdPerson)
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, personId)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema)

        const query = {
            page: 1,
            limit: 10,
            propertyCampusId: 2,
            propertyTypeId: [1]
        }
        let properties = await AgreementPropertyController.fetchListOfProperties(query)
        let property = properties.properties[0]
        propertyId = property.id
        lotSellUnitId = property.lotSellUnitId
        const propertyData = {
            propertyId: propertyId,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        const propertyController = new AgreementPropertyController(agreement.id)
        await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        // const agreementPropertyId = await propertyController.getReservation(null, agreementProperty.propertyId)
    })

    describe('Event - property.save', () => {
        it('should return the property details', async () => {
            const result = await WebCemPropertyController.saveProperty(propertyId)
            result.should.have.property('event_type').and.to.equal('property.save')
            result.should.have.property('payload').and.to.be.an('object')
            result.payload.should.have.property('property').and.to.be.an('object')
            result.payload.property.should.have.property('cl_ref')
            result.payload.property.should.have.property('lot_section_panel')
            result.payload.property.should.have.property('row_tier_division')
            result.payload.property.should.have.property('niche_grave_crypt')
            result.payload.property.should.have.property('grave_status')
            result.payload.property.should.have.property('max_rights')
            result.payload.property.should.have.property('no_of_graves')
            result.payload.property.should.have.property('price')
            result.payload.property.should.have.property('discount')
            result.payload.property.should.have.property('endowment_case')
            result.payload.should.have.property('decedent_properties').and.to.be.an('array')
        })
    })

    describe('Event - property.decedents.add', () => {
        it('should return the property and decedent details', async () => {
            const result = await WebCemPropertyController.saveDecedentForProperty(personId, propertyId, lotSellUnitId)
            result.should.have.property('event_type').and.to.equal('property.decedents.add')
            result.should.have.property('payload').and.to.be.an('object')
            result.payload.should.have.property('property').and.to.be.an('object')
            result.payload.property.should.have.property('cl_ref').to.equal(lotSellUnitId)
            result.payload.should.have.property('decedent_properties').and.to.be.an('array')
        })
    })

    after(async () => {
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
    })

})
