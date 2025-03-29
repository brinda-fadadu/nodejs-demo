const SMS = require('./sms')
const logger = require('../logger')

class CallStaffSMSNotification {
    static send (data) {
        try {
            // Check phone number and send SMS
            if (process.env.NODE_ENV !== 'test') {
                if (data.assignedTo.phoneNumber) {
                    let toNumber = data.assignedTo.phoneNumber
                    let message = `Hello ${data.assignedTo.name},\n\nA call: ${data.callId} has been assigned to you. Please log on to the OnePortal\napplication and navigate to the All Calls Panel, to review and do the needful.\n\n- OnePortal`
                    SMS.sendSms(toNumber, message)
                }
            }
        } catch (err) {
            logger.log('error', 'Error in sending SMS to assigned staff', { error: err, data: data.assignedTo })
        }
    }
}

module.exports = CallStaffSMSNotification
