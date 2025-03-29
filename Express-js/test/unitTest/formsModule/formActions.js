const chai = require('chai')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
const _ = require('lodash')
chai.use(chaiAsPromised);
chai.should();

const { personSchema, addressSchema } =require('../schema')
const models = require('../../../models')
const FormsController = require('../../../controllers/refactorControllers/formsController/formsController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')

describe('Forms Controller', () => {
    let agreement
    before(async () => {
        // Create person
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
        
        // Create other recipient
        createdOtherRecipientData = {
            name: 'Bob the other recipient',
            email: 'pri@gmail.com',
            createdBy: createdEmployeeData.id
        }
        createdOtherRecipient = await models.OtherRecipient.create(createdOtherRecipientData)
        formId = 1
    })
    
    describe('Case info form Preview URL', async () => {
        let res
        it('Should generate form preview URL', async () => {
            try {
                let previewReqData = {
                    employees: [{
                        id: createdEmployee.id,
                        formRecipientRoleId: 1
                    }],
                    contacts: [{
                        id: createdPersonContact.id,
                        formRecipientRoleId: 2
                    }]
                }
                const formId = 1
                const personId = createdPerson.id
                const userId = createdEmployee.id
                res = await FormsController.createCaseInfoFormPreview(formId, personId, previewReqData, userId)
                res.should.have.property('previewURL').and.to.be.an('string').of.length.greaterThan(1)
            } catch (error) {
                console.log(error)
            }
        })
        after(async () => {
            await FormsController.deleteCaseInfoForms([res])
        })
    })

    describe('Create case info form', () => {
        it('should create a case info form and send to docusign', async () => {
            const reqData = [{
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
        })
    })
    
    describe('void case info form', async() => {
        before(async () => {
            let previewReqData = {
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: 1
                }],
                contacts: [{
                    id: createdPersonContact.id,
                    formRecipientRoleId: 2
                }]
            }
            voidPreViewRes = await FormsController.createCaseInfoFormPreview(1, createdPerson.id, previewReqData, createdEmployee.id)
        })
        it('should void case info form', async () => {
            const res = await FormsController.voidCaseInfoForm(voidPreViewRes.id, voidPreViewRes.personId)
            res.should.have.property('status').and.to.be.an('string').equal('voided')
        })
        after(async () => {
            await FormsController.deleteCaseInfoForms([voidPreViewRes])
        })
    })

    describe('Delete case info forms', async() => {
        before(async () => {
            let previewReqData = {
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: 1
                }],
                contacts: [{
                    id: createdPersonContact.id,
                    formRecipientRoleId: 2
                }]
            }
            delPreviewRes = await FormsController.createCaseInfoFormPreview(1, createdPerson.id, previewReqData, createdEmployee.id)
        })
        it('should delete all created and drafted case info form', async () => {
            const res = await FormsController.deleteDraftedAndCreatedCaseInfoFormsOfAPerson(delPreviewRes.personId)
            res.should.have.property('envelopes').and.to.be.an('array').of.length.greaterThan(0)
        })
    })

    describe('Download Case Info form', async () => {
        let formsCreateRes
        before(async () => {
            const reqData = {
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: 1
                }],
                contacts: [{
                    id: createdPersonContact.id,
                    formRecipientRoleId: 2
                }]
            }
            
            const personId = createdPerson.id
            const user = 1
            formsCreateRes = await FormsController.createCaseInfoFormPreview(1, personId, reqData, user)
        })
        it('should download case info form', async () => {
            const res = await FormsController.downloadCaseInfoForm(formsCreateRes.envelopeId,formsCreateRes.personId)
            expect(res).to.not.equal(null);
        })
        after(async () => {
            try {
                await FormsController.deleteCaseInfoForms([formsCreateRes])
            } catch (error) {
                console.log(error)
            }
        })
    })

    describe('Create agreement form and sent via docusign', () => {
        let agreement, form
        before(async () => {
            let [fms] = await FormsController.getAllForms('AN Statement of Goods and Services')
            form = fms.forms[0]
            const personId = createdPerson.id
            let agreementSchema = {
                locationId: 1,
                arrangerId: 1,
                needType: createdPerson.isAlive ? 2 : 1,
                type: 1,
                persons: [
                    {
                        personId,
                        agreementRoleId: 1,
                        relationId: 4
                    }
                ]
            }
            const verifiedPersonController = new VerifiedPersonController(personId)
            await verifiedPersonController.createArrangement(1)
            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        })
        it('should create a statement form', async () => {
            const user = { id: 1 }
            const personId = createdPerson.id
            const reqData = [{
                formId: form.id,
                agreementId: agreement.id,
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "FuneralAssignedTo").id,
                    availableInPerson: false
                }],
                agreementPersons: [
                    {
                        id: 2,
                        formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Purchaser").id,
                        availableInPerson: false
                    }
                ]
            }]
            res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
            res.should.be.an('array').of.length(1)
        })
    })

    describe('Create Retail Installment form and sent via docusign', () => {
        let personId, purchaserId, form
        before(async () => {
            let [fms] = await FormsController.getAllForms('Retail Installment Agreement')
            form = fms.forms[0]
            personId = createdPerson.id
            const person = { ...personSchema() }
            const place= {
                address: {
                    ...addressSchema()
                }
            }
            let purchaser = await PersonController.createOrUpdate(person, place, {})
            purchaserId = purchaser.id
            let agreementSchema = {
                locationId: 2,
                arrangerId: 1,
                needType: createdPerson.isAlive ? 2 : 1,
                type: 2,
                persons: [
                    {
                        personId: purchaserId,
                        agreementRoleId: 1,
                        relationId: 4
                    }
                ]
            }
            const verifiedPersonController = new VerifiedPersonController(purchaserId)
            await verifiedPersonController.verifyPerson(purchaser)
            // await verifiedPersonController.createArrangement(1)
            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            let createdAgmt = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
            agreement = await models.Agreement.scope('withAgreementPersons').findOne({
                where: {
                    id: createdAgmt.id
                }
            })    
        })
        it('should create a retail installment form', async () => {
            const user = { id: 1 }
            const reqData = [{
                formId: form.id,
                agreementId: agreement.id,
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Counselor").id,
                    availableInPerson: false
                }, {
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Manager").id,
                    availableInPerson: false
                }],
                agreementPersons: [
                    {
                        id: agreement.purchaser.id,
                        formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Purchaser").id,
                        availableInPerson: false
                    }
                ]
            }]
            let res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
            res.should.be.an('array').of.length(1)
        })

        it('should create a retail installment form with ownership value as Individual', async () => {
            const user = { id: 1 }
            const reqData = [{
                formId: form.id,
                agreementId: agreement.id,
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Counselor").id,
                    availableInPerson: false
                }, {
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Manager").id,
                    availableInPerson: false
                }],
                agreementPersons: [
                    {
                        id: agreement.purchaser.id,
                        formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Purchaser").id,
                        availableInPerson: false
                    }
                ],
                metaData: "{'ownerShipType':'Individual'}"
            }]
            let res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
            res.should.be.an('array').of.length(1)
        })

        it('should create a retail installment form with ownership value as Joint Tenancy', async () => {
            const user = { id: 1 }
            const reqData = [{
                formId: form.id,
                agreementId: agreement.id,
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Counselor").id,
                    availableInPerson: false
                }, {
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Manager").id,
                    availableInPerson: false
                }],
                agreementPersons: [
                    {
                        id: agreement.purchaser.id,
                        formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Purchaser").id,
                        availableInPerson: false
                    }
                ],
                metaData: "{'ownerShipType':'Joint Tenancy'}"
            }]
            let res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
            res.should.be.an('array').of.length(1)
        })

        it('should create a retail installment form with ownership value as Trust', async () => {
            const user = { id: 1 }
            const reqData = [{
                formId: form.id,
                agreementId: agreement.id,
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Counselor").id,
                    availableInPerson: false
                }, {
                    id: createdEmployee.id,
                    formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Sales Manager").id,
                    availableInPerson: false
                }],
                agreementPersons: [
                    {
                        id: agreement.purchaser.id,
                        formRecipientRoleId: form.formRecipientRoles.find(e => e.docusignRole === "Purchaser").id,
                        availableInPerson: false
                    }
                ],
                metaData: "{'ownerShipType':'Trust'}"
            }]
            let res = await FormsController.createCaseInfoFormsAndSendUsingDocusign(personId, reqData, user)
            res.should.be.an('array').of.length(1)
        })
    })

    describe('Get Forms', () => {
        it('Should get all forms', async () => {
            const forms = await FormsController.getAllForms()
            forms.should.be.an('array').of.length.greaterThan(0)
        })
        it('Should get form details', async () => {
            const forms = await FormsController.getAllForms('AN Statement of Goods and Services')
            forms.should.be.an('array').of.length.greaterThan(0)
        })
        it('Should get all person Forms', async () => {
            const opiForms = await FormsController.getCaseInfoForms(createdPerson.id)
            opiForms.should.be.an('array')
        })
        it('Should get all person Forms based on formName', async () => {
            const opiForms = await FormsController.getCaseInfoForms(createdPerson.id, {formName: 'AN Statement of Goods and Services'})
            opiForms.should.be.an('array')
        })
        it('Should get all person Forms based on formName and Agreement Id', async () => {
            const opiForms = await FormsController.getCaseInfoForms(createdPerson.id, {formName: 'Retail Installment Agreement', agreementId: agreement.id})
            opiForms.should.be.an('array')
        })
    })

    describe('View in docusign sent form', async () => {
        let formsCreateRes
        before(async () => {
            const reqData = {
                employees: [{
                    id: createdEmployee.id,
                    formRecipientRoleId: 1
                }],
                contacts: [{
                    id: createdPersonContact.id,
                    formRecipientRoleId: 2
                }]
            }
            
            const personId = createdPerson.id
            const user = 1
            formsCreateRes = await FormsController.createCaseInfoFormPreview(1, personId, reqData, user)
        })
        it('should get latest status of sent form', async () => {
            const res = await FormsController.checkStatusAndReturnUrlOfSentForm(formsCreateRes.envelopeId,formsCreateRes.personId)
            expect(res).to.not.equal(null);
        })
        after(async () => {
            try {
                await FormsController.deleteCaseInfoForms([formsCreateRes])
            } catch (error) {
                console.log(error)
            }
        })
    })

    /* after(async () => {
        // NOTE: because of foreign key constriants after hook will not pass
        // Delete Other recipient
        await models.OtherRecipient.destroy({  where: { id: createdOtherRecipient.id } })
        // Delete createdEmployee
        await models.Employee.destroy({ where: { id: createdEmployee.id } })
        // Delete personContact
        await models.PersonContact.destroy({  where: { id: createdPersonContact.id } })
        // Delete Person
        await models.person.destroy({ where: { id: createdPerson.id } })
    }) */
})