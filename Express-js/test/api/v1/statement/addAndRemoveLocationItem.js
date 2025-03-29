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
const _ = require('underscore')
let authToken, statementId, 
packagesList, packageData, addedMerchandiseItems = [], addedServiceItems = [], statementTotal= 0

if(process.env.TEST_MODE==='single') {
    require('./get_statement.js')
    require('./locationItemsList.js')
}

describe('PUT /api/v1/statement/:statementId/items/:action', async () => {
    before(async () => {        
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        global.locations = await getLocations()
        locationId = global.statementLocationId
        packagesList = global.packagesList
        statementId = global.statementId
    })

    it('Return 401 unAuthorized error', async () => {
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items/add`)
        response.status.should.equal(401)
    })

    it('Return 200 status code', async () => {

        const merchandiseItemId = global.merchandiseItems[0].locationItemId
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items/add`)
        .set('Authorization', authToken)
        .send({
            locationId: locationId,
            locationItemId: merchandiseItemId
        })        
        addedMerchandiseItems.push(global.merchandiseItems[0].id)
        statementTotal += global.merchandiseItems[0].price
        response.body.statementTotal.should.equal(statementTotal)
        response.status.should.equal(201)
        
    })

    it('RETURN 200 when added a different item', async () => {
        const merchandiseItemId = global.merchandiseItems[1].locationItemId
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items/add`)
        .set('Authorization', authToken)
        .send({
            locationId: locationId,
            locationItemId: merchandiseItemId
        })
        addedMerchandiseItems.push(global.merchandiseItems[1].locationItemId)
        statementTotal += global.merchandiseItems[1].price
        response.body.statementTotal.should.equal(statementTotal)
        response.status.should.equal(201)
    })

    it('Add service item to the statement', async () => {
        const serviceItemId = global.serviceItems[0].locationItemId
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items/add`)
        .set('Authorization', authToken)
        .send({
            locationId: locationId,
            locationItemId: serviceItemId
        })
        addedServiceItems.push(global.serviceItems[0].locationItemId)
        statementTotal += global.serviceItems[0].price
        response.body.statementTotal.should.equal(statementTotal)
        response.status.should.equal(201)
    })

    it('Add a different service item to the statement', async () => {
        const serviceId = global.serviceItems[1].locationItemId
        const response = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items/add`)
        .set('Authorization', authToken)
        .send({
            locationId: locationId,
            locationItemId: serviceId
        })
        addedServiceItems.push(global.serviceItems[1].locationItemId)
        statementTotal += global.serviceItems[1].price
        response.body.statementTotal.should.equal(statementTotal)
        response.status.should.equal(201)
    })

    it('Remove a service item from the statement', async () => {
        const serviceItemId = global.serviceItems[1].locationItemId
        const response= await chai.request(server)
            .put(`/api/v1/statements/${statementId}/items/remove`)
            .set('Authorization', authToken)
            .send({
                locationId: locationId,
                locationItemId: serviceItemId
            })
            addedServiceItems.pop()
            statementTotal -= global.serviceItems[1].price
            response.body.statementTotal.should.equal(statementTotal)
            response.status.should.equal(201)
    })

    it('Remove a merchandise item from the statement', async () => {
        const merchandiseItemId = global.merchandiseItems[1].locationItemId
        const response= await chai.request(server)
            .put(`/api/v1/statements/${statementId}/items/remove`)
            .set('Authorization', authToken)
            .send({
                locationId: locationId,
                locationItemId: merchandiseItemId
            })
            addedMerchandiseItems.pop()
            statementTotal -= global.merchandiseItems[1].price
            response.body.statementTotal.should.equal(statementTotal)
            response.status.should.equal(201)
    })

})


describe('GET /statements/:statementId/items', async () => {
    before(() => {
        statementId = global.statementId
    })

    it('Get list of services and merchandise items added to the statement', async () => {
        const response = await chai.request(server)
            .get(`/api/v1/statements/${statementId}/items`)
            .set('Authorization', authToken)
        response.status.should.equal(200)
        response.body.statementItems.length.should.equal(2)
        const locationItems = _.pluck(response.body.statementItems, 'locationItemId')
        locationItems.length.should.equal(addedMerchandiseItems.length + addedServiceItems.length)
        response.body.sumOfPropertiesAndItems.should.equal(statementTotal)        
    })
    after(() => {
        delete global.merchandiseItems
        delete global.serviceItems
    })
})