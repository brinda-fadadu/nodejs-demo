const models = require('../../../../models/index')

async function includedAssociations (queries = {}) {
    let whereCondForRoles = {}
    let whereCondForRolesRequired = false
    if (queries && queries.caseRoles && queries.caseRoles.length) {
        whereCondForRoles.roleId = queries.caseRoles
        whereCondForRolesRequired = true
    }
    return [
        {
            model: models.Person,
            as: 'PersonalInformation',
            attributes: [
                'id', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'email', 'secondaryPhoneNumber'
            ],
            include: [{
                model: models.PersonInfo,
                as: 'PersonInformation',
                attributes: ['id', 'personId', 'maidenName', 'birthState', 'birthCountry', 'residentialAddressId'],
                include: [{
                    model: models.Address,
                    as: 'PersonAddress'
                }]
            }]
        },
        {
            model: models.ContactCaseRole,
            as: 'caseRoles',
            include: [
                {
                    model: models.Role
                }
            ],
            where: whereCondForRoles,
            required: whereCondForRolesRequired // Seem to add Case here, CaseRole getting inner join with PersonInfo, that why mentioned expilicit required false
        },
        {
            model: models.Relation
        },
        {
            model: models.Employee,
            include: [
                {
                    model: models.EmployeeType
                }
            ]
        }
    ]
}

module.exports = exports = includedAssociations
