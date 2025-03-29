const models = require('../../../../../models')
const { createAddressInclude, createOrganizationInclude } = require('../../../../../lib/commonIncludes')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

function getQuery (personId) {
    return models.ContactPerson.findOne({
        where: { personId, deletedAt: null, deletedBy: null },
        include: [
            {
                model: models.Person,
                as: 'PersonalInformation',
                attributes: [
                    'id', 'onePortalId', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'organizationId', 'aka', 'email'
                ],
                include: [
                    {
                        model: models.PersonInfo,
                        as: 'PersonInformation',
                        attributes: ['id', 'personId', 'residentialAddressId'],
                        include: [...createAddressInclude('PersonAddress')]
                    },
                    ...createOrganizationInclude('PersonOrganization')]
            },
            {
                model: models.Relation
            },
            {
                model: models.ContactCaseRole,
                as: 'caseRoles',
                include: [
                    {
                        model: models.Role,
                        attributes: ['name'],
                        where: {
                            [Op.and]: [
                                {
                                    name: 'Notifier'
                                },
                                {
                                    type: 'Contact'
                                }
                            ]
                        }
                    }
                ],
                required: false
            }

        ]
    })
}

module.exports = {
    getQuery
}
