const chai = require('chai')
const faker = require('faker')
const _ = require('lodash')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const { personSchema } = require('../../schema')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyAdditionalRights = require('../../../../controllers/refactorControllers/agreementController/agreementPropertyAdditionalRights')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const SideBySidePropertyController = require('../../../../controllers/refactorControllers/agreementController/sideBySideProperty')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const AgreementMemorialController = require('../../../../controllers/refactorControllers/agreementController/agreementMemorialController')
const ApprovalsController = require('../../../../controllers/refactorControllers/adjustmentController/approvalsController')
const { findOrCreateUser } = require('../../helper')
const models = require('../../../../models')
const PropertyReservationController = require('../../../../controllers/refactorControllers/agreementController/propertyReservationTypeController')
const WebCemController = require('../../../../controllers/refactorControllers/webCemController/webCemController')
const WebCemPropertyController = require('../../../../controllers/refactorControllers/webCemController/webCemPropertyController')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();

const getSaleTypeIds = async (type, person) => {
    const verifiedPersonController = new VerifiedPersonController(person.id)

    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, person.isAlive ? 1: 2 )
    return saleTypes.map(saleType => saleType.id)
}

describe('Agreement Property Reservation Type For PN Case', () => {
    let createdPerson, agreement, currentUser, agreementProperty, propertyData
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
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

        const query = `SELECT Property.id from Property`

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
            propertyData.reservationStatus
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
        const expiryDate = (moment(agreementProperty.expiryDate)).toString()
        const expectedExpiryDate = (moment(agreementProperty.reservedDate).add(7, 'days')).toString()
        expiryDate.should.equal(expectedExpiryDate)
    })
})

describe('Agreement Property Reservation Type For AN Case', () => {
    let createdPerson, agreement, currentUser, agreementProperty, propertyData
    let agreementSchema = {
        needType: 1,
        type: 2,
        locationId: 1
    }

    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        person.isAlive = false
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

        const query = `SELECT Property.id from Property`

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
            propertyData.reservationStatus
        )
    })

    after(async () => {
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
    })

    it('should add property with reservation type as at-need when an case', async () => {
        agreementProperty.should.have.property('id')
        agreementProperty.should.have.property('reservationType').and.to.be.equal("At-Need")
        agreementProperty.should.have.property('expiryDate').and.to.be.equal(null)
    })
})
describe('Should list the persons associated to that property when the property is released', () => {
    let createdPerson, agreement, currentUser, properties
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
    it('should list the property and persons associated with it', async () => {
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        const agreementPropertyId = await propertyController.getReservation(null, agreementProperty.propertyId)
        const webCemPropertyController = new WebCemPropertyController()
        const result = await webCemPropertyController.removePropertyForDecedentsOnRelease([agreementPropertyId.id])
        result.should.have.property('decedents').and.to.be.an('array').of.length.greaterThan(0)
        result.should.have.property('property')
        result.property.should.have.property('cl_ref')
    })
    it('should not list the property and persons associated with it', async ()=> {
        // const agreementPropertyId = await propertyController.getReservation(null, agreementProperty.propertyId)
        const webCemPropertyController = new WebCemPropertyController()
        const result = await webCemPropertyController.removePropertyForDecedentsOnRelease([properties[0].id])
        result.should.equal('Cannot fetch the list')


    })

})
describe('Release Agreement Property', () => {
    let createdPerson, agreement, currentUser, properties, agreementProperty, propertyWithRights, companionProperties
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
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

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
            propertyData.reservationStatus
        )
        const result = await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        result.should.be.an('array').of.length.greaterThan(0)
        result[0].should.equal(1)
    })

    it('should delete side by side properties pair', async () => {
        let payload = {}
        const properties = await models.Property.findAll({
            where: {
                propertyGardenId: 3
            },
            order: models.sequelize.random(),
            limit: 2
        })
        
        const rightPropertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        const leftPropertyData = {
            propertyId: properties[1].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const rightAgreementProperty = await propertyController.reserveProperty(rightPropertyData.propertyId, currentUser, "reserved")
        const leftAgreementProperty = await propertyController.reserveProperty(leftPropertyData.propertyId, currentUser, "reserved")
        payload.rightAgreementPropertyId = rightAgreementProperty.id
        payload.leftAgreementPropertyId = leftAgreementProperty.id
        await propertyController.confirmProperty(rightPropertyData.propertyId, "confirmed", currentUser)
        await propertyController.confirmProperty(leftPropertyData.propertyId, "confirmed", currentUser)
        let sideBySidePropertyController = new SideBySidePropertyController(agreement.id)
        const createdSideBySideProperty = await sideBySidePropertyController.upsertSideBySideProperty(payload, currentUser)
        createdSideBySideProperty.should.have.property('id')

        sideBySidePropertyController = new SideBySidePropertyController(agreement.id, createdSideBySideProperty.id)
        let sideBySideProperties = await sideBySidePropertyController.listSideBySideProperties()
        sideBySideProperties.should.be.an('array')
        sideBySideProperties.should.have.length.greaterThan(0)

        await propertyController.releaseProperty(rightAgreementProperty.propertyId, currentUser)
        sideBySideProperties = await sideBySidePropertyController.listSideBySideProperties()
        sideBySideProperties.should.be.an('array')
        sideBySideProperties.should.have.length(0)
    })

    it('should delete additional rights added to that property', async () => {
        const intermentRights = await models.IntermentRights.findOne({
            where: {
                graves: 1,
                rights: 1,
                maxRights: 2
            }
        })

        query = `SELECT Property.id from Property 
        INNER JOIN PropertyGarden ON Property.propertyGardenId = PropertyGarden.id
        INNER JOIN PropertyType ON Property.propertyTypeCodeId = PropertyType.id
        WHERE PropertyGarden.propertyCampusId = ${intermentRights.propertyCampusId} and Property.propertyTypeCodeId = ${intermentRights.propertyTypeId}
        `
        properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(propertyData.propertyId, currentUser, propertyData.reservationStatus)
        await propertyController.confirmProperty(propertyData.propertyId, "confirmed", currentUser)
        const additionalRightController = new AgreementPropertyAdditionalRights(agreement.id, agreementProperty.id)
        const result = await additionalRightController.updateAdditionalRights({}, 'add', currentUser)
        result.should.have.property('id')
        const additionalRightsBeforeRelease = await additionalRightController.listAdditionalRights()
        additionalRightsBeforeRelease.should.be.an('array')
        additionalRightsAfterRelease.should.have.length.greaterThan(0)

        await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        const propertyAfterRelease = await propertyController.getAgreementProperties()
        propertyAfterRelease.should.be.an('array')
        propertyAfterRelease.should.have.length(0)
        const additionalRightsAfterRelease = await additionalRightController.listAdditionalRights()
        additionalRightsAfterRelease.should.be.an('array')
        additionalRightsAfterRelease.should.have.length(0)
    })
})

