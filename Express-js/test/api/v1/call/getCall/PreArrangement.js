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
                "firstName": "Jack",
                "lastName": "Rayan",
                "middleName": "M",
                "phone": "9812345890",
                "email": "user@example.com",
                "languageId": 1,
                "organization": {
                    "name": "one org",
                    "organizationTypeId": 1,
                    "address": {
                        "line1": "khkj",
                        "line2": "jhk",
                        'city': 'city',
                        'state': 'state',
                        'county': 'county',
                        'country': 'country',
                        'zipcode': '22222'
                    }
                }
            },
            "callStatus": 1,
            "appointmentDateTime": "2019-12-26T12:57:41.151Z",
            "note": {
                "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                "resourceType": "Call"
            },
            "assignedToId": 2,
            "callReceivedLocationId": 1,
            "isCallFromOrganization": true,
            "reasonNote": {
                "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                "resourceType": "CallReason"
            },
            "reasonTypeId": 2,
            "reason": [{
                "beneficiary": {
                    "isSelf": true,
                    "prefix": "Mr",
                    "firstName": "jake",
                    "lastName": "peralta",
                    "middleName": "M",
                    "dateOfBirth": "2019-02-20T08:21:56.276Z",
                    "relationshipId": 1
                },
                "needFuneralService": true,
                "needCemetryService": true,
                "isExistingPreNeed": true,
                "funeralContractNumber": "skjhf23",
                "cemetryContractNumber": "askdjh234"
            },
            {
                "beneficiary": {
                    "isSelf": true,
                    "prefix": "Mr",
                    "firstName": "kjdhfdkj",
                    "lastName": "asdlkjasd",
                    "middleName": "M",
                    "dateOfBirth": "2019-02-20T08:21:56.276Z",
                    "relationshipId": 3,
                    "relationshipName": "newRelations"
                },
                "needFuneralService": true,
                "needCemetryService": true,
                "isExistingPreNeed": true,
                "funeralContractNumber": "sdfs7df",
                "cemetryContractNumber": "sdf34234"
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