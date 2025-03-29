const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require("../../../helper")

let authToken, queries

describe('convert call to case', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        return
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/calls/1/convert_to_case`)
            .set("authorization", "")
            res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return message for already converted call', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/calls/1/convert_to_case`)
            .set("authorization", authToken)
            .send({
                Services : "Funeral",
                Funeral : {
                    AssignedTo : 1,
                    AppointmentDate : "2018-12-20 12:00"
                }
            })
        res.body.should.have.property('message').and.to.be.equal('This call has been already converted to case')
    })

    it('should return call not found message if the call is not found', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/calls/20/convert_to_case`)
            .set("authorization", authToken)
            .send({
                Services : "Funeral",
                Funeral : {
                    AssignedTo : 1,
                    AppointmentDate : "2018-12-20 12:00"
                }
            })
        res.body.should.have.property('message').and.to.be.equal('Call Not Found')
    })

    it('should return Call is successfully converted to Case message if the call is found and converted to case', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/calls/13/convert_to_case`)
            .set("authorization", authToken)
            .send({
                Services : "Funeral",
                Funeral : {
                    AssignedTo : 1,
                    AppointmentDate : "2018-12-20 12:00"
                }
            })
        res.body.should.have.property('message').and.to.be.equal('Call is successfully converted to Case')
    })
})