describe('Remove items from Agreement', () => {
    let createdPerson, agreement, currentUser, properties
    let agreementItemsListBefore, agreementItemsListAfter, agreementMemorialBefore, agreementMemorialAfter
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
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

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
    })

    it('should have deleted merchandises', async () => {
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        await propertyController.confirmProperty(propertyData.propertyId, "confirmed", currentUser)

        const merchandiseItemType = await models.ItemType.findOne({ where: { name: 'Merchandises' } })
        merchandise = await models.LocationItem.findOne({ 
            include: [
                {
                    model: models.Item,
                    include: [
                        {
                            model: models.ItemCategory,
                            where: {
                                itemTypeId: merchandiseItemType.id
                            }
                        }
                    ],
                    required: true
                }
            ]
        })

        const agreementItemController = new AgreementItemController(agreement.id)
        await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })

        agreementItemsListBefore = await agreementItemController.getAgreementItems()

        await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        await propertyController.removeItems()
        agreementItemsListAfter = await agreementItemController.getAgreementItems()
        agreementItemsListBefore.should.be.an('array')
        agreementItemsListBefore.should.have.length.greaterThan(0)
        agreementItemsListAfter.should.be.an('array')
        agreementItemsListAfter.should.have.length(0)
    })

    it('should have deleted services', async () => {
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        await propertyController.confirmProperty(propertyData.propertyId, "confirmed", currentUser)

        const serviceItemType = await models.ItemType.findOne({ where: { name: 'Services' } })
        service = await models.LocationItem.findOne({ 
            include: [
                {
                    model: models.Item,
                    include: [
                        {
                            model: models.ItemCategory,
                            where: {
                                itemTypeId: serviceItemType.id
                            }
                        }
                    ],
                    required: true
                }
            ]
        })

        const agreementItemController = new AgreementItemController(agreement.id)
        await agreementItemController.createOrUpdate('add', {
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })

        agreementItemsListBefore = await agreementItemController.getAgreementItems()

        await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        await propertyController.removeItems()
        agreementItemsListAfter = await agreementItemController.getAgreementItems()
        agreementItemsListBefore.should.be.an('array')
        agreementItemsListBefore.should.have.length.greaterThan(0)
        agreementItemsListAfter.should.be.an('array')
        agreementItemsListAfter.should.have.length(0)
    })

    it('should have deleted memorials', async () => {
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        await propertyController.confirmProperty(propertyData.propertyId, "confirmed", currentUser)

        const agreementMonumentPayload = {
            "memorialTypeId": 277,
            "items": [
                {
                    "locationItemId": 4265,
                    "itemType": "monument"
                }
            ]
        }
        const agreementMemorialController = new AgreementMemorialController(agreement.id)
        await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)

        agreementMemorialBefore = await agreementMemorialController.getAgreementMemorials(agreementMonumentPayload.memorialTypeId)

        await propertyController.releaseProperty(agreementProperty.propertyId, currentUser)
        await propertyController.removeItems()
        agreementMemorialAfter = await agreementMemorialController.getAgreementMemorials(agreementMonumentPayload.memorialTypeId)
        agreementMemorialBefore.should.be.an('array')
        agreementMemorialBefore.should.have.length.greaterThan(0)
        agreementMemorialAfter.should.be.an('array')
        agreementMemorialAfter.should.have.length(0)
    })
})


