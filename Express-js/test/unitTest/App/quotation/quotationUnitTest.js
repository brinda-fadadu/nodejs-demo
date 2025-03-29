const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()
const {
    getAgreementRoles
} = require('../../../../controllers/refactorControllers/utils')
const { personSchema, addressSchema } = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const itemController = require('../../../../controllers/refactorControllers/itemController/itemController')

const addAgreementInQuotation = async (quotationId, type) => {
    let agreementSchema = {},
        needTypes,
        types,
        personId
    needTypes = AgreementController.NEED_TYPES
    types = AgreementController.TYPES
    agreementSchema = {
        locationId: 2,
        type: type,
        needType: needTypes['PN'],
        apiType: 'quotation'
    }
    agreementSchema.persons = []
    await AgreementController.createOrEditAgreement(
        personId,
        agreementSchema,
        1,
        quotationId
    )
    let quotation = await new QuotationController(quotationId).getQuotation()
    return quotation
}

const addPersonInQuotation = async (quotationId) => {
    return await new QuotationController(quotationId).addPerson({...personSchema(), isAlive: true})
}
describe('Quotation Controller', () => {
    describe('Get list of Quotation', async () => {
        it('should successfully list the quotations', async () => {
            let result = await QuotationController.listOfQuotations({
                limit: 10,
                page: 1
            })
            result.should.have.property('rows').and.to.be.an('array')
            result.should.have.property('count').and.to.be.an('number')
        })
    })

    describe('create Quotation', async () => {
        it('should create quotation successfully', async () => {
            let record = await QuotationController.upsertQuotation({
                userId: 1
            })
            record.should.have.property('dataValues').and.to.be.an('object')
            record.dataValues.should.have.property('id').and.to.be.an('number')
            record.dataValues.should.have.property('createdBy').and.to.be.an('number')
            record.dataValues.should.have.property('createdBy').and.to.be.an('number')
            record.dataValues.should.have.property('quotationNumber').and.to.be.an('string')
            record.dataValues.should.have.property('convertedToCase').and.to.be.equal(false)
        })
    })

    describe('update Quotation', async () => {
        let id, funeralAgreementId
        let types = AgreementController.TYPES
        before(async () => {
            let result = await QuotationController.upsertQuotation({
                userId: 1
            })
            id = result.dataValues.id
        })

        it('should return an error saying Agreement not found', async () => {
            try {
                await QuotationController.upsertQuotation({
                    cemeteryAgreementId: faker.random.number({
                        min: 100
                    }, id)
                })
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('AGREEMENT_NOT_FOUND')
            }
        })

        it('should return an error saying Agreement not found', async () => {
            try {
                await QuotationController.upsertQuotation({
                    funeralAgreementId: faker.random.number({
                        min: 100
                    }, id)
                })
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('AGREEMENT_NOT_FOUND')
            }
        })

        it('should add cemetry agreement in quotation successfully', async () => {
            let record = await addAgreementInQuotation(id, types['Cemetry'])
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('quotationNumber').and.to.be.an('string')
            record.should.have.property('convertedToCase').and.to.be.equal(false)
            record.should.have.property('cemeteryAgreementId').and.to.be.an('number')
        })

        it('should add funeral agreement in quotation successfully', async () => {
            let record = await addAgreementInQuotation(id, types['Funeral'])
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('quotationNumber').and.to.be.an('string')
            record.should.have.property('convertedToCase').and.to.be.equal(false)
            record.should.have.property('funeralAgreementId').and.to.be.an('number')
            funeralAgreementId = record.funeralAgreementId
        })

        it('should add person details in quotation', async () => {
            let record = await addPersonInQuotation(id)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('quotationNumber').and.to.be.an('string')
            record.should.have.property('convertedToCase').and.to.be.equal(false)
            record.should.have.property('funeralAgreementId').and.to.be.an('number')
            record.should.have.property('personId').and.to.be.an('number')
        })

        it('should convert quoation into case', async () => {
            await new QuotationController(id).covertToCase(1)
        })

        it('should return an error saying quotation not found', async () => {
            try {
                await new QuotationController(faker.random.number({
                    min: 1000
                })).covertToCase(1)
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('QUOTATION_NOT_FOUND')
            }
        })
    })

    describe('find Quotation details using id', async () => {
        let id
        before(async () => {
            let result = await QuotationController.upsertQuotation({
                userId: 1
            })
            id = result.dataValues.id
        })
        it('should get quotation details successfully', async () => {
            let quotationController = new QuotationController(id)
            let quotation = await quotationController.getQuotation(1)
            quotation.should.have.property('id').and.to.be.an('number')
            quotation.should.have.property('createdBy').and.to.be.an('number')
        })
    })

    describe('delete Quotation', async () => {
        let id
        before(async () => {
            let result = await QuotationController.upsertQuotation({
                userId: 1
            })
            id = result.dataValues.id
        })
        it('should delete quotation successfully', async () => {
            let quotationController = new QuotationController(id)
            await quotationController.deleteQuotation(1)
        })
    })

    describe('upsert person details for cases', async () => {
        it('should return an error saying person not found', async () => {
            try {
                await QuotationController.upsertCasePerson({
                    id: faker.random.number({
                        min: 10000
                    })
    
                })
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
            }
        })
    
        it('should create person details successfully', async () => {
            let personDetails = {
                ...personSchema(),
                userId: 1,
                createdAtApp: true
            }
            personDetails.addressPlace = {
                address: addressSchema()
            }
            let personData = await QuotationController.upsertCasePerson(personDetails)
            personData.should.have.property('id').and.to.be.an('number')
            personData.should.have.property('aka').and.to.be.an('string').and.to.be.equal(personDetails.aka)
            personData.should.have.property('firstName').and.to.be.an('string').and.to.be.equal(personDetails.firstName)
            personData.should.have.property('lastName').and.to.be.an('string').and.to.be.equal(personDetails.lastName)
            personData.should.have.property('maidenName').and.to.be.an('string').and.to.be.equal(personDetails.maidenName)
            personData.should.have.property('phoneNumber').and.to.be.an('string').and.to.be.equal(personDetails.phoneNumber)
            personData.should.have.property('email').and.to.be.an('string').and.to.be.equal(personDetails.email)
            personData.should.have.property('createdAtApp').and.to.be.an('boolean').and.to.be.equal(true)
            personData.should.have.property('personVerificationDetails').and.to.be.an('object')
            personData.should.have.property('addressPlace').and.to.be.an('object')
        })
    
        it('should update person details successfully', async () => {
            let personDetails = {
                ...personSchema(),
                userId: 1,
                createdAtApp: true
            }
            personDetails.addressPlace = {
                address: addressSchema()
            }
            let person = await QuotationController.upsertCasePerson(personDetails)
            person = {
                ...person.toJSON(),
                ...personSchema()
            }
            delete person.isVerified
            person.userId = 1
            let personData = await QuotationController.upsertCasePerson(person)
            personData.should.have.property('id').and.to.be.an('number')
            personData.should.have.property('aka').and.to.be.an('string').and.to.be.equal(person.aka)
            personData.should.have.property('firstName').and.to.be.an('string').and.to.be.equal(person.firstName)
            personData.should.have.property('lastName').and.to.be.an('string').and.to.be.equal(person.lastName)
            personData.should.have.property('maidenName').and.to.be.an('string').and.to.be.equal(person.maidenName)
            personData.should.have.property('phoneNumber').and.to.be.an('string').and.to.be.equal(person.phoneNumber)
            personData.should.have.property('email').and.to.be.an('string').and.to.be.equal(person.email)
            personData.should.have.property('createdAtApp').and.to.be.an('boolean').and.to.be.equal(true)
            personData.should.have.property('personVerificationDetails').and.to.be.an('object')
            personData.should.have.property('addressPlace').and.to.be.an('object')
        })
    })
})