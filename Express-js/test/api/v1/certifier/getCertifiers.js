const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson,
} = require('../../../helper')  //Please change the helper path if required


const faker = require('faker')
const _ = require('underscore')
const { getCallData, createCallData } = require('../../../schema/call') 	// Please check this path from your file path
const { certifierSchema, createAddress } = require('../../../schema/personInfo')
const models = require('../../../../models')
const loweringFirstLetter = require('../../../../utils/loweringFirstLetter')

let authToken, certifierObject, addressObject
const baseUrl = '/api/v1/certifiers'

describe('Get certifier list', async () => {
    before(async () => {
        try {
            const user = await addTestUser()
            const atNeedCallData = await getCallData()
            authToken = await genAuthToken(user)
    
            atNeedCallData.call.userId = user.id
            const callResponse = await createCallData(atNeedCallData.call)
            const verifyData = {
                callId: callResponse.Identifier,
                personId: callResponse.someOneHasPassed[0].DecedentId,
                currentUserId: user.id,
                userType: 'Decedent',
                reasonId: callResponse.someOneHasPassed[0].id
            }
            const verificationResult = await verifyPerson(verifyData)
            OPI = verificationResult.onePortalId
            for (let index = 0; index < 10; index++) {
                certifierObject = certifierSchema()
                addressObject = await createAddress()
                const createdAddress = await models.Address.create(addressObject)
                certifierObject.LicenseNumber = 'tEsT' + certifierObject.LicenseNumber
                certifierObject.AddressId = createdAddress.id
                await models.Certifier.create(certifierObject)
            }
            certifierObject.address = addressObject
        } catch (error) {
            console.log(error)
        }
    })

    after(async () => {
        await models.Call.destroy({where:{}})
        await models.Person.destroy({where:{}})
        await models.PersonInfo.destroy({where:{}})
        await models.Certifier.destroy({where:{}})
    })

    
    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?license-no=test`)
            .set('authorization', '')
        res.should.have.status(401);
        res.body.should.have.property('message').and.to.be.equal(`Token not found`)
    })

    it('should return error of invalid query params', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}?random=test`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Invalid query parameters`)
    })

    it('should return 10 items without sending any query', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(10)
    })

    it('should return 10 items when sending query as test', async () => {
        certifierObject = loweringFirstLetter(certifierObject)
        const res = await chai.request(server)
            .get(`${baseUrl}?license-no=test`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.lengthOf(10)
        res.body.forEach((eachItem) => {
            chai.assert.containsAllKeys(eachItem, certifierObject)
        })
    })

})
