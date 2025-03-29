const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();
const models = require('../../../../models/index')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const { personSchema } = require('../../schema')
const addPersonInQuotation = async (quotationId) => {
    return await new QuotationController(quotationId).addPerson({...personSchema(), isAlive: true})
}

describe('share quotation which contains a funeral agreement handler', async () => {
    let quotationId, quotationController, agreementSchema = {
        apiType: 'quotation',
        locationId: 2,
        arrangerId: 13
    }
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        quotationController = new QuotationController(result.id)
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Funeral']
    })

    it('should return an error saying Quotation not found', async () => {
        try {
            await new QuotationController(faker.random.number({
                min: 10000
            })).shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })

    it('should return an error saying agreement details not found for quotaion', async () => {
        try {
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_AGREEMENT_NOT_FOUND')
        }
    })
    
    it('should return an error saying person details not found', async () => {
        try {
            await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ADD_PERSON_IN_QUOTATION')
        }
    })

    it('should return an error saying item not found for quotation', async () => {
        try {
            await addPersonInQuotation(quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
    })

    it('should share quotation successfully', async () => {
        //creating quotation
        let quotation = await QuotationController.upsertQuotation({
            userId: 1
        })
        //creating funeral agreement for quotation
        let agreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotation.id)
        await addPersonInQuotation(quotation.id)
        //fetching item
        const itemTypes = await models.ItemType.findAll({
            where: {
                name: ['Services', 'Merchandises']
            },
            raw: true
        })
        let itemTypesIds = itemTypes.map(itemType => itemType.id)
        let item = await models.LocationItem.findOne({
            where: {
                locationId: agreementSchema.locationId
            },
            include: [{
                model: models.Item,
                include: [{
                    model: models.ItemCategory,
                    where: {
                        itemTypeId: itemTypesIds
                    }
                }],
                required: true
            }],
            raw: true,
            order: [
                ['price', 'DESC']
            ],
            limit: 1
        })
        const agreementItemController = new AgreementItemController(agreement.id)
        await agreementItemController.createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
        let data = {
            "timezone" : "Asia/Calcutta",
            "emailSubject" :"Quote - Feneral",
            "emailMessage" : "Thank you for choosing. We will do everything we can to carry out your wishes promptly. Attached are the necessary documents for your arrangements. Once these documents are completed and returned, we will be able to complete and process your request with any other important documents and move on to the next steps. Most of these documents are required by state law. We believe they are reasonably self-explanatory, but if you have any questions, please reach out to us for help. We will let you know when we receive the completed documents from you.\n Thank you;\n ",
            "brandId" :  7
        }
        await new QuotationController(quotation.id).shareQuotation(data, {id:1})
        let formData = await models.CaseInfoForm.findOne({
            where: {
                quotationId: quotation.id
            }
        })
        formData.should.have.property('id').and.to.be.an('number')
        formData.should.have.property('personId').and.to.be.an('number')
        formData.should.have.property('agreementId').and.to.be.an('number').and.to.be.equal(agreement.id)
        formData.should.have.property('quotationId').and.to.be.an('number').and.to.be.equal(quotation.id)
    })
})

