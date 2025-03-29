
const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();
const models = require('../../../models')
const { personSchema, agreementSchema, financeSchema } = require('../schema')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const AdjustmentsController = require('../../../controllers/refactorControllers/adjustmentController/discountsAndAdjustmentsHandler')
const adjustmentInstance = new AdjustmentsController()
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const AgreementItemController = require('../../../controllers/refactorControllers/agreementController/agreementItemController')
const FinanceController = require('../../../controllers/refactorControllers/financeController/financeOptionController')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const ApprovalsController = require('../../../controllers/refactorControllers/adjustmentController/approvalsController')
const expect = chai.expect

async function fetchApprovalDetails (whereObj) {
    try {
        const approvalDetails = await models.Approval.scope('commonIncludes').findOne({
            where:whereObj
        })
        if (approvalDetails) {
            return approvalDetails.toJSON()
        }
        return approvalDetails
    } catch (error) {
        console.log(error)
        return error
    }
}

const inputForAgreementAdjsutment = (agreementId, adjustment) => {
    const approvalNeededDiscount = adjustment
        const inputData = {
            adjustmentTypeId: approvalNeededDiscount.adjustmentTypeId,
            adjustmentId: approvalNeededDiscount.id,
            amount: faker.random.number({ min: 1 }),
            description: 'applying approval discount',
            documents: ['document1', 'document2'],
            agreementId,
            userId: 1,
            requesterName: 'Testrequester'
        }
        return inputData
}

