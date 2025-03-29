const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require("../../../helper")
const Joi = require('@hapi/joi')
const assert = chai.assert;

let authToken, queries

describe('Get person overview test case', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        return
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/persons/1/overview`)
            .set("authorization", "")
        console.log(res.body)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return arrangement overview for valid arrangement id', async function () {
        const onGoingCasesRes = await chai.request(server)
            .get(`/api/v1/dashboard/ongoing_cases`) // DB should have a valid arrangement with id = 1
            .set("authorization", authToken)

        console.log(onGoingCasesRes.body)
        assert.isTrue(onGoingCasesRes.body.data.list.length > 0, 'DB has verified persons');

        const validOPI = onGoingCasesRes.body.data.list[0].decedentOrBeneficiaryOnePortalId
        const res = await chai.request(server)
            .get(`/api/v1/persons/${validOPI}/overview`) // DB should have a valid arrangement with id = 1
            .set("authorization", authToken)

        res.body.should.have.property('success').and.to.be.equal(true);

        const schema = Joi.object().keys({
            success: Joi.boolean(),
            data: Joi.object().keys({
                id: Joi.number(),
                prefix: Joi.string().allow(null),
                firstName: Joi.string().allow(null),
                middleName: Joi.string().allow(null),
                lastName: Joi.string().allow(null),
                phone: Joi.string().allow(null),
                email: Joi.string().allow(null),
                caseInfo: Joi.object().keys({
                    personPrimaryInfo: Joi.object().keys({
                        id: Joi.number(),
                        prefix: Joi.string().allow(null),
                        firstName: Joi.string().allow(null),
                        middleName: Joi.string().allow(null),
                        lastName: Joi.string().allow(null),
                        phone: Joi.string().allow(null),
                        email: Joi.string().allow(null),
                        languageId: Joi.number().allow(null),
                        dateOfBirth: Joi.date(),
                        dateOfDeath: Joi.date().allow(null),
                        aka: Joi.string().allow(null),
                        maritalStatus: Joi.string().allow(null)
                    }),
                    secondaryInfo: Joi.object().allow(null)
                }),
                notes: Joi.array().items(Joi.object().keys({
                    id: Joi.number(),
                    Content: Joi.string(),
                    ResourceType: Joi.string(),
                    ResourceId: Joi.number(),
                    CategoryId: Joi.number(),
                    CreatedBy: Joi.number(),
                    UpdatedBy: Joi.number(),
                    CreatedAt: Joi.date(),
                    UpdatedAt: Joi.date(),
                    CreatedUser: Joi.object().keys({
                        id: 1,
                        LdapId: Joi.string(),
                        Name: Joi.string(),
                        Email: Joi.string(),
                        Token: Joi.string().allow(null),
                        ProfilePic: Joi.string().allow(null),
                        RoleId: Joi.number().allow(null)
                    })
                })),
            })
        })
        const {error, value} = Joi.validate(res.body, schema);
        console.log(error)
        assert.isTrue(error == null, 'Person overview API response schema validated');
    })

    it('should return 404 error for invalid arrangement id', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/persons/1/overview`) // '1' is not a valid person OPI.
            .set("authorization", authToken)
        res.should.have.status(404);
    })
})