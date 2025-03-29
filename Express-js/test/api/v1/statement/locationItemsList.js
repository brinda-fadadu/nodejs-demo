
const {
    chai,
    server,
    models,
    getRelations,
    addTestUser,
    genAuthToken,
    getLocations,
    getItemTypes
} = require('../../../helper')
const faker = require('faker')
const _ = require('underscore')
let authToken, totalPackages, statementId,itemCategories, serviceTypeId, itemTypes;

if(process.env.TEST_MODE==='single') {
    require('./get_statement.js')
}

describe('GET /api/v1/itemTypes/:itemTypeId/itemCategories', async () => {
    before(async () => {
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        locationId = global.statementLocationId  
        statementId = global.statementId
        itemTypes = await getItemTypes()        
        serviceTypeId = _.find(itemTypes, { itemType: 'Services'}).id        
    })

    it('GET /api/v1/itemTypes/:itemTypeId/itemCategories  for servies', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${serviceTypeId}/itemCategories?itemIndustryId=1`)
        .set('Authorization', authToken)        
        response.body.should.have.all.keys('itemCategories')
        itemCategories = response.body.itemCategories
    })
})
describe('GET /api/v1/itemTypes/:itemTypeId/items', async () => {
    before(async () => {
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        global.locations = await getLocations()
        locationId = global.statementLocationId
        statementId = global.statementId
        itemTypes = await getItemTypes()
        serviceTypeId = _.find(itemTypes, { itemType: 'Services'}).id
    })

    it('Return 401 unAuthorized error', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${serviceTypeId}/${locationId}/items`)
        response.status.should.equal(401)
    })

    it('Return 422 error if we send string for itemTypeId', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/itemTypeId/${locationId}/items`)
        .set('Authorization', authToken)
        response.status.should.equal(422)
    })

    it('Return 200 status code', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${serviceTypeId}/${locationId}/items`)
        .set('Authorization', authToken)        
        response.status.should.equal(200)
        response.body.items.length.should.above(0)
        response.body.should.have.all.keys('items','total')        
    })
    it('Return 200 status code', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${serviceTypeId}/${locationId}/items`)
        .query({ offset:0, limit: 100})
        .set('Authorization', authToken)        
        response.status.should.equal(200)
        response.body.items.length.should.above(0)
        response.body.should.have.all.keys('items','total')
        global.serviceItems = _.filter(response.body.items, (ele) => {
            return ele.price > 0
        })
    })
})

describe('GET /api/v1/:itemTypeid/:locationId/items for Merchandise items', async () => {
    before(async () => {
        itemTypeId = _.find(itemTypes, {itemType: 'Merchandises'}).id        
    })

    it('Return 401 status code', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${serviceTypeId}/${locationId}/items`)
        response.status.should.equal(401)
    })

    it('Return 200 status code', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${itemTypeId}/${locationId}/items`)
        .set('Authorization', authToken)
        response.body.should.have.all.keys('total', 'items')
        response.status.should.equal(200)
        global.merchandiseItems = _.filter(response.body.items, ele => {
            return ele.price > 0
        })
    })

    it('Return 200 status code and limited result based on limit value', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${itemTypeId}/${locationId}/items`)
        .set('Authorization', authToken)
        .query({offset: 0, limit:5})
        response.body.should.have.all.keys('total', 'items')
        response.status.should.equal(200)
        response.body.items.length.should.equal(5)
    })

    it('Return 422 status code when sending string value to limit', async () => {
        const response = await chai.request(server)
        .get(`/api/v1/itemTypes/${itemTypeId}/${locationId}/items`)
        .set('Authorization', authToken)
        .query({offset: 0, limit:'dsfdsa'})        
        response.status.should.equal(500)
    })

    after(async () => {
    })
})