describe('Approving/Rejeccting approval reuests', () => {
    let approvalRequiredAdjustments, otherAdjustments, agreementId, agreementController

    before(async () => {
        const createdPerson = await PersonController.createOrUpdate({ ...personSchema() }, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 1: 2 )
        const saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        agreementController = new AgreementController(agreementId)
        await agreementController.checkoutAgreement(agreement.id, createdPerson.id)
        

        const serviceItemType = await models.ItemType.findOne({ where: { name: 'Services' } })
        const service = await models.LocationItem.findOne({ 
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
            ],
            where: {
                price : {
                    [Op.gt]: 500
                }
            }
        })
        const agreementItemController = new AgreementItemController(agreementId)
        await agreementItemController.createOrUpdate('add', { 
            itemType: 'locationItem',
            locationItemId: service.id,
            timezone: 'Asia/Calcutta'
        })
    })

    it('should fetch list of adjustments', async () => {
        const listOfAdjustments = await AdjustmentsController.getListOfAdjustments({})
            listOfAdjustments.should.be.an('object')
            listOfAdjustments.should.have.property('count').and.to.be.equal(17)
            listOfAdjustments.should.have.property('rows').and.to.be.an('array').of.length(17)
        approvalRequiredAdjustments = listOfAdjustments.rows.filter(adjustment => adjustment.isApprovalNeeded)
        otherAdjustments = listOfAdjustments.rows.filter(adjustment => !adjustment.isApprovalNeeded)
    })

    it('should apply the Approval not required adjustment and update the totalAdjustment of the Agreement', async () => {
        const fcaAdjustmentDetails = otherAdjustments.find(l => { return l.title === 'FCA Discount' })
            const inputData = {
                adjustmentTypeId: fcaAdjustmentDetails.adjustmentTypeId,
                adjustmentId: fcaAdjustmentDetails.id,
                amount: faker.random.number({ min: 1 }),
                description: 'applying fca discount',
                documents: ['document1', 'document2'],
                agreementId,
                userId: 1,
                requesterName: 'Testrequester'
            }
        let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
            appliedVeteranDiscountId = appliedAdjustment.id
        const agreementDetails = await agreementController.getAgreementDetails()
        agreementDetails.should.have.property('totalAdjustment').and.to.be.greaterThan(0)
    })

    it('should add a approval request when discount/adjustment which needs approval is applied', async () => {
        const inputData = inputForAgreementAdjsutment(agreementId, approvalRequiredAdjustments[0])
        let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
        appliedAdjustment.should.be.an('object')
        appliedAdjustment.should.have.property('id')
        appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
        appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
        appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        appliedVeteranDiscountId = appliedAdjustment.id
        const approvalDetails = await fetchApprovalDetails({resourceId: appliedAdjustment.id, resourceType: 'AgreementAdjustment'})
        approvalDetails.should.have.property('agreementAdjustment').and.to.be.an('object').and.to.have.property('amount').to.be.equal(inputData.amount)
    })

    it('should approve the approval request and apply it and update the agreement Details', async () => {
        const inputData = inputForAgreementAdjsutment(agreementId, approvalRequiredAdjustments[1])
        let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
        const approvalDetails = await fetchApprovalDetails({resourceId: appliedAdjustment.id, resourceType: 'AgreementAdjustment'})
        const approvalsController = new ApprovalsController(approvalDetails.id)
        const approvedRequest = await approvalsController.approveOrRejectRequest({status: 'Approved', actionNotes: 'approving the request', currentUser: {id: 1, name: 'company_name', UserPermissions: {description: "Vp of sales"}}})
        approvedRequest.should.be.an('object')
        approvedRequest.status.should.be.equal(ApprovalsController.ApprovalStatus['Approved'])
        const agreementDetails = await agreementController.getAgreementDetails()
        approvedRequest.agreementAdjustment.agreement.totalAdjustment.should.be.greaterThan(agreementDetails.totalAdjustment)

    })

    it('should throw an error saying approval not found when invalid id is sent', async () => {
        const approvalsController = new ApprovalsController(faker.random.number())
        await expect(approvalsController.approveOrRejectRequest({status: 'Approved', actionNotes: 'approving the request', currentUser: {id: 1, name: 'company_name', UserPermissions: {description: "Vp of sales"}}})).to.be.rejectedWith('APPROVAL_NOT_FOUND')
        
    })

    it('should reject the approval request', async () => {
        const inputData = inputForAgreementAdjsutment(agreementId, approvalRequiredAdjustments[2])
        let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
        const approvalDetails = await fetchApprovalDetails({resourceId: appliedAdjustment.id, resourceType: 'AgreementAdjustment'})
        const approvalsController = new ApprovalsController(approvalDetails.id)
        const approvedRequest = await approvalsController.approveOrRejectRequest({status: 'Declined', actionNotes: 'rejecting the request', currentUser: {id: 1, name: 'company_name', UserPermissions: {description: "Vp of sales"}}})
        approvedRequest.should.be.an('object')
        approvedRequest.status.should.be.equal(ApprovalsController.ApprovalStatus['Declined'])
        const agreementDetails = await agreementController.getAgreementDetails()
        approvedRequest.agreementAdjustment.agreement.should.have.property('totalAdjustment').to.be.equal(agreementDetails.totalAdjustment)

    })

    it('should add the specialFinancing request for the approval', async () => {
        it('should successfully create a special finance with even payments', async () => {
            const financeController = new FinanceController(agreementId)
            const financePayload = financeSchema()
            const specialFinance = await financeController.specialFinance({
                ...financePayload,
                financedAmount: financePayload.totalPrincipal,
                isUnequal: false
            })
            specialFinance.should.have.property('id')
            specialFinance.should.have.property('financeType').and.equal('Special-equal')
            specialFinance.should.have.property('status').and.equal('Pending')
            const approvalDetails = await fetchApprovalDetails(specialFinance.id, 'AgreementFinance')
            approvalDetails.should.have.property('agreementFinance').and.to.be.an('object').and.to.have.property('financedAmount').to.be.equal(financePayload.totalPrincipal)
        })
    })

    it('should mark the special finance request as Auto Declined if no action is taken on the request for 10 min', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        const specialFinance = await financeController.specialFinance({
            ...financePayload,
            financedAmount: financePayload.totalPrincipal,
            isUnequal: false
        })
        const interval = setInterval(async () => {
            const approvalDetails = await fetchApprovalDetails({resourceId: specialFinance.id, resourceType: 'AgreementFinance'})
            approvalDetails.status.should.be.equal(ApprovalsController.ApprovalStatus['AutoDeclined'])
            clearInterval(interval)
        }, 600 *1000);
    })

})
