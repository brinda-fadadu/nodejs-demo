const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')

class CertifierController {
    /**
     *
     * @param {String} licenseNumber
     */
    static async getCertifiers (licenseNumber) {
        try {
            const whereObject = {}
            if (licenseNumber) {
                whereObject.LicenseNumber = {
                    [models.Sequelize.Op.iLike]: `%${licenseNumber}%`
                }
            }
            const certifiers = await models.Certifier.findAll({
                where: whereObject,
                include: [
                    {
                        model: models.Person,
                        as: 'certifierPerson',
                        attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'aka', 'email'],
                        include: [
                            {
                                model: models.Place,
                                as: 'place',
                                include: [
                                    {
                                        model: models.Address,
                                        as: 'address'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            })
            return this.getFinalCertifiersList(certifiers)
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async getFinalCertifiersList (certifiers) {
        let finalList = []
        finalList = certifiers.map(certifier => {
            const certifierObj = {
                id: _.get(certifier, 'id', null),
                prefix: _.get(certifier, 'certifierPerson.prefix', null),
                firstName: _.get(certifier, 'certifierPerson.firstName', null),
                middleName: _.get(certifier, 'certifierPerson.middleName', null),
                lastName: _.get(certifier, 'certifierPerson.lastName', null),
                licenseNumber: _.get(certifier, 'licenseNumber', null),
                phoneNumber: _.get(certifier, 'certifierPerson.phoneNumber', null),
                faxNumber: _.get(certifier, 'faxNumber', null),
                email: _.get(certifier, 'certifierPerson.email', null),
                address: _.get(certifier, 'certifierPerson.place.address', null)
            }
            return certifierObj
        })
        return finalList
    }
}

module.exports = CertifierController
