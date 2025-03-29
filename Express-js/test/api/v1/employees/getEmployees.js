const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../helper')  //Please change the helper path if required
const models = require('../../../../models/index')
const loweringFirstLetter = require('../../../../utils/loweringFirstLetter')

const faker = require('faker')
const { employeeSchema, employeeTypeSchema } = require('../../../schema/employees')

const baseUrl = '/api/v1/employees'
let createdEmployee

describe('GET /api/v1/employees', () => {

    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            for (let index = 0; index < 5; index++) {
                const employeeTypeObject = employeeTypeSchema()
                employeeTypeObject.id = index + 1
                const createdEmployeeType = await models.EmployeeType.create(employeeTypeObject)
                const employeeObject = employeeSchema()
                for (let j = 0; j < 2; j++) {
                    if (j === 1) {
                        employeeObject.Name = 'tEsT sUrNaMe'
                    }
                    employeeObject.EmployeeTypeId = createdEmployeeType.id
                    createdEmployee = await models.Employee.create(employeeObject)
                }
            }
        } catch (error) {
            console.log(error);
        }
    })

    after(async () => {
        try {
            await models.Employee.destroy({ truncate: true })
            await models.EmployeeType.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}`)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return error of invalid ', async () => {
        const randomString = faker.random.word()
        const res = await chai.request(server)
            .get(`${baseUrl}?type=${randomString}`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Invalid query parameters`)
    })

    it('should return list of 10 items when calling without any query', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(10)
    })

    it('should return list of 6 items when calling with type 1, 2, 3', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?type[]=1&type[]=2&type[]=3`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(6)
    })

    it('should return list of 10 items when calling with type 1, 2, 3, 4, 5', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?type[]=1&type[]=2&type[]=3&type[]=4&type[]=5`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(10)
        res.body.forEach((eachEmployee) => {
            chai.assert.containsAllKeys(eachEmployee,
                ['id', 'name', 'salesCounselorId', 'email', 'phoneNumber', 'employeeTypeId', 'employeeType']
            )
            chai.assert.containsAllKeys(eachEmployee.employeeType, ['id', 'code', 'description'])
        })
    })

    it('should return error when the name query is blank', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?name=`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Invalid query parameters`)
    })

    it('should return list of 5 items when calling with the name test', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?name=test`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(5)
    })

    it('should return list of 5 items when calling with the name surname', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?name=surname`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(5)
    })

    it('should return list of 5 items when calling with the name "st su"', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?name=st su`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(5)
    })

    it('should return list of 1 item when calling with the name "st su" and any type from 1 - 5', async () => {
        const randomNumber = faker.random.number({ min: 1, max: 5 })
        const res = await chai.request(server)
            .get(`${baseUrl}?name=st su&type[]=${randomNumber}`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(1)
    })

    it('should return list of 5 items when calling with the name "st su" and all types', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?name=st su&type[]=1&type[]=1&type[]=2&type[]=3&type[]=4&type[]=5`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(5)
    })

})