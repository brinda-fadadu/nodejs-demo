const models = require('../../../models')
const _ = require('lodash')
class ReasonController {
    /**
     * @param {Object<{id: Number, name: String}>} relation
     * @param {*} transaction
     */
    static async addOrGetRelation (relation, transaction) {
        if (_.isEmpty(relation)) {
            return null
        }
        const relationId = _.get(relation, 'id')
        if (!relationId) {
            const existingRelation = await models.Relation.findOne({
                where: { name: relation.name },
                transaction
            })
            if (existingRelation) {
                return existingRelation.id
            }
            const createdRelation = await models.Relation.create({
                name: relation.name
            }, { transaction })
            return createdRelation.id
        }
        return relationId
    }
}
module.exports = ReasonController
