const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
  } = require("../../../helper")
  
const LdapAuth = require('../../../../lib/ldap_auth') 
const sinon = require('sinon');

describe('Login for the CL users using LDAP', function () {
    afterEach(() => {
        // Restore the default sandbox here
        sinon.restore();
    });
    it('should respond with 200 and AuthToken if username and password are correct', async function () {
        let success_message = {success: true, data: {sAMAccountName: 'gmail'}}
        sinon.stub(LdapAuth.prototype, 'connect').returns(Promise.resolve(success_message));
        const res = await chai.request(server)
        .post('/api/v1/login')
        .send({username : "gmail",password : ""})

        res.body.should.have.property('success').and.to.be.equal(true)
    })
    it('should respond with invalid username or password if any of the credentials are wrong', async function () {
       
        let failure_message = {success: false, message: 'Invalid username or password'}
        sinon.stub(LdapAuth.prototype, 'connect').returns(Promise.resolve(failure_message));
        const res = await chai.request(server)
            .post('/api/v1/login')
            .send({username : "gmail",password : "password"})
        res.body.should.have.property('message').and.to.be.equal("Invalid username or password")
        res.body.should.have.property('success').and.to.be.equal(false)
    })
})