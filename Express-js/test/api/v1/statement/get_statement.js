
const {
    chai,
    server,
    models,
    getRelations,
    addTestUser,
    genAuthToken,
    getLocations
} = require('../../../helper')
const faker = require('faker')
let authToken, totalPackages, packagesCategories, packagesList, locationId, statementId, statementInfo;

if(process.env.TEST_MODE==='single') {
    if(!global.statementId) {
        require('./createStatement_test')
    }
    
}

describe('GET /api/v1/statements/{statementId}', async () => {    
    before(async () => {
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        global.locations = await getLocations()
        locationId = global.statementLocationId
        statementId = global.statementId
    })

    it('Get 401 error when calling without Authorization token', async () => {        
        const response = await chai.request(server)
            .get(`/api/v1/statements/${statementId}`)
            response.status.should.equal(401)
    })

    it('Get 200 when passing statement Id', async () => {        
        const response = await chai.request(server)
            .get(`/api/v1/statements/${statementId}`)
            .set("authorization", authToken)
            response.status.should.equal(200)            
            statementInfo = response.body
    })

    it('LocationId must be equals to the global location Id', async () => {
        statementInfo.locationId.should.equal(global.statementLocationId)
    })

    it('Must have all keys', async () => {
        statementInfo.should.have.keys(['id','agreementPersons','agreementType','amount','arranger',
        'contractNumber','createdAt','locationId','saleType','saleTypeCode','saleTypeId','statementProperties','status'])
        global.statementInfo = statementInfo
    })
})