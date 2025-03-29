const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
let authToken, callIdentifier

function reqData() {
    return {
        'call': {
            'callType': 'callIn',
            'caller': {
                'prefix': 'Mr',
                'firstName': 'caller1',
                'lastName': '',
                'middleName': 'first',
                'phone': '9812345890',
                'email': 'caller@example.com',
                'languageId': 1,
                'organizationId': 1,
                'organization': {
                    'name': 'xyzs',
                    'organizationTypeId': 1,
                    'address': {
                        'line1': 'line1',
                        'line2': 'line2',
                        'city': 'city',
                        'state': 'state',
                        'county': 'county',
                        'country': 'country',
                        'zipcode': '22222',
                        'addressTypeId': 2
                    }
                }
            },
            'callStatus': 1,
            'appointmentDateTime': '2019-02-28T12:57:41.151Z',
            'note': {
                'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
            },
            'reasonNote': {
                'content': 'Reason note'
            },
            'assignedToId': 2,
            'callReceivedLocationId': 1,
            'isCallFromOrganization': true,
            'reasonTypeId': 1,
            'reason': [{
                    'decedent': {
                        'prefix': 'Mr',
                        'firstName': 'decedent1',
                        'lastName': 'first',
                        'middleName': 'test',
                        'dateOfBirth': '2019-02-02T08:49:02.274Z',
                        'dateOfDeath': '2019-02-20T08:49:02.274Z',
                        'relationshipId': 1
                    },
                    'isReadyForPickup': true,
                    'locationOfRemain': {
                        'name': 'lor',
                        'address': {
                            'line1': 'lor1',
                            'line2': 'lor2',
                            'city': 'city',
                            'state': 'state',
                            'county': 'county',
                            'country': 'country',
                            'zipcode': '22222',
                            'addressTypeId': 1
                        }
                    },
                    'preNeedFuneralInfo': 'funeral',
                    'preNeedCemetryInfo': 'cemetry',
                    'isNok': true,
                    'informantSameAsCaller': false,
                    'informant': {
                        'prefix': 'Mr',
                        'firstName': 'informant1',
                        'middleName': 'first',
                        'lastName': 'test',
                        'email': 'informant@example.com',
                        'phone': '+1 9812345890',
                        'relationshipId': 1
                    },
                    'arrangerEmail': 'arranger@example.com',
                    'requiredService': 'Funeral'
                },
                {
                    'decedent': {
                        'prefix': 'Mr',
                        'firstName': 'decedent2',
                        'lastName': 'Rayan',
                        'middleName': 'M',
                        'dateOfBirth': '2019-02-02T08:49:02.274Z',
                        'dateOfDeath': '2019-02-20T08:49:02.274Z',
                        'relationshipId': 1
                    },
                    'isReadyForPickup': true,
                    'locationOfRemain': {
                        'name': 'lor2',
                        'address': {
                            'line1': 'string',
                            'line2': 'string',
                            'city': 'city',
                            'state': 'state',
                            'county': 'county',
                            'country': 'country',
                            'zipcode': '22222',
                            'addressTypeId': 1
                        }

                    },
                    'preNeedFuneralInfo': 'string',
                    'preNeedCemetryInfo': 'string',
                    'isNok': true,
                    'informantSameAsCaller': false,
                    'informant': {
                        'prefix': 'Mr',
                        'firstName': 'informant2',
                        'middleName': 'string',
                        'lastName': 'Rayan',
                        'email': 'informant2@example.com',
                        'phone': '+1 9812345890',
                        'relationshipId': 1
                    },
                    'arrangerEmail': 'arranger2@example.com',
                    'requiredService': 'Funeral'
                }
            ]
        }
    }
}
describe('POST /api/v1/calls', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);

        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        callIdentifier = res.result.Identifier
        return
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get('/api/v1/cases/' + callIdentifier)
            .set("authorization", "")
            res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return error message if the case id is wrong', async function () {
        const res = await chai.request(server)
            .get('/api/v1/cases/abcd')
            .set("authorization", authToken)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.equal("Call information not found")
    })

    it('should return success if all input is correct', async function () {
        const res = await chai.request(server)
            .get('/api/v1/cases/' + callIdentifier)
            .set("authorization", authToken)
            res.should.have.status(200);
            res.body.should.have.property('data').and.to.be.an("object");
    })
})