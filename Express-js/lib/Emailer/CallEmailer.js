const Email = require('./core')
class CallEmailer {
    static async sendToAssignedPerson (data) {
        try {
            if (process.env.NODE_ENV !== 'test') {
                if (data.assignedTo.email) {
                    const envs = [
                        'production'
                    ]
                    let bcc = []
                    if (envs.includes(process.env.NODE_ENV)) {
                        bcc = [
                            'a@gmail.com',
                            'a@gmail.com'
                        ]
                    } else {
                        bcc = [
                            'a@gmail.com'
                        ]
                    }
                    let to = data.assignedTo.email
                    let subject = `Call Assigned - ${data.callId}`
                    let text = `Hello ${data.assignedTo.name},\n\nA call: ${data.callId} has been assigned to you. Please log on to the OnePortal\napplication and navigate to the All Calls Panel, to review and do the needful.\n\n- OnePortal`

                    Email.sendMail(to, subject, text, '', '', '', bcc)
                }
            }
        } catch (error) {
            throw error
        }
    }
}
module.exports = CallEmailer
