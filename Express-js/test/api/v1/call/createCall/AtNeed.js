const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    getLanguages,
    getRelations,
    getAddressTypes,
    getOrganizationTypes,
    getCallReasonTypes
} = require('../../../../helper')
const models = require('../../../../../models')
const { getCallData } = require('../../../../schema/call')
const callerTest = require('./callerTest')
const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
let authToken
let reqData, user, relations

async function apiCall() {
    return chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
}

describe('POST /api/v1/calls AtNeed', () => {
    before(async () => {
        try {
            languages = await getLanguages()
            addressTypes = await getAddressTypes()
            user = await addTestUser()
            relations = await getRelations()
            organizationTypes = await getOrganizationTypes()
            authToken = genAuthToken(user);
            reasonTypes = getCallReasonTypes()
            await callerTest()
            return
        } catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    beforeEach(async () => {
        reqData = await getCallData()
    })

    it('should respond with an error saying that decedent firstName is required', async () => {
        reqData.call.reason.forEach(e => e.decedent.firstName = "")
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`First Name is required`)
    })

    it('should respond with an error saying that informant firstName is required', async () => {
        reqData.call.reason.forEach((e) => e.informant.firstName = "")
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`First Name is required`)
    })

    it('should respond with an error saying that dateOfBirth should be less than today', async () => {
        reqData.call.reason.forEach(e => {
            e.decedent.dateOfBirth = moment().format('MM/DD/YYYY')
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal("Date of Death must be greater than Date of Birth")
    })

    it('shpuld respond with an error saying that relationShipId is not found', async () => {
        const relationIds = _.values(relations)
        reqData.call.reason.forEach(e => {
            e.decedent.relationshipId = faker.random.number()
            e.informant.relationshipId = faker.random.number()
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Enter valid relationId from ${relationIds}`)
    })

    it('should resond with an error saying isReadyForPickup should be a boolean', async () => {
        reqData.call.reason.forEach(e => {
            e.isReadyForPickup = "abcd"
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Enter true or false for isReadyForPickup`)
    })

    it('should respond with an error saying that isNok should be a boolean', async () => {
        reqData.call.reason.forEach(e => {
            e.isNok = "abcd"
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal('Enter true or false for isNOK')
    })

    it('should respond with an error saying that informantSameAsCaller should be a boolean', async () => {
        reqData.call.reason.forEach(e => {
            e.informantSameAsCaller = "abcd"
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Enter true or false for informantSameAsCaller`)
    })

    it('should respond with an error saying that locationOfRemainId should be a number', async () => {
        reqData.call.reason.forEach(e => {
            e.locationOfRemainId = faker.random.word()
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Enter valid number for locationOfRemainId`)
    })

    it('should respond with an error saying that isLorSameAsCallerOrg should be a boolean', async () => {
        reqData.call.reason.forEach(e => {
            e.isLorSameAsCallerOrg = faker.random.word()
        })
        const res = await apiCall()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Enter true or false for isLorSameAsCallerOrg`)
    })

    it('should successfully create a call for someone has passed reason', async () => {
        const res = await apiCall()
        res.should.have.status(201);
    })
})

describe('POST /api/v1/calls AtNeed (LOR scenarios)', () => {
    it('should successfully create a call for someone has passed reason with isLorSameAsCallerOrg true', async () => {
        reqData = await getCallData()
        reqData.call.reason.forEach(e => {
            e.isLorSameAsCallerOrg = true
        })
        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.someOneHasPassed.forEach((e) => {
            e.decedent.PersonInformation.locationOfRemainId.should.equal(res.body.call.caller.organizationId)
        })
    })

    it('should successfully create a call for someone has passed reason with isLorSameAsCallerOrg true and searched org', async () => {
        reqData = await getCallData()
        const searchedOrg = await models.Organization.findOne({})
        reqData.call.caller.organizationId = searchedOrg.id
        reqData.call.reason.forEach(e => {
            e.isLorSameAsCallerOrg = true
        })
        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.someOneHasPassed.forEach((e) => {
            e.decedent.PersonInformation.locationOfRemainId.should.equal(res.body.call.caller.organizationId)
        })
    })

    it('should successfully create a call for someone has passed reason with isLorSameAsCallerOrg true and callFromOrganisation is false', async () => {
        reqData = await getCallData(1, false)
        reqData.call.reason.forEach(e => {
            e.isLorSameAsCallerOrg = true
        })
        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.someOneHasPassed.forEach((e) => {
            e.decedent.PersonInformation.locationOfRemainAddressId.should.equal(res.body.call.caller.PersonInformation.residentialAddressId)
        })
    })

    it('should successfully create a call for someone has passed reason with isLorSameAsCallerOrg false and searched org', async () => {
        reqData = await getCallData()
        const searchedOrg = await models.Organization.findOne({})
        reqData.call.reason.forEach(e => {
            e.locationOfRemainId = searchedOrg.id
        })
        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.someOneHasPassed.forEach((e) => {
            e.decedent.PersonInformation.locationOfRemainId.should.equal(searchedOrg.id)
        })
    })
})

describe('POST /api/v1/calls AtNeed (person lookup)', () => {
    after(async () => {
        try {
            await models.SomeOnePassed.destroy({ truncate: true })
            await models.Person.destroy({ truncate: true })
            await models.Note.destroy({ truncate: true })
            await models.Call.destroy({ where: {} })

        } catch (error) {
            console.log(error);
        }
    })

    before(async () => {
        reqData = await getCallData(1, false)
    })

    it('should successfully create a call for someone has passed reason from existing decedent', async () => {
        const existingDecedent = await models.SomeOnePassed.findOne()
        reqData.call.reason[0].decedent = {
            ...reqData.call.reason[0].decedent,
            id: existingDecedent.decedentId,
            firstName: 'Test',
            lastName: 'Test'
        }

        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(false)
        const testDecedent = res.body.call.someOneHasPassed.find(ele => ele.decedentId === existingDecedent.decedentId)
        testDecedent.decedentId.should.equal(existingDecedent.decedentId)
        testDecedent.decedent.firstName.should.equal('Test')
        testDecedent.decedent.lastName.should.equal('Test')
    })

    it('should successfully create a call for someone has passed reason from existing informant', async () => {
        const existingInformant = await models.SomeOnePassed.findOne()
        reqData.call.reason[0].informant = {
            ...reqData.call.reason[0].informant,
            id: existingInformant.informantId,
            firstName: 'TestInformant',
            lastName: 'TestInformant'
        }

        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(false)
        const testInformant = res.body.call.someOneHasPassed.find(ele => ele.informantId === existingInformant.informantId)
        testInformant.informantId.should.equal(existingInformant.informantId)
        testInformant.informant.firstName.should.equal('TestInformant')
        testInformant.informant.lastName.should.equal('TestInformant')
    })

    it('should successfully create a call for someone has passed reason when selected the exisiting caller', async () => {
        const exisitingPerson = await models.Person.findOne({
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    where: {
                        id: { [models.Sequelize.Op.ne]: null }
                    }
                }
            ]
        })
        reqData.call.caller = {
            ...reqData.call.caller,
            id: exisitingPerson.id,
            firstName: 'TestCaller',
            lastName: 'TestCaller'
        }

        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(false)
        res.body.call.caller.id.should.equal(exisitingPerson.id)
        res.body.call.caller.firstName.should.equal('TestCaller')
        res.body.call.caller.lastName.should.equal('TestCaller')
    })

    it('should successfully create a verified call for someone has passed reason when all persons are verified', async () => {
        reqData.call.reason = [
            {
                ...reqData.call.reason[0]
            }
        ]
        let idsToVerifiy = [
            reqData.call.caller.id,
            reqData.call.reason[0].decedent.id,
            reqData.call.reason[0].informant.id,
        ]
        await models.Person.update({ isVerified: true },
            { where: { id: { [models.Sequelize.Op.in]: idsToVerifiy } } }
        )

        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(true)
    })

    it('should successfully create a verified call for someone has passed reason when all persons are verified', async () => {
        reqData.call.reason = [
            {
                ...reqData.call.reason[0],
                informantSameAsCaller: true
            }
        ]

        const res = await apiCall()
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(true)
    })
})

