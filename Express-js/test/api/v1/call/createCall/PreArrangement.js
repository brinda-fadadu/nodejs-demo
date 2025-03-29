const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
let authToken
const models = require('../../../../../models/index')
const callerTest = require('./callerTest')
const { getCallData } = require('../../../../schema/call')


describe('POST /api/v1/calls - Pre Need', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        await callerTest(2)
        return
    })

    beforeEach(async () => {
        reqData = await getCallData(2)        
    })

    it('should successfully create a call for PreNeed reason', async () => {
        const res = await chai.request(server)
            .post('/api/v1/calls')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(201);
        res.body.should.have.property('success').and.to.be.equal(true)
    })

    it ('should respond with an error saying that beneficiary firstName is required', async () => {
        reqData.call.reason.forEach(e => e.beneficiary.firstName = "")
        const res = await chai.request(server)
            .post('/api/v1/calls')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`First Name is required`)
    })

    it ('should respond with an error saying that decedent relationshipId must be a number', async () => {
        reqData.call.reason.forEach(e => e.beneficiary.relationshipId = "test")
        const res = await chai.request(server)
            .post('/api/v1/calls')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child "call" fails because [child "reason" fails because ["reason" at position 0 fails because [child "beneficiary" fails because [child "relationshipId" fails because ["relationshipId" must be a number]]]]]`)
    })
    
    it('should successfully create a call for PN reason when isCallFromOrganisation is false', async () => {
        reqData.call.isCallFromOrganization = false
        reqData.call.caller.address = {
            ...reqData.call.caller.organization.address
        }
        delete reqData.call.caller.organization

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
    })


})

describe('POST /api/v1/calls - Pre Need (lookup)', () => {

    after(async () => {
        try {
            await models.PreArrangementReason.destroy({ truncate: true })
            await models.Person.destroy({ truncate: true })
            await models.Note.destroy({ truncate: true })
            await models.Address.destroy({ truncate: true })
            await models.PersonInfo.destroy({ truncate: true })
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log(error);
        }
    })

    it('should successfully create a call from existing beneficiary', async () => {
        const existingBeneficiary = await models.PreArrangementReason.findOne()
        reqData.call.reason[0].beneficiary = {
            ...reqData.call.reason[0].beneficiary,
            id: existingBeneficiary.beneficiaryId,
            firstName: 'Test',
            lastName: 'Test'
        }

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
        const testBeneficiary = res.body.call.preNeedReason.find(ele => ele.beneficiaryId === existingBeneficiary.beneficiaryId)
        testBeneficiary.beneficiaryId.should.equal(existingBeneficiary.beneficiaryId)
        testBeneficiary.beneficiary.firstName.should.equal('Test')
        testBeneficiary.beneficiary.lastName.should.equal('Test')
    })
    
    it('should successfully create a call for PN reason when selected the exisiting caller with personInfo', async () => {
        const exisitingPerson = await models.Person.findOne({
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    where: {
                        id: {[models.Sequelize.Op.ne]: null}
                    }
                }
            ]
        })
        reqData.call.caller = {
            ...reqData.call.caller,
            id: exisitingPerson.id,
            firstName: 'TestCaller',
            lastName: 'TestCaller',
            address: {
                ...reqData.call.caller.address,
                line1: 'testLine'
            }
        }

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(false)
        res.body.call.caller.id.should.equal(exisitingPerson.id)
        res.body.call.caller.firstName.should.equal('TestCaller')
        res.body.call.caller.lastName.should.equal('TestCaller')
        res.body.call.CallerAddress.line1.should.equal('testLine')
    })

    it('should successfully create a call for PN reason when selected the exisiting caller without personInfo', async () => {
        const exisitingPerson = await models.Person.findOne()
        reqData.call.caller = {
            ...reqData.call.caller,
            id: exisitingPerson.id,
            firstName: 'TestCaller',
            lastName: 'TestCaller',
            address: {
                ...reqData.call.caller.address,
                line1: 'testLine'
            }
        }

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(false)
        res.body.call.caller.id.should.equal(exisitingPerson.id)
        res.body.call.caller.firstName.should.equal('TestCaller')
        res.body.call.caller.lastName.should.equal('TestCaller')
        res.body.call.CallerAddress.line1.should.equal('testLine')
    })

    it('should successfully create a verified call for PN reason when all persons are verified', async () => {
        reqData.call.reason = [
            {
                ...reqData.call.reason[0]
            }
        ]
        let idsToVerifiy = [
            reqData.call.caller.id,
            reqData.call.reason[0].beneficiary.id,
        ]
        await models.Person.update({ isVerified: true },
            { where: { id: { [models.Sequelize.Op.in]: idsToVerifiy } } }
        )

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
        res.body.call.isVerified.should.equal(true)
    })
})

