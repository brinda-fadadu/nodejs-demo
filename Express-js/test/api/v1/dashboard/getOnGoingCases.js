const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require("../../../helper")
const moment = require('moment')
const createCall = require('../../../../controllers/Calls/CreateCall/create')

const { getCallData } = require('../../../schema/call')
const personSchema = require('../../../schema/person')
const { generateOnePortalId } = require('../../../../utils/dbGetFunctions')
const models = require('../../../../models/index')

let authToken, verifiedOrder = []


describe('Get ongoing cases test case', () => {
    before(async () => {
        try {
            const user = await addTestUser()
            authToken = genAuthToken(user);
            for (let index = 0; index < 8; index++) {
                const responseObject = await getCallData((index % 2) + 1)
                await createCall.createCall(responseObject.call)
            }
            return
        } catch (error) {
            console.log(error)
        }
    })

    after(async () => {
        try {
            await models.Call.destroy({ where: {} })
            await models.PersonInfo.destroy({ where: {} })
            await models.AgreementPersonRole.destroy({ where: {} })
            await models.AgreementPerson.destroy({ where: {} })
            await models.Person.destroy({ where: {} })
        } catch (error) {
            console.log(error);            
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases`)
            .set("authorization", "")
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return empty array when there is no person verified', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(0)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(0)
    })

    it('should return array of persons that are verified according to the verifiedAt flag when decedent is verified', async function () {
        for (let index = 0; index < 5; index++) {
            const someOnePassed = await models.SomeOnePassed.findOne({
                include: [
                    {
                        model: models.Person,
                        as: 'decedent',
                        where: {
                            isVerified: false
                        }
                    }
                ]
            })
            someOnePassed.decedent.isVerified = true
            someOnePassed.decedent.onePortalId = await generateOnePortalId()
            someOnePassed.decedent.verifiedAt = moment().add(index, 'minutes').toISOString()

            await someOnePassed.decedent.save()
            verifiedOrder.push(someOnePassed.decedent.id)
        }
        verifiedOrder = await Promise.all(verifiedOrder)
        verifiedOrder = verifiedOrder.reverse().slice(0, 10)
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.above(0)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(5)
        const receivedVerifiedOrder = res.body.data.onGoingCases.map(eachPerson => eachPerson.id)
        chai.expect(verifiedOrder).to.have.ordered.members(receivedVerifiedOrder)
    })

    it('should return array of persons that are verified according to the verifiedAt flag when beneficiary is verified', async function () {
        for (let index = 0; index < 5; index++) {
            const someOnePassed = await models.PreArrangementReason.findOne({
                include: [
                    {
                        model: models.Person,
                        as: 'beneficiary',
                        where: {
                            isVerified: false
                        }
                    }
                ]
            })
            someOnePassed.beneficiary.isVerified = true
            someOnePassed.beneficiary.onePortalId = await generateOnePortalId()
            someOnePassed.beneficiary.verifiedAt = moment().add(index + 5, 'minutes').toISOString()
            await someOnePassed.beneficiary.save()
            verifiedOrder = [
                someOnePassed.beneficiary.id,
                ...verifiedOrder
            ]
        }
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.above(0)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(10)
        const receivedVerifiedOrder = res.body.data.onGoingCases.map(eachPerson => eachPerson.id)
        chai.expect(verifiedOrder).to.have.ordered.members(receivedVerifiedOrder)
    })

    it('should return array of persons of the searched name', async function () {
        const someOnePassed = await models.SomeOnePassed.findOne({
            include: [
                {
                    model: models.Person,
                    as: 'decedent',
                    where: {
                        isVerified: true
                    }
                }
            ]
        })
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1&opiOrName=${someOnePassed.decedent.firstName}`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(1)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(1)
    })

    it('should return array of persons of the searched opi', async function () {
        const someOnePassed = await models.SomeOnePassed.findOne({
            include: [
                {
                    model: models.Person,
                    as: 'decedent',
                    where: {
                        isVerified: true
                    }
                }
            ]
        })
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1&opiOrName=${someOnePassed.decedent.onePortalId}`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(1)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(1)
    })

    it('should return array of persons that has any incomplete statement', async function () {
        /* made all persons unverified */
        await models.Person.update({
            verifiedAt: moment().subtract(16, 'days').toISOString(),
            isVerified: false
        }, {
            where: {
                isVerified: true
            }
        })

        /* created the statements with new persons */
        const beneficiaryRole = await models.Role.findOne({ where: { name: 'Beneficiary' } })
        const decedentRole = await models.Role.findOne({ where: { name: 'Decedent' } })
        for (let index = 0; index < 6; index++) {
            const personObject = await personSchema()
            const createdPerson = await models.Person.create(personObject)
            for (let statementindex = 0; statementindex < 2; statementindex++) {
                const createdStatement = await models.Statement.create({
                    agreementType: statementindex % 2 ? 'funeral' : 'cemetery',
                })
                const createdAgreement = await models.AgreementPerson.create({
                    personId: createdPerson.id,
                    statementId: createdStatement.id,
                })
                await models.AgreementPersonRole.create({
                    agreementPersonId: createdAgreement.id,
                    roleId: beneficiaryRole.id
                })
            }
        }

        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(6)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(6)
        res.body.data.onGoingCases.forEach((eachPerson) => {
            eachPerson.funeralContractsCount.should.equal(1)
            eachPerson.cemetryContractsCount.should.equal(1)
        })
    })


    it('should return array of persons when the statement is complete but the time is within 15 days', async function () {
        const persons = await models.Person.findAll({
            where: {
                isVerified: true
            }
        })
        const createdAnOrPn = persons.map((eachPerson, index) => {
            return models[index % 2 ? 'SomeOnePassed' : 'PreArrangementReason'].create({
                [index % 2 ? 'decedentId' : 'beneficiaryId']: eachPerson.id
            })
        })
        await Promise.all(createdAnOrPn)
        await models.Statement.update({
            status: 'Completed'
        }, {
            where: {
                status: 'In progress'
            }
        })
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(6)
        res.body.data.should.have.property('onGoingCases').and.to.have.lengthOf(6)
        res.body.data.onGoingCases.forEach((eachPerson) => {
            eachPerson.funeralContractsCount.should.equal(1)
            eachPerson.cemetryContractsCount.should.equal(1)
        })
    })

    it('should return array of persons when page 2 is called', async function () {
        await models.Person.update({
            isVerified: true,
            verifiedAt: Date.now()
        }, {
            where: {
                isVerified: false 
            }
        })
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=2`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.above(0)
    })

    it('should return empty array when the time of verifiedAt is made 15 days earlier than current time', async function () {
        await models.Person.update({
            verifiedAt: moment().subtract(16, 'days').toISOString()
        }, {
            where: {
                isVerified: true 
            }
        })
        const res = await chai.request(server)
            .get(`/api/v1/dashboard/ongoingCases?limit=10&page=1`)
            .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.data.should.have.property('totalResults').and.to.be.equal(0)
        res.body.data.should.have.property('onGoingCases').and.to.be.lengthOf(0)
    })
})