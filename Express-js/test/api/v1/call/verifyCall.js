const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../helper')
const faker = require('faker')
const moment = require('moment')
const models = require('../../../../models/index')
const { addressGenerator, getCallData, createCallData } = require('../../../schema/call')
const baseUrl = '/api/v1/calls'

let authToken, user, reqData, call, searchedPerson
let callId = 'CLC-12356' + faker.random.number()

async function apiCall(token = authToken) {
    return chai.request(server)
        .post(`${baseUrl}/${callId}/verifyPersons`)
        .set("authorization", token)
        .send(reqData)
}

function createVerifyCallSchema() {
    return {
        person: {
            unverifiedPersonId: faker.random.number(),
            verifiedPersonId: faker.random.number(),
            callReasonId: faker.random.number({ min: 1, max: 2 }),
            personType: 'caller',
            personInformation: {
                ...createPersonSchema(),
                address: {
                    id: faker.random.number(),
                    ...addressGenerator()
                }
            }
        }
    }
}

function createPersonSchema(isVerified = false) {
    const result = {
        email: faker.internet.email(),
        prefix: faker.name.prefix(),
        firstName: faker.name.firstName(),
        middleName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        phoneNumber: faker.phone.phoneNumberFormat(1),
        ssnLastFour: faker.random.word({ length: 4 }),
        dateOfBirth: moment().subtract(60, 'year').format(),
        dateOfDeath: moment().subtract(1, 'day').format(),
    }
    if (isVerified) {
        result.isVerified = true
    }
    return result
}

describe('/POST Verify calls validations', function () {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            return
        } catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    beforeEach(() => {
        reqData = createVerifyCallSchema()
    })

    it('should return error message if the token is not present', async function () {
        const res = await apiCall('')
        res.should.have.status(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found")
    })

    it('should return error message if unverifiedPersonId is string', async function () {
        reqData.person.unverifiedPersonId = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("unverifiedPersonId must be a number")
    })

    it('should return error message if verifiedPersonId is string', async function () {
        reqData.person.verifiedPersonId = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("verifiedPersonId must be a number")
    })

    it('should return error message if callReasonId is string', async function () {
        reqData.person.callReasonId = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Enter valid callReasonId from [1, 2]")
    })

    it('should return error message if callReasonId is more than 2', async function () {
        reqData.person.callReasonId = faker.random.number({ min: 3 })
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Enter valid callReasonId from [1, 2]")
    })

    it('should return error message if personType is random string', async function () {
        reqData.person.personType = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("personType must be from `caller`, `informant`, `decedent`, `beneficiary`")
    })

    it('should return error message if email is random string', async function () {
        reqData.person.personInformation.email = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("enter valid email")
    })

    it('should return error message if prefix is number', async function () {
        reqData.person.personInformation.prefix = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("prefix must be a string")
    })

    it('should return error message if firstName is number', async function () {
        reqData.person.personInformation.firstName = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("firstName must be a string")
    })

    it('should return error message if middleName is number', async function () {
        reqData.person.personInformation.middleName = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("middleName must be a string")
    })

    it('should return error message if lastName is number', async function () {
        reqData.person.personInformation.lastName = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("lastName must be a string")
    })

    it('should return error message if phoneNumber is number', async function () {
        reqData.person.personInformation.phoneNumber = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Enter a valid phone number")
    })

    it('should return error message if ssnLastFour is number', async function () {
        reqData.person.personInformation.ssnLastFour = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("ssnLastFour must be a string")
    })

    it('should return error message if dateOfBirth is word', async function () {
        reqData.person.personInformation.dateOfBirth = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("enter valid dateofBirth")
    })

    it('should return error message if dateOfDeath is word', async function () {
        reqData.person.personInformation.dateOfDeath = faker.random.word()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("enter valid dateofDeath")
    })

    it('should return error message if line1 is number', async function () {
        reqData.person.personInformation.address.line1 = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Line1 should be string")
    })

    it('should return error message if line2 is number', async function () {
        reqData.person.personInformation.address.line2 = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Line2 should be string")
    })

    it('should return error message if country is number', async function () {
        reqData.person.personInformation.address.country = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Country should be string")
    })

    it('should return error message if county is number', async function () {
        reqData.person.personInformation.address.county = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("County should be string")
    })

    it('should return error message if state is number', async function () {
        reqData.person.personInformation.address.state = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("State should be string")
    })

    it('should return error message if city is number', async function () {
        reqData.person.personInformation.address.city = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("City should be string")
    })

    it('should return error message if zipcode is number', async function () {
        reqData.person.personInformation.address.zipcode = faker.random.number()
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal("Zipcode should contain only numbers")
    })


});

