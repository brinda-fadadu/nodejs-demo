const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    models,
    createVerifiedPerson,
    getPreviewFormFromDocusign
} = require('../../../helper')
let user, authToken, form, person, contact, reqData

describe('PUT /api/v1/forms/person/:personId/deleteForms', async function () {
    before(async () => {
        user = await addTestUser()
        authToken = genAuthToken(user)
        form = await models.Form.findOne({
            where: {
                title: 'Authorization to Accept or Decline Embalming'
            },
            includes: [
                {
                    model: models.FormRecipientRole,
                    as: 'formRecipientRole'
                }
            ]
        })
        person = await createVerifiedPerson()
        const constactPerson = await createVerifiedPerson()
        const relation = models.Relation.findOne()
        contact = await models.ContactPerson.create({
            personId: person.id,
            resourceId: constactPerson.id,
            relationId: relation.id,
        })
        const [signerRole1, signerRole2] = await models.FormRecipientRole.findAll({
            limit: 2
        })

        const employee = await models.Employee.findOne()
        reqData = {
            employees: [{
                id: employee.id,
                formRecipientRoleId: signerRole1.id
            }],
            contacts: [{
                id: contact.id,
                formRecipientRoleId: signerRole2.id
            }]
        }
        await getPreviewFormFromDocusign(form.id, person.id, reqData, user)
    })

    it('should not add form without auth token', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/forms/person/${person.id}/deleteForms`)
            .set("authorization", "")
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return wrong personId for Preview form for OPI ', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/forms/person/abc/deleteForms`)
            .set("authorization", authToken)
        res.status.should.equal(422)        
        res.body.should.have.property('message').and.to.be.equal('personId must be a integer')
    })

    it('should Preview the form for OPI', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/forms/person/${person.id}/deleteForms`)
            .set("authorization", authToken)
        res.status.should.equal(200)
        res.body.should.have.property('envelopes').and.to.be.an('array').and.to.have.lengthOf(1)
    })
})
