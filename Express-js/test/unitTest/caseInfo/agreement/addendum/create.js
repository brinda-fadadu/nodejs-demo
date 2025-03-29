const chai = require('chai')
const faker = require('faker')
const chaiAsPromised = require('chai-as-promised')
const { personSchema, agreementSchema, addressSchema } = require('../../../schema')
const VerifiedPersonController = require('../../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../../controllers/refactorControllers/agreementController/addendum')
const AgreementItemController = require('../../../../../controllers/refactorControllers/agreementController/agreementItemController')
const AgreementPackageController = require('../../../../../controllers/refactorControllers/agreementController/agreementPackageController')
const FormsController = require('../../../../../controllers/refactorControllers/formsController/formsController')
const models = require('../../../../../models')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();

let agreementId, addendumId, packageDetails

describe('addendum creation', () => {
    before(async () => {
        packageDetails = await models.Package.findOne({ where: { isActive: true } })
        location = await models.Location.findOne({
            id: packageDetails.locationId
        })
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
        const createdPerson = await PersonController.createOrUpdate({ ...personSchema() }, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 1: 2 )
        const saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
    })

    it('should throw error when there is random agreementId', async () => {
        const addendumController = new AddendumController(faker.random.number({ min: 1000 }))
        await expect( addendumController.createAddendum()).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })
    it('should add the service and make the quantity 1', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('add', {
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItem.should.have.property('id')
        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedServiceAgreementItem.should.have.property('locationItemId').and.to.equal(service.id)
    })

    it('should add the merchandise and make the quantity 1', async() => {
        const agreementItemController = new AgreementItemController(agreementId)
        addedMerchandiseAgreementItem = await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        })
        addedMerchandiseAgreementItem.should.have.property('id')
        addedMerchandiseAgreementItem.should.have.property('quantity').and.to.equal(1)
        addedMerchandiseAgreementItem.should.have.property('locationItemId').and.to.equal(merchandise.id)
    })

    it('should add a package in agreement and make quantity 1', async () => {
        const agreementPackageController = new AgreementPackageController(agreementId)
        addedAgreementPackage = await agreementPackageController.createOrUpdatePackage( { 
            itemType: 'package',
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }, 'add')        
        addedAgreementPackage.should.have.property('id')
        addedAgreementPackage.should.have.property('quantity').and.to.equal(1)
        addedAgreementPackage.should.have.property('packageId').and.to.equal(packageDetails.id)
    })
    it('should throw error when agreement is in progress status', async () => {
        const addendumController = new AddendumController(agreementId)
        await expect( addendumController.createAddendum()).to.be.rejectedWith(Error, 'AGREEMENT_IS_NOT_COMPLETED')
    })

    it('Should make the agreement as completed', async () => {
        const agreementController = new AgreementController(agreementId)
        const result = await agreementController.markAgreementComplete()
        result.should.to.have.ordered.members([1])
    })

    it('Should throw error while adding a merchandise item before creating an addendum and after complete the agreement', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        const payload = {            
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        }
        await expect(agreementItemController.createOrUpdate('remove', payload)).to.be.rejectedWith(Error, 'AGREEMENT_ALREADY_COMPLETED')
        
    })

    it('Should throw an error when trying to add a package before creating addendum and after completed the Agreement', async () => {
        const agreementPackageController = new AgreementPackageController(agreementId)
        const payload = {            
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }
        await expect(agreementPackageController.createOrUpdatePackage(payload, 'add')).to.be.rejectedWith(Error, 'AGREEMENT_ALREADY_COMPLETED')
    })

    
    it('should create addendum successfully', async () => {
        const addendumController = new AddendumController(agreementId)
        const agreementController = new AgreementController(agreementId)
        await agreementController.markAgreementComplete()
        const addendum = await addendumController.createAddendum()
        addendum.should.have.property('id')
        addendum.should.have.property('agreementId').and.equal(agreementId)
        addendumId = addendum.id
    })

   

    it('Should remove the package successfully from the addendum', async () => {
        const agreementPackageController = new AgreementPackageController(agreementId)
        const payload = {
            addendumId: addendumId,
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementPackageController.createOrUpdatePackage(payload, 'remove')
        agreementItem.should.have.property('deletedAt')
    })

    it('Package remove log must be available in the Change log', async () => {
        
    })

    
    it('Should add the package successfully after creating the addendum', async () => {
        const agreementPackageController = new AgreementPackageController(agreementId)
        const payload = {
            addendumId: addendumId, 
            packageId: packageDetails.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementPackageController.createOrUpdatePackage(payload, 'add')
        agreementItem.should.have.property('quantity').and.equal(1)

    })

    it('Package add log must be available in the Change log', async () => {

    })

    it('Should add Service in the addendum', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        const payload = {
            addendumId: addendumId,
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementItemController.createOrUpdate('add', payload)
        agreementItem.should.have.property('quantity').and.equal(1)
    })

    it('Service add log must be available in the Change log', async () => {

    })

    it('Should be able to remove the service from the Agreement in an Addendum', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        const payload = {
            addendumId: addendumId,
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementItemController.createOrUpdate('remove', payload)
        agreementItem.should.have.property('quantity').and.equal(0)
    })

    it('Service remove log should be available in the Change log', async () => {

    })

    it('Should be able to add merchandise item for the agreement in an addendum', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        const payload = {
            addendumId: addendumId,
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementItemController.createOrUpdate('add', payload)
        agreementItem.should.have.property('quantity').and.equal(1)
    })


    it('Should be able to remove the merchandise from the Agreement', async () => {
        const agreementItemController = new AgreementItemController(agreementId)
        const payload = {
            addendumId: addendumId,
            locationItemId: merchandise.id,
            timezone: 'Asia/Calcutta'
        }
        const agreementItem = await agreementItemController.createOrUpdate('remove', payload)
        agreementItem.should.have.property('quantity').and.equal(0)
    })

    it('Merchandise item add and remove logs must be available in the Change Log', async () => {

    })

    it('should throw error if the previous addendum is not completed', async () => {
        const addendumController = new AddendumController(agreementId)
        await expect( addendumController.createAddendum()).to.be.rejectedWith(Error, 'ADDENDUM_IS_NOT_COMPLETED')
    })
    
    it('should get the agreement and all addendum successfully ', async () => {
        const addendumController = new AddendumController(agreementId)
        const addendum = await addendumController.getAllAddendum()
        addendum.agreementDetails.should.have.property('id').and.equal(agreementId)
        addendum.addendumList[0].should.have.property('id').and.equal(addendumId)
    })
})

