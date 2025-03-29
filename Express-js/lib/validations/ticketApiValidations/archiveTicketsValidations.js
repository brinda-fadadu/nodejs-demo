async function archiveTicketsValidations (req, res, next) {
    try {
        if (req.body.archiveTicketList.length) {
            next()
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

module.exports = {
    archiveTicketsValidations
}
