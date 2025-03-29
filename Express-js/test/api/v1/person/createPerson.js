const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../helper')

let authToken, personData

personData = {
    firstName: "first name",
    lastName: "last name",
    ssn: "123-12-1234"
}

describe('Create Person', async () => {    
    before(async () => {
        try {
            const user = await addTestUser()       
            authToken = await genAuthToken(user)
        } catch (error) {
            console.log(error);
        }
    })

    it('1 Should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', '')
            .send(personData)
        res.should.have.status(401);
    })

    it('2 Should return status code 422 without request data', async () => {
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', authToken)
            .send()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Input required`)
    })

    it('3 Should return error when invalid ssn is given in input', async () => {
        personData.ssn = "123-123-1234"
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', authToken)
            .send(personData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child \"SSN\" fails because [\"SSN\" with value \"${personData.ssn}\" fails to match the required pattern: /^(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}$/]`)
    })

    it('4 Should return error when firstName is not given in input', async () => {
        personData.ssn = "123-12-1234"
        delete personData.firstName
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', authToken)
            .send(personData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child \"firstName\" fails because [\"firstName\" is required]`)
    })

    it('5 Should return error when lastName is not given in input', async () => {
        personData.firstName = "first name"
        delete personData.lastName
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', authToken)
            .send(personData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child \"lastName\" fails because [\"lastName\" is required]`)
    })

    it('6 Should return success when valid input is given', async () => {
        personData.lastName = "last name"
        const res = await chai.request(server)
            .post(`/api/v1/persons/`)
            .set('authorization', authToken)
            .send(personData)
        res.should.have.status(201);
        res.body.should.have.property('success').to.equal(true);
        res.body.data.should.have.property('id')
        res.body.data.should.have.property('firstName').and.to.be.equal(personData.firstName)
        res.body.data.should.have.property('lastName').and.to.be.equal(personData.lastName)
        res.body.data.should.have.property('ssn').and.to.be.equal(personData.ssn)
    })
})