describe('create case info form for addendum', () => {
    let createdEmployee, createdPersonContact, createdPerson, contactPersonData, createdEmployeeData
    before(async () => {
        const person = { ...personSchema() }
        const place= {
            address: {
                ...addressSchema()
            }
        }
        createdPerson = await PersonController.createOrUpdate(person, place, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)

        // Create ContactPerson
        contactPersonData = {
            personId: createdPerson.id,
            contactType: 1,
            person: { ...personSchema() },
            createdAt: Date.now(),
            relationId: 2,
            resourceType: 'Person'
        }
        createdPersonContact = await verifiedPersonController.addOrUpdateNok(contactPersonData)

        // Create Employee
        createdEmployeeData =  {
            name: 'Alex the Employee',
            salesCounselorId: 12000,
            email: 'pri@gmail.com',
            phoneNumber: '1234567890',
            employeeTypeId: 4
        }
        createdEmployee = await models.Employee.create(createdEmployeeData)
    })

    it('should create a case info form and send to docusign', async () => {
        const reqData = [{
            addendumId: 1,
            formId: 1,
            employees: [{
                id: createdEmployee.id,
                formRecipientRoleId: 1
            }],
            contacts: [{
                id: createdPersonContact.id,
                formRecipientRoleId: 2
            }]
        }]
        
        const personId = createdPerson.id
        const user = { id: 1 }
        res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
        res.should.be.an('array').of.length(1)
        res[0].should.have.property('addendumId')
    })
})
