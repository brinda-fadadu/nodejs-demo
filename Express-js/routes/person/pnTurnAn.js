const { customResponse } = require('../../lib/custom-response')
const PersonController = require('../../controllers/refactorControllers/personController/personController')

async function pnTurnAn (req, res, next) {
    try {
        let person = {}
        person.id = req.params.personId
        person.isAlive = false
        person.updatedBy = req.currentUser.id
        let personController = new PersonController(person.id)
        const data = await personController.pnTurnAn(person)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

async function fetchSSNDetails (req, res) {
    try {
        const data = await PersonController.fetchSSNDetails(req.body.OPIids)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

module.exports = exports = {
    pnTurnAn,
    fetchSSNDetails
}
