const faker = require('faker')
const { personSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementPropertyAdditionalRights = require('../../../../controllers/refactorControllers/agreementController/agreementPropertyAdditionalRights')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const { findOrCreateUser } = require('../../helper')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
chai.should()

const getSaleTypeIds = async (type, person) => {
    const verifiedPersonController = new VerifiedPersonController(person.id)

    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, person.isAlive ? 1: 2 )
    return saleTypes.map(saleType => saleType.id)

}

describe('additional rights', () => {
    let createdPerson, agreement, currentUser, agreementPropertyId
    let agreementSchema = {
        needType: 2,
        type: 2,
        locationId: 1
    }

    after(async () => {
        await models.AgreementPropertyAdditionalRight.destroy({ where: {} })
    })

    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)
        const intermentRights = await models.IntermentRights.findOne({
            where: {
                graves: 1,
                rights: 1,
                maxRights: 2
            }
        })

        const query = `SELECT Property.id from Property 
            INNER JOIN PropertyGarden ON Property.propertyGardenId = PropertyGarden.id
            INNER JOIN PropertyType ON Property.propertyTypeCodeId = PropertyType.id
            WHERE PropertyGarden.propertyCampusId = ${intermentRights.propertyCampusId} and Property.propertyTypeCodeId = ${intermentRights.propertyTypeId}
            `
        const properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(propertyData.propertyId, currentUser, propertyData.reservationStatus)
        agreementPropertyId = agreementProperty.id
    })

    it('should throw error while adding additional right, when property is not confirmed', async () => {
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementPropertyId)
        await expect(additionalRightController.updateAdditionalRights({}, 'add', currentUser)).to.be.rejectedWith(Error, 'AGREEMENT_PROPERTY_NOT_CONFIRMED')
    })
    
    it('should throw error of underflow while removing the additional right', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        propertyData.reservationStatus = "confirmed";
        await propertyController.confirmProperty(propertyData.propertyId, propertyData.reservationStatus, currentUser)
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementPropertyId)
        await expect(additionalRightController.updateAdditionalRights({}, 'remove', currentUser)).to.be.rejectedWith(Error, 'ADDITIONAL_RIGHTS_UNDERFLOW')
    })
    
    it('should successfully add an additional right', async () => {
        const agreementBeforeRight = await models.Agreement.findOne({ where: { id: agreement.id } })
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementPropertyId)
        const result = await additionalRightController.updateAdditionalRights({}, 'add', currentUser)
        result.should.have.property('id')

        const agreementAfterRight = await models.Agreement.findOne({ where: { id: agreement.id } })
        const agreementProperty = await additionalRightController.fetchCompletedAgreementProperty()
        const propertyPrice = agreementProperty.agreementPropertyPriceDetails.totalPrice
        const price =  (propertyPrice / 2) > 4000 ? 4000 : Number(propertyPrice / 2).toFixed(2)

        agreementAfterRight.totalPrice.should.equal(agreementBeforeRight.totalPrice + price)
    })

    it('should throw error of overflow while adding the additional right', async () => {
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementPropertyId)
        await expect(additionalRightController.updateAdditionalRights({}, 'add', currentUser)).to.be.rejectedWith(Error, 'ADDITIONAL_RIGHTS_OVERFLOW')
    })
    
    it('should successfully list and remove the additional right', async () => {
        const agreementBeforeRight = await models.Agreement.findOne({ where: { id: agreement.id } })
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementPropertyId)
        const additionalRights = await additionalRightController.listAdditionalRights()
        additionalRights.should.have.length.greaterThan(0)

        const result = await additionalRightController.updateAdditionalRights({additionalRightId: additionalRights[0].id}, 'remove', currentUser)
        result.should.have.property('id')

        const agreementAfterRight = await models.Agreement.findOne({ where: { id: agreement.id } })
        const agreementProperty = await additionalRightController.fetchCompletedAgreementProperty()
        const propertyPrice = agreementProperty.agreementPropertyPriceDetails.totalPrice
        const price =  (propertyPrice / 2) > 4000 ? 4000 : Number(propertyPrice / 2).toFixed(2)

        agreementAfterRight.totalPrice.should.equal(agreementBeforeRight.totalPrice - price)
    })
})
