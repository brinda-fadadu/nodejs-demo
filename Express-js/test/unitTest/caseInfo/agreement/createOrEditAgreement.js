const faker = require('faker')
const {personSchema, addressSchema} = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const { getAgreementRoles } = require('../../../../controllers/refactorControllers/utils')
const models = require('../../../../models')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();


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
    return createdPerson.toJSON()
}

const getSaleTypeIds = async (type, createdPerson) => {
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)

        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, createdPerson.isAlive ? 1: 2 )
        return saleTypes.map(saleType => saleType.id)

}

const returnAgreementDetails =  (agreementId) => {
    const agreementController = new AgreementController(agreementId)
    return agreementController.getAgreementDetails()
}


describe('Funeral Agreement test cases', () => {
    let personId, createdPerson, agreementSchema = {}, agreementRoles, saleTypeIds, agreementDetails, types, needTypes

    before (async () => {
        agreementRoles = await getAgreementRoles('map')
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES

    })


    it('should create verified alive person', async () => {
        createdPerson = await createPerson(true, true)
        personId = createdPerson.id
    })

    it('should throw an error saying person not found if nonexisting person is sent', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(faker.random.number(), agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }

    })

    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }

    })

    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })

    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Funeral'],
            agreementSchema.needType = faker.random.number()

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })

    it('should throw an error saying invalid needType if we send AN for PN', async () => {
        try {
            agreementSchema.needType = needTypes['AN']

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })


    it('should create verified dead person', async () => {
        createdPerson = await createPerson(true, false)
        personId = createdPerson.id
    })

    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }

    })

    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['AN']
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })

    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Funeral'],
            agreementSchema.needType = faker.random.number()

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })

    it('should throw an error saying invalid needType if we send PN for AN', async () => {
        try {
            agreementSchema.needType = needTypes['PN']

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })


    it('should throw an error saying invalid SaleTypeId', async () => {
        try {
            agreementSchema.needType = needTypes['AN']
            agreementSchema.saleTypeId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_SALE_TYPE_ID')
        }

    })

    it('should throw an error if non verified persons are sent as agreement persons', async () => {
        try {

            const agreementPerson1 = await createPerson(false, true)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            agreementSchema.persons = []
            agreementSchema.persons.push({
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Purchaser']
            })
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('ADD_VERIFIED_PERSONS')
        }
    })

    it('should throw an error if non existing persons are added as agreement persons', async () => {
        try {
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: faker.random.number(),
            agreementRoleId: agreementRoles['Purchaser']
        })
        const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('ADD_VERIFIED_AND_EXISTING_PERSONS')
        }
    })


    it('should throw an error if same persons are sent as multiple co-purchasers', async () => {
        try {
            agreementSchema.persons = []
            const agreementPerson1 = await createPerson(true, true)
            agreementSchema.persons.push({
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            }, {
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            })
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('MULTIPLE_SAME_CO_PURCHASERS')
        }

    })

    it('should not be able to add multiple beneficiaries for funeral agreement', async () => {
        saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        const person1 = await createPerson(true, true)
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: person1.id,
            agreementRoleId: agreementRoles['Beneficiary']
        })
        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        agreementDetails.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        agreementDetails.beneficiary[0].should.have.property('personId').and.to.be.equal(personId)

    })

    it('should add the OPI person as beneficiary with isOwner true and add the purchasers and co-purchasers', async () => {
        const person1 = await createPerson(true, true)
        const person2 = await createPerson(true, true)
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: person1.id,
            agreementRoleId: agreementRoles['Co-purchaser']
        },{
            personId: person1.id,
            agreementRoleId: agreementRoles['Purchaser']
        }, {
            personId: person2.id,
            agreementRoleId: agreementRoles['Co-purchaser']
        })

        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        agreementDetails.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        agreementDetails.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('personId').and.to.be.equal(person1.id)
        agreementDetails.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('roleId').and.to.be.equal(agreementRoles['Purchaser'])
        agreementDetails.should.have.property('coPurchasers').and.to.be.an('array').of.length(2)
    })

    it('should fetch details of the agreement added', async () => {
        const agreementData = await returnAgreementDetails(agreementDetails.id)
        agreementData.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementData.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        agreementData.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        agreementData.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('roleId').and.to.be.equal(agreementRoles['Purchaser'])
        agreementData.should.have.property('coPurchasers').and.to.be.an('array').of.length(2)
    })


    it('should be able to edit the agreement and delete/update the agreementPersons', async () => {
        const editSchema = {
            ...agreementDetails.toJSON()
        }

        editSchema.persons = []

        const relationId = faker.random.number({ min:1, max: 5})

        editSchema.persons.push(
            {
                personId: agreementDetails.beneficiary[0].personId,
                id: agreementDetails.beneficiary[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Beneficiary']
            },
            {
                personId: agreementDetails.purchaser.personId,
                id: agreementDetails.purchaser.id,
                isDeleted: true,
                agreementRoleId: agreementRoles['Purchaser']

            },
            {
                personId: agreementDetails.coPurchasers[0].personId,
                id: agreementDetails.coPurchasers[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Co-purchaser']
            },
            {
                personId: agreementDetails.coPurchasers[1].personId,
                id: agreementDetails.coPurchasers[1].id,
                isDeleted: true,
                agreementRoleId: agreementRoles['Co-purchaser']
            }
        )
        const editedAgreement = await AgreementController.createOrEditAgreement(personId, editSchema, 1)
        const editedDetailsOfAgreement = await returnAgreementDetails(editedAgreement.id)
        editedDetailsOfAgreement.should.have.property('saleTypeId').and.to.be.equal(editSchema.saleTypeId)
        editedDetailsOfAgreement.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        editedDetailsOfAgreement.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        editedDetailsOfAgreement.beneficiary[0].should.have.property('relationId').and.to.be.equal(relationId)
        editedDetailsOfAgreement.should.have.property('purchaser').and.to.be.equal(null)
        editedDetailsOfAgreement.should.have.property('coPurchasers').and.to.be.an('array').of.length(1)
        editedDetailsOfAgreement.coPurchasers[0].should.have.property('relationId').and.to.be.equal(relationId)
    })

    it('should not be able to delete the main beneficiary', async () => {
        const editSchema = {
            ...agreementDetails.toJSON()
        }

        editSchema.persons = []

        const relationId = faker.random.number({ min:1, max: 5})
        const person1 = await createPerson(true, true)
        editSchema.persons.push(
            {
                personId: agreementDetails.beneficiary[0].personId,
                id: agreementDetails.beneficiary[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Beneficiary'],
                isDeleted: true
            },
            {
                personId: agreementDetails.coPurchasers[0].personId,
                id: agreementDetails.coPurchasers[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Co-purchaser']
            },
            {
                personId: person1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            }
        )
        await expect(AgreementController.createOrEditAgreement(personId, editSchema, 1)).to.be.rejectedWith('BENEFICIARY_CANNOT_BE_DELETED')
    })

    it('should return the list of agreements of the person', async () => {
        const agreements = await AgreementController.getListOfAgreements(personId)
        agreements.should.be.an('array').and.to.be.of.length.greaterThan(1)
    })


})

describe('Cemetry Agreement test cases', () => {
    let personId, createdPerson, agreementSchema = {}, agreementRoles, saleTypeIds, agreementDetails, types, needTypes

    before (async () => {
        agreementRoles = await getAgreementRoles('map')
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES

    })

    it('should create verified alive person', async () => {
        createdPerson = await createPerson(true, true)
        personId = createdPerson.id
    })

    it('should throw an error saying person not found if nonexisting person is sent', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(faker.random.number(), agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }

    })

    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }

    })

    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['PN']
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })

    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Funeral'],
            agreementSchema.needType = faker.random.number()

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })

    it('should throw an error saying invalid needType if we send AN for PN', async () => {
        try {
            agreementSchema.type = types['Funeral'],
            agreementSchema.needType = needTypes['AN']

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })


    it('should create verified dead person', async () => {
        createdPerson = await createPerson(true, false)
        personId = createdPerson.id
    })

    it('should throw an error saying invalid locationId', async () => {
        try {
            agreementSchema.locationId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_LOCATION_ID')
        }

    })

    it('should throw an error saying invalid type', async () => {
        try {
            agreementSchema.locationId = faker.random.number({ min:1, max: 5})
            agreementSchema.type = faker.random.number()
            agreementSchema.needType = needTypes['AN']
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_TYPE')
        }
    })

    it('should throw an error saying invalid needType', async () => {
        try {
            agreementSchema.type = types['Cemetry'],
            agreementSchema.needType = faker.random.number()

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })

    it('should throw an error saying invalid needType if we send PN for AN', async () => {
        try {
            agreementSchema.needType = needTypes['PN']

            const verifiedPersonController = new VerifiedPersonController(personId)

            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
            saleTypeIds = saleTypes.map(saleType => saleType.id)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_NEED_TYPE')
        }
    })


    it('should throw an error saying invalid SaleTypeId', async () => {
        try {
            agreementSchema.needType = needTypes['AN']
            agreementSchema.saleTypeId = faker.random.number()
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_SALE_TYPE_ID')
        }

    })

    it('should throw an error if non verified persons are sent as agreement persons', async () => {
        try {

            const agreementPerson1 = await createPerson(false, true)
            agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

            agreementSchema.persons = []
            agreementSchema.persons.push({
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Purchaser']
            })
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('ADD_VERIFIED_PERSONS')
        }
    })

    it('should throw an error if non existing persons are added as agreement persons', async () => {
        try {
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: faker.random.number(),
            agreementRoleId: agreementRoles['Purchaser']
        })
        const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('ADD_VERIFIED_AND_EXISTING_PERSONS')
        }
    })


    it('should throw an error if same persons are sent as multiple co-purchasers', async () => {
        try {
            agreementSchema.persons = []
            const agreementPerson1 = await createPerson(true, true)
            agreementSchema.persons.push({
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            }, {
                personId: agreementPerson1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            })
            const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('MULTIPLE_SAME_CO_PURCHASERS')
        }

    })

    // commenting the below code for CCS-8028
    // it('should not be able to add more than one extra beneficiaries for cemetry agreement', async () => {
    //     saleTypeIds = await getSaleTypeIds(agreementSchema.type, personId)
    //     agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
    //     const person1 = await createPerson(true, true)
    //     agreementSchema.persons = []
    //     agreementSchema.persons.push({
    //         personId: person1.id,
    //         agreementRoleId: agreementRoles['Beneficiary']
    //     })
    //     try {
    //         const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
    //     } catch (error) {
    //         error.should.have.property('message').and.to.be.equal('MULTIPLE_BENEFICIARIES_CAN_NOT_BE_ADDED')
    //     }

    // })

    it('should  be able to add multiple beneficiaries for cemetry agreement', async () => {
        const person1 = await createPerson(true, true)
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: person1.id,
            agreementRoleId: agreementRoles['Beneficiary']
        })
        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('beneficiary').and.to.be.an('array').of.length(2)
    })
    

    it('should add the OPI person as beneficiary with isOwner true and add the purchasers and co-purchasers and an extra beneficiary', async () => {
        const person1 = await createPerson(true, true)
        const person2 = await createPerson(true, true)
        agreementSchema.persons = []
        agreementSchema.persons.push({
            personId: person1.id,
            agreementRoleId: agreementRoles['Co-purchaser']
        },{
            personId: person1.id,
            agreementRoleId: agreementRoles['Purchaser']
        }, {
            personId: person2.id,
            agreementRoleId: agreementRoles['Co-purchaser']
        })

        const createdAgreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        agreementDetails = await returnAgreementDetails(createdAgreement.id)
        agreementDetails.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementDetails.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        agreementDetails.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        agreementDetails.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('personId').and.to.be.equal(person1.id)
        agreementDetails.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('roleId').and.to.be.equal(agreementRoles['Purchaser'])
        agreementDetails.should.have.property('coPurchasers').and.to.be.an('array').of.length(2)
    })

    it('should fetch details of the agreement added', async () => {
        const agreementData = await returnAgreementDetails(agreementDetails.id)
        agreementData.should.have.property('saleTypeId').and.to.be.equal(agreementSchema.saleTypeId)
        agreementData.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        agreementData.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        agreementData.should.have.property('purchaser').and.to.be.an('object').and.to.have.property('roleId').and.to.be.equal(agreementRoles['Purchaser'])
        agreementData.should.have.property('coPurchasers').and.to.be.an('array').of.length(2)
    })

    it('should be able to edit the agreement and delete/update the agreementPersons', async () => {
        const editSchema = {
            ...agreementDetails.toJSON()
        }

        editSchema.persons = []

        const relationId = faker.random.number({ min:1, max: 5})

        editSchema.persons.push(
            {
                personId: agreementDetails.beneficiary[0].personId,
                id: agreementDetails.beneficiary[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Beneficiary']
            },
            {
                personId: agreementDetails.purchaser.personId,
                id: agreementDetails.purchaser.id,
                isDeleted: true,
                agreementRoleId: agreementRoles['Purchaser']

            },
            {
                personId: agreementDetails.coPurchasers[0].personId,
                id: agreementDetails.coPurchasers[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Co-purchaser']
            },
            {
                personId: agreementDetails.coPurchasers[1].personId,
                id: agreementDetails.coPurchasers[1].id,
                isDeleted: true,
                agreementRoleId: agreementRoles['Co-purchaser']
            }
        )
        const editedAgreement = await AgreementController.createOrEditAgreement(personId, editSchema, 1)
        const editedDetailsOfAgreement = await returnAgreementDetails(editedAgreement.id)
        editedDetailsOfAgreement.should.have.property('saleTypeId').and.to.be.equal(editSchema.saleTypeId)
        editedDetailsOfAgreement.should.have.property('beneficiary').and.to.be.an('array').of.length(1)
        editedDetailsOfAgreement.beneficiary[0].should.have.property('isOwner').and.to.be.equal(true)
        editedDetailsOfAgreement.beneficiary[0].should.have.property('relationId').and.to.be.equal(relationId)
        editedDetailsOfAgreement.should.have.property('purchaser').and.to.be.equal(null)
        editedDetailsOfAgreement.should.have.property('coPurchasers').and.to.be.an('array').of.length(1)
        editedDetailsOfAgreement.coPurchasers[0].should.have.property('relationId').and.to.be.equal(relationId)
    })

    it('should not be able to delete the main beneficiary', async () => {
        const editSchema = {
            ...agreementDetails.toJSON()
        }

        editSchema.persons = []

        const relationId = faker.random.number({ min:1, max: 5})
        const person1 = await createPerson(true, true)
        const mainBenefciary = editSchema.beneficiary.filter(person => person.personId === personId && person.isOwner)
        editSchema.persons.push(
            {
                personId: mainBenefciary[0].personId,
                id: mainBenefciary[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Beneficiary'],
                isDeleted: true
            },
            {
                personId: agreementDetails.coPurchasers[0].personId,
                id: agreementDetails.coPurchasers[0].id,
                relationId: relationId,
                agreementRoleId: agreementRoles['Co-purchaser']
            },
            {
                personId: person1.id,
                agreementRoleId: agreementRoles['Co-purchaser']
            }
        )
        await expect(AgreementController.createOrEditAgreement(personId, editSchema, 1)).to.be.rejectedWith('BENEFICIARY_CANNOT_BE_DELETED')
    }) 

    it('should return the list of agreements of the person', async () => {
        const agreements = await AgreementController.getListOfAgreements(personId)
        agreements.should.be.an('array').and.to.be.of.length.greaterThan(1)
    })
})

describe('payors for the agreement', () => {

    let agreementSchema = {}, agreementRoles, needTypes, types, personId, agreementId, agreementController
    before (async () => {
        agreementRoles = await getAgreementRoles('map')
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        const createdPerson = await createPerson(true, true)
        personId = createdPerson.id
        agreementSchema = {
            locationId: faker.random.number({min :1, max: 5}),
            type: types['Funeral'],
            needType: needTypes['PN']
        }
    })

    it('should create a agreement', async () => {
        agreementSchema.persons = []
        const agreementPerson1 = await createPerson(true, true)
        agreementSchema.persons.push({
            personId: agreementPerson1.id,
            agreementRoleId: agreementRoles['Co-purchaser']
        })
        const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, 1)
        agreementId = agreement.id
    })
    it('should throw an error saying person not found if non-existing personId is sent to add as payor', async () => {
        agreementController = new AgreementController(agreementId)
        try {
        const payorDeatils =   await agreementController.addPayor({person: {personId: faker.random.number()}})
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }
        
    })

    it('should add a new person as payor', async () => {
        const person = {
            person: {
                ...personSchema(),
            },
            addressPlace: {
                address: {
                    ...addressSchema()
                }
            }
        }
        const payor =  await agreementController.addPayor(person)
        payor.should.have.property('personId')
        payor.should.have.property('agreementId').and.to.be.equal(agreementId)
    })

    it('should add a already existing person as payor', async () => {
        const person1 = await createPerson(true, true)
        const payor =  await agreementController.addPayor({person: {personId: person1.id}})
        payor.should.have.property('personId').and.to.be.equal(person1.id)
        payor.should.have.property('agreementId').and.to.be.equal(agreementId)
    })
    
    it('should be able to get list of payors', async () => {
        const payorDeatils =  await agreementController.getPayors()
        payorDeatils.should.be.an('array').and.to.be.of.length.greaterThan(1)
    })

    it('should be able to delete a payor', async () => {
        const person1 = await createPerson(true, true)
        const payor =  await agreementController.addPayor({person: {personId: person1.id}})
        const deletedRes = await agreementController.deletePayor(payor.id)
        deletedRes.should.be.equal(1)
    })
})