const {
    chai,
    server,
    models,    
    addTestUser,
    genAuthToken,
    createVerifiedPerson
} = require('../../helper')
const faker = require('faker')
const { agreementPersonCreate } = require('../../../controllers/agreementPerson/index')
let user, authToken

async function beforeFunctionForPayment () {

    try {
        user = await addTestUser()
        authToken = genAuthToken(user)
        const personAN = await createVerifiedPerson()
        const personPN = await createVerifiedPerson()
        arrangementAN = await models.Arrangement.create({
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
        })
        reqData = {
            "packages": [{
                "id": package.id,
                "quantity": 1
            }],
            "services": [{
                "id": service.id,
                "quantity": 1
            }],
            "merchandises": [{
                "id": merchandise.id,
                "quantity": 1
            }],
            "cashAdvanceItems": [{
                "id": cashAdvanceItem.id,
                "quantity": 1,
                "price": 1000
            }]
        }
        const res = await chai.request(server)
        .post(`/api/v1/arrangement/${arrangementAN.id}/statement`)
        .set("authorization", authToken)
        .send(reqData)
        res.status.should.equal(201)
        statementId = res.body.statement.id
        payorBody = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            middleName: faker.name.firstName(),
            email: faker.internet.email(),
            phoneNumber: faker.phone.phoneNumberFormat(),
            agreementRoleIds: [19],
            statementId: statementId,
            userId: user.id
        }
        const payor = await agreementPersonCreate(payorBody)
        return {
            statementId: statementId,
            payorId: payor.personId
        }
    } catch (error) {
        throw error
    }

}

module.exports = {
    beforeFunctionForPayment
}