describe('/POST Verify calls (create new record - AN caller)', () => {
    before(async () => {
        const callSchema = await getCallData(1, false)
        call = await createCallData(callSchema.call)
    })

    beforeEach(() => {
        reqData = {
            person: {
                unverifiedPersonId: call.caller.id,
                verifiedPersonId: null,
                callReasonId: 1,
                personType: 'caller',
                personInformation: {
                    email: call.caller.email,
                    prefix: call.caller.prefix,
                    firstName: call.caller.firstName,
                    middleName: call.caller.middleName,
                    lastName: call.caller.lastName,
                    phoneNumber: call.caller.phoneNumber,
                    ssnLastFour: call.caller.ssnLastFour,
                    dateOfBirth: call.caller.dateOfBirth,
                    dateOfDeath: call.caller.dateOfDeath,
                    address: call.caller.PersonInformation && call.caller.PersonInformation.PersonAddress ? {
                        ...call.caller.PersonInformation.PersonAddress
                    } : addressGenerator()
                }
            }
        }
    })


    it('should return error when callId is invalid', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('Invalid call id')
    })

    it('should return success when all the data is correct in caller', async function () {
        callId = call.identifier
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(call.caller.id)
    })

    it('should return error when verifying the same person', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('This person was already verified')
    })
})

describe('/POST Verify calls (create new record - AN decedent)', () => {
    beforeEach(() => {
        const decedent = call.someOneHasPassed[0].decedent
        reqData = {
            person: {
                unverifiedPersonId: decedent.id,
                verifiedPersonId: null,
                callReasonId: 1,
                personType: 'decedent',
                personInformation: {
                    email: decedent.email,
                    prefix: decedent.prefix,
                    firstName: decedent.firstName,
                    middleName: decedent.middleName,
                    lastName: decedent.lastName,
                    phoneNumber: decedent.phoneNumber,
                    ssnLastFour: decedent.ssnLastFour,
                    dateOfBirth: decedent.dateOfBirth,
                    dateOfDeath: decedent.dateOfDeath,
                    address: decedent.PersonInformation && decedent.PersonInformation.PersonAddress ? {
                        ...call.caller.PersonInformation.PersonAddress
                    } : addressGenerator()
                }
            }
        }
    })

    it('should return success when all the data is correct in decedent', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(call.someOneHasPassed[0].decedent.id)
        const anRemansInfo = await models.AnRemainsInfo.findOne({ where: { personId: call.someOneHasPassed[0].decedent.id } })
        anRemansInfo.should.not.equal(null)
        const notifierRole = await models.Role.findOne({ where: { name: 'Notifier' } })
        const nextOfKinRole = await models.Role.findOne({ where: { name: 'Next of Kin' } })
        const informantRole = await models.Role.findOne({ where: { name: 'Informant' } })
        const decedentContacts = await models.ContactPerson.findAll({
            attributes: ['id', 'resourceId'],
            include: [
                {
                    model: models.ContactCaseRole,
                    as: 'caseRoles',
                    where: {
                        [models.Sequelize.Op.or]: [
                            {
                                roleId: notifierRole.id
                            },
                            {
                                roleId: nextOfKinRole.id
                            },
                            {
                                roleId: informantRole.id
                            }
                        ]
                    }
                }
            ],
            where: {
                personId: call.someOneHasPassed[0].decedent.id
            }
        })
        decedentContacts.should.have.lengthOf(2) // Informant and notifier
    })

    it('should return error when verifying the same person', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('This person was already verified')
    })
})

describe('/POST Verify calls (create new record - AN informant)', () => {
    beforeEach(() => {
        const decedent = call.someOneHasPassed[0].informant
        reqData = {
            person: {
                unverifiedPersonId: decedent.id,
                verifiedPersonId: null,
                callReasonId: 1,
                personType: 'informant',
                personInformation: {
                    email: decedent.email,
                    prefix: decedent.prefix,
                    firstName: decedent.firstName,
                    middleName: decedent.middleName,
                    lastName: decedent.lastName,
                    phoneNumber: decedent.phoneNumber,
                    ssnLastFour: decedent.ssnLastFour,
                    dateOfBirth: decedent.dateOfBirth,
                    dateOfDeath: decedent.dateOfDeath,
                    address: decedent.PersonInformation && decedent.PersonInformation.PersonAddress ? {
                        ...call.caller.PersonInformation.PersonAddress
                    } : addressGenerator()
                }
            }
        }
    })

    it('should return success when all the data is correct in informant', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(call.someOneHasPassed[0].informant.id)
    })

    it('should return error when verifying the same person', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('This person was already verified')
    })
})

