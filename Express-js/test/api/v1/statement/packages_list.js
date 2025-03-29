
const {
    chai,
    server,
    models,
    getRelations,
    addTestUser,
    genAuthToken,
    getLocations
} = require('../../../helper')
const _ = require('underscore')
const faker = require('faker')
let authToken, totalPackages, packagesCategories, packagesList, locationId;

if (process.env.TEST_MODE==='single') {
    require('./get_statement')
}

describe('GET /api/v1/package/categories', async () => {
    before(async () => {        
        user = await addTestUser()
        authToken = genAuthToken(user)
        userToken = authToken
        global.userToken = userToken
        global.locations = await getLocations()
        locationId = global.statementLocationId
    })
    it('Get list of package categories', async () => {
        const response = await chai.request(server)
            .get('/api/v1/packages/categories')
            response.status.should.equal(401)
    })

    it('Get list of package categories', async () => {
        const response = await chai.request(server)
            .get('/api/v1/packages/categories')
            .set('Authorization', global.userToken)
            response.status.should.equal(200)
            response.body.should.have.property('packageCategories')
            packagesCategories = response.body.packageCategories
    })
    it('Get list of packages without package category filter', async () => {
        const response = await chai.request(server)
            .get(`/api/v1/packages/${locationId}`)
            .set('Authorization', global.userToken)
            response.status.should.equal(200)
            response.body.should.have.property('packages')            
            totalPackages = response.body.total
            packagesList = response.body.packages
            global.packagesList = packagesList
    })

    it('Get list of packages with package category filter', async () => {
        const response = await chai.request(server)
            .get(`/api/v1/packages/${locationId}?packageCategoryId=${packagesCategories[0].id}`)
            .set('Authorization', global.userToken)
            response.status.should.equal(200)
            response.body.should.have.property('packages')            
    })

    it('Get list of packages with pagination', async () => {
        const response = await chai.request(server)
            .get(`/api/v1/packages/${locationId}?offset=0&limit=2`)
            .set('Authorization', global.userToken)
            response.status.should.equal(200)
            response.body.packages.length.should.equal(2)
    })

    it('Get list of packages with pagination', async () => {
        const response = await chai.request(server)
            .get(`/api/v1/packages/${locationId}?offset=0&limit=2`)
            .set('Authorization', global.userToken)
            response.status.should.equal(200)
            response.body.packages.length.should.equal(2)
    })
    it('GET list of package items', async () => {
        const response = await chai.request(server)
            .get('/api/v1/packages/'+packagesList[0].id+'/items')
            .set('Authorization', global.userToken)
        response.status.should.equal(200)          
        response.body.packageItems.packageItems.length.should.have.above(0)
    })    
})