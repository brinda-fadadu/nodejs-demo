const models = require('../../models/index')
const logger = require('../../lib/logger')
const { docuSignClient } = require('../../services').docusign
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const utils = require('../../lib/util')

async function deleteForms (personId) {
    try {
        const person = await models.Person.findByPk(personId)
        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }
        const caseInfoFormResults = await models.CaseInfoForm.findAll({
            where: {
                [Op.and]: [{
                    personId,
                    [Op.or]: [
                        {
                            status: 'created'
                        },
                        {
                            status: 'draft'
                        }
                    ]

                }
                ]
            }
        })
        if (!caseInfoFormResults) {
            throw new Error('CASEINFOFORMS_NOT_FOUND')
        }
        // const t = await models.sequelize.transaction()
        try {
            await utils.asyncForEach(caseInfoFormResults, async caseInfoFormResult => {
                await models.CaseInfoFormRecipient.destroy({ where: { caseInfoFormId: caseInfoFormResult.id } })
                await models.CaseInfoForm.destroy({ where: { id: caseInfoFormResult.id } })
            })
            const formsToDelete = await caseInfoFormResults.map(c => c.envelopeId)
            let deletedResult
            if (formsToDelete.length) {
                deletedResult = await docuSignClient.moveToRecycleBin(formsToDelete)
            }
            return deletedResult
        } catch (error) {
            // await t.rollback()
            console.log(error)
            logger.error(`Error while deleting form for particular OPI ${error}`)
            throw error
        }
    } catch (error) {
        console.log(error)
        logger.error(`Error while voiding form for particular OPI ${error}`)
        throw error
    }
}

module.exports = deleteForms