describe('/POST Verify calls (verify searched record - AN caller)', () => {
    before(async () => {
        try {
            searchedPerson = await models.Person.create(createPersonSchema(true))
            await models.Person.update({ isVerified: false }, {
                where: {
                    id: call.caller.id
                }
            })
        } catch (error) {
            console.log(error)
        }
    })
    beforeEach(async () => {
        const address = await models.Address.create(addressGenerator())
        reqData = {
            person: {
                unverifiedPersonId: call.caller.id,
                verifiedPersonId: searchedPerson.id,
                callReasonId: 1,
                personType: 'caller',
                personInformation: {
                    email: call.caller.email,
                    prefix: call.caller.prefix,
                    firstName: call.caller.firstName,
                    middleName: call.caller.middleName,
                    lastName: call.caller.lastName,
                    phoneNumber: call.caller.phoneNumber,
                    ssnLastFour: call.caller.ssnLastFour,
                    dateOfBirth: call.caller.dateOfBirth,
                    dateOfDeath: call.caller.dateOfDeath,
                    address: {
                        id: address.id
                    }
                }
            }
        }
    })

    it('should return success when all the data is correct in caller', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(searchedPerson.id)
        const checkUnverifiedPerson = await models.Person.findOne({ where: { id: call.caller.id } })
        checkUnverifiedPerson.deletedBy.should.not.equal(null)
    })
})

describe('/POST Verify calls (verify searched record - AN informant)', () => {
    beforeEach(async () => {
        searchedPerson = await models.Person.create(createPersonSchema(true))
        const informant = call.someOneHasPassed[1].informant
        const address = await models.Address.create(addressGenerator())
        reqData = {
            person: {
                unverifiedPersonId: informant.id,
                verifiedPersonId: searchedPerson.id,
                callReasonId: 1,
                personType: 'informant',
                personInformation: {
                    email: informant.email,
                    prefix: informant.prefix,
                    firstName: informant.firstName,
                    middleName: informant.middleName,
                    lastName: informant.lastName,
                    phoneNumber: informant.phoneNumber,
                    ssnLastFour: informant.ssnLastFour,
                    dateOfBirth: informant.dateOfBirth,
                    dateOfDeath: informant.dateOfDeath,
                    address: {
                        id: address.id
                    }
                }
            }
        }
    })

    it('should return success when all the data is correct in informant', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(searchedPerson.id)
        const checkUnverifiedPerson = await models.Person.findOne({ where: { id: call.someOneHasPassed[1].informant.id } })
        checkUnverifiedPerson.deletedBy.should.not.equal(null)
    })
})

describe('/POST Verify calls (verify searched record - AN decedent)', () => {
    beforeEach(async () => {
        searchedPerson = await models.Person.create(createPersonSchema(true))
        const decedent = call.someOneHasPassed[1].decedent
        const address = await models.Address.create(addressGenerator())
        reqData = {
            person: {
                unverifiedPersonId: decedent.id,
                verifiedPersonId: searchedPerson.id,
                callReasonId: 1,
                personType: 'decedent',
                personInformation: {
                    email: decedent.email,
                    prefix: decedent.prefix,
                    firstName: decedent.firstName,
                    middleName: decedent.middleName,
                    lastName: decedent.lastName,
                    phoneNumber: decedent.phoneNumber,
                    ssnLastFour: decedent.ssnLastFour,
                    dateOfBirth: decedent.dateOfBirth,
                    dateOfDeath: decedent.dateOfDeath,
                    address: {
                        id: address.id
                    }
                }
            }
        }
    })

    it('should return success when all the data is correct in decedent', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(true)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(searchedPerson.id)
        const checkUnverifiedPerson = await models.Person.findOne({ where: { id: call.someOneHasPassed[1].decedent.id } })
        checkUnverifiedPerson.deletedBy.should.not.equal(null)
    })
})

describe('/POST Verify calls (create new record - PN caller)', () => {
    before(async () => {
        const callSchema = await getCallData(2, false)
        call = await createCallData(callSchema.call)
    })

    beforeEach(() => {
        reqData = {
            person: {
                unverifiedPersonId: call.caller.id,
                verifiedPersonId: null,
                callReasonId: 2,
                personType: 'caller',
                personInformation: {
                    email: call.caller.email,
                    prefix: call.caller.prefix,
                    firstName: call.caller.firstName,
                    middleName: call.caller.middleName,
                    lastName: call.caller.lastName,
                    phoneNumber: call.caller.phoneNumber,
                    ssnLastFour: call.caller.ssnLastFour,
                    dateOfBirth: call.caller.dateOfBirth,
                    dateOfDeath: call.caller.dateOfDeath,
                    address: call.caller.PersonInformation && call.caller.PersonInformation.PersonAddress ? {
                        ...call.caller.PersonInformation.PersonAddress
                    } : addressGenerator()
                }
            }
        }
    })


    it('should return success when all the data is correct in caller', async function () {
        callId = call.identifier
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(call.caller.id)
    })

    it('should return error when verifying the same person', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('This person was already verified')
    })
})

