const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    getCities,
    getStates,
    getLanguages,
    getRelations,
    getAddressTypes,
    getCountries,
    getOrganizationTypes,
    getCallReasonTypes
} = require('../../../helper')
const moment = require('moment')
const faker = require('faker')
let user, authToken, decendentOnePortalId, reqData;

describe('POST /api/v1/calls', function () {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        try {
            let cities = await getCities()
            let languages = await getLanguages()
            let states = await getStates()
            let countries = await getCountries()
            let addressTypes = await getAddressTypes()
            let user = await addTestUser()
            let relations = await getRelations()
            let organizationTypes = await getOrganizationTypes()
            authToken = genAuthToken(user);
            let reasonTypes = getCallReasonTypes()
            let anReqData = {
                'call': {
                    'callType': 'Call',
                    'caller': {
                        'prefix': faker.name.prefix(),
                        'firstName': faker.name.firstName(),
                        'lastName': faker.name.lastName(),
                        'middleName': faker.name.findName(),
                        'phone': faker.phone.phoneNumberFormat(1),
                        'email': faker.internet.email(),
                        'languageId': languages['English'],
                        'organization': {
                            'name': 'Xyz',
                            'organizationTypeId': organizationTypes['Hospital'],
                            'address': {
                                'line1': faker.address.streetName(),
                                'line2': faker.address.streetName(),
                                'city': faker.address.city(),
                                'state': faker.address.state(),
                                'county': faker.address.county(),
                                'country': faker.address.country(),
                                'zipcode': faker.address.zipCode(),
                                'addressTypeId': addressTypes['Residential']
                            }
                        }
                    },
                    'callStatus': 1,
                    'appointmentDateTime': moment().add(1, 'day').format(),
                    'note': [{
                        "content": faker.lorem.sentences(),
                        "resourceType": "Call",
                        "createdAt": moment().format()
                    }, {
                        "content": faker.lorem.sentences(),
                        "resourceType": "Call",
                        "createdAt": moment().format()
                    }],
                    'reasonNote': [{
                        "content": faker.lorem.sentences(),
                        "resourceType": "CallReason",
                        "createdAt": moment().format()
                    }],
                    'assignedToId': user.id,
                    'callReceivedLocationId': 1,
                    'isCallFromOrganization': true,
                    'reasonTypeId': 1,
                    'reason': [{
                        'decedent': {
                            'prefix': faker.name.prefix(),
                            'firstName': faker.name.firstName(),
                            'lastName': faker.name.lastName(),
                            'middleName': faker.name.findName(),
                            'dateOfBirth': moment().subtract(60, 'year').format(),
                            'dateOfDeath': moment().subtract(1, 'day').format(),
                            'relationshipId': relations['Aunt']
                        },
                        'isReadyForPickup': true,
                        'locationOfRemain': {
                            'name': faker.address.streetName(),
                            'organizationTypeId': organizationTypes['Hospital'],
                            'address': {
                                'line1': faker.address.streetName(),
                                'line2': faker.address.streetName(),
                                'city': faker.address.city(),
                                'state': faker.address.state(),
                                'county': faker.address.county(),
                                'country': faker.address.country(),
                                'zipcode': faker.address.zipCode(),
                                'addressTypeId': addressTypes['Organization']
                            }
                        },
                        'preNeedFuneralInfo': 'funeral',
                        'preNeedCemetryInfo': 'cemetry',
                        'isNok': true,
                        'informantSameAsCaller': false,
                        'informant': {
                            'prefix': faker.name.prefix(),
                            'firstName': faker.name.firstName(),
                            'lastName': faker.name.lastName(),
                            'middleName': faker.name.findName(),
                            'email': faker.internet.email(),
                            'phone': faker.phone.phoneNumberFormat(1),
                            'relationshipId': relations['Aunt']
                        },
                        'arrangerEmail': faker.internet.email(),
                        'requiredService': 'Funeral',
                        'isNok': true,
                        'informantSameAsCaller': false
                    }
                    ]
                }
            }

            // Create AN reason
            const anCreationRes = await chai.request(server)
                .post('/api/v1/calls')
                .set('authorization', authToken)
                .send(anReqData)
            let callIdentifier = anCreationRes.body.call.Identifier
            let decedentId = anCreationRes.body.call.someOneHasPassed[0].decedent.id

            let verifyReqData = {
                'person': {
                    'personId': decedentId,
                    'userType': 'Decedent',
                    'reasonId': 1
                }
            }
            // Verfiy the person
            const verificationRes = await chai.request(server)
                .post('/api/v1/calls/' + callIdentifier + '/verify_persons')
                .set('authorization', authToken)
                .send(verifyReqData)
            console.log(verificationRes.body)
            // Take required details for arrangement creation
            decendentOnePortalId = verificationRes.body.data.onePortalId

            reqData = {
                'arrangementType': 1
            }
            //done()
            return
        } catch (err) {
            console.log('Error')
            console.log(err)
            process.exit()
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/persons/abc/arrangement`)
            .set("authorization", "")
            .send(reqData)
        console.log(res.body)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return error message for invalid one portal id', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/persons/abc/arrangement`)
            .set("authorization", authToken)
            .send(reqData)
        console.log(res.body)
        res.body.should.have.property('error').and.to.be.equal("PERSON_NOT_AVAILABLE");
    })

    it('should create arrangement successfully', async function () {
        const res = await chai.request(server)
            .post('/api/v1/persons/' + decendentOnePortalId + '/arrangement')
            .set("authorization", authToken)
            .send(reqData)
        console.log(res.body)
        res.should.have.status(201);
    })

    it('should return error if try to create arrangement for same person again', async function () {
        const res = await chai.request(server)
            .post('/api/v1/persons/' + decendentOnePortalId + '/arrangement')
            .set("authorization", authToken)
            .send(reqData)
        console.log(res.body)
        res.body.should.have.property('error').and.to.be.equal("ARRANGEMENT_ALREADY_CREATED");
    })
})