describe('update reservation type', () => {
    let createdPerson, agreement, currentUser, properties
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
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

        const query = `SELECT Property.id from Property`
        properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
    })

    beforeEach(async () => {
        await models.AgreementProperty.destroy({ where: {}})
    })

    after(async () => {
        await models.AgreementProperty.destroy({ where: {}})
    })

    it('should release property if the expiry date is passed', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        const reservedAgreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser,
            propertyData.reservationStatus
        )
        await models.AgreementProperty.update({ expiryDate: moment().subtract(1, 'day').format() }, {
            where: { id: reservedAgreementProperty.id }
        })
        const previousReservedProperties = await propertyController.reviewProperties({})
        await PropertyReservationController.updateReservationType()
        const newReservedProperties = await propertyController.reviewProperties({})
        previousReservedProperties.length.should.equal(1)
        newReservedProperties.length.should.equal(0)
    })

    it('should not release property if the expiry date is passed and the 5% payment is done', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        const reservedAgreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser,
            propertyData.reservationStatus
        )
        const thisAgreement = await models.Agreement.findOne({ where: { id: agreement.id } })
        const totalPaid = thisAgreement.totalCashPrice * 10 / 100
        thisAgreement.set({ ...thisAgreement, totalPaid: totalPaid ? totalPaid : 100 })
        await thisAgreement.save()
        await models.AgreementProperty.update({ expiryDate: moment().subtract(1, 'day').format() }, {
            where: { id: reservedAgreementProperty.id }
        })
        const previousReservedProperties = await propertyController.reviewProperties({})
        await PropertyReservationController.updateReservationType()
        const newReservedProperties = await propertyController.reviewProperties({})
        previousReservedProperties.length.should.equal(1)
        newReservedProperties.length.should.equal(1)
    })

    it('should not release property if the expiry date has not passed', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        const propertyData = {
            propertyId: properties[1].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser,
            propertyData.reservationStatus
        )
        const previousReservedProperties = await propertyController.reviewProperties({})
        await PropertyReservationController.updateReservationType()
        const newReservedProperties = await propertyController.reviewProperties({})
        previousReservedProperties.length.should.equal(1)
        newReservedProperties.length.should.equal(1)
    })
    
})