describe('/POST Verify calls (create new record - PN beneficiary)', () => {
    beforeEach(() => {
        const beneficiary = call.preNeedReason[0].beneficiary
        reqData = {
            person: {
                unverifiedPersonId: beneficiary.id,
                verifiedPersonId: null,
                callReasonId: 2,
                personType: 'beneficiary',
                personInformation: {
                    email: beneficiary.email,
                    prefix: beneficiary.prefix,
                    firstName: beneficiary.firstName,
                    middleName: beneficiary.middleName,
                    lastName: beneficiary.lastName,
                    phoneNumber: beneficiary.phoneNumber,
                    ssnLastFour: beneficiary.ssnLastFour,
                    dateOfBirth: beneficiary.dateOfBirth,
                    dateOfDeath: beneficiary.dateOfDeath,
                    address: beneficiary.PersonInformation && beneficiary.PersonInformation.PersonAddress ? {
                        ...call.caller.PersonInformation.PersonAddress
                    } : addressGenerator()
                }
            }
        }
    })

    it('should return success when all the data is correct in beneficiary', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(call.preNeedReason[0].beneficiary.id)
    })

    it('should return error when verifying the same person', async function () {
        const res = await apiCall()
        res.should.have.status(404)
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal('This person was already verified')
    })
})

describe('/POST Verify calls (verify searched record - PN caller)', () => {
    before(async () => {
        try {
            searchedPerson = await models.Person.create(createPersonSchema(true))
            await models.Person.update({ isVerified: false }, {
                where: {
                    id: call.caller.id
                }
            })
        } catch (error) {
            console.log(error)
        }
    })
    beforeEach(async () => {
        const address = await models.Address.create(addressGenerator())
        reqData = {
            person: {
                unverifiedPersonId: call.caller.id,
                verifiedPersonId: searchedPerson.id,
                callReasonId: 2,
                personType: 'caller',
                personInformation: {
                    email: call.caller.email,
                    prefix: call.caller.prefix,
                    firstName: call.caller.firstName,
                    middleName: call.caller.middleName,
                    lastName: call.caller.lastName,
                    phoneNumber: call.caller.phoneNumber,
                    ssnLastFour: call.caller.ssnLastFour,
                    dateOfBirth: call.caller.dateOfBirth,
                    dateOfDeath: call.caller.dateOfDeath,
                    address: {
                        id: address.id
                    }
                }
            }
        }
    })

    it('should return success when all the data is correct in caller', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(false)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(searchedPerson.id)
        const checkUnverifiedPerson = await models.Person.findOne({ where: { id: call.caller.id } })
        checkUnverifiedPerson.deletedBy.should.not.equal(null)
    })
})


describe('/POST Verify calls (verify searched record - PN beneficiary)', () => {
    beforeEach(async () => {
        searchedPerson = await models.Person.create(createPersonSchema(true))
        const beneficiary = call.preNeedReason[1].beneficiary
        const address = await models.Address.create(addressGenerator())
        reqData = {
            person: {
                unverifiedPersonId: beneficiary.id,
                verifiedPersonId: searchedPerson.id,
                callReasonId: 2,
                personType: 'beneficiary',
                personInformation: {
                    email: beneficiary.email,
                    prefix: beneficiary.prefix,
                    firstName: beneficiary.firstName,
                    middleName: beneficiary.middleName,
                    lastName: beneficiary.lastName,
                    phoneNumber: beneficiary.phoneNumber,
                    ssnLastFour: beneficiary.ssnLastFour,
                    dateOfBirth: beneficiary.dateOfBirth,
                    dateOfDeath: beneficiary.dateOfDeath,
                    address: {
                        id: address.id
                    }
                }
            }
        }
    })

    after(async () => {
        try {
            await models.SomeOnePassed.destroy({ truncate: true })
            await models.Note.destroy({ truncate: true })
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return success when all the data is correct in beneficiary', async function () {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data')
        res.body.data.should.have.property('isCallVerified').and.to.be.equal(true)
        res.body.data.should.have.property('verifiedPersonId').and.to.be.equal(searchedPerson.id)
        const checkUnverifiedPerson = await models.Person.findOne({ where: { id: call.preNeedReason[1].beneficiary.id } })
        checkUnverifiedPerson.deletedBy.should.not.equal(null)
    })
})
