const createCertifier = require('../../controllers/certifier/createCertifier')

async function createCertifierHandler (req, res, next) {
    try {
        const createdCertifier = await createCertifier(req.body, req.person)
        res.status(200).json(createdCertifier)
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = createCertifierHandler
