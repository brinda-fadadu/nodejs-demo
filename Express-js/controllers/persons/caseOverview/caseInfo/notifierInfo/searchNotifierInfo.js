const models = require('../../../../../models')
const Sequelize = require('sequelize')
const _ = require('underscore')
const Op = Sequelize.Op
const { createOrganizationInclude } = require('../../../../../lib/commonIncludes')

async function searchNotifierInfo (OrganizationId, searchText) {
    try {
        const result = await models.Person.findAll({
            where: {
                [Op.and]: [
                    {
                        OrganizationId: Number(OrganizationId),
                        DeletedAt: null,
                        DeletedBy: null,
                        [Op.or]: [
                            {
                                FirstName: {
                                    [Op.like]: `%${searchText}%`
                                }
                            },
                            {
                                MiddleName: {
                                    [Op.like]: `%${searchText}%`
                                }
                            },
                            {
                                LastName: {
                                    [Op.like]: `%${searchText}%`
                                }
                            }
                        ]
                    }
                ]
            },
            attributes: [
                'id', 'OnePortalId', 'Prefix', 'FirstName', 'MiddleName', 'LastName', 'PhoneNumber', 'SecondaryPhoneNumber', 'AKA', 'Email'
            ],
            include: [
                ...createOrganizationInclude('PersonOrganization')
            ]
        })
        let finalResult = _.map(result, function (obj) {
            if (obj.PersonOrganization) {
                return obj
            }
        })
        return _.compact(finalResult)
    } catch (error) {
        throw error
    }
}

module.exports = {
    searchNotifierInfo
}
