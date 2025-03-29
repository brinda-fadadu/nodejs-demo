const {
    chai,
    server,
    addTestUser,
    genAuthToken,   
    verifyPerson,
    getLocations,
} = require('../../../../helper')

const _ = require('underscore')
const {getCallData, createCallData} = require('../../../../schema/call')
let authToken, personId, contactId

let reqData = {
    "contactType": 2,
	"staffId": 3,
	"roleIds": [16]
}

describe('CL Staff Contacts', async () => {    
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        locations = await getLocations()        
        authToken = await genAuthToken(user)
        
        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        personId = callResponse.someOneHasPassed[0].DecedentId
        const verifyData = {
            callId: callResponse.Identifier,
            personId: personId,
            currentUserId: user.id,
            userType:'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        await verifyPerson(verifyData)
    })

    describe('Create CL Staff Contacts', async () => {

        it('1 Should return Token not found response without sending the authToken', async () => {
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', '')
                .send(reqData)
            res.should.have.status(401);
        })
    
        it('2 Should return status code 422 without request data', async () => {
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
                .send()
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.an('object')
        })

        it('3 Should return error when invalid personId is given in params', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/abcd/contacts/${contactId}`)
                .set('authorization', authToken)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.a('object');
        })

        it('4 Should return error when invalid contactId is given in params', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/abcd`)
                .set('authorization', authToken)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.a('object');
        })
    
        it('5 Should return error when Invalid staffId is given in input', async () => {
            reqData.staffId = 0
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(422);
        })
    
        it('6 Should return error when Invalid roleId is given in input', async () => {
            reqData.staffId = 2,
            reqData.roleIds = [4]
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(422);
            res.body.should.have.property('error').and.to.be.equal("roleId must be one of [Pallbearers, Honorary Pallbearers]")
        })
    
        it('7 Should return success when valid input is given', async () => {
            reqData.roleIds = [3]
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(200);
            res.body.should.have.property('contactType').to.be.equal(reqData.contactType);
            res.body.should.have.property('personId').to.be.equal(personId.toString());
            res.body.should.have.property('staffId').to.be.equal(reqData.staffId);
            contactId = res.body.id
        })
    
        it('8 Should return error while adding same role and staff to same case', async () => {
            const res = await chai.request(server)
                .post(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.equal("This role is already assigned to this staff")
        })
    })

    describe('Get list of CL Staff Contacts', async () => {

        it('1 Should return Token not found response without sending the authToken', async () => {
            const res = await chai.request(server)
                .get(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', '')
            res.should.have.status(401);
        })
    
        it('2 Should return error when invalid personId is given in params', async () => {
            const res = await chai.request(server)
                .get(`/api/v1/persons/abcd/contacts`)
                .set('authorization', authToken)
            res.should.have.status(422);
            res.body.should.have.property('error').to.be.equal('PersonId must be a integer')
        })
    
        it('3 Should return error when Invalid staffId is given in input', async () => {
            reqData.staffId = 0
            const res = await chai.request(server)
                .get(`/api/v1/persons/${personId}/contacts`)
                .set('authorization', authToken)
            res.should.have.status(200);
            res.body.should.have.property('count').to.equal(1);
            res.body.should.have.property('contacts').and.to.be.an('array');
            res.body.contacts[0].should.have.property('id').to.equal(contactId);
        })
    })

    describe('Update CL Staff Contacts', async () => {

        it('1 Should return Token not found response without sending the authToken', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/${contactId}`)
                .set('authorization', '')
                .send(reqData)
            res.should.have.status(401);
        })
    
        it('2 Should return status code 422 without request data', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/${contactId}`)
                .set('authorization', authToken)
                .send()
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.an('object')
        })

        it('3 Should return error when invalid personId is given in params', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/abcd/contacts/${contactId}`)
                .set('authorization', authToken)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.a('object');
        })

        it('4 Should return error when invalid contactId is given in params', async () => {
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/abcd`)
                .set('authorization', authToken)
            res.should.have.status(404);
            res.body.should.have.property('error').and.to.be.a('object');
        })
    
        it('5 Should return error when Invalid staffId is given in input', async () => {
            reqData.staffId = 0
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/${contactId}`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(422);
        })
    
        it('6 Should return error when Invalid roleId is given in input', async () => {
            reqData.staffId = 2,
            reqData.roleIds = [4]
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/${contactId}`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(422);
            res.body.should.have.property('error').and.to.be.equal("roleId must be one of [Pallbearers, Honorary Pallbearers]")
        })
    
        it('7 Should return success when valid input is given', async () => {
            reqData.roleIds = [3]
            const res = await chai.request(server)
                .put(`/api/v1/persons/${personId}/contacts/${contactId}`)
                .set('authorization', authToken)
                .send(reqData)
            res.should.have.status(200);
        })
    })
})
