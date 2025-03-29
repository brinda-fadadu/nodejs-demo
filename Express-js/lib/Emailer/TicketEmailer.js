const Email = require('./core')
class TicketEmailer {
    static sendEmailNotification (user, subject, text) {
        if (process.env.NODE_ENV !== 'test') {
            if (user.Email) {
                let to = user.Email
                Email.sendMail(to, subject, text)
            }
        }
    }
}
module.exports = TicketEmailer
