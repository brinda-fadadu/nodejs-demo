const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson,
} = require('../../../../helper')  //Please change the helper path if required


const faker = require('faker')
const _ = require('underscore')
const { getCallData, createCallData } = require('../../../../schema/call') 	// Please check this path from your file path
const { certifierSchema, createAddress } = require('../../../../schema/personInfo')
const models = require('../../../../../models')
const loweringFirstLetter = require('../../../../../utils/loweringFirstLetter')

let authToken, certifierObject, addressObject, OPI, createdCertifier
const baseUrl = '/api/v1/persons'

describe('Edit certifier id', async () => {
    before(async () => {
        try {
            const user = await addTestUser()
            const atNeedCallData = await getCallData()
            authToken = await genAuthToken(user)

            atNeedCallData.call.userId = user.id
            const callResponse = await createCallData(atNeedCallData.call)
            const verifyData = {
                callId: callResponse.identifier,
                personId: callResponse.someOneHasPassed[0].decedentId,
                currentUserId: user.id,
                userType: 'Decedent',
                reasonId: callResponse.someOneHasPassed[0].id
            }
            const verificationResult = await verifyPerson(verifyData)
            OPI = verificationResult.onePortalId

            certifierObject = certifierSchema()
            addressObject = await createAddress()
            const createdAddress = await models.Address.create(addressObject)
            certifierObject.AddressId = createdAddress.id
            createdCertifier = await models.Certifier.create(certifierObject)
            certifierObject.address = addressObject
        } catch (error) {
            console.log(error)
        }
    })

    after(async () => {
        await models.Call.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
        await models.PersonInfo.destroy({ where: {} })
        await models.Certifier.destroy({ where: {} })
    })


    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${OPI}/certifier-info`)
            .send({ id: certifierObject.id })
            .set('authorization', '')
        res.should.have.status(401);
        res.body.should.have.property('message').and.to.be.equal(`Token not found`)
    })

    it('should return error of invalid body params', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${OPI}/certifier-info`)
            .send({ random: 'test' })
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Invalid body params`)
    })

    it('should return error of certifier with the given id does not exist', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${OPI}/certifier-info`)
            .send({ id: faker.random.number() })
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`Cannot find the certifier with the given id`)
    })

    it('should return success when sending the correct id', async () => {
        certifierObject = loweringFirstLetter(certifierObject)
        const res = await chai.request(server)
            .put(`${baseUrl}/${OPI}/certifier-info`)
            .send({ id: createdCertifier.id })
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.id.should.be.equal(createdCertifier.id)
        chai.assert.containsAllKeys(res.body, certifierObject)
    })

})
