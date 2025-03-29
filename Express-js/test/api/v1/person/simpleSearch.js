const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    getCities,
    getStates,
    getLanguages,
    getRelations,
    getAddressTypes,
    getCountries,
    getPersonCount,
    getANCount
} = require('../../../helper')
const seedData = require('../../../../config/seed').seed
const createCall = require('../../../../controllers/Calls/CreateCall/create')
const verifyCall = require('../../../../controllers/Calls/VerifyCall/verifyCall')
const moment = require('moment')
const faker = require('faker')
process.env.JWT_SECRET_TOKEN = "xyz-dev-wal"

let authToken, user, cities, languages, states, countries, callReceivedLocations, relationsIds, createANCallReqData, anCallIdentifer, callerId, anCallResp

describe('Test Cases for Simple Search', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            cities = await getCities()
            languages = await getLanguages()
            console.log(languages)
            states = await getStates()
            countries = await getCountries()
            addressTypes = await getAddressTypes()
            callReceivedLocations = Object.keys(
                seedData.CallReceivedLocations
            ).map(Number)
            relationsIds = await getRelations()
            personIdNotExists = await getPersonCount() + faker.random.number()
            anReasonIdNotExists = await getANCount() + faker.random.number()
            createANCallReqData = {
                "call": {
                    "callType": "Call",
                    "caller": {
                        "prefix": faker.name.prefix(),
                        "firstName": faker.name.firstName(),
                        "lastName": faker.name.lastName(),
                        "middleName": faker.name.lastName(),
                        "DateOfBirth": moment().subtract(30, 'year').format(),
                        "phone": faker.phone.phoneNumberFormat(1),
                        "email": faker.internet.email(),
                        "languageId": languages['English'],
                        "isVerified": false,
                        "address": {
                            "line1": faker.address.streetName(),
                            "line2": faker.address.streetAddress(),
                            'city': faker.address.city(),
                            'state': faker.address.state(),
                            'county': faker.address.county(),
                            'country': faker.address.country(),
                            'zipcode': faker.address.zipCode(),
                        }
                    },
                    "appointmentDateTime": moment().add(1, 'day').format(),
                    "note": [{}],
                    "reasonNote": [{}],
                    "assignedToId": user.id,
                    "callReceivedLocationId": callReceivedLocations[0],
                    "isCallFromOrganization": false,
                    "callStatus": 1,
                    "reasonTypeId": 1,
                    "isVerified": false,
                    "reason": [{
                        "decedent": {
                            "prefix": faker.name.prefix(),
                            "firstName": faker.name.firstName(),
                            "lastName": faker.name.lastName(),
                            "middleName": faker.name.lastName(),
                            "dateOfBirth": moment().subtract(60, 'year').format(),
                            "dateOfDeath": moment().subtract(1, 'day').format(),
                            "isVerified": false
                        },
                        "isReadyForPickup": true,
                        "isFuneralPN": false,
                        "isCemeteryPN": false,
                        "isNok": false,
                        "informantSameAsCaller": false,
                        "informant": {
                            "prefix": faker.name.prefix(),
                            "firstName": faker.name.firstName(),
                            "middleName": faker.name.lastName(),
                            "lastName": faker.name.lastName(),
                            "email": faker.internet.email(),
                            "phone": faker.phone.phoneNumberFormat(1),
                            "DateOfBirth": moment().subtract(30, 'year').format(),
                            "relationshipId": relationsIds['Aunt'],
                            "isVerified": false
                        },
                        "arrangerEmail": faker.internet.email(),
                    }]
                }
            }
            anCallResp = await createCall.createCall(createANCallReqData.call)
            anCallIdentifer = anCallResp.identifier
            callerId = anCallResp.caller.id
            let verifyCallReqData = {
                params: {
                    callId: anCallIdentifer
                },
                body: {
                    person: {
                        personId: callerId,
                        userType: "Caller"
                    }
                },
                currentUser: {
                    id: user.id
                }
            }
            verifyCallResp = await verifyCall.verifyCall(verifyCallReqData)
            console.log(verifyCallResp)
            return
        }
        catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get('/api/v1/persons/search/simple?q=' + verifyCallResp.onePortalId)
            .set("authorization", "")
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return empty array if records are not found', async function () {
        const res = await chai.request(server)
            .get('/api/v1/persons/search/simple?q=abcd')
            .set("authorization", authToken)
        res.should.have.status(200);
        res.body.should.have.property('totalResults').and.to.be.equal(0)
        res.body.should.have.property('results').to.be.an('array').that.is.empty;
    })

    it('should return error if invalid isVerified value is given in query params', async function () {
        const res = await chai.request(server)
            .get('/api/v1/persons/search/simple?q=' + verifyCallResp.onePortalId + '&page=1&limit=1&isVerified=abcd')
            .set("authorization", authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').to.equal('child "isVerified" fails because ["isVerified" must be a boolean]')
    })

    it('should return success if search is done with correct onePortalId', async function () {
        const res = await chai.request(server)
            .get('/api/v1/persons/search/simple?q=' + verifyCallResp.onePortalId + '&page=1&limit=1')
            .set("authorization", authToken)
        res.should.have.status(200);
        res.body.should.have.property('totalResults').to.not.equal(0)
        res.body.should.have.property('results').to.be.an('array').that.is.not.empty
    })

    it('should return success if search is done with correct name', async function () {
        const res = await chai.request(server)
            .get('/api/v1/persons/search/simple?q=' + createANCallReqData.call.caller.firstName + ' ' + createANCallReqData.call.caller.middleName + '&page=1&limit=1')
            .set("authorization", authToken)
        res.should.have.status(200);
        res.body.should.have.property('totalResults').to.not.equal(0)
        res.body.should.have.property('results').to.be.an('array').that.is.not.empty
    })
})