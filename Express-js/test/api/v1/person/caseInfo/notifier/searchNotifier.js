const {
    chai,
    server,
    addTestUser,
    genAuthToken,   
    verifyPerson,
    getLocations,
} = require('../../../../../helper')

process.env.JWT_SECRET_TOKEN = 'ABCD'
const _ = require('underscore')
const {getCallData, createCallData} = require('../../../../../schema/call')
const createNotifier = require('../../../../../../routes/person/caseInfo/notifier')
let authToken, onePortalId, createdNotifier


describe('Test Cases for Search Notifier', async () => {    
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        locations = await getLocations()        
        authToken = await genAuthToken(user)
        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        const verifyData = {
            callId: callResponse.Identifier,
            personId: callResponse.someOneHasPassed[0].DecedentId,
            currentUserId: user.id,
            userType:'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        onePortalId = verificationResult.onePortalId
        notifierData = {
            "firstName": "Notifier First Name",
            "middleName": "Notifier Middle Name",
            "lastName": "Notifier Last Name",
            "relationId": 2,
            "phoneNumber": "1234567899",
            "secondaryPhoneNumber": "1234567899",
            "isOrganization": true,
            "aka":"same as known",
            "email":"notifier@abcd.com",
            "organization": {
                "organizationTypeId": 1,
                "name": "dummy notifier org",
                "address": {
                    "line1": "line 1",
                    "line2": "line 2",
                    'city': 'city',
                    'state': 'state',
                    'county': 'county',
                    'country': 'country',
                    'zipcode': '22222',
                }
            },
            "address":{}
        }
        createdNotifier = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/notifier-info`)
            .set('authorization', authToken)
            .send(notifierData)
    })

    it('1 Should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search?searchText=first&organizationId=${createdNotifier.body.result.organizationId}`)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('2 Should return error when query params are not sent in request', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('message').to.equal('Input required');
    })

    it('3 Should return error when searchText is not sent in request', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search?organizationId=${createdNotifier.body.result.organizationId}`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').to.equal('child "searchText" fails because ["searchText" is required]');
    })

    it('4 Should return error when organizationId is not sent in request', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search?searchText=first`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').to.equal('child "organizationId" fails because ["organizationId" is required]');
    })

    it('5 Should return error when invalid organizationId is sent in request', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search?searchText=first&organizationId=0`)
            .set('authorization', authToken)
        res.should.have.status(422);
    })

    it('6 Should return success when valid organizationId is sent in request', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/notifier-info/search?searchText=first&organizationId=${createdNotifier.body.result.organizationId}`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.property('result').and.to.be.an('array')
    })
})