describe('share quotation which contains a cemetery agreement handler', async () => {
    let quotationId, quotationController, agreementSchema = {
        apiType: 'quotation',
        locationId: 2,
        arrangerId: 13
    }
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        quotationController = new QuotationController(result.id)
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Cemetry']
    })

    it('should return an error saying Quotation not found', async () => {
        try {
            await new QuotationController(faker.random.number({
                min: 10000
            })).shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })

    it('should return an error saying agreement details not found for quotaion', async () => {
        try {
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_AGREEMENT_NOT_FOUND')
        }
    })
    
    it('should return an error saying person details not found', async () => {
        try {
            await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ADD_PERSON_IN_QUOTATION')
        }
    })

    it('should return an error saying item not found for quotation', async () => {
        try {
            await addPersonInQuotation(quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
    })

    it('should share quotation successfully', async () => {
        //creating quotation
        let quotation = await QuotationController.upsertQuotation({
            userId: 1
        })
        //creating cemetery agreement for quotation
        let agreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotation.id)
        await addPersonInQuotation(quotation.id)
        //fetching item
        const itemTypes = await models.ItemType.findAll({
            where: {
                name: ['Services', 'Merchandises']
            },
            raw: true
        })
        let itemTypesIds = itemTypes.map(itemType => itemType.id)
        let item = await models.LocationItem.findOne({
            where: {
                locationId: agreementSchema.locationId
            },
            include: [{
                model: models.Item,
                include: [{
                    model: models.ItemCategory,
                    where: {
                        itemTypeId: itemTypesIds
                    }
                }],
                required: true
            }],
            raw: true,
            order: [
                ['price', 'DESC']
            ],
            limit: 1
        })
        const agreementItemController = new AgreementItemController(agreement.id)
        await agreementItemController.createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
        let data = {
            "timezone" : "Asia/Calcutta",
            "emailSubject" :"Quote - Cemetery",
            "emailMessage" : "Thank you for choosing. We will do everything we can to carry out your wishes promptly. Attached are the necessary documents for your arrangements. Once these documents are completed and returned, we will be able to complete and process your request with any other important documents and move on to the next steps. Most of these documents are required by state law. We believe they are reasonably self-explanatory, but if you have any questions, please reach out to us for help. We will let you know when we receive the completed documents from you.\n Thank you;\n",
            "brandId" :  7
        }
        await new QuotationController(quotation.id).shareQuotation(data, {id:1})  
        let formData = await models.CaseInfoForm.findOne({
            where: {
                quotationId: quotation.id
            }
        })
        formData.should.have.property('id').and.to.be.an('number')
        formData.should.have.property('personId').and.to.be.an('number')
        formData.should.have.property('agreementId').and.to.be.an('number').and.to.be.equal(agreement.id)
        formData.should.have.property('quotationId').and.to.be.an('number').and.to.be.equal(quotation.id)
    })
})

describe('share quotation which contains both agreement handler', async () => {
    let quotationId, quotationController, agreementSchema = {
        apiType: 'quotation',
        locationId: 2,
        arrangerId: 13
    }
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        quotationController = new QuotationController(result.id)
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Funeral']
    })

    it('should return an error saying Quotation not found', async () => {
        try {
            await new QuotationController(faker.random.number({
                min: 10000
            })).shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })

    it('should return an error saying agreement details not found for quotaion', async () => {
        try {
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_AGREEMENT_NOT_FOUND')
        }
    })
    
    it('should return an error saying person details not found', async () => {
        try {
            await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ADD_PERSON_IN_QUOTATION')
        }
    })

    it('should return an error saying item not found for quotation', async () => {
        try {
            await addPersonInQuotation(quotationId)
            await quotationController.shareQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
    })

    it('should share quotation successfully', async () => {
        //creating quotation
        let quotation = await QuotationController.upsertQuotation({
            userId: 1
        })
        //creating funeral agreement for quotation
        let funeralAgreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotation.id)
         //creating cemetery agreement for quotation
         agreementSchema.type = types['Cemetry']
         let cemeteryAgreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotation.id)
        await addPersonInQuotation(quotation.id)
        //fetching item
        const itemTypes = await models.ItemType.findAll({
            where: {
                name: ['Services', 'Merchandises']
            },
            raw: true
        })
        let itemTypesIds = itemTypes.map(itemType => itemType.id)
        let item = await models.LocationItem.findOne({
            where: {
                locationId: agreementSchema.locationId
            },
            include: [{
                model: models.Item,
                include: [{
                    model: models.ItemCategory,
                    where: {
                        itemTypeId: itemTypesIds
                    }
                }],
                required: true
            }],
            raw: true,
            order: [
                ['price', 'DESC']
            ],
            limit: 1
        })
        await new AgreementItemController(funeralAgreement.id).createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
        await new AgreementItemController(cemeteryAgreement.id).createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
        let data = {
            "timezone" : "Asia/Calcutta",
            "emailSubject" :"Quote - Feneral",
            "emailMessage" : "Thank you for choosing. We will do everything we can to carry out your wishes promptly. Attached are the necessary documents for your arrangements. Once these documents are completed and returned, we will be able to complete and process your request with any other important documents and move on to the next steps. Most of these documents are required by state law. We believe they are reasonably self-explanatory, but if you have any questions, please reach out to us for help. We will let you know when we receive the completed documents from you.\n Thank you;\n",
            "brandId" :  7
        }
        await new QuotationController(quotation.id).shareQuotation(data, {id:1})
        let formData = await models.CaseInfoForm.findOne({
            where: {
                quotationId: quotation.id
            }
        })
        formData.should.have.property('id').and.to.be.an('number')
        formData.should.have.property('personId').and.to.be.an('number')
        formData.should.have.property('quotationId').and.to.be.an('number').and.to.be.equal(quotation.id)
    })
})

