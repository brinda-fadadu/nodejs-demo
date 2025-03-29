
const PayerController = require('../../controllers/refactorControllers/paymentController/payerController')
const { customResponse } = require('../../lib/custom-response')
const _ = require('lodash')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const logger = require('../../lib/logger')
const seedData = require('../../config/seed').seed
const agreementType = _.get(seedData, 'ContractType')
const paymentType = {
    1: 'Cash',
    2: 'Check',
    3: 'Money order',
    4: 'Card',
    5: 'Preneed/insurance payment',
    6: 'Email Request',
    7: 'Void Check'
}

exports.listPaymentReceipt = async (req, res, next) => {
    try {
        const result = await PayerController.getListOfPaymentReceipt(req.query)
        customResponse(200, result, res)
    } catch (err) {
        customResponse(400, err, res)
    }
}
exports.exportPaymentReceipt = async (req, res, next) => {
    try {
        let data = await PayerController.getListOfPaymentReceipt(req.query)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                return {
                    'AGREEMENT NUMBER': _.get(e, 'Agreement.contractNumber'),
                    'AGREEMENT STATUS': _.get(e, 'Agreement.status'),
                    'FUNERAL/CEMETERY': agreementType[_.get(e, 'Agreement.type')],
                    'ARRANGER': _.get(e, 'Agreement.arranger.name'),
                    'PAYMENT TYPE': paymentType[_.get(e, 'paymentType')],
                    'AMOUNT': _.get(e, 'amount'),
                    'DATE-TIME': moment(e.createdAt).tz(req.query.timezone).format('LLL'),
                    'RECEIPT #': _.get(e, 'receiptNumber'),
                    'RECEIVED BY': _.get(e, 'User.name')

                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('cash-receipt-report.csv')
            res.send(Buffer.from(csv))
        } else {
            res.json({
                success: true,
                msg: 'No records found'
            })
        }
    } catch (error) {
        logger.error(error)
        throw error
    }
}
