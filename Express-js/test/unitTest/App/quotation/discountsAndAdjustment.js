const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();
const models = require('../../../../models/index')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')
const { discountSchema, adjustmentSchema } = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AdjustmentsController = require('../../../../controllers/refactorControllers/adjustmentController/discountsAndAdjustmentsHandler')
const adjustmentInstance = new AdjustmentsController()
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController');

const returnAgreementDetails = (agreementId) => {
    const agreementController = new AgreementController(agreementId)
    return agreementController.getAgreementDetails()
}

describe('Adjustments Controller', () => {
    let listOfAdjustments, appliedFCAAdjustmentId, cemeteryAgreementId, types, needTypes
    const startDate = moment().subtract(1, 'days').format('YYYY/MM/DD HH:mm:ss')
    let quotationId, agreementSchema = {
        apiType: 'quotation',
        locationId: 2
    }
    let promocodeInput = {
        description: faker.random.words(),
        code: faker.random.word(),
        agreementType: 2,
        discountUnit: '$',
        maxDiscountValue: 10,
        startDate: startDate,
        title: faker.random.word(),
        endDate: moment(startDate, "YYYY/MM/DD").add('years', 1).format('L'),
        agreementSectionId: [
            1, 2
        ],
        isDisabled: false,
        adjustmentTypeId: 1
    }

    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        agreementSchema.needType = needTypes['PN']
        quotationId = result.id
        agreementSchema.type = types['Cemetry']
        const createdAgreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
        cemeteryAgreementId = createdAgreement.id
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
        const agreementItemController = new AgreementItemController(cemeteryAgreementId)
        await agreementItemController.createOrUpdate('add', {
            locationItemId: item.id,
            timezone: 'Asia/Calcutta',
            userId: 1
        })
    })

    it('get agreement details and should have due amount ', async () => {
        const agreementData = await returnAgreementDetails(cemeteryAgreementId)
        agreementData.should.have.property('type').and.to.be.equal(types['Cemetry'])
        agreementData.should.have.property('needType').and.to.be.equal(needTypes['PN'])
        agreementData.should.have.property('status').and.to.be.equal('In progress')
        agreementData.should.have.property('contractNumber').and.to.be.equal(null)
        agreementData.should.have.property('due').to.be.an('number').to.not.be.equal(0)
    })

    describe('Get list of adjustments', async () => {
        it('Get list of other discounts and adjustments', async () => {
            listOfAdjustments = await AdjustmentsController.getListOfAdjustments({})
            listOfAdjustments.should.be.an('object')
            listOfAdjustments.should.have.property('count')
            listOfAdjustments.should.have.property('rows')
        })
    })

    describe('Create agreement adjustment for other discount and adjustment type adjustments to agreement', async () => {

        it('Apply Customer Service Refund - Prior Year Discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Customer Service Refund - Prior Year'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Customer Service Refund - Prior Year Discount',
                documents: [],
                requesterName: 'Customer Service Refund - Prior Year discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Customer Service Refund - Prior Year Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Customer Service Refund - Prior Year'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Customer Service Refund - Prior Year',
                    documents: [],
                    requesterName: 'Customer Service Refund - Prior Year discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Veteran Discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Veteran Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Veteran Discount',
                documents: [],
                requesterName: 'Veteran DiscountdiscountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Veteran Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Veteran Discount'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Veteran Discount',
                    documents: [],
                    requesterName: 'Veteran Discount discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply AN-split-PN Paid in Full discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'AN-split-PN Paid in Full Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying AN-split-PN Paid in Full Discount',
                documents: [],
                requesterName: 'AN-split-PN Paid in Full Discount discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply AN-split-PN Paid in Full Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'AN-split-PN Paid in Full Discount'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying AN-split-PN Paid in Full Discount',
                    documents: [],
                    requesterName: 'AN-split-PN Paid in Full Discount discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Accommodation - Other discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Other'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Accommodation - Other Discount',
                documents: [],
                requesterName: 'Accommodation - Other Discount discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Accommodation - Other Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Other'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Other Discount',
                    documents: [],
                    requesterName: 'Accommodation - Other discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })
        it('Apply Accommodation - Infant / Children discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Infant / Children'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Accommodation - Infant / Children Discount',
                documents: [],
                requesterName: 'Accommodation - Infant / Children Discount discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Accommodation - Infant / Children Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Infant / Children'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Infant / Children Discount',
                    documents: [],
                    requesterName: 'Accommodation - Infant / Children discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })
        it('Should get error while Apply Accommodation - Infant / Children Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Infant / Children'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Infant / Children Discount',
                    documents: [],
                    requesterName: 'Accommodation - Infant / Children discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Accommodation - Hardship discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Hardship'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Accommodation - Hardship Discount',
                documents: [],
                requesterName: 'Accommodation - Hardship Discount discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Accommodation - Hardship Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Hardship'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Hardship Discount',
                    documents: [],
                    requesterName: 'Accommodation - Hardship Discount discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Accommodation - Document Fee Discount discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Document Fee Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Accommodation - Document Fee Discount',
                documents: [],
                requesterName: 'Accommodation - Document Fee Discount discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Accommodation - Document Fee Discount to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Document Fee Discount'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Document Fee Discount',
                    documents: [],
                    requesterName: 'Accommodation - Document Fee Discount discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Accommodation - Courtesy discount to agreement', async () => {
            const adjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Courtesy'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                description: 'applying Accommodation - Courtesy',
                documents: [],
                requesterName: 'Accommodation - Courtesy discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })
        it('Should get error while Apply Accommodation - Courtesy to agreement for second time', async () => {
            try {
                const adjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Accommodation - Courtesy'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, adjustmentDetails.adjustmentTypeId, adjustmentDetails.id),
                    description: 'applying Accommodation - Courtesy',
                    documents: [],
                    requesterName: 'Accommodation - Courtesy discountTestrequester',
                    apiType: 'quotation'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })
        it('Apply FCA discount to agreement', async () => {
            const fcaAdjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'FCA Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, fcaAdjustmentDetails.adjustmentTypeId, fcaAdjustmentDetails.id),
                description: 'applying fca discount',
                apiType: 'quotation',
                documents: []
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
            appliedFCAAdjustmentId = appliedAdjustment.id
        })

        it('Should get error while Apply FCA discount to agreement for second time', async () => {
            try {
                const fcaAdjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'FCA Discount'
                })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, fcaAdjustmentDetails.adjustmentTypeId, fcaAdjustmentDetails.id),
                    description: 'applying fca discount',
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Employee discount to agreement', async () => {
            const employeeAdjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Employee Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, employeeAdjustmentDetails.adjustmentTypeId, employeeAdjustmentDetails.id),
                description: 'applying fca discount',
                apiType: 'quotation',
                documents: []
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })

        it('Apply Accommodation - Matching discount to agreement', async () => {
            const accMatchingAdjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Accommodation - Matching'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, accMatchingAdjustmentDetails.adjustmentTypeId, accMatchingAdjustmentDetails.id),
                description: 'applying acc matching discount',
                documents: [],
                requesterName: 'Acc matching discountTestrequester',
                apiType: 'quotation'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })

        it('Apply Customer Service Refund - Current Year adjustment to agreement', async () => {
            const cusserviceRefundAdjustmentDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Customer Service Refund - Current Year'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, cusserviceRefundAdjustmentDetails.adjustmentTypeId, cusserviceRefundAdjustmentDetails.id),
                description: 'applying cus service discount',
                documents: ['document3', 'document4'],
                requesterName: 'Customer service refund discountTestrequester',
                apiType: 'quotation',
                documents: []
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })

        it('Apply Paid in Full Discount to cemetery agreement', async () => {
            const paidInFullDetails = listOfAdjustments.rows.find(l => {
                return l.title === 'Paid in Full Discount'
            })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, paidInFullDetails.adjustmentTypeId, paidInFullDetails.id),
                description: 'applying paid in full discount',
                requesterName: 'Paid in Full Discount Test Requester',
                apiType: 'quotation',
                documents: []
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
        })

        it('Should not apply Reinstate Credit Adjustment to funeral agreement', async () => {
            try {
                const reinstateCreditAdjustmentDetails = listOfAdjustments.rows.find(l => {
                    return l.title === 'Reinstate Credit Adjustment'
                })
                const inputData = {
                    ...adjustmentSchema(cemeteryAgreementId, reinstateCreditAdjustmentDetails.adjustmentTypeId, reinstateCreditAdjustmentDetails.id),
                    description: 'applying reinstate credit adjustment',
                    requesterName: 'Reinstate Credit Adjustment Test Requester',
                    apiType: 'quotation',
                    documents: [],
                    requesterRole: 'Accounting'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AGREEMENT_TYPE_NOT_ALLOWED')
            }
        })
    })

    describe('Get list of applied agreement adjustments', async () => {
        it('should return error for agreementId', async () => {
            try {
                await AdjustmentsController.getAgreementAdjustments()
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AGREEMENT_ID_NOT_FOUND')
            }
        })
        it('Get list of applied agreement adjustments of agreement', async () => {
            const appliedAdjustments = await AdjustmentsController.getAgreementAdjustments(cemeteryAgreementId)
            appliedAdjustments.should.be.an('array')
        })
    })

    describe('Remove applied agreement adjustment from agreement', async () => {
        it('Remove applied adjustment form agreement', async () => {
            const appliedAdjustments = await adjustmentInstance.removeAppliedAgreementAdjustment(appliedFCAAdjustmentId, cemeteryAgreementId, 1)
            appliedAdjustments.should.be.an('array').of.length(1)
        })
    })
    describe('Create Adjustment (promocode)', async () => {
        it('Create adjustment with $ discount type and without discount value', async () => {
            const promocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
            promocode.should.be.an('object')
        })

        it('Should return Promocode already exists error', async () => {
            try {
                await adjustmentInstance.createPromocodeAdjustment({
                    currentUser: {
                        id: 1
                    },
                    body: promocodeInput
                })
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('CODE_MUST_BE_UNIQUE')
            }
        })

        it('Create adjustment with $ discount type and with discount value', async () => {
            promocodeInput.code = faker.random.word()
            promocodeInput.discountValue = 20
            const promocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
            promocode.should.be.an('object')
        })

        it('Create adjustment with % discount type and without discount value', async () => {
            promocodeInput.code = faker.hacker.abbreviation() + '' + faker.random.word()
            promocodeInput.discountUnit = '%'
            const promocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
            promocode.should.be.an('object')
        })

        it('Create adjustment with % discount type and with discount value', async () => {
            promocodeInput.code = faker.random.word()
            promocodeInput.discountValue = 20
            promocodeInput.discountUnit = '%'
            const promocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
            promocode.should.be.an('object')
        })
    })

    describe('Get single promocode details', async () => {
        let promocode
        before(async () => {
            promocodeInput.code = faker.random.word()
            promocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
        })

        it('Should return error promocode not found', async () => {
            try {
                await adjustmentInstance.getPromocodeAdjustment(faker.random.number())
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('NOT_FOUND')
            }
        })

        it('Get details of promocode', async () => {
            const getPromo = await adjustmentInstance.getPromocodeAdjustment(promocode.id)
            getPromo.should.be.an('object')
        })
    })

    describe('Update Promocode', async () => {
        let createdPromocode
        before(async () => {
            promocodeInput.code = faker.hacker.abbreviation()
            createdPromocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
        })
        it('Update created promo', async () => {
            createdPromocode.title = faker.random.word()
            const updatePromo = await adjustmentInstance.updatePromocodeAdjustment(createdPromocode)
            updatePromo.should.be.an('object')
            updatePromo.should.have.property('title').and.to.be.equal(createdPromocode.title)
        })
    })

    describe('Delete Promocode', async () => {
        let createdPromocode
        before(async () => {
            promocodeInput.code = faker.random.word()
            createdPromocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: promocodeInput
            })
        })
        it('Should return error as record not found', async () => {
            try {
                await adjustmentInstance.deletePromoAdjustment(faker.random.number(), 1)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('RECORD_NOT_FOUND')
            }
        })
        it('Delete createdPromo', async () => {
            const deletedPromo = await adjustmentInstance.deletePromoAdjustment(createdPromocode.id, 1)
            deletedPromo.should.be.equal(true)
        })
    })

    describe('apply promocode for agreement', async () => {
        let code = faker.random.word()
        it('return error as discount not found', async () => {
            try {
                const inputData = {
                    code: faker.random.words(),
                    adjustmentTypeId: 1,
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('DISCOUNT_NOT_FOUND')
            }
        })

        it('return error as discount is expired', async () => {
            let createdPromocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: {
                    ...promocodeInput,
                    code: faker.random.word(),
                    endDate: moment().subtract('days', 1).format('L')
                }
            })
            try {
                const inputData = {
                    code: createdPromocode.code,
                    adjustmentTypeId: 1,
                    agreementId: cemeteryAgreementId,
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('DISCOUNT_IS_EXPIRED')
                await models.Adjustment.destroy({
                    where: {
                        id: createdPromocode.id
                    }
                })
            }
        })

        it('return error as discount is in-active', async () => {
            let createdPromocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: {
                    ...promocodeInput,
                    code: faker.random.word(),
                    isDisabled: true
                }
            })
            try {
                const inputData = {
                    code: createdPromocode.code,
                    adjustmentTypeId: 1,
                    agreementId: cemeteryAgreementId,
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('DISCOUNT_IS_IN_ACTIVE')
                await models.Adjustment.destroy({
                    where: {
                        id: createdPromocode.id
                    }
                })
            }
        })

        it('return error as discount is not applicable', async () => {
            let createdPromocode = await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: {
                    ...promocodeInput,
                    code: faker.random.word(),
                    startDate: moment().add('days', 5).format('L')
                }
            })
            try {
                const inputData = {
                    code: createdPromocode.code,
                    adjustmentTypeId: 1,
                    agreementId: cemeteryAgreementId,
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_NOT_APPLICABLE')
                await models.Adjustment.destroy({
                    where: {
                        id: createdPromocode.id
                    }
                })
            }
        })

        it('apply promo code to agreement', async () => {
            await adjustmentInstance.createPromocodeAdjustment({
                currentUser: {
                    id: 1
                },
                body: {
                    ...promocodeInput,
                    code
                }
            })
            const inputData = {
                code: code,
                adjustmentTypeId: 1,
                agreementId: cemeteryAgreementId,
                apiType: 'quotation',
                documents: []
            }
            let record = await adjustmentInstance.createAgreementAdjustment(inputData)
            record.should.be.an('object')
            record.should.have.property('id')
            record.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
            record.should.have.property('amount').and.to.be.equal(promocodeInput.maxDiscountValue)
        })
        it('return error as discount is already applied', async () => {
            try {
                const inputData = {
                    code: code,
                    adjustmentTypeId: 1,
                    agreementId: cemeteryAgreementId,
                    apiType: 'quotation',
                    documents: []
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('DISCOUNT_ALREADY_APPLIED')
            }
        })
    })
})