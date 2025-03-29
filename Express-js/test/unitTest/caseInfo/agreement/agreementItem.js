try {
const chai = require('chai')
const faker = require('faker')
const { personSchema, agreementSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
const AgreementPackageController = require('../../../../controllers/refactorControllers/agreementController/agreementPackageController')
chai.use(chaiAsPromised);
chai.should();

let agreementId, agreementItemController, location

describe('item controller common test scenarios', () => {
    
    it('should throw error when adding an item that does not have agreement', async() => {
        const agreementItemController = new AgreementItemController(faker.random.number({ min: 1000 }))
        await expect(agreementItemController.createOrUpdate('add', { itemType: 'package', timezone: 'Asia/Calcutta' })).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })
})

describe('package', () => {
    let packageDetails, packageLocationItem, addedAgreementPackage, saleTypeIds, agreementPackageController
    before(async () => {
        packageDetails = await models.Package.findOne({ where: { isActive: true } })
        packageLocationItem = await models.PackageLocationItem.findAll({ where: { packageId: packageDetails.id } })
        location = await models.Location.findOne({
            id: packageDetails.locationId
        })
        location = location.toJSON()
        const person = { ...personSchema() }
        const createdPerson = await PersonController.createOrUpdate(person, {}, {})
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
        agreementPackageController = new AgreementPackageController(agreementId)
    })
    it('should add a package in agreement and make quantity 1', async () => {
        addedAgreementPackage = await agreementPackageController.createOrUpdatePackage( { 
            itemType: 'package',
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'add')
        const subAgreementPackages = await models.AgreementPackageItem.findAll({ where: { agreementPackageId: addedAgreementPackage.id } })
        // packageLocationItem.forEach((eachPackageLocationItem, index) => {
        //     eachPackageLocationItem.id.should.be.equal(subAgreementPackages[index].locationItemId)            
        // })
        addedAgreementPackage.should.have.property('id')
        addedAgreementPackage.should.have.property('quantity').and.to.equal(1)
        addedAgreementPackage.should.have.property('packageId').and.to.equal(packageDetails.id)
    })
    
    it('should throw error when adding the package whose quantity is 1', async() => {
        await expect(agreementPackageController.createOrUpdatePackage( { 
            itemType: 'package',
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'add')).to.be.rejectedWith(Error, 'PACKAGE_ALREADY_ADDED')
    })

    it('should list 1 package that is added', async() => {
        const agreementItemsList = await agreementPackageController.getAgreementPackages()
        agreementItemsList.length.should.be.equal(1)
        agreementItemsList[0].should.have.property('name')
        agreementItemsList[0].should.have.property('description')
    })
    
    it('should remove a package from agreement and make quantity 0', async() => {
        const removedAgreementPackage = await agreementPackageController.createOrUpdatePackage({ 
            itemType: 'package',
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'remove')
        // const subAgreementPackages = await models.AgreementPackageItem.findAll({ where: { parentId: addedAgreementPackage.id } })
        // subAgreementPackages.length.should.be.equal(0)
        removedAgreementPackage.should.have.property('id')
        removedAgreementPackage.should.have.property('packageId').and.to.equal(packageDetails.id)
    })

    it('should throw error while removing the package whose quantity is 0 ', async() => {
        await expect(agreementPackageController.createOrUpdatePackage({ 
            itemType: 'package',
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'remove')).to.be.rejectedWith(Error, 'PACKAGE_ALREADY_REMOVED')
    })

    it('should list 0 agreementItem after package is removed', async() => {
        await expect(AgreementPackageController.getAgreementPackageItems(packageDetails.id))
        .to.be.rejectedWith(Error, 'PACKAGE_STATEMENT_NOT_FOUND')
    })

    it('Comparing tax percentages', async () => {
        let unitTax =0, totalTax=0
        const addedAgreementPackage = await agreementPackageController.createOrUpdatePackage({
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'add')
        if (packageDetails.isTaxable) {
            unitTax = Number((packageDetails.price * location.tax / 100).toFixed(2))
            totalTax = Number((addedAgreementPackage.quantity * packageDetails.price * location.tax / 100).toFixed(2))
            
        }
        console.log(addedAgreementPackage)
        let agreementItemPrice = await models.AgreementItemPrice.findOne({
            where: {
                id: addedAgreementPackage.agreementItemPriceId
            }
        })
        agreementItemPrice = agreementItemPrice.toJSON()
        addedAgreementPackage.should.have.property('id')
        addedAgreementPackage.should.have.property('quantity').and.to.equal(1)
        addedAgreementPackage.should.have.property('packageId').and.to.equal(packageDetails.id)
        agreementItemPrice.should.have.property('unitTax').and.to.equal(unitTax)
        agreementItemPrice.should.have.property('totalTax').and.to.equal(totalTax)
    })
})

describe('services', () => {
    let service, addedServiceAgreementItem
    before(async () => {
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

        const person = { ...personSchema() }
        const createdPerson = await PersonController.createOrUpdate(person, {}, {})
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
        agreementItemController = new AgreementItemController(agreementId)
    })
    
    it('should add the service and make the quantity 1', async () => {
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('id')
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedServiceAgreementItem.should.have.property('locationItemId').and.to.equal(service.id)        
    })

    it('should add the service whose quantity is 1 and increment it', async() => {
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('add', {
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('id')
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(2)
        addedServiceAgreementItem.should.have.property('locationItemId').and.to.equal(service.id)        
    })

    it('should list 1 agreementItem that is associated with the agreement', async() => {
        const agreementItemsList = await agreementItemController.getAgreementItems()
        agreementItemsList.length.should.be.equal(1)
        agreementItemsList[0].should.have.property('name')
        agreementItemsList[0].should.have.property('description')
        agreementItemsList[0].should.have.property('itemType').and.to.equal('Services')
    })

    it('should decrement the quantity whose quantity > 1', async() => {
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('id')
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedServiceAgreementItem.should.have.property('locationItemId').and.to.equal(service.id)
    })

    it('should make the quantity 0 when sending `removeAll: true` whose quantity > 1', async() => {
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(2)
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
            removeAll: true,
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(0)
    })

    it('should throw error while removing the service whose quantity is 0 ', async() => {
        await expect(agreementItemController.createOrUpdate('remove', { 
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })).to.be.rejectedWith(Error, 'LOCATION_ITEM_ALREADY_REMOVED')
    })

    it('should list 0 agreementItem after the service has been removed', async() => {
        const agreementItemsList = await agreementItemController.getAgreementItems()
        agreementItemsList.length.should.be.equal(0)
    })
})

describe('merchandise', () => {
    let merchandise, addedMerchandiseAgreementItem
    before(async () => {
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
        const person = { ...personSchema() }
        const createdPerson = await PersonController.createOrUpdate(person, {}, {})
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
        agreementItemController = new AgreementItemController(agreementId)
    })

    it('should add the merchandise and make the quantity 1', async() => {
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('id')
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedMerchandiseAgreementItem.should.have.property('locationItemId').and.to.equal(merchandise.id)
    })

    it('should add the merchandise whose quantity is 1 and increment it', async() => {
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('id')
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(2)
        addedMerchandiseAgreementItem.should.have.property('locationItemId').and.to.equal(merchandise.id)
    })

    it('should list 1 merchandise that is associated with the agreement', async() => {
        const agreementItemsList = await agreementItemController.getAgreementItems()
        agreementItemsList.length.should.be.equal(1)
        agreementItemsList[0].should.have.property('name')
        agreementItemsList[0].should.have.property('description')
        agreementItemsList[0].should.have.property('itemType').and.to.equal('Merchandises')
    })

    it('should decrement the quantity whose quantity > 1', async() => {
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('remove', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('id')
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedMerchandiseAgreementItem.should.have.property('locationItemId').and.to.equal(merchandise.id)
    })

    it('should make the quantity 0 when sending `removeAll: true` whose quantity > 1', async() => {
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(2)
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('remove', { 
            removeAll: true,
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(0)
    })

    it('should throw error while removing the merchandise whose quantity is 0 ', async() => {
        await expect(agreementItemController.createOrUpdate('remove', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })).to.be.rejectedWith(Error, 'LOCATION_ITEM_ALREADY_REMOVED')
    })

    it('should list 0 agreementItem after the merchandise has been removed', async() => {
        const agreementItemsList = await agreementItemController.getAgreementItems()
        agreementItemsList.length.should.be.equal(0)
    })
})
} catch (err) {
    console.log(err)
}