
const {
    chai,
    server,
    models,
    getRelations
} = require('../../../helper')
const faker = require('faker')
const { editStatementReqBody, getListOfPersons } = require('../../../schema/statements/createStatementReqBody')
let authToken, reqData, employees, saleType, location, editReqBodyFunRes, statementId, randomString, personsIds, beneficiaryRoleId, purchaserRoleId, coPurchaserRoleId, relationIds

describe('POST /api/v1/:arragementId/statement', async function () {
    before(async () => {
        try {
            editReqBodyFunRes = await editStatementReqBody('funeral')
            saleType = await models.SaleType.findOne()
            location = await models.Location.findOne()
            saleType = saleType.toJSON()
            location = location.toJSON()        
            authToken = editReqBodyFunRes.authToken,
            reqData = editReqBodyFunRes.reqBody,
            statementId = editReqBodyFunRes.statementId,
            randomString = faker.random.word(),
            personsIds = await getListOfPersons(),
            relationIds = await getRelations(),
            employees= editReqBodyFunRes.employees
            
        } catch (error) {
            console.log(error)
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", "")
            .send(reqData)
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return an error message saying statementId is required', async () => {
        const res = await chai.request(server)
        .put(`/api/v1/statements/${randomString}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal("Statement Id must be a integer");
    })

    it('should return not found error message for invalid arranger', async function () {
        delete reqData.arrangerId
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Arranger is required');
    })

    it('should return an error saying arrangerId must be a integer', async () => {
        reqData.arrangerId = randomString
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Arranger must be a integer');
    })

    it('should return not found error message for invalid location', async function () {        
        reqData.arrangerId = employees[0].id
        delete reqData.locationId
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Location is required')
    })

    it('should return an error saying that location must be a number', async () => {
        reqData.locationId = randomString
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Location must be a integer')
    })

    it('should return not found error message for invalid saleType', async function () {       
        reqData.locationId = location.id
        delete reqData.saleType
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('SaleType is required')
    })
    
    it('should create a statement for AN arragement', async function () {
        reqData.saleType = saleType.id
        reqData.arrangerId = employees[0].id        
        reqData.agreementPersons.forEach(e => {
            if (e.roleId !== beneficiaryRoleId) {
                e.isDeleted = true
            }
        })
        reqData.agreementPersons.concat([
            {
                personId: personsIds[0],
                roleId: purchaserRoleId,
                relationId: relationIds[0]
            },
            {
                personId: personsIds[0],
                roleId: coPurchaserRoleId,
                relationId: relationIds[1]
            }
        ])
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            .send(reqData)                    
        res.status.should.equal(201)       
    })
})
