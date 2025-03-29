const logger = require('../../../lib/logger')
const models = require('../../../models')
const { upsert } = require('../utils')

class AgreementItemPriceController {
    /**
     *
     * @param {number} locationItemId is selected service, merchandise, cashadvanceditem id
     * @param {*} transaction
     */
    async getTaxPercent (locationItemId, transaction) {
        let taxPercent = 0
        let locItem = await models.LocationItem.findOne({
            where: {
                id: locationItemId
            },
            include: [
                {
                    model: models.Item,
                    where: { isTaxable: true }
                }
            ],
            transaction
        })
        if (locItem && locItem.Item.isTaxable) {
            const loc = await models.Location.findOne({
                where: {
                    id: locItem.locationId
                },
                transaction
            })
            taxPercent = loc.tax
        }
        return taxPercent
    }

    /**
     *
     * @param {number} packageId id of the package of which the tax percentage needs to be fetched
     * @param {number} locationTaxPercent location tax percent
     * @param {*} transaction
     */
    async __getPackageTaxValue (packageId, locationTaxPercent, transaction) {
        let packageTaxableAmount = 0
        // As we need to take tax percentage for only items which is isTaxable true.

        let packageLocationItems = await models.sequelize.query(`select LocationItem.*  from PackageLocationItem 
        inner join LocationItem on LocationItem.id=PackageLocationItem.locationItemId
        inner join Item on Item.id=LocationItem.itemId
        where packageId=${packageId} and Item.isTaxable = 1 and PackageLocationItem.isActive = 1`, { type: models.sequelize.QueryTypes.SELECT, transaction })

        // calculate tax for each package location item
        packageLocationItems.forEach(item => { packageTaxableAmount = packageTaxableAmount + item.price })
        let packageTaxValue = packageTaxableAmount * locationTaxPercent / 100

        return packageTaxValue
    }
    /**
     * this method return tax percent based on location
     * @param {*} data
     * @param {*} data.locationId is the locationItemId
     * @param {*} data.packageId is the id of the package
     * @param {*} transaction
     */
    async getLocationTaxPercent (data, transaction) {
        let locationTaxQuery; let result = []

        if (data.locationItemId) {
            locationTaxQuery = `select * from LocationItem li inner join Location on li.locationId = Location.id
            inner join Item on Item.id=li.itemId
            where li.id=${data.locationItemId} and Item.isTaxable = 1`
            result = await models.sequelize.query(locationTaxQuery, { type: models.sequelize.QueryTypes.SELECT, transaction })
        } else if (data.packageId) {
            locationTaxQuery = `select Location.tax from Package inner join Location on Location.id = Package.locationId where Package.id = ${data.packageId}`

            result = await models.sequelize.query(locationTaxQuery, { type: models.sequelize.QueryTypes.SELECT, transaction })
        }

        return result.length ? result[0].tax : 0
    }

    async getLocationItemTaxValue (data, locationTaxPercent) {
        return data.price * locationTaxPercent / 100
    }

    /**
     *
     * @param {Object} data to create agreementItemPrice record in db
     * @param {number} data.locationItemId is the itemId
     * @param {number} data.packageId is the id of the package
     * @param {number} data.agreementItemPriceId is the id of the itemPrice
     * @param {number} data.quantity is the quantity of the item
     * @param {number} data.price is the price of the item
     * @param {*} transaction
     */
    async upsertAgreementItemPrice (data, transaction) {
        try {
            // fetching tax value for the given location item
            let taxValue = 0

            let locationTaxPercent = await this.getLocationTaxPercent(data, transaction)
            if (data.packageId) {
                taxValue = await this.__getPackageTaxValue(data.packageId, locationTaxPercent, transaction)
            } else if (data.locationItemId) {
                taxValue = await this.getLocationItemTaxValue(data, locationTaxPercent)
            }

            let reqBody = {
                id: data.agreementItemPriceId,
                quantity: data.quantity,
                unitPrice: data.price,
                unitTax: taxValue, // Should be unit price value but not percentage value.
                totalPrice: data.quantity * data.price,
                totalTax: data.quantity * taxValue,
                ecfAmount: data.ecfAmount || 0,
                totalECFAmount: data.ecfAmount ? (data.quantity * data.ecfAmount).toFixed(2) : 0
            }
            reqBody.totalPrice = Number(reqBody.totalPrice).toFixed(2)
            reqBody.unitPrice = Number(reqBody.unitPrice).toFixed(2)
            reqBody.unitTax = Number(reqBody.unitTax).toFixed(2)
            reqBody.totalTax = Number(reqBody.totalTax).toFixed(2)

            // create/update agreementitemprice record
            const agreementItemPrice = await upsert('AgreementItemPrice', reqBody, transaction)
            return agreementItemPrice
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = AgreementItemPriceController
