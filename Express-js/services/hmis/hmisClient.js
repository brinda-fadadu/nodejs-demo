const hmisModels = require('./hmisConnection')
class HMISClient {
    constructor (agreementId) {
        this.agreementId = agreementId
    }

    static async createNewLotSpace (lotselUnitId, transaction) {
        // TODO: Implementation of writing query
        try {
            const result = await hmisModels.sequelize.query('sp_createLotSpaceForAdditionalRight :lotselUnitId', {
                replacements: {
                    lotselUnitId: lotselUnitId
                }
            })
            if (result[0] && result[0].length) {
                return {
                    lotSpaceId: result[0][0].Lot_Space_ID,
                    lotSellUnitId: result[0][0].Lot_Sell_Unit_ID,
                    sequence: result[0][0].Sequence,
                    location: result[0][0].Location,
                    sectionCode: result[0][0].Section_Cd,
                    cemeteryCode: result[0][0].Cemetery_Cd
                }
            } else {
                throw new Error('HMIS_CONNECTION_FAILED')
            }
        } catch (err) {
            throw err
        }
    }
}

module.exports = HMISClient
