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
                "organizationId": 1,
                "organization": {
                    "name": "Xyz",
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
                "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            },
            "assignedToId": 2,
            "callReceivedLocationId": 1,
            "isCallFromOrganization": true,
            "reasonNote": {
                "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                "resourceType": "CallReason"
            },
            "reasonTypeId": 5,
            "reason": [{
                "isFollowUpRequired": true,
                "note": {
                    "content": "qwefqwhjefb"
                },
                "email": "wal@gmail.com",
                "otherReasonFollowUps": [
                    1
                ]
            }]
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