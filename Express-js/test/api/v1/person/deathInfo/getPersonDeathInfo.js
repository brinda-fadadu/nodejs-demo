const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson
} = require('../../../../helper')

const { getCallData, createCallData } = require('../../../../schema/call')
const createDeathInfoObj = require('../../../../schema/deathinfo/createDeathInfo')

let authToken, onePortalId, personDeathInfoInputObj

describe('Get person death details', async () => {
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        personDeathInfoInputObj = await createDeathInfoObj()
        authToken = await genAuthToken(user)

        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        personId = callResponse.someOneHasPassed[0].DecedentId
        dateOfDeath = callResponse.someOneHasPassed[0].decedent.DateOfDeath
        const verifyData = {
            callId: callResponse.Identifier,
            personId: callResponse.someOneHasPassed[0].DecedentId,
            currentUserId: user.id,
            userType: 'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        console.log('Verification completed :::::::::', verificationResult)
        onePortalId = verificationResult.onePortalId
    })

    it('Get death deatails of a person with wrong oneportalId', async () => {
        let response = await chai.request(server)
            .get(`/api/v1/persons/cs-123/death-info`)
            .set('Authorization', authToken)
        response.should.have.status(404)
    })

    it('Get death deatails of a person (only location of remains data) with correct oneportalId', async () => {
        let response = await chai.request(server)
            .get(`/api/v1/persons/${onePortalId}/death-info`)
            .set('Authorization', authToken)
        response.should.have.status(200)
        response.body.should.have.property('result').and.to.be.an('object');
        response.body.result.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`);
        response.body.result.should.have.property('placeOfDeath').and.to.be.an('object');
        response.body.result.should.have.property('locationOfRemains').and.to.be.an('object');
        response.body.result.locationOfRemains.should.have.property('type').and.to.be.equal(`organization`);
        response.body.result.locationOfRemains.should.have.property('details').and.to.be.an('object');
        response.body.result.locationOfRemains.details.should.have.property('Address').and.to.be.an('object');
        response.body.result.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object');
    })

    it('should return success for update deathinfo api', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(personDeathInfoInputObj)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
    })

    it('Get death deatails of a person (get placeofdeath and location of remains) with correct oneportalId', async () => {
        let response = await chai.request(server)
            .get(`/api/v1/persons/${onePortalId}/death-info`)
            .set('Authorization', authToken)
        response.should.have.status(200)
        response.body.should.have.property('result').and.to.be.an('object');
        response.body.result.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`);
        response.body.result.should.have.property('placeOfDeath').and.to.be.an('object');
        response.body.result.placeOfDeath.should.have.property('type').and.to.be.equal(`address`);
        response.body.result.placeOfDeath.should.have.property('details').and.to.be.an('object');

        response.body.result.should.have.property('locationOfRemains').and.to.be.an('object');
        response.body.result.locationOfRemains.should.have.property('details').and.to.be.an('object');
        response.body.result.locationOfRemains.details.should.have.property('Address').and.to.be.an('object');
        response.body.result.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object');
    })

})
