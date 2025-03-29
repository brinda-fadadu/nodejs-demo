
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
let authToken, totalPackages, statementId, packagesList, packageData;

if(process.env.TEST_MODE==='single') {
    require('./get_statement.js')
    require('./packages_list')
}

describe('PUT /api/v1/statement/:statementId/packages/:action', async () => {    
    before(async () => {        
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        global.locations = await getLocations()
        locationId = global.statementLocationId  
        packagesList = global.packagesList
        statementId = global.statementId
        packageData =  { 
            packageId: packagesList[0].id,
            locationId: locationId
        }
    })

    it('Return 401 unAuthorized error', async () => {
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/packages/add`)
        response.status.should.equal(401)
    })

    it('Return 200 status code', async () => {
        const data = {
            packageId: packagesList[0].packagesId,
            locationId: global.statementLocationId
        }
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/packages/add`)
        .set('Authorization', authToken)
        .send(packageData)
        response.status.should.equal(201)
    })

    it('Check the quantity of the added items ', async () => {
        const data = {
            packageId: packagesList[0].packagesId,
            locationId: global.statementLocationId
        }
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/packages/add`)
        .set('Authorization', authToken)
        .send(packageData)
        response.status.should.equal(201)
        response.body.quantity.should.equal(2)
    })

    it('Check the quantity of the removed item', async () => {
        const data = {
            packageId: packagesList[0].packagesId,
            locationId: global.statementLocationId
        }
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/packages/remove`)
        .set('Authorization', authToken)
        .send(packageData)
        response.status.should.equal(201)
        response.body.quantity.should.equal(1)
    })
    it('Quantity must be 0', async () => {
        const data = {
            packageId: packagesList[0].packagesId,
            locationId: global.statementLocationId
        }
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/packages/remove`)
        .set('Authorization', authToken)
        .send(packageData)
        response.status.should.equal(201)
        response.body.quantity.should.equal(0)
    })

    

})