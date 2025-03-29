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

const advanceSearchReqData = {
    "matchCriteria": "all",
    "page": 1,
    "limit": 2
}

let authToken, user, cities, languages, states, countries, callReceivedLocations, relationsIds, createANCallReqData, anCallIdentifer, callerId, anCallResp

describe('Test Cases for Advanced Search', () => {
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
            console.log(anCallResp)
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
            .post('/api/v1/persons/search/advance')
            .set("authorization", "")
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('Should return status code 422 without request data', async () => {
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Input required`)
    })

    it('Should return status 422 if wrong input is sent in matchCriteria', async () => {
        let reqData = advanceSearchReqData
        reqData.matchCriteria = 'abc'
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child \"matchCriteria\" fails because [\"matchCriteria\" must be one of [all, some]]`)
    })

    it('Should return status 422 if wrong input is sent in isVerified', async () => {
        let reqData = advanceSearchReqData
        reqData.matchCriteria = 'all'
        reqData.isVerified = 'abc'
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal('child "isVerified" fails because ["isVerified" must be a boolean]')
    })

    it('Should return status 422 if wrong input is sent in page', async () => {
        let reqData = advanceSearchReqData
        delete reqData.isVerified
        reqData.page = 0
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child \"page\" fails because [\"page\" must be larger than or equal to 1]`)
    })

    it('Should return status 422 if wrong input is sent in limit', async () => {
        let reqData = advanceSearchReqData
        reqData.page = 1
        reqData.limit = 0
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child \"limit\" fails because [\"limit\" must be larger than or equal to 1]`)
    })

    it('Should return status 422 if atleast one elememt is not present in fieldCriterias', async () => {
        let reqData = advanceSearchReqData
        reqData.page = 1
        reqData.limit = 10
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child \"fieldCriterias\" fails because ["fieldCriterias" is required]`)
    })

    it('Should return status 422 if atleast one elememt is not present in fieldCriterias', async () => {
        let reqData = advanceSearchReqData
        reqData.fieldCriterias = []
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child \"fieldCriterias\" fails because [\"fieldCriterias\" must contain at least 1 items]`)
    })

    it('should return success with 0 records if search is done with all correct input and unmatching input', async function () {
        let reqData = advanceSearchReqData
        reqData.fieldCriterias = [
            {
                "field": "simpleSearch",
                "value": verifyCallResp.onePortalId
            }, {
                "field": "address",
                "value": "Mondovi"
            }, {
                "field": "phone",
                "condition": "is",
                "value": "8989898989"
            }, {
                "field": "birthDate",
                "value": {
                    "startDate": "2019-06-05"
                }
            }, {
                "field": "deathDate",
                "value": {
                    "startDate": "2019-06-01",
                    "endDate": "2019-06-10"
                }
            }
        ]
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set("authorization", authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('totalResults').to.equal(0)
        res.body.should.have.property('results').to.be.an('array').that.is.empty
    })

    it('should return success with 0 records if search is done with all correct input and matching input', async function () {
        let reqData = advanceSearchReqData
        reqData.fieldCriterias = [
            {
                "field": "simpleSearch",
                "value": verifyCallResp.onePortalId
            }, {
                "field": "address",
                "value": anCallResp.CallerAddress.dataValues.line1
            }, {
                "field": "phone",
                "condition": "is",
                "value": anCallResp.caller.phoneNumber
            }
        ]
        const res = await chai.request(server)
            .post('/api/v1/persons/search/advance')
            .set("authorization", authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('totalResults').to.not.equal(0)
        res.body.should.have.property('results').to.be.an('array').that.is.not.empty
    })
})