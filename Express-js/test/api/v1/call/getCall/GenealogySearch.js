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
        "call": {
            "callType": "callIn",
            "caller": {
                "prefix": "Mr",
                "firstName": "caller1",
                "lastName": "",
                "middleName": "first",
                "phone": "9812345890",
                "email": "caller@example.com",
                "languageId": 1,
                "organization": {
                    "name": "xyz",
                    "organizationTypeId": 1,
                    "address": {
                        "line1": "line1",
                        "line2": "line2",
                        'city': 'city',
                        'state': 'state',
                        'county': 'county',
                        'country': 'country',
                        'zipcode': '22222',
                        "addressTypeId": 2
                    }
                }
            },
            "callStatus": 1,
            "appointmentDateTime": "2019-12-26T12:57:41.151Z",
            "note": {
                "content": "aaaa",
                "resourceType": "Call"
            },
            "assignedToId": 2,
            "callReceivedLocationId": 1,
            "isCallFromOrganization": true,
            "reasonNote": {
                "content": "bbbb",
                "resourceType": "CallReason"
            },
            "reasonTypeId": 5,
            "reason": [{
                "decedent": {
                    "prefix": "Mr",
                    "firstName": "hari",
                    "middleName": "test",
                    "lastName": "test",
                    "aka": "test",
                    "dateOfBirth": "1999-12-31T18:30:00.000Z",
                    "dateOfDeath": "2019-02-13T18:30:00.000Z",
                    "relationshipId": 1
                },
                "isNok": true,
                "arrangerEmail": "hari@gmail.com"
            },
            {
                "decedent": {
                    "prefix": "Mr",
                    "firstName": "krishna",
                    "middleName": "test",
                    "lastName": "test",
                    "aka": "test",
                    "dateOfBirth": "1999-12-31T18:30:00.000Z",
                    "dateOfDeath": "2019-02-13T18:30:00.000Z",
                    "relationshipName": "pro"
                },
                "isNok": true,
                "arrangerEmail": "krishna@gmail.com"
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