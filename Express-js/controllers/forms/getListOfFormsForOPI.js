const models = require('../../models/index')
const logger = require('../../lib/logger')
const Op = require('sequelize').Op

async function listOfFormsForOPI (personId) {
    try {
        const formsList = await models.CaseInfoForm.findAll({
            where: {
                personId: personId,
                [Op.and]: [ { status: { [Op.ne]: 'draft' } }, { status: { [Op.ne]: 'created' } } ]
            },
            include: [
                {
                    model: models.CaseInfoFormRecipient,
                    as: 'recipients',
                    where: {
                        [Op.and]: [ { status: { [Op.ne]: 'draft' } }, { status: { [Op.ne]: 'created' } } ]
                    },
                    include: [
                        {
                            model: models.ContactPerson,
                            as: 'contactPerson',
                            include: [
                                {
                                    model: models.Person,
                                    attributes: ['firstName', 'middleName', 'lastName', 'email'],
                                    as: 'PersonalInformation'
                                }
                            ],
                            attributes: ['resourceId']
                        },
                        {
                            model: models.Employee,
                            attributes: ['id', 'Name', 'Email'],
                            as: 'employee'
                        }
                    ]
                },
                {
                    model: models.Form
                }
            ]
        })
        let finalFormsList = await formatData(formsList)
        return finalFormsList
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

let formatData = async function (formsList) {
    try {
        let finalFormsList = formsList.map(form => {
            let finalForm = JSON.parse(JSON.stringify(form))
            finalForm.formTitle = finalForm.Form.title
            delete finalForm.Form
            let formRecipients = finalForm.recipients.map(formRecipient => {
                let recipient
                if (formRecipient.employeeId) {
                    let employee = formRecipient.employee
                    recipient = {
                        id: employee.id,
                        name: employee.Name,
                        email: employee.Email,
                        status: formRecipient.status
                    }
                }
                if (formRecipient.contactPersonId) {
                    let contactPerson = formRecipient.contactPerson
                    const { firstName, middleName, lastName } = contactPerson.PersonalInformation

                    recipient = {
                        id: contactPerson.resourceId,
                        name: `${firstName}  ${middleName} ${lastName}`,
                        email: contactPerson.PersonalInformation.email,
                        status: formRecipient.status
                    }
                }
                return recipient
            })
            finalForm.recipients = formRecipients
            return finalForm
        })
        return finalFormsList
    } catch (error) {
        console.log(error)
        return error
    }
}

module.exports = exports = listOfFormsForOPI
