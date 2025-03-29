const faker = require('faker')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const returnAgreementDetails =  (agreementId) => {
    const agreementController = new AgreementController(agreementId)
    return agreementController.getAgreementDetails()
}


describe('Funeral Agreement test cases', () => {
    let personId, quotationId, agreementSchema = {apiType : 'quotation'}, saleTypeIds, agreementDetails, types, needTypes

    before (async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
    })

    it('should throw an error saying invalid quotation id', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, faker.random.number({
                min: 1000
            }))
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })

    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }
    })

    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })

    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Funeral'],
            agreementSchema.needType = faker.random.number()
            const verifiedPersonController = new VerifiedPersonController(personId)
            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, 2)
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })


    it('should throw an error saying invalid SaleTypeId', async () => {
        try {
            agreementSchema.needType = needTypes['PN']
            agreementSchema.saleTypeId = faker.random.number()
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_SALE_TYPE_ID')
        }
    })

    it('should create agreement without person details', async () => {
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('type').and.to.be.equal(types['Funeral'])
        agreementDetails.should.have.property('needType').and.to.be.equal(needTypes['PN'])
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('status').and.to.be.equal('In progress')
    })

    it('should throw an error saying funeral agreement already added in the quotation', async () => {
        try {
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('DUPLICATE_FUNERAL_AGREEMENT_FOR_QUOTATION')
        }
    })

    it('should fetch details of the agreement added', async () => {
        const agreementData = await returnAgreementDetails(agreementDetails.id)
        agreementData.should.have.property('type').and.to.be.equal(types['Funeral'])
        agreementData.should.have.property('needType').and.to.be.equal(needTypes['PN'])
        agreementData.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementData.should.have.property('status').and.to.be.equal('In progress')
        agreementData.should.have.property('beneficiary').and.to.be.an('array')
        agreementData.should.have.property('coPurchasers').and.to.be.an('array')
    })
})

describe('Cemetry Agreement test cases', () => {
    let personId, agreementSchema = {apiType : 'quotation'}, saleTypeIds, agreementDetails, types, needTypes
    before (async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        quotationId = result.id
    })
    it('should throw an error saying invalid quotation id', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, faker.random.number({
                min: 1000
            }))
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
        }
    })
    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }
    })
    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })
    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Cemetry'],
            agreementSchema.needType = faker.random.number()
            const verifiedPersonController = new VerifiedPersonController(personId)
            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, 2)
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })
    it('should throw an error saying invalid SaleTypeId', async () => {
        try {
            agreementSchema.needType = needTypes['PN']
            agreementSchema.saleTypeId = faker.random.number()
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_SALE_TYPE_ID')
        }
    })
    it('should create agreement without person details', async () => {
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('type').and.to.be.equal(types['Cemetry'])
        agreementDetails.should.have.property('needType').and.to.be.equal(needTypes['PN'])
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('status').and.to.be.equal('In progress')
    })

    it('should throw an error saying cemetry agreement already added in the quotation', async () => {
        try {
            await AgreementController.createOrEditAgreement(personId, agreementSchema, 1, quotationId)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('DUPLICATE_CEMETERY_AGREEMENT_FOR_QUOTATION')
        }
    })

    it('should fetch details of the agreement added', async () => {
        const agreementData = await returnAgreementDetails(agreementDetails.id)
        agreementData.should.have.property('type').and.to.be.equal(types['Cemetry'])
        agreementData.should.have.property('needType').and.to.be.equal(needTypes['PN'])
        agreementData.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementData.should.have.property('status').and.to.be.equal('In progress')
        agreementData.should.have.property('beneficiary').and.to.be.an('array')
        agreementData.should.have.property('coPurchasers').and.to.be.an('array')
    })
})