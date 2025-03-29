
const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    createVerifiedPerson
} = require('../../../helper')
let user, authToken, personAN

describe('GET /api/v1/scheduling/schedulableServices/:personId', async function () {
    before(async () => {
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        personAN = await createVerifiedPerson()
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/scheduling/schedulableServices/${personAN.id}`)
            .set("authorization", "")
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return result for getSchedulablesServices', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/scheduling/schedulableServices/${personAN.id}`)
            .set("authorization", authToken)
        res.status.should.equal(200)
    })
})
