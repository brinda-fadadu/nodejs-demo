
const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    models,
    createVerifiedPerson,
    cleanupStatementData
} = require('../../../helper')
let user, authToken, arrangementAN, arrangementPN, reqData, finalAmount, employees, saleType, location
describe('POST /api/v1/:arragementId/statement', async function () {    
    before(async () => {
        //await cleanupStatementData()
        user = await addTestUser()

        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        const personAN = await createVerifiedPerson()
        const personPN = await createVerifiedPerson()        
        /*arrangementAN = await models.Arrangement.create({
            PersonId: personAN.id,
            ArrangementType: 'AN'
        })
        arrangementPN = await models.Arrangement.create({
            PersonId: personPN.id,
            ArrangementType: 'PN'
        })
        const package = await models.Package.findOne()
        const service = await models.Service.findOne()
        const merchandise = await models.Item.findOne()
        const cashAdvanceItem = await models.Item.findOne({
            order: [ [ 'createdAt', 'DESC' ]]
        }) */
        const res  = await chai.request(server)
            .get('/api/v1/employees')
            .set('Authorization', authToken)
        employees  = res.body
        
        saleType = await models.SaleType.findOne()
        location = await models.Location.findOne({ where: {
            name: 'Crosby-N. Gray & Co. Funeral Home'
        }})
        saleType = saleType.toJSON()
        location = location.toJSON()        
        
        reqData = {
            "saleType": saleType.id,
            "locationId": location.id,
            "arrangerId": employees[0].id,
            "agreementType": "funeral",
            "agreementPersons":[{
                "personId":personAN.id,
                primaryAgreementPerson: true,
                "roleId":17
            }]
        }
        global.personId = personAN.id
        //finalAmount = package.Price + service.Price + merchandise.Price + 1000    
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/statements`)
            .set("authorization", "")
            .send(reqData)
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return not found error message for invalid arranger', async function () {
        delete reqData.arrangerId
        const res = await chai.request(server)
            .post(`/api/v1/statements`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Arranger is required and must be integer');
    })

    it('should return not found error message for invalid location', async function () {        
        reqData.arrangerId = employees[0].id
        delete reqData.locationId
        const res = await chai.request(server)
            .post(`/api/v1/statements`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Location is required and must be integer')
    })
    it('should return not found error message for invalid saleType', async function () {       
        reqData.locationId = location.id
        reqData.saleType = 'invalid'
        const res = await chai.request(server)
            .post(`/api/v1/statements`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Invalid Sale type value')
        reqData.saleType = saleType.id
    })

    it('should create a statement for AN arragement', async function () {
        reqData.arrangerId = employees[0].id        
        const res = await chai.request(server)
            .post(`/api/v1/statements`)
            .set("authorization", authToken)
            .send(reqData)                    
        res.status.should.equal(201)
        const statement = res.body        
        const location = await models.Location.findByPk(statement.locationId)
        const year = (new Date()).getFullYear() 
        global.statementId = statement.id 
        global.statementLocationId = statement.locationId
//        statement.contractNumber.should.equal(`${year}${location.Code}00001`)        
    })
})