describe('preview quotation handler', async () => {
    let quotationId, quotationController, agreementSchema = {
        apiType: 'quotation',
        locationId: 2,
        arrangerId: 13
    }
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
        quotationController = new QuotationController(result.id)
        agreementSchema.needType = needTypes['PN']
        agreementSchema.type = types['Funeral']
    })

    it('should return an error saying Quotation not found', async () => {
        try {
            await new QuotationController(faker.random.number({
                min: 10000
            })).previewQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })

    it('should return an error saying agreement details not found for quotaion', async () => {
        try {
            await quotationController.previewQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('QUOTATION_AGREEMENT_NOT_FOUND')
        }
    })
    
    it('should return an error saying person details not found', async () => {
        try {
            await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
            await quotationController.previewQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ADD_PERSON_IN_QUOTATION')
        }
    })

    it('should return an error saying item not found for quotation', async () => {
        try {
            await addPersonInQuotation(quotationId)
            await quotationController.previewQuotation()
        } catch (err) {
            err.should.have.property('message').and.to.be.equal('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
    })

    it('should share quotation successfully', async () => {
        //creating quotation
        let quotation = await QuotationController.upsertQuotation({
            userId: 1
        })
        //creating funeral agreement for quotation
        let agreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotation.id)
        await addPersonInQuotation(quotation.id)
        //fetching item
        const itemTypes = await models.ItemType.findAll({
            where: {
                name: ['Services', 'Merchandises']
            },
            raw: true
        })
        let itemTypesIds = itemTypes.map(itemType => itemType.id)
        let item = await models.LocationItem.findOne({
            where: {
                locationId: agreementSchema.locationId
            },
            include: [{
                model: models.Item,
                include: [{
                    model: models.ItemCategory,
                    where: {
                        itemTypeId: itemTypesIds
                    }
                }],
                required: true
            }],
            raw: true,
            order: [
                ['price', 'DESC']
            ],
            limit: 1
        })
        const agreementItemController = new AgreementItemController(agreement.id)
        await agreementItemController.createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
        let data = {
            "timezone" : "Asia/Calcutta",
            "emailSubject" :"Quote - Feneral",
            "emailMessage" : "Thank you for choosing. We will do everything we can to carry out your wishes promptly. Attached are the necessary documents for your arrangements. Once these documents are completed and returned, we will be able to complete and process your request with any other important documents and move on to the next steps. Most of these documents are required by state law. We believe they are reasonably self-explanatory, but if you have any questions, please reach out to us for help. We will let you know when we receive the completed documents from you.\n Thank you;\n ",
            "brandId" :  7
        }
        let result = await new QuotationController(quotation.id).previewQuotation(data, {id:1})
        result.should.have.property('id').and.to.be.an('number')
        result.should.have.property('status').and.to.be.an('string').and.to.be.equal('preview')
        result.should.have.property('agreementId').and.to.be.an('number').and.to.be.equal(agreement.id)
        result.should.have.property('envelopeId').and.to.be.an('string')
        result.should.have.property('previewURL').and.to.be.an('string')
        result.recipients.should.be.an('array')
    })
})