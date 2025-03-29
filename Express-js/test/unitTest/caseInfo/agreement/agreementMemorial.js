const chai = require('chai')
const faker = require('faker')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const _ = require('lodash')
const { personSchema, agreementSchema, agreementMemorialSchema } = require('../../schema')
const models = require('../../../../models/index')
const { findOrCreateUser } = require('../../helper')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const AgreementMemorialController = require('../../../../controllers/refactorControllers/agreementController/agreementMemorialController')
const AddendumController = require('../../../../controllers/refactorControllers/agreementController/addendum')

describe('Agreement Memorial', () => {
    let createdPerson
    before(async () => {
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType=1, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        agreementMemorialController = new AgreementMemorialController(agreementId)
    })

    it('should throw an error when adding an agreement memorial that does not have agreement', async () => {
        const agreementMemorialController = new AgreementMemorialController(faker.random.number({ min: 10000 }))
        await expect(agreementMemorialController.createOrUpdate('add', { itemType: 'package' })).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })

    it('should create upright agreement memorial with items', async () => {
        let agreementMonumentPayload = agreementMemorialSchema()
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
        addedAgreementMemorial.should.have.property('id')
        addedAgreementMemorial.should.have.property('agreementMemorialItems').and.to.be.an('array').of.length.greaterThan(0)  
    })

    it('should update agreement memorial with items', async () => {
        let agreementMonumentPayload = agreementMemorialSchema()
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)

        let memorialItem = {
            locationItemId: 30493,
            itemId: 5083,
            itemType: "30X1 Base Colonial Rose"
        }
        let updateMemorialItems = _.filter(addedAgreementMemorial.agreementMemorialItems, item => item.locationItemId !== 30487 )
        updateMemorialItems.push(memorialItem)
        let updatedPayload = {
            id: addedAgreementMemorial.id,
            "memorialTypeId": 277,
            "items": updateMemorialItems
        }

        let updatedAgreementMemorial = await agreementMemorialController.createOrUpdate('edit', updatedPayload)
        updatedAgreementMemorial.should.have.property('id')
        updatedAgreementMemorial.should.have.property('agreementMemorialItems').and.to.be.an('array').of.length.greaterThan(0)
        updatedAgreementMemorial.agreementMemorialItems[0].should.have.property('id')
        updatedAgreementMemorial.agreementMemorialItems[0].should.have.property('name')
        updatedAgreementMemorial.agreementMemorialItems[0].should.have.property('itemCode').and.should.not.be.equal(addedAgreementMemorial.agreementMemorialItems[0].itemCode)
    })

    it('should list agreement memorials', async () => {
        let memorialTypeId = 277
        let agreementMonumentPayload = agreementMemorialSchema()
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
        let res = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        res.should.be.an('array').of.length.greaterThan(0)
    })

    it('should edit the quantity of a memorial item', async () => {
        let memorialTypeId = 277
        let agreementMonumentPayload = agreementMemorialSchema()
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
        await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let memorialId = addedAgreementMemorial.id
        let locationItemId = 109
        let quantity = 10
        let res = await agreementMemorialController.editMemorialItemQuantity(memorialId, locationItemId, quantity, null, createdPerson.id)
        res.should.be.an('array').of.length.greaterThan(0)
    })

    it('should delete the agreement memorial and memorial items', async () => {
        let memorialTypeId = 277
        let agreementMonumentPayload = agreementMemorialSchema()
        let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
        await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let memorialId = addedAgreementMemorial.id
        let res = await agreementMemorialController.deleteMemorial(memorialId, null, createdPerson.id)
        res.should.be.equal(true)
    })
})

describe('Agreement Memorial For Addendum', () => {
    let createdPerson, agreementId, addendumId, currentUser, agreementMemorial, addendumMemorial
    before(async () => {
        const person = { ...personSchema() }
        currentUser = await findOrCreateUser()
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType=1, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        agreementMemorialController = new AgreementMemorialController(agreementId)
        // Adding monument to agreement
        let agreementMonumentPayload = agreementMemorialSchema()
        agreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)

        // Update quantity of extra
        let locationItemId = 30427
        let quantity = 10
        await agreementMemorialController.editMemorialItemQuantity(agreementMemorial.id, locationItemId, quantity, null, createdPerson.id)

        const agreementController = new AgreementController(agreement.id)
        await agreementController.markAgreementComplete()
    })

    after(async () => {
        await models.AgreementProperty.destroy({ 
            where: {
                agreementId
            } 
        })
        await models.AgreementMemorial.destroy({ 
            where: {
                agreementId
            } 
        })
        await models.AgreementMemorialItem.destroy({ 
            where: {
                agreementMemorialId: agreementMemorial.id
            } 
        })
    })

    it('should throw an error when adding an agreement memorial on completed agreement', async () => {
        try {
            const agreementMemorialController = new AgreementMemorialController(agreementId)
            await agreementMemorialController.createOrUpdate('add', agreementMemorialSchema())
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('AGREEMENT_ALREADY_COMPLETED')
        }
    })

    it('should throw an error when editing an agreement memorial on completed agreement', async () => {
        try {
            let memorialTypeId = 277
            const agreementMemorialController = new AgreementMemorialController(agreementId)
            let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
            let updateMemorialPayload = _.find(memorialList, { id: agreementMemorial.id })
            updateMemorialPayload.items = _.filter(updateMemorialPayload.items, item => item.locationItemId !== 30487 )
            updateMemorialPayload.items.push({
                locationItemId: 30493,
                itemId: 5083,
                itemType: "30X1 Base Colonial Rose"
            })
            updateMemorialPayload = {
                id: agreementMemorial.id,
                ...updateMemorialPayload
            }
            await agreementMemorialController.createOrUpdate('edit', updateMemorialPayload)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('AGREEMENT_ALREADY_COMPLETED')
        }
    })

    it('should throw an error when editing an agreement memorial extras on completed agreement', async () => {
        try {
            let locationItemId = 30487
            let quantity = 12
            const agreementMemorialController = new AgreementMemorialController(agreementId)
            await agreementMemorialController.editMemorialItemQuantity(agreementMemorial.id, locationItemId, quantity, null, currentUser.id)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('AGREEMENT_ALREADY_COMPLETED')
        }
    })

    it('should add an agreement memorial on active addendum', async () => {
        let memorialTypeId = 277
        const agreementController = new AgreementController(agreementId)
        await agreementController.checkoutAgreement(agreementId, createdPerson.id)
        const addendumController = new AddendumController(agreementId)
        const addendum = await addendumController.createAddendum()
        addendumId = addendum.id
        addendumMemorial = await agreementMemorialController.createOrUpdate('add', agreementMemorialSchema())
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        memorialList.should.be.an('array')
        memorialList.should.have.length.greaterThan(0)
        addendumMemorial = _.find(memorialList, { id: addendumMemorial.id })
        addendumMemorial.should.have.property('id')
        addendumMemorial.should.have.property('addendumId').and.to.equal(addendumId)
    })

    it('should list memorials with addendum number', async () => {
        let memorialTypeId = 277
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        memorialList.should.be.an('array')
        memorialList.should.have.length.greaterThan(0)
        memorialList[0].should.have.property('agreementNumber')
        let memorial = _.find(memorialList, { id: addendumMemorial.id })
        memorial.should.have.property('addendumNumber')
    })

    it('should edit memorial on agreement as part of addendum', async () => {
        let memorialTypeId = 277
        let memorialItem = {
            locationItemId: 30493,
            itemId: 5083,
            itemType: "30X1 Base Colonial Rose"
        }
        const agreementMemorialController = new AgreementMemorialController(agreementId)
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let updateMemorialPayload = _.find(memorialList, { id: agreementMemorial.id })
        updateMemorialPayload.items = _.filter(updateMemorialPayload.items, item => item.locationItemId !== 30487 )
        updateMemorialPayload.items.push(memorialItem)
        updateMemorialPayload = {
            id: agreementMemorial.id,
            ...updateMemorialPayload
        }
        let updatedMemorialPayload = await agreementMemorialController.createOrUpdate('edit', updateMemorialPayload)
        updatedMemorialPayload.should.have.property('id').and.to.equal(agreementMemorial.id)
        let updatedMemorialItem = _.find(updatedMemorialPayload.agreementMemorialItems, { locationItemId: memorialItem.locationItemId })
        updatedMemorialItem.should.have.property('addendumId').and.to.equal(addendumId)
        updatedMemorialItem.should.have.property('itemId').and.to.equal(memorialItem.itemId)
    })

    it('should be able to decrease memorial extra quantity', async () => {
        let memorialTypeId = 277
        let locationItemId= 30427
        let quantity = 9
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let updateMemorial = _.find(memorialList, { id: agreementMemorial.id })
        let updateMemorialItem = _.find(updateMemorial.items, { locationItemId })
        await agreementMemorialController.editMemorialItemQuantity(agreementMemorial.id, locationItemId, quantity, null, currentUser.id)
        memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        updateMemorial = _.find(memorialList, { id: agreementMemorial.id })
        updateMemorialItem = _.find(updateMemorial.items, { locationItemId })
        updateMemorialItem.should.have.property('quantity').to.be.equal(quantity)
        updateMemorialItem.should.have.property('addendumId').to.be.equal(null)
    })

    it('should be able to increase memorial extra quantity and save as part of addendum', async () => {
        let memorialTypeId = 277
        let locationItemId= 30427
        let quantity = 11
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let updateMemorial = _.find(memorialList, { id: agreementMemorial.id })
        let updateMemorialItem = _.find(updateMemorial.items, { locationItemId })
        let previousQuantity = updateMemorialItem.quantity
        await agreementMemorialController.editMemorialItemQuantity(agreementMemorial.id, locationItemId, quantity, null, currentUser.id)
        memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        updateMemorial = _.findLast(memorialList, { id: agreementMemorial.id })
        updateMemorialItem = _.find(updateMemorial.items, { locationItemId })
        updateMemorialItem.should.have.property('quantity').to.be.equal(quantity - previousQuantity)
        updateMemorialItem.should.have.property('addendumId').to.be.equal(addendumId)
    })

    it('should be able to delete memorial and record change logs', async () => {
        let memorialTypeId = 277
        let memorialList = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        let updateMemorial = _.findLast(memorialList, { id: agreementMemorial.id })
        let updateMemorialItem = _.get(updateMemorial, 'items')
        updateMemorialItem = _.filter(updateMemorialItem, { addendumId })

        let res = await agreementMemorialController.deleteMemorial(agreementMemorial.id, addendumId, createdPerson.id)
        res.should.be.equal(true)

        let result = await AddendumController.getChangeLogs(addendumId)
        result = _.groupBy(result, 'itemType')
        result.should.have.property('monuments')

        for await (let item of updateMemorialItem) {
            const itemLog = _.findLast(result.monuments, { memorials: { itemName: item.name }, addendumId, agreementId: item.agreementId })
            itemLog.should.have.property('memorials')
            itemLog.memorials.should.have.property('action').to.be.equal('removed')
            itemLog.memorials.should.have.property('quantity').to.be.equal(-(item.quantity))
        }
    })
})