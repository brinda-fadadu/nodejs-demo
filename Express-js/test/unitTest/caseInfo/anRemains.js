const faker = require('faker')
const {getEmployeeIds, getRolesOnContactType, getLocationsIds, findOrCreateUser} = require('../helper')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const ANRemainsController = require('../../../controllers/refactorControllers/personController/anRemainsController')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const AddressController = require('../../../controllers/refactorControllers/addressController/addressController')

const models = require('../../../models/index')
const {addressSchema, organizationSchema, personSchema, contactsSchema} = require('../schema')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();

async function createPlace (isOrg) {
    const placeSchema = {
        address: {
            ...addressSchema()
        }
    }
    if (isOrg) {
        placeSchema.organization = {
            ...organizationSchema()
        }
    }
    const place = await AddressController.managePlace(placeSchema)
    return place.toJSON()
}

describe('getting the remains details of the person',  () => {
    after(async () => {
        await models.PersonRemainsApproval.destroy({ where: {}})
        await models.PersonRemainsInfo.destroy({ where: {}})
        await models.PersonContactRole.destroy({ where: {}})
        await models.PersonContact.destroy({ where: {}})
        await models.PersonRemainsTransfer.destroy({ where: {}})
        await models.Person.destroy({ where: {}})
        await models.Place.destroy({ where: {}})
    })


    let personId, createdContact, locationIds, employeeIds


    it('should create a verified person who is dead', async () => {
        const person = {
            ...personSchema(),
            isAlive: false
        }
        const place= {
            organization:{
                ...organizationSchema()
            },
            address: {
                ...addressSchema()
            }
        }
        createdPerson = await PersonController.createOrUpdate(person, place, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)

        personId = createdPerson.id
        createdPerson.should.have.property('firstName').and.to.be.equal(person.firstName)
    })

    it('should throw an error saying person not found', async () => {
        try {
            const anRemainsController = new ANRemainsController(faker.random.number())
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }
    })


    it('should throw an error saying anRemains not found', async () => {
            const anRemainsController = new ANRemainsController(personId)
            const remainsInfo = await anRemainsController.getANRemainsInfo()
            expect(remainsInfo).to.equal(null)
    })

    it('should throw an error saying person not found', async () => {
        try {
            const anRemainsSchema = {
                isEmbalmingApproved: true,
                isCremationApproved: true,
                isEmbalmingSelfApproved: true,
                isCremationSelfApproved: true,
                embalmerId: faker.random.arrayElement(employeeIds)
            }
            const anRemainsController = new ANRemainsController(faker.random.number())
            const remainsInfo = await anRemainsController.createOrEditANRemainsInfo(anRemainsSchema)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }
    })

    it('should add the remains details of the person', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=false)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations = true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        const employeeIds = await getEmployeeIds()
        const anRemainsSchema = {
            isEmbalmingApproved: true,
            isCremationApproved: true,
            isEmbalmingSelfApproved: false,
            isCremationSelfApproved: false,
            embalmerId: faker.random.arrayElement(employeeIds),
            embalmingApprovedBy: createdContact.id,
            cremationApprovedBy: [
                createdContact.id
            ],
            finalDisposition: 'Burial at sea'
        }
        const anRemainsController = new ANRemainsController(personId)
        const remainsInfo = await anRemainsController.createOrEditANRemainsInfo(anRemainsSchema)
        remainsInfo.should.have.property('isEmbalmingSelfApproved').and.to.be.equal(anRemainsSchema.isEmbalmingSelfApproved)
        remainsInfo.should.have.property('embalmingApprovedBy').and.to.be.an('array').and.to.be.of.length(1)
        remainsInfo.should.have.property('cremationApprovedBy').and.to.be.an('array').and.to.be.of.length(1)
        remainsInfo.should.have.property('finalDisposition').and.to.be.equal('Burial at sea')
    })

    it('should be able to edit the anRemains info', async () => {
        const anRemainsController = new ANRemainsController(personId)
        const remainsInfo = await anRemainsController.getANRemainsInfo()
        const toEditScheama = {
            ...remainsInfo,
            isEmbalmingApproved: true,
            isCremationApproved: true,
            isEmbalmingSelfApproved: true,
            isCremationSelfApproved: true,
            finalDisposition: 'Burial at sea'
        }
        const editedData = await anRemainsController.createOrEditANRemainsInfo(toEditScheama)
        editedData.should.have.property('id').and.to.be.equal(remainsInfo.id)
        editedData.should.have.property('embalmingApprovedBy').and.to.be.an('array').and.to.be.of.length(0)
        editedData.should.have.property('cremationApprovedBy').and.to.be.an('array').and.to.be.of.length(0)

    })

    it('should throw an error id invalid contact ids are given inremains approved by', async () => {
        try {
            const anRemainsController = new ANRemainsController(personId)
            const remainsInfo = await anRemainsController.getANRemainsInfo()
            const toEditScheama = {
                ...remainsInfo,
            isEmbalmingApproved: true,
            isCremationApproved: true,
                isEmbalmingSelfApproved: false,
                embalmingApprovedBy: faker.random.number(),
                isCremationSelfApproved: false,
                cremationApprovedBy: faker.random.number()
            }
            const editedData = await anRemainsController.createOrEditANRemainsInfo(toEditScheama)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_APPROVED_BY_CONTACTS')
        }
    })

    it('should remove the embalming and cremation approved by when self approved is true', async () => {
        const anRemainsController = new ANRemainsController(personId)
        const remainsInfo = await anRemainsController.getANRemainsInfo()
        const toEditScheama = {
            ...remainsInfo,
            isEmbalmingApproved: true,
            isCremationApproved: true,
            isEmbalmingSelfApproved: true,
            embalmingApprovedBy: faker.random.number(),
            isCremationSelfApproved: true,
            cremationApprovedBy: faker.random.number()
        }
        const editedData = await anRemainsController.createOrEditANRemainsInfo(toEditScheama)
        editedData.should.have.property('embalmingApprovedBy').and.to.be.an('array').and.to.be.of.length(0)
        editedData.should.have.property('cremationApprovedBy').and.to.be.an('array').and.to.be.of.length(0)
    })

    it('should throw an error saying person not found', async () => {
        try {
            const transferSchema = {}
            const anRemainsController = new ANRemainsController(faker.random.number())
            const remainsInfo = await anRemainsController.createOrEditTransfer(transferSchema)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }
    })

    it('should be able to add a transfer record for the person', async () => {
        locationIds = await getLocationsIds()
        employeeIds = await getEmployeeIds()
        const fromPlace = await createPlace(isOrg = true)
        const toPlace = await createPlace(isOrg = true)
        const transferSchema = {
            transferType: faker.random.number({min: 1, max:4}),
            neededByDate: faker.date.future(20, new Date()),
            isTransferReady: faker.random.boolean(),
            transferDateTime: faker.date.future(20, new Date()),
            isTransferComplete: faker.random.boolean(),
            transferFromLocationId: locationIds[0],
            transferFromPlace: {...fromPlace},
            transferToLocationId: locationIds[1],
            transferToPlace: {...toPlace},
            primaryDriverId: employeeIds[0],
            secondaryDriverId: employeeIds[1]
        }
        const anRemainsController = new ANRemainsController(personId)
        const transfer = await anRemainsController.createOrEditTransfer(transferSchema)
        transfer.should.have.property('id')
        transfer.should.have.property('personId').and.to.be.equal(personId)
        transfer.should.have.property('transferFromPlaceId').and.to.be.equal(transferSchema.transferFromPlace.id)
        transfer.should.have.property('transferToPlaceId').and.to.be.equal(transferSchema.transferToPlace.id)
        transfer.should.have.property('transferFromLocationId').and.to.be.equal(transferSchema.transferFromLocationId)
        transfer.should.have.property('transferToLocationId').and.to.be.equal(transferSchema.transferToLocationId)
    })

    it('should throw an error saying transfer from location and to location should not be same', async () => {
        try {
            const fromPlace = await createPlace(isOrg = true)
            const toPlace = await createPlace(isOrg = true)
        const transferSchema = {
            transferType: faker.random.number({min: 1, max:4}),
            neededByDate: faker.date.future(20, new Date()),
            isTransferReady: faker.random.boolean(),
            transferDateTime: faker.date.future(20, new Date()),
            isTransferComplete: faker.random.boolean(),
            transferFromLocationId: locationIds[0],
            transferFromPlace: {...fromPlace},
            transferToLocationId: locationIds[0],
            transferToPlace: {...toPlace},
            primaryDriverId: employeeIds[0],
            secondaryDriverId: employeeIds[1]
        }
        const anRemainsController = new ANRemainsController(personId)
        const transfer = await anRemainsController.createOrEditTransfer(transferSchema)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('TRANSFER_FROM_AND_TRANSFER_TO_CAN_NOT_BE_SAME')
        }
        
    })

    it('should throw an error saying transfer drivers should not be same', async () => {
        try {
            const fromPlace = await createPlace(isOrg = true)
            const toPlace = await createPlace(isOrg = true)
        const transferSchema = {
            transferType: faker.random.number({min: 1, max:4}),
            neededByDate: faker.date.future(20, new Date()),
            isTransferReady: faker.random.boolean(),
            transferDateTime: faker.date.future(20, new Date()),
            isTransferComplete: faker.random.boolean(),
            transferFromLocationId: locationIds[0],
            transferFromPlace: {...fromPlace},
            transferToLocationId: locationIds[0],
            transferToPlace: {...toPlace},
            primaryDriverId: employeeIds[0],
            secondaryDriverId: employeeIds[0]
        }
        const anRemainsController = new ANRemainsController(personId)
        const transfer = await anRemainsController.createOrEditTransfer(transferSchema)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('DRIVERS_CAN_NOT_BE_SAME')
        }
        
    })


    it('should throw an error saying transfer from place and to place should not be same', async () => {
        try {
            const fromPlace = await createPlace(isOrg = false)
        const transferSchema = {
            transferType: faker.random.number({min: 1, max:4}),
            neededByDate: faker.date.future(20, new Date()),
            isTransferReady: faker.random.boolean(),
            transferDateTime: faker.date.future(20, new Date()),
            isTransferComplete: faker.random.boolean(),
            transferFromLocationId: locationIds[0],
            transferFromPlace: {...fromPlace},
            transferToLocationId: locationIds[1],
            transferToPlace: {...fromPlace},
            primaryDriverId: employeeIds[0],
            secondaryDriverId: employeeIds[1]
        }
        const anRemainsController = new ANRemainsController(personId)
        const transfer = await anRemainsController.createOrEditTransfer(transferSchema)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('TRANSFER_FROM_AND_TRANSFER_TO_CAN_NOT_BE_SAME')
        }
        
    })

    it('should throw an error saying transfer not found', async () => {
        try {
            const anRemainsController = new ANRemainsController(personId)
            const transferDetails = await anRemainsController.getTransferDetails(faker.random.number())
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('TRANSFER_NOT_FOUND')
        }
    })


    it('should return the details of the transfer', async () => {
        const anRemainsController = new ANRemainsController(personId)
        const transfers = await anRemainsController.listTransfers()

        const transferDetails = await anRemainsController.getTransferDetails(transfers[0].id)
        transferDetails.should.have.property('personId').and.to.be.equal(personId)
        transferDetails.should.have.property('id')
    })

    it('should list the transfers of the person', async () => {
        const anRemainsController = new ANRemainsController(personId)
        const transfers = await anRemainsController.listTransfers()
        transfers.should.be.an('array').and.to.be.length.greaterThan(0)
    })

    it('should be able to delete the transfer of the person', async () => {
        const user = await findOrCreateUser()
        const anRemainsController = new ANRemainsController(personId)
        const transfers = await anRemainsController.listTransfers()
        const deletedTransfer = await anRemainsController.deleteTransfer(transfers[0].id, user.id)
        deletedTransfer.should.have.property('deletedBy').and.to.be.equal(user.id)
        deletedTransfer.should.have.property('deletedAt').and.to.be.a('date')
    })

})
