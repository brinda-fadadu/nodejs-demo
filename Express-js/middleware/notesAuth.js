const AgreementController = require('../controllers/refactorControllers/agreementController/agreementController')
const models = require('../models')
async function fetchAgreementData (agreementId) {
    const types = AgreementController.TYPES
    const agreementController = new AgreementController(agreementId)
    const agreementDetails = await agreementController.getAgreementDetails()
    if (types['Funeral'] === agreementDetails.type) {
        return 'Funeral'
    } else if (types['Cemetry'] === agreementDetails.type) {
        return 'Cemetery'
    }
}
async function notesAuth (req, res, next) {
    try {
        const resourceType = req.query.resourceType || req.body.resourceType
        const categoryId = req.body.categoryId
        let category = ''
        if (categoryId) {
            category = await models.NoteCategory.findOne({
                where: {
                    id: categoryId
                }
            })
        }
        switch (resourceType) {
        case 'Agreement':
            req.module = await fetchAgreementData(req.query.resourceId || req.body.resourceId)
            break
        case 'Person':
            req.module = 'Case_Info'
            break
        case 'Call':
            req.module = 'Calls'
            break
        default:
            break
        }
        if (category.name === 'Scheduling' && req.method === 'POST') {
            const modulesToCheck = [
                'Service_Scheduling',
                'Cremation_Scheduling',
                'Funeral_Non_Cremation_Scheduling'
            ]
            const modules = await models.Module.findAll({
                where: {
                    name: modulesToCheck
                }
            })
            const moduleIds = modules.map(module => module.id)
            const permissions = await models.Permission.findAll({
                where: {
                    moduleId: moduleIds,
                    write: 1,
                    userRoleId: req.currentUser.userRoleId
                }
            })
            if (permissions.length) {
                req.module = modules.find(module => module.id === permissions[0].moduleId).name
            } else {
                req.module = modulesToCheck[0]
            }
        }
        next()
    } catch (error) {
        next(error)
    }
}

module.exports = {
    notesAuth
}