describe('extending expiration date', () => {
    let createdPerson, agreement, currentUser, properties, reservedAgreementProperty, approval
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
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

        const query = `SELECT Property.id from Property`
        properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
    })

    beforeEach(async () => {
        await models.AgreementProperty.destroy({ where: {}})
        const propertyController = new AgreementPropertyController(agreement.id)
        const propertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        reservedAgreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser,
            propertyData.reservationStatus
        )
        await models.AgreementProperty.update({ expiryDate: moment().subtract(1, 'day').format() }, {
            where: { id: reservedAgreementProperty.id }
        })
    })

    after(async () => {
        await models.AgreementProperty.destroy({ where: {}})
    })

    it('should throw error of the reservation not found', async () => {
        const propertyReservationController = new PropertyReservationController()
        await expect(propertyReservationController.extendExpiryDate(faker.random.number(),
            { extensionDate: moment(), note: '' })).to.be.rejectedWith('RESERVATION_NOT_FOUND')
    })
    

    it('should throw error of the approval is not found', async () => {
        const reqBody = {
            status: 'Approved',
            actionNotes: 'approving the request',
            currentUser: {
                id: 1,
                name: 'company_name',
                UserPermissions: {
                    description: "Vp of sales"
                }
            }
        }
        const approvalsController = new ApprovalsController(faker.random.number(), {})
        await expect(approvalsController.approveOrRejectRequest(reqBody)).to.be.rejectedWith('APPROVAL_NOT_FOUND')
    })

    it('expiration date should be greater than current expiry date', async () => {
        const propertyReservationController = new PropertyReservationController()
        await expect(propertyReservationController.extendExpiryDate(reservedAgreementProperty.id,
            { extensionDate: moment().subtract(3, 'days').format(), note: '' })).to.be.rejectedWith('WRONG_EXPIRY_DATE')
    })

    it('should successfully create a request for extending expiry date', async () => {
        const user = {
            id: 1,
            name: 'company_name',
            role: 4,
            UserPermissions: {
                description: "Vp of sales"
            }
        }
        const notes = faker.random.words()
        const extensionDate = moment().add(3, 'days').format()
        const propertyReservationController = new PropertyReservationController()
        const extendedAgreementProperty = await propertyReservationController.extendExpiryDate(reservedAgreementProperty.id,
            { extensionDate, note: notes }, user)
        extendedAgreementProperty.should.have.property('id')
        approval = await models.Approval.findOne({
            where: {
                resourceType: 'AgreementProperty',
                resourceId: extendedAgreementProperty.id
            }
        })
        const approvalDetails = await propertyReservationController.getApprovalDetails(approval.id)

        approvalDetails.requestInformation.extensionDate.should.equal(extensionDate)
        approvalDetails.status.should.equal('Pending')

        const agreementPropertiesController = new AgreementPropertyController(agreement.id)
        const fetchedProperties = await agreementPropertiesController.reviewProperties({})
        const requiredAgreementProperty = _.find(fetchedProperties, { agreementPropertyId: extendedAgreementProperty.id })
        requiredAgreementProperty.should.have.property('status').and.equal('Pending')
        moment(requiredAgreementProperty.requestInformation.extensionDate).format().should.equal(extensionDate)

        const approvalList = await ApprovalsController.getListOfApprovals({ requestedBy: user.id }, user)
        approvalList.should.have.property('count').and.to.equal(approvalList.rows.length)
        approvalList.should.have.property('rows')
        expect(approvalList.rows).to.be.an('array').and.to.have.length.greaterThan(0)
    })

    it('should approve the agreement property', async () => {
        const notes = faker.random.words()
        const extensionDate = moment().add(3, 'days').format()
        const propertyReservationController = new PropertyReservationController()
        const extendedAgreementProperty = await propertyReservationController.extendExpiryDate(reservedAgreementProperty.id,
            { extensionDate, note: notes })
        extendedAgreementProperty.should.have.property('id')
        approval = await models.Approval.findOne({
            where: {
                resourceType: 'AgreementProperty',
                resourceId: extendedAgreementProperty.id
            }
        })
        const reqBody = {
            status: 'Approved',
            actionNotes: 'approving the request',
            currentUser: {
                id: 1,
                name: 'company_name',
                UserPermissions: {
                    description: "Vp of sales"
                }
            }
        }
        const approvedApproval = await propertyReservationController.updateExpiryApprovalRequest(approval.id, reqBody)
        ApprovalsController.ApprovalStatusStr(approvedApproval.status).should.equal('Approved')
        moment(approvedApproval.agreementProperty.expiryDate).format().should.equal(extensionDate)

        const agreementPropertiesController = new AgreementPropertyController(agreement.id)
        const fetchedProperties = await agreementPropertiesController.reviewProperties({})
        const requiredAgreementProperty = _.find(fetchedProperties, { agreementPropertyId: extendedAgreementProperty.id })
        requiredAgreementProperty.should.have.property('status').and.equal('Approved')
        moment(requiredAgreementProperty.requestInformation.extensionDate).format().should.equal(extensionDate)
    })
    
    it('should reject the agreement property', async () => {
        const notes = faker.random.words()
        const extensionDate = moment().add(3, 'days').format()
        const propertyReservationController = new PropertyReservationController()
        const extendedAgreementProperty = await propertyReservationController.extendExpiryDate(reservedAgreementProperty.id,
            { extensionDate, note: notes })
        extendedAgreementProperty.should.have.property('id')
        approval = await models.Approval.findOne({
            where: {
                resourceType: 'AgreementProperty',
                resourceId: extendedAgreementProperty.id
            }
        })
        const reqBody = {
            status: 'Declined',
            actionNotes: 'approving the request',
            currentUser: {
                id: 1,
                name: 'company_name',
                UserPermissions: {
                    description: "Vp of sales"
                }
            }
        }
        const rejectedApproval = await propertyReservationController.updateExpiryApprovalRequest(approval.id, reqBody)
        ApprovalsController.ApprovalStatusStr(rejectedApproval.status).should.equal('Declined')
        moment(rejectedApproval.agreementProperty.expiryDate).format().should.not.equal(extensionDate)

        const agreementPropertiesController = new AgreementPropertyController(agreement.id)
        const fetchedProperties = await agreementPropertiesController.reviewProperties({})
        const requiredAgreementProperty = _.find(fetchedProperties, { agreementPropertyId: extendedAgreementProperty.id })
        requiredAgreementProperty.should.have.property('status').and.equal('Declined')
        moment(requiredAgreementProperty.requestInformation.extensionDate).format().should.equal(extensionDate)
    })
})

