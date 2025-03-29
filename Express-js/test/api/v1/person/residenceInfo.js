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
    "line1": "line 1",
    "line2": "line 2",
    'city': 'city',
    'state': 'state',
    'county': 'county',
    'country': 'country',
    'zipcode': '22222',
    "noOfYearsAtCountry": 10
}

describe('Get Person Residential Details', async () => {
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
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
        onePortalId = verificationResult.onePortalId
    })

    describe('# Test cases for getting residence info', function () {
        it('Should return Token not found response without sending the authToken', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${onePortalId}/caseInfo`)
                .set('authorization', '')
            response.should.have.status(401);
        })

        it('Get residential deatails of a person with wrong oneportalId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/cs-123/caseInfo`)
                .set('Authorization', authToken)
            response.should.have.status(404)
            response.body.should.have.property('error').to.equal('OnePortalId not found')
        })

        it('Get residential deatails of a person with correct oneportalId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${onePortalId}/caseInfo`)
                .set('Authorization', authToken)
            response.should.have.status(200)
            response.body.should.have.property('data').and.to.be.an('object')
            response.body.data.should.have.property('PersonInformation').and.to.be.an('object')
            response.body.data.PersonInformation.should.have.property('NoOfYearsStayed').to.be.a('null')
            response.body.data.PersonInformation.should.have.property('PersonAddress').to.be.a('null')
        })
    })

    describe('# Test cases for updating residence info', function () {
        it('Should return Token not found response without sending the authToken', async () => {
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('authorization', '')
                .send(reqData)
            response.should.have.status(401);
        })

        it('Should return 422 status by when no input is given', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('authorization', authToken)
            res.should.have.status(422);
        })

        it('Should return 404 when residential deatails of a person are updated with wrong oneportalId', async () => {
            let response = await chai.request(server)
                .put(`/api/v1/persons/cs-123/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(404)
            response.body.should.have.property('error').to.equal('OnePortalId not found')
        })

        it('Should return 422 when line1 is not given in the input', async () => {
            delete reqData.line1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
            response.body.should.have.property('error').to.be.equal('child "line1" fails because ["line1" is required]')
        })

        it('Should return 422 when cityId is not valid', async () => {
            reqData.line1 = "line1"
            reqData.cityId = 100
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when stateId is not valid', async () => {
            reqData.cityId = 1
            reqData.stateId = 100
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when countryId is not valid', async () => {
            reqData.stateId = 1
            reqData.countryId = 1000
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when countyId is not valid', async () => {
            reqData.countryId = 1
            reqData.countyId = 100
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
        })

        it('Should return 422 when noOfYearsAtCountry is not valid', async () => {
            reqData.countyId = 1
            reqData.noOfYearsAtCountry = -1
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(422)
            response.body.should.have.property('error').to.be.equal('No of years stayed in the country is not valid')
        })

        it('Should return 200 when residential deatails of a person are updated with valid input', async () => {
            reqData.noOfYearsAtCountry = 10
            let response = await chai.request(server)
                .put(`/api/v1/persons/${onePortalId}/residence-info`)
                .set('Authorization', authToken)
                .send(reqData)
            response.should.have.status(200)
            response.body.should.have.property('id')
            response.body.should.have.property('OnePortalId').to.equal(onePortalId)
            response.body.should.have.property('PersonInformation').and.to.be.an('object')
            response.body.PersonInformation.should.have.property('id')
            response.body.PersonInformation.should.have.property('NoOfYearsStayed').to.equal(reqData.noOfYearsAtCountry)
            response.body.PersonInformation.should.have.property('PersonAddress').and.to.be.an('object')
            response.body.PersonInformation.PersonAddress.should.have.property('line1').to.equal(reqData.line1)
            response.body.PersonInformation.PersonAddress.should.have.property('line2').to.equal(reqData.line2)
            response.body.PersonInformation.PersonAddress.should.have.property('city').to.equal(reqData.city)
            response.body.PersonInformation.PersonAddress.should.have.property('state').to.equal(reqData.state)
            response.body.PersonInformation.PersonAddress.should.have.property('country').to.equal(reqData.country)
            response.body.PersonInformation.PersonAddress.should.have.property('zipcode').to.equal(reqData.zipcode)
            response.body.PersonInformation.PersonAddress.should.have.property('county').to.equal(reqData.county)
        })

        it('Get residential deatails of a person after adding/updating them', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${onePortalId}/caseInfo`)
                .set('Authorization', authToken)
            response.should.have.status(200)
            response.body.should.have.property('data').and.to.be.an('object')
            response.body.data.should.have.property('PersonInformation').and.to.be.an('object')
            response.body.data.PersonInformation.should.have.property('NoOfYearsStayed').to.equal(reqData.noOfYearsAtCountry)
            response.body.data.PersonInformation.should.have.property('PersonAddress').and.to.be.an('object')
            response.body.data.PersonInformation.PersonAddress.should.have.property('line1').to.equal(reqData.line1)
            response.body.data.PersonInformation.PersonAddress.should.have.property('line2').to.equal(reqData.line2)
            response.body.data.PersonInformation.PersonAddress.should.have.property('city').to.equal(reqData.city)
            response.body.data.PersonInformation.PersonAddress.should.have.property('state').to.equal(reqData.state)
            response.body.data.PersonInformation.PersonAddress.should.have.property('country').to.equal(reqData.country)
            response.body.data.PersonInformation.PersonAddress.should.have.property('zipcode').to.equal(reqData.zipcode)
            response.body.data.PersonInformation.PersonAddress.should.have.property('county').to.equal(reqData.county)
        })
    })
})
