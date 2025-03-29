const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    models
} = require("../../../helper")
const faker = require('faker')
const searchPath = "/api/v1/persons/search"
const esPerson = require('../../../../es_models/person')
let authToken
let personData

describe('POST /api/v1/persons/search', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        return
    })

    after(async () => {
        try {
            await models.Person.destroy({ truncate: true })
            await models.PersonInfo.destroy({ truncate: true })
            await models.Address.destroy({ truncate: true })
            esPerson.client.indices.delete({
                index: 'cl-person-test',
            }, (error, success) => {
                if (error) {
                    throw new Error(error)
                }
            })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", "")
            .send({});

        res.should.have.status(401);
    })

    it('should return searchResults empty array data if passed a non existing keyword', async function () {
        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({})

        res.should.have.status(200);
        res.body.should.have.property('persons').and.to.be.a('array').to.be.empty;
        res.body.should.have.property('totalResults').and.to.be.equal(0);
    })

    it('should return search results', async function () {
        const city = await models.City.findOne({})
        const state = await models.State.findOne({})
        const country = await models.Country.findOne({})
        const dateOfBirth = new Date(1988, 1, 1)
        { }
        personData = {
            prefix: faker.name.prefix(),
            firstName: faker.name.firstName(),
            middleName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            dateOfBirth: dateOfBirth,
            ssnLastFour: 'asdf',
            isVerified: true,
            phoneNumber: faker.phone.phoneNumberFormat().replace(/-/g, ''),
            PersonInformation: {
                PersonAddress: {
                    'city': faker.address.city(),
                    'line1': faker.random.word(),
                    'line2': faker.random.word(),
                    'state': faker.address.state(),
                    'county': faker.address.county(),
                    'country': faker.address.country(),
                    'zipcode': faker.address.zipCode(),
                }
            }
        }

        for (let index = 0; index < 2; index++) {
            const newPersonData = {
                ...personData,
                middleName: faker.random.word(),
                lastName: faker.random.word(),
            }
            
            const person = await models.Person.create(newPersonData, {
                include: [{
                    model: models.PersonInfo,
                    as: "PersonInformation",
                    include: [{
                        model: models.Address,
                        as: "PersonAddress"
                    }]
                }]
            })
        }
            

        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                ...personData,
                "address": {
                    ...personData.PersonInformation.PersonAddress
                }
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.have.lengthOf.above(0);;
        res.body.should.have.property('totalResults').and.to.be.above(0);

    })

    it('should return 2 persons when search with firstName, middleName and lastName', async function () {

        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                firstName: personData.firstName,
                middleName: personData.middleName,
                lastName: personData.lastName
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.have.lengthOf.above(0);;
        res.body.should.have.property('totalResults').and.to.be.above(0);
    })

    it('should return person when search after the person is verified', async function () {

        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                ssnLastFour: personData.ssnLastFour
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.have.lengthOf.above(0);;
        res.body.should.have.property('totalResults').and.to.be.above(0);
    })

    it('should return person when search with ssnLastFour field', async function () {
        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                ssnLastFour: personData.ssnLastFour
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.have.lengthOf.above(0);;
        res.body.should.have.property('totalResults').and.to.be.above(0);
    })


    it('should return person when search with phoneNumber field', async function () {
        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                phoneNumber: personData.phoneNumber
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.have.lengthOf.above(0);;
        res.body.should.have.property('totalResults').and.to.be.above(0);
    })

    it('should return empty search results for non exists person data', async function () {
        const res = await chai.request(server)
            .post(searchPath)
            .set("authorization", authToken)
            .send({
                firstName: "not-exists",
                address: {
                    line1: "E-101",
                    line2: "Avenue",
                    zipcode: 21001
                }
            })

        res.should.have.status(200);
        res.body.should.have.property('persons').and.to.be.a('array').to.be.empty;
        res.body.should.have.property('totalResults').and.to.be.equal(0);
    })
})