describe('agreement property owners', () => {
    let createdPerson, agreement, currentUser, agreementProperty, propertyData, propertyController, newPerson
    let agreementSchema = {
        needType: 1,
        type: 2,
        locationId: 1
    }

    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        person.isAlive = false
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)

        const query = `SELECT Property.id from Property`

        const properties = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        const propertyId = faker.random.arrayElement(properties).id
        propertyData = {
            propertyId: propertyId,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        propertyController = new AgreementPropertyController(agreement.id)
        webCemPropertyController = new webCemPropertyController()
        agreementProperty = await propertyController.reserveProperty(
            propertyData.propertyId, 
            currentUser, 
            propertyData.reservationStatus
        )
        propertyData = {
            propertyId: propertyId,
            reservationStatus: "confirmed",
            resourceType: "Property"
        }
        await propertyController.confirmProperty(propertyData.propertyId, "confirmed", currentUser)
        
    })

    after(async () => {
        await models.AgreementPropertyOwner.destroy({
            where: {
                agreementPropertyId: agreementProperty.id
            } 
        })
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId: agreement.id
            } 
        })
    })
    it('should add an owner to property', async () => {
        const person = { ...personSchema() }
        person.isAlive = false
        newPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(newPerson.id)
        await verifiedPersonController.verifyPerson(newPerson)
        payload = {
            ownerId: newPerson.id,
        }

        const propertyOwners = await propertyController.addAgreementPropertyOwner(agreementProperty.id,payload,currentUser)
        propertyOwners.should.be.an('array').of.length.greaterThan(0)
        propertyOwners[0].should.have.property('ownerDetails')
        propertyOwners[0].ownerDetails.should.be.an('array').of.length.greaterThan(0)
    })
    it('should list agreement property owners', async () => {
        const propertyOwners = await propertyController.getOwnersOfProperties()
        propertyOwners.should.be.an('array').of.length.greaterThan(0)
    })
    it('should list the properties associated to owners', async () => {
        let data = {
            personId: newPerson.id,
            agreementPropertyId: agreementProperty.id,
            propertyId: propertyData.propertyId,
            agreementPropertyOwners:propertyOwners

        }
        const payload = await WebCemController.addPropertyOwner(data)
        payload.payload.should.have.property('property')
        payload.payload.should.have.property('property').and.to.be.an('object')
        payload.payload.property.should.have.property('cl_ref').to.equal(lotSellUnitId)
        payload.payload.should.have.property('property_owners').and.to.be.an('array').of.length.greaterThan(0)
    })
    it('should delete an owner from property within agreement', async () => {
        const data = {
            propertyId: agreementProperty.id,
            ownerId: newPerson.id,
            deletedInAddendumId: null
        }
        const result = await propertyController.deleteAgreementPropertyOwner(data,currentUser)
        result.should.be.an('array').of.length.greaterThan(0)
        result[0].should.have.property('ownerDetails')
        result[0].ownerDetails.should.be.an('array').of.length(0)
    })
    it('should remove the owner associated to property when the owner is removed', async () => {
        const data = {
            agreementPropertyId: agreementPropertyId,
            personId: newPerson.id
        }
        const result =await WebCemPropertyController.removePropertyOwner(data)
        result.should.have.property('property')
        result.should.have.property('property').and.to.be.an('object')
        result.property.should.have.property('cl_ref')
        payload.should.have.property('owners').and.to.be.an('array').of.length.greaterThan(0)

    })
})