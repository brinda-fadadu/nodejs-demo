const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    models,
    createVerifiedPerson
} = require('../../../helper')
let user, authToken, form, person, contact, reqData

describe('POST /api/v1/forms/person/:personId/send', async function () {
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
    })

    it('should not add form without auth token', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/forms/person/${person.id}/send`)
            .set("authorization", "")
            .send({})
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should add form to case with recipients', async function () {
        const res = await chai.request(server)
            .post(`/api/v1/forms/person/${person.id}/send`)
            .set("authorization", authToken)
            .send(reqData)
        res.status.should.equal(200)
        expect(res.body).to.have.lengthOf(1)
        
        const caseForm = res.body[0]

        caseForm.should.have.property('id')
        caseForm.should.have.property('formId').and.to.be.equal(form.id)
        caseForm.should.have.property('status').and.to.be.equal('sent')
        caseForm.should.have.property('personId').and.to.be.equal(person.id)
        caseForm.should.have.property('recipients')
        // expect(caseForm.envelopeId).to.not.be.null;
        expect(caseForm.recipients).to.have.lengthOf(2)
    })

})
