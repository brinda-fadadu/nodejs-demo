const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson
} = require('../../../helper')

const { getCallData, createCallData } = require('../../../schema/call')

let authToken, onePortalId
let reqData = {
    "firstName": "test firstname",
    "middleName": "test middlename",
    "lastName": "test lastname",
    "relationId": 2,
    "phoneNumber": "1234567890",
    "secondaryPhoneNumber": "",
    "isOrganization": false,
    "address": {
        "line1": "line 1 address",
        "line2": "line 2 address",
        "city": "Adjuntas",
        "state": "New York",
        "country": "United States",
        "zipcode": "00601",
        "county": "County"
    }
}

describe('Get Notifier details and update notifier deatails in OPI section', async () => {
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        authToken = await genAuthToken(user)
        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        personId = callResponse.someOneHasPassed[0].decedentId
        dateOfDeath = callResponse.someOneHasPassed[0].decedent.dateOfDeath
        const verifyData = {
            callId: callResponse.identifier,
            personId: callResponse.someOneHasPassed[0].decedentId,
            currentUserId: user.id,
            userType: 'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        onePortalId = verificationResult.onePortalId
    })

    describe('# Test cases for getting notifier info', function () {
        it('Should return Token not found response without sending the authToken', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('authorization', '')
            response.should.have.status(401);
        })

        it('Get notifier deatails of a person with wrong oneportalId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/cs-123/notifier-info`)
                .set('Authorization', authToken)
            response.should.have.status(404)
            response.body.should.have.property('message').to.equal('No Person found for the given OPI..')
        })

        it('Get notifier deatails of a person with correct oneportalId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
            response.should.have.status(200)
            response.body.should.have.property('result').and.to.be.an('object')
            response.body.should.have.property('result').and.to.be.an('object').to.be.empty
        })
    })

    describe('# Test cases for updating notifier info', function () {
        it('Should return Token not found response without sending the authToken', async () => {
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('authorization', '')
                .send(reqData)
            response.should.have.status(401);
        })

        it('Should return 422 status by when no input is given', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('authorization', authToken)
            res.should.have.status(422);
            res.body.should.have.property('message').to.equal('Input required')
        })

        it('Should return 404 when residential deatails of a person are updated with wrong oneportalId', async () => {
            let response = await chai.request(server)
                .put(`/api/v1/persons/cs-123/notifier-info`)
                .set('Authorization', authToken)
            response.should.have.status(404)
            response.body.should.have.property('error').to.equal('OnePortalId not found')
        })

        it('Should return 422 when phone number is not valid', async () => {
            reqData.phoneNumber = "9876543"
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
            response.body.should.have.property('error').to.equal('Phone number is invalid')
        })

        it('Should return 422 when city is not valid', async () => {
            reqData.phoneNumber = "1234567890"
            reqData.address.city = 1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when state is not valid', async () => {
            reqData.address.city = "Adjuntas"
            reqData.address.state = 1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when country is not valid', async () => {
            reqData.address.state = "New York"
            reqData.address.country = 1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when county is not valid', async () => {
            reqData.address.country = "United States"
            reqData.address.county = 1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 200 when notifier deatails of a person are updated with valid input', async () => {
            reqData.address.county = "County"
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/notifier-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(200)
            response.body.should.have.property('result').and.to.be.an('object')
            response.body.result.should.have.property('id')
            response.body.result.should.have.property('firstName').to.equal(reqData.firstName)
            response.body.result.should.have.property('middleName').to.equal(reqData.middleName)
            response.body.result.should.have.property('lastName').to.equal(reqData.lastName)
            response.body.result.should.have.property('phoneNumber').to.equal(reqData.phoneNumber)
            response.body.result.should.have.property('secondaryPhoneNumber').to.equal(reqData.secondaryPhoneNumber)
            response.body.result.should.have.property('isOrganization').to.equal(reqData.isOrganization)
            response.body.result.should.have.property('relation').and.to.be.an('object')
            response.body.result.relation.should.have.property('id').to.equal(reqData.relationId)
            response.body.result.should.have.property('caseRoles').to.be.an('array')
            response.body.result.should.have.property('personAddress').and.to.be.an('object')
            response.body.result.should.have.property('personOrganizationAddress').to.equal(null)
            response.body.result.personAddress.should.have.property('Address').and.to.be.an('object')
            response.body.result.personAddress.object.should.have.property('line1').to.equal(reqData.address.line1)
            response.body.result.personAddress.object.should.have.property('line2').to.equal(reqData.address.line2)
            response.body.result.personAddress.object.should.have.property('state').to.equal(reqData.address.state)
            response.body.result.personAddress.object.should.have.property('city').to.equal(reqData.address.city)
            response.body.result.personAddress.object.should.have.property('country').to.equal(reqData.address.country)
            response.body.result.personAddress.object.should.have.property('county').to.equal(reqData.address.county)
            response.body.result.personAddress.object.should.have.property('zipcode').to.equal(reqData.address.zipcode)
        })

    })
})
