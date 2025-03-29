const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const moment = require('moment')
async function purchaseOrderEmailWorker (job, done) {
    logger.info(`Processing Purchase Order Notification Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let emailStructure
        switch (job.data.emailTemplate) {
        case 'template1':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `New purchase order no. ${job.data.purchaseOrderNumber} is received for [statement/contract] no. ${job.data.contractNumber}`,
                body: `Hi Team,\n 
                
                A new purchase order no. ${job.data.purchaseOrderNumber} is received for [statement/contract] no. ${job.data.contractNumber}\n
                
                Please look into this at your earliest convenience.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template2':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is validated`,
                body: `Hi Team,\n 
                
                The purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is validated with the following details:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                Quantity: ${job.data.itemQuantity}\n

                Please reach out to purchasing department in case of any concerns.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template3':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is invalidated`,
                body: `Hi Team,\n 
                
                The purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is invalidated, as purchasing department cannot proceed with procurement of the following item:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                Quantity: ${job.data.itemQuantity}\n

                Please reach out to purchasing department or customer for clarification or modification in order respectively.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template4':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is modified`,
                body: `Hi Team,\n 
                
                The purchase order no. ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is modified with the following details:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                Quantity: ${job.data.itemQuantity}\n

                Please reach out to purchasing department in case of any concerns.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template5':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Item Id ${job.data.itemId} for [statement/contract] no. ${job.data.contractNumber} is received`,
                body: `Hi Team,\n 
                
                The Item Id ${job.data.itemId} for [statement/contract] no. ${job.data.contractNumber} is received. The item and price details are as follows:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                Quantity: ${job.data.itemQuantity}\n

                Please reach out to purchasing department in case of any concerns.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template6':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Modification required on purchase order ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber}`,
                body: `Hi Team,\n 
                
                The Item present in the purchase order ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is modified with the following details:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                Modified Quantity: ${job.data.itemQuantity}\n

                Request you to make appropriate changes in the purchase order and do the needful.\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template7':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `Purchase order ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} have been deleted`,
                body: `Hi Team,\n 
                
                The Item present in the purchase order ${job.data.purchaseOrderNumber} for [statement/contract] no. ${job.data.contractNumber} is deleted with the following details:\n
                Item Id: ${job.data.itemId}\n
                Item Description: ${job.data.itemDescription}\n
                
                Regards,\n
                One portal`
            }
            break
        case 'template8':
            emailStructure = {
                to: job.data.notifierEmail,
                subject: `${job.data.purchaseOrderNumber} - Pull from inventory Request`,
                body: `Hi,\n 
                
                Deceased Name: ${job.data.decedentName}\n
                Service location: ${job.data.serviceLocation}\n
                Service Date: ${moment.tz(job.data.serviceDate, job.data.timezone).format('MM/DD/YYYY')}\n
                Item Name: ${job.data.itemDescription}\n
                Item #: ${job.data.itemId}\n
                
                -One portal`
            }
            break
        default:
            emailStructure = null
        }

        if (emailStructure) {
            let ccTo = null
            if (process.env.NODE_ENV !== 'development') {
                ccTo = ['aauyeung@gmail.com', 'htran@gmail.com']
            }
            Email.sendMail(emailStructure.to, emailStructure.subject, emailStructure.body, null, null, ccTo)
        } else {
            throw new Error('Purchase Order Email template not found')
        }
        logger.info(`Done Purchase Order Notification Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}
exports.purchaseOrderEmailWorker = purchaseOrderEmailWorker
