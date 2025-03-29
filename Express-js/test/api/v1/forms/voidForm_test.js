const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    models,
    createVerifiedPerson,
    sendFormsToDocusign
} = require('../../../helper')
let user, authToken, form, person, contact, reqData, sendFormResult, envelopeId

describe('PUT /api/v1/forms/:formId/person/:personId/voidForm', async function () {
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
        reqData = [{
            formId: form.id,
            employees: [{
                id: employee.id,
                formRecipientRoleId: signerRole1.id
            }],
            contacts: [{
                id: contact.id,
                formRecipientRoleId: signerRole2.id
            }]
        }]

        sendFormResult = await sendFormsToDocusign(person.id, reqData, user)
    })

    it('should not add form without auth token', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/forms/${form.id}/person/${person.id}/voidForm`)
            .set("authorization", "")
            .send({})
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return wrong envelope id for void form', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/forms/${form.id}/person/${person.id}/voidForm`)
            .set("authorization", authToken)
            .send({})
        res.status.should.equal(422)
    })

    it('should void the sent form', async function () {
        setTimeout(async () => {
            const getCaseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: sendFormResult[0].id } })
            envelopeId = getCaseInfoFormResult.envelopeId
            let reqBody = { envelopeId }
            const res = await chai.request(server)
                .put(`/api/v1/forms/${form.id}/person/${person.id}/voidForm`)
                .set("authorization", authToken)
                .send(reqBody)
            res.status.should.equal(200)
            res.body.should.have.property('id')
            res.body.should.have.property('status').and.to.be.equal('voided')
            res.body.should.have.property('envelopeId').and.to.be.equal(envelopeId)
        }, 20000);
    })
})
