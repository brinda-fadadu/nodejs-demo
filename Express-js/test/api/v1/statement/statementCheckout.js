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
    require('./addAndRemoveLocationItem.js')
}

describe('PUT /statements/:statementId/checkout', async () => {
    before(async () => {
        authToken = global.userToken
        statementId = global.statementId
    })

    it('401 UnAuthorized', async () => {
        const personId = global.personId
        const response = await chai.request(server)
            .put(`/api/v1/statements/${statementId}/checkout`)
            .send({
                personId: personId
            })
        response.status.should.equal(401)
    })

    it('422 without personId', async () => {
        const personId = global.personId
        const response = await chai.request(server)
            .put(`/api/v1/statements/${statementId}/checkout`)
            .set('Authorization', authToken)
            .send({
                
            })
        response.status.should.equal(500)
    })

    it('200 without personId', async () => {
        const personId = global.personId
        const response = await chai.request(server)
            .put(`/api/v1/statements/${statementId}/checkout`)
            .set('Authorization', authToken)
            .send({
                personId: personId
            })
        response.status.should.equal(200)
        response.body.should.have.all.keys('contractNumber','StatementItems', 'id', 'locationId', 'updatedAt')
    })
})