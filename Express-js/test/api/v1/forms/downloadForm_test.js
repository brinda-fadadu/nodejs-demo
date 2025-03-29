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

describe('PUT /api/v1/forms/person/:personId/downloadForm', async function () {
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

    it('should return wrong person id for download form', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/forms/adfadsf/person/abc/downloadForm`)
            .set("authorization", authToken)
        res.status.should.equal(422)
    })

    it('should return wrong envelope id for download form', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/forms/adfadsf/person/${person.id}/downloadForm`)
            .set("authorization", authToken)
        res.status.should.equal(422)
    })

    it('should return download url for sent form', async function () {
        setTimeout(async () => {
            const getCaseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: sendFormResult[0].id } })
            envelopeId = getCaseInfoFormResult.envelopeId
            const res = await chai.request(server)
                .get(`/api/v1/forms/${envelopeId}/person/${person.id}/downloadForm`)
                .set("authorization", authToken)
            res.status.should.equal(200)
        }, 20000);
    })
})
