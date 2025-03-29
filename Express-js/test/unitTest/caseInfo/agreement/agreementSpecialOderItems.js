const chai = require('chai')
const faker = require('faker')
const { personSchema, agreementSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const CategoryController = require('../../../../controllers/refactorControllers/itemController/categoryController')
const AgreementSpecialOrderController = require('../../../../controllers/refactorControllers/agreementController/agreementSpecialOrderRequestController')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

let agreementId, attributes, vendors, casket, specialOrderRequest, specialOrderRequestId, itemCategories

describe('Sepcial Order requests', async () => {
    let  saleTypeIds, specialOrderRequestPayload
    before(async () => {
        const merchandise = await models.ItemType.findOne({ where: {name: 'Merchandises'}},{})
        itemCategories = await models.ItemCategory.findAll({ where: { itemTypeId: merchandise.id}})
        itemCategories = JSON.parse(JSON.stringify(itemCategories))
        casket = itemCategories.find(ele => {            
            return ele.name == 'Casket'
        })        
        attributes = await CategoryController.getCategoryAttributes(casket.id)
        attributes = JSON.parse(JSON.stringify(attributes))
        vendors = await models.Vendor.findAll({})
        vendors = JSON.parse(JSON.stringify(vendors))
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
            saleTypeId: faker.random.arrayElement(saleTypeIds),            
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        specialOrderRequestPayload = {
            description: faker.commerce.productAdjective(),
            code: faker.commerce.product(),
            quantity: 1,
            itemCategoryId: casket.id,
            attributes: {
                [attributes[0].id]: attributes[0].attributeValues[0].name,
                [attributes[1].id]: attributes[1].attributeValues[0].name
            },
            vendor: vendors[0]
        }
        await models.ItemRequest.destroy({where: {}})
    })

    it('Returns error when sending invalid item category Id', async () => {
        specialOrderRequestPayload.itemCategoryId = faker.random.number()
        await expect(AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload))
            .to.be.rejectedWith(Error, 'INVALID_CATEGORY_ATTRIBUTES')
        specialOrderRequestPayload.itemCategoryId = casket.id
    })

    it('Returns error while sending invalid agreementId', async () => {
        await expect(AgreementSpecialOrderController.addSpecialOrderRequest(faker.random.number(), specialOrderRequestPayload))
        .to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')

    })

    it('Returns error while sending invalid attributes', async () => {
        let temporaryValue = faker.random.number()+'11'
        specialOrderRequestPayload.attributes[temporaryValue] = 'Green'
        await expect(AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload))
        .to.be.rejectedWith(Error, 'INVALID_CATEGORY_ATTRIBUTES')
        delete specialOrderRequestPayload.attributes[temporaryValue]
    })

    it('Return error while sending invalid vendor', async () => {
        specialOrderRequestPayload.vendor = {
            id: faker.random.number()+'1234'
        }
        await expect(AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload))
        .to.be.rejectedWith(Error, 'VENDOR_NOT_FOUND')
        specialOrderRequestPayload.vendor = vendors[0]
    })

    it('Create a special order request item', async () => {        
        const result =  await AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload)
        result.should.have.property('id')
        result.should.have.property('status').and.to.equal('Validation Pending')
        result.should.have.property('quantity').and.to.equal(specialOrderRequestPayload.quantity)
        result.should.have.property('attributes')
        result.should.have.property('vendor')
        result.should.have.property('itemCategoryId').and.to.equal(specialOrderRequestPayload.itemCategoryId)
    })

    it('Create a special order with new vendor', async () => {
        specialOrderRequestPayload.attributes = {
            [attributes[0].id]: attributes[0].attributeValues[0].name,
            [attributes[1].id]: attributes[1].attributeValues[0].name
        }
        specialOrderRequestPayload.vendor = vendors[0]
        delete specialOrderRequestPayload.vendor.id

        const result =  await AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload)
        result.should.have.property('id')
        result.should.have.property('status').and.to.equal('Validation Pending')
        result.should.have.property('quantity').and.to.equal(specialOrderRequestPayload.quantity)
        result.should.have.property('attributes')
        result.should.have.property('vendor')
        result.should.have.property('itemCategoryId').and.to.equal(specialOrderRequestPayload.itemCategoryId)
        specialOrderRequestPayload.vendor.id = vendors[0].id
        specialOrderRequestId = result.id
    })

    it('Create a special order with new attribute value', async () => {
        specialOrderRequestPayload.attributes = {
            [attributes[0].id]: attributes[0].attributeValues[0].name,
            [attributes[1].id]: attributes[1].attributeValues[0].name
        }
        specialOrderRequestPayload.vendor = vendors[0]
        delete specialOrderRequestPayload.vendor.id
        const result =  await AgreementSpecialOrderController.addSpecialOrderRequest(agreementId, specialOrderRequestPayload)
        result.should.have.property('id')
        result.should.have.property('status').and.to.equal('Validation Pending')
        result.should.have.property('quantity').and.to.equal(specialOrderRequestPayload.quantity)
        result.should.have.property('attributes')
        result.should.have.property('vendor')
        result.should.have.property('itemCategoryId').and.to.equal(specialOrderRequestPayload.itemCategoryId)
        specialOrderRequestPayload.vendor.id = vendors[0].id
        specialOrderRequest = result
    })
    
    /**
     * Unit test cases for special order item get
     */
    it('Returns error when snding random special order reqeset id', async () => {
        expect(AgreementSpecialOrderController.getSpecialOrderRequestById(faker.random.number())).to.be.be.rejectedWith('SPECIAL_ORDER_REQUEST_NOT_FOUND')
    })

    it('Returns special order item by id', async () => {
        const result = await AgreementSpecialOrderController.getSpecialOrderRequestById(agreementId, specialOrderRequestId)
        result.should.have.property('id')
        result.should.have.property('description')
        result.should.have.property('attributes').and.to.be.a('string')
        result.should.have.property('vendor').and.to.be.a('string')
        result.should.have.property('quantity').and.to.equal(specialOrderRequest.quantity)
    })

    /**
     * Unit test cases for special order item listing
     */

     it('Returns list of special order requests by agreementId', async () => {
        const payload = {}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(3)
     })
     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:1}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(2)
     })
     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:0, limit:1}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(1)
     })
     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:0, limit:10}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(3)
     })
     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:0, limit:10, itemCategoryId:itemCategories[3].id}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(0)
     })
     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:0, limit:10, searchTerm: specialOrderRequest.name}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(3)
     })

     it('Returns list of special order requests by agreementId', async () => {
        const payload = {offset:0, limit:10, searchTerm: specialOrderRequest.name}
         const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId, payload)
         result.specialOrderItems.length.should.be.equal(3)
     })
     
     it('Remove a special order item', async () => {
         const payload = {
             specialOrderRequestId: specialOrderRequest.id
         }
        await AgreementSpecialOrderController.removeSpecialOrderRequests(agreementId, payload)
        await expect(AgreementSpecialOrderController.getSpecialOrderRequestById(agreementId, specialOrderRequest.id)).to.be.rejectedWith('SPECIAL_ORDER_REQUEST_NOT_FOUND')
     })

     it('Returns list of special order requests by agreementId', async () => {
         payload = {}
        const result = await AgreementSpecialOrderController.getSpecialOrderRequests(agreementId)
        result.specialOrderItems.length.should.be.equal(2)
    })

    /**
     * Updating latest special order request test cases
     */

    it('Return error when sending invalid specialOrderRequestId', async () => {
        specialOrderRequestPayload.id = faker.random.number()
        specialOrderRequestPayload.attributes = JSON.parse(specialOrderRequestPayload.attributes)
        specialOrderRequestPayload.vendor = JSON.parse(specialOrderRequestPayload.vendor)
        await expect(AgreementSpecialOrderController.updateSpecialOrderRequests(agreementId, specialOrderRequestPayload)).to.be.rejectedWith('Record not found')
    })
    
    it('Updates the special order request description', async () => {
        specialOrderRequestPayload.id = specialOrderRequestId
        specialOrderRequestPayload.description = faker.commerce.productAdjective()
        specialOrderRequestPayload.attributes = JSON.parse(specialOrderRequestPayload.attributes)
        specialOrderRequestPayload.vendor = JSON.parse(specialOrderRequestPayload.vendor)
        const result = await AgreementSpecialOrderController.updateSpecialOrderRequests(agreementId, specialOrderRequestPayload)
        result.should.have.property('description').and.to.equal(specialOrderRequestPayload.description)
        result.should.have.property('quantity')
    })
    
    it('Updates the quantity of special order request', async () => {
        specialOrderRequestPayload.quantity += 2
        specialOrderRequestPayload.attributes = JSON.parse(specialOrderRequestPayload.attributes)
        specialOrderRequestPayload.vendor = JSON.parse(specialOrderRequestPayload.vendor)
        const result = await AgreementSpecialOrderController.updateSpecialOrderRequests(agreementId, specialOrderRequestPayload)
        result.should.have.property('description')
        result.should.have.property('quantity').and.to.equal(specialOrderRequestPayload.quantity)        
    })

    it('Updates the attributes information of special order request', async () => {
        specialOrderRequestPayload.attributes = {
            [attributes[0].id]: attributes[0].attributeValues[0].name,
            [attributes[1].id]: 'New Value'
        }
        specialOrderRequestPayload.vendor = JSON.parse(specialOrderRequestPayload.vendor)
        const result = await AgreementSpecialOrderController.updateSpecialOrderRequests(agreementId, specialOrderRequestPayload)
        result.should.have.property('description')
        result.should.have.property('quantity')
        result.should.have.property('attributes').and.to.equal(specialOrderRequestPayload.attributes)
    })

    it('Updates the vendor information in the special order request', async () => {
        specialOrderRequestPayload.attributes = JSON.parse(specialOrderRequestPayload.attributes)
        specialOrderRequestPayload.vendor = vendors[2]
        const result = await AgreementSpecialOrderController.updateSpecialOrderRequests(agreementId, specialOrderRequestPayload)
        result.should.have.property('description')
        result.should.have.property('quantity')
        result.should.have.property('attributes')
        result.should.have.property('vendor').and.to.equal(specialOrderRequestPayload.vendor)
    })

    /**
     *  Test cases about sending the email to Purchase order validation
     */
    it('Send validation request to the purchase order department', async () => {
        const payload = {
            specialOrderRequestId
        }
        const result = await AgreementSpecialOrderController.sendApprovalRequest(agreementId, payload)
        result.should.have.property('status').and.to.equal('Validation Pending')
    })

    /**
     *  Test cases about about approving special order requests
     */
    it('Approve special order requests for Arrangers', async () => {
        const payload = {
            specialOrderRequestId,
            role:'Arrangers'
        }
        const result = await AgreementSpecialOrderController.approveSpecialOrderRequests(agreementId, payload)
        result.should.have.property('status').and.to.equal('Approved')
    })

    it('Unauthorized Role for Special Order request Approval', async () => {
        const payload = {
            specialOrderRequestId: specialOrderRequest.id,
            userRole: "VP of Sales"
        }
       await AgreementSpecialOrderController.approveSpecialOrderRequests(agreementId, payload)
       await expect(AgreementSpecialOrderController.approveSpecialOrderRequests(agreementId, specialOrderRequest.id)).to.be.rejectedWith('UNAUTHORIZED')
    })
})