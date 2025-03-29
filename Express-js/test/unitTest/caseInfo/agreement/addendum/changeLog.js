const chai = require('chai')
const faker = require('faker')
const _ = require('lodash')
const chaiAsPromised = require('chai-as-promised')
const { personSchema } = require('../../../schema')
const VerifiedPersonController = require('../../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../../controllers/refactorControllers/agreementController/addendum')
const ChangeLogController = require('../../../../../controllers/refactorControllers/agreementController/changeLog')
const AgreementPropertyController = require('../../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementMemorialController = require('../../../../../controllers/refactorControllers/agreementController/agreementMemorialController')
const { findOrCreateUser } = require('../../../helper')
const models = require('../../../../../models')
chai.use(chaiAsPromised);
chai.should();

const getSaleTypeIds = async (type, createdPerson) => {
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)

    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, createdPerson.isAlive ? 1: 2 )
    return saleTypes.map(saleType => saleType.id)
}

describe('change logs', () => {
    let createdPerson, agreement, currentUser, agreementProperty, addendumId, propertyData
    let agreementSchema = {
        needType: 2,
        type: 2,
        locationId: 1
    }

    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson.id)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)
        const agreementController = new AgreementController(agreement.id)
        await agreementController.markAgreementComplete()
        const addendumController = new AddendumController(agreement.id)
        const createdAddendum = await addendumController.createAddendum()
        addendumController.addendumId = createdAddendum.id
        addendumId = addendumController.addendumId

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
        agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus,
            addendumId
            )
        agreementPropertyId = agreementProperty.id
    })

    after(async () => {
        await models.AgreementPropertyAdditionalRight.destroy({ where: {} })
        await models.AgreementProperty.destroy({ where: {} })
    })

    it('should not return properties when there is no confirmed property', async () => {
        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.not.have.property('properties')
    })

    it('should return properties when confirmed', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        await propertyController.confirmProperty(
            propertyData.propertyId, 
            currentUser, 
            'confirmed',
            addendumId
        )
        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.have.property('properties')
    })

    it('should return more than 2 properties when confirmed another property', async () => {
        const query = `SELECT Property.id from Property 
            INNER JOIN PropertyGarden ON Property.propertyGardenId = PropertyGarden.id
            INNER JOIN PropertyType ON Property.propertyTypeCodeId = PropertyType.id
            WHERE Property.propertyGardenId != (
                SELECT Property.propertyGardenId from Property where Property.id = ${propertyData.propertyId}
            )`
        
        const properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })

        const otherPropertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        await propertyController.reserveProperty(
            otherPropertyData.propertyId, 
            currentUser, 
            otherPropertyData.reservationStatus,
            addendumId
            )
        await propertyController.confirmProperty(
            otherPropertyData.propertyId, 
            currentUser, 
            'confirmed',
            addendumId
        )
        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.have.property('properties')
        _.filter(result.properties, { action: 'removed' }).length.should.be.greaterThan(1)
    })

    it('should not return additionalRights when there is no rights added to property', async () => {
        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.not.have.property('additionalRights')
    })

    it('should return additionalRights when there is rights added to property', async () => {

    })
})

describe('change logs for monument', () => {
    let createdPerson, agreement, currentUser, addendumId
    let agreementSchema = {
        needType: 2,
        type: 2,
        locationId: 1
    }
    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson.id)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)
        const agreementController = new AgreementController(agreement.id)
        await agreementController.markAgreementComplete()
        const addendumController = new AddendumController(agreement.id)
        const createdAddendum = await addendumController.createAddendum()
        addendumController.addendumId = createdAddendum.id
        addendumId = addendumController.addendumId
        
    })

    it('should return empty array of change logs', async () => {
        let result = await AddendumController.getChangeLogs(addendumId)
        result.length.should.equal(0)
    })
    

    it('should return change log for monuments', async () => {
        let agreementMonumentPayload = {
            "memorialTypeId": 277,
            "items": [
                {
                    "locationItemId": 4265,
                    "itemType": "monument"
                }
            ]
        }
        const agreementMemorialController = new AgreementMemorialController(agreement.id)
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
        await ChangeLogController.recordAction('add', addedAgreementMemorial.id, 'AgreementMemorialItem')

        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.have.property('monuments')
        result.monuments[0].should.have.property('id')
        result.monuments[0].should.have.property('agreementId').and.equal(agreement.id)
        result.monuments[0].should.have.property('addendumId').and.equal(addendumId)
        result.monuments[0].should.have.property('memorials')
        result.monuments[0].memorials.should.have.property('quantity')
        result.monuments[0].memorials.should.have.property('unitPrice')
        result.monuments[0].memorials.should.have.property('totalPrice')
        result.monuments[0].memorials.should.have.property('updatedAt')
        result.monuments[0].memorials.should.have.property('itemCode')
        result.monuments[0].memorials.should.have.property('itemName')
        result.monuments[0].memorials.should.have.property('itemCategory')
        result.monuments[0].memorials.should.have.property('action')
        result.monuments[0].should.have.property('memorialType')
        result.monuments[0].memorialType.should.have.property('id')
        result.monuments[0].memorialType.should.have.property('name')
    })
    
})
