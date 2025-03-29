const chai = require('chai')
const faker = require('faker')
const chaiAsPromised = require('chai-as-promised')
const { personSchema, agreementSchema, addressSchema } = require('../../../schema')
const VerifiedPersonController = require('../../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../../controllers/refactorControllers/agreementController/addendum')
const models = require('../../../../../models')
const { getAgreementRoles } = require('../../../../../controllers/refactorControllers/utils')
const { array } = require('@hapi/joi')

chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();

let agreementId, addendumId, packageDetails, agreementRoles

const createAgreement = async () => {
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
        type: 2,
        saleTypeId: faker.random.arrayElement(saleTypeIds),
        persons: [
            {
                personId: await createPerson(true, true),
                agreementRoleId: agreementRoles['Beneficiary']
            },
            {
                personId: await createPerson(true, true),
                agreementRoleId: agreementRoles['Purchaser']
            },
            {
                personId: await createPerson(true, true),
                agreementRoleId: agreementRoles['Co-Purchaser']
            }
        ]
    }
    const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
    const agreementController = new AgreementController(agreementId)
    const result = await agreementController.markAgreementComplete()
    agreementId = agreement.id
}

const createPerson = async (isVerified, isAlive) => {
    person = {
        ...personSchema(),
        isAlive
    }
    const place= {
        address: {
            ...addressSchema()
        }
    }
    createdPerson = await PersonController.createOrUpdate(person, place, {})
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
    if(isVerified) {
        await verifiedPersonController.verifyPerson(createdPerson)
    }
    return createdPerson.id
}

describe('edit the agreement persons through addendum for cemetery contracts', () => {
    before(async () => {
        agreementRoles = await getAgreementRoles('map')
        await createAgreement()
    })

    it('should create a addendum for the agreement', async () => {
        const addendumController = new AddendumController(agreementId)
        const addendum = await addendumController.createAddendum()
        addendum.should.have.property('id')
        addendum.should.have.property('agreementId').and.equal(agreementId)
        addendumId = addendum.id
    })

    it('should be able to add benefciary for cemetery', async () => {
        const reqBody = {
            persons: [
                {
                    personId: await createPerson(true, true),
                    agreementRoleId: createdPerson['Beneficiary']
                }
            ]
        }
        const addendumController = new AddendumController(agreementId, addendumId)
        const updatedAddendum = await addendumController.editAddendum(reqBody)
        const agreementController = new AgreementController(agreementId)
        const agreementDetails = await agreementController.getAgreementDetails()
        expect(agreementDetails).to.have.property('id').to.equal(agreementId)
        expect(agreementDetails).to.have.property('beneficiary').and.to.be.an('array').of.length(2)
    })

    it('should be able to delete the beneficiary from agreement through editing addendum', async () => {
        const agreementController = new AgreementController(agreementId)
        const agreementDetails = await agreementController.getAgreementDetails()
        const reqBody = {
            persons: [
                {
                    personId: _.get(agreementDetails, 'beneficiary[0].personId'),
                    isDeleted: true,
                    id: _.get(agreementDetails, 'beneficiary[0].id')
                }
            ]
        }
        const addendumController = new AddendumController(agreementId, addendumId)
        const updatedAddendum = await addendumController.editAddendum(reqBody)
        const agreementData = await agreementController.getAgreementDetails()
        expect(agreementDetails).to.have.property('id').to.equal(agreementId)
        expect(agreementDetails).to.have.property('beneficiary').and.to.be.an('array').of.length(1)
    })

    it('should be able to update the beneficiary through addendum', async () => {
        const agreementController = new AgreementController(agreementId)
        const agreementDetails = await agreementController.getAgreementDetails()
        const reqBody = {
            persons: [
                {
                    personId: _.get(agreementDetails, 'beneficiary[0].personId'),
                    id: _.get(agreementDetails, 'beneficiary[0].id'),
                    relationId: faker.random.number({ min:1, max: 5})
                }
            ]
        }
        const updatedAddendum = await addendumController.editAddendum(reqBody)
        const agreementData = await agreementController.getAgreementDetails()
        expect(agreementDetails).to.have.property('id').to.equal(agreementId)
        expect(agreementDetails).to.have.property('beneficiary').and.to.be.an('array').of.length(1)
        expect(agreementDetails.beneficiary[0]).to.have.property('relationId').to.equal(reqBody.persons[0].relationId)
    })
})

