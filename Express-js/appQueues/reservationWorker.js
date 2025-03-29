const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const models = require('../models')
const { getPriceWithDecimial } = require('../lib/util')

async function reservationEmailWorker (job, done) {
    logger.info(`Processing Reservation Extension Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        // GET Property Details
        const query = `SELECT TOP 1 props.name, props.total, CASE WHEN pt.name = 'Grave'
                        THEN 1 
                        ELSE 
                        ISNULL(itr.rights,0)
                        END AS rights, 
                    CASE WHEN pt.name = 'Grave' THEN 4 ELSE 
                        ISNULL(itr.maxRights,0) END AS maxRights, 
                    CASE WHEN pt.name = 'Grave'  THEN 1 ELSE 
                    ISNULL(itr.graves,0) END AS graves,
                    (
                        SELECT Count(*) FROM
                        AgreementPropertyAdditionalRight apr
                        WHERE apr.deletedBy is NULL AND apr.deletedAt is NULL AND apr.agreementPropertyId = :agreementPropertyId
                    ) AS additonalRights
                    FROM [Property] AS props
                    INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
                    INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId AND pc.locationId = 2
                    INNER JOIN [PropertyTypeCode] AS ptc ON ptc.id = props.propertyTypeCodeId 
                    INNER JOIN [PropertyType] AS pt ON pt.id = ptc.propertyTypeId 
                    LEFT OUTER JOIN [IntermentRights] AS itr ON itr.propertyCampusId=pc.id AND itr.propertyTypeId=pt.id
                    WHERE itr.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END ) AND 
                    props.id = :propertyId`
        let propertyDetails = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            plain: true,
            replacements: {
                agreementPropertyId: data.agreementPropertyId,
                propertyId: data.propertyId
            }
        })

        // fetching the users to send emails
        const users = await models.User.findAll({
            where: {
                userRoleId: data.approvalRoles
            }
        })
        users.map(e => {
            let text = returnText(e.name, data, propertyDetails)

            // adding the users who can appove the request to the appoval particpants
            Email.sendMail(e.email, 'Requires Approval', text)
        })
        logger.info(`Done Reservation Extension Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function returnText (name, data, propertyDetails) {
    return `Hello ${name},\n
Please review the below reservation extension request made.\n
Requestor: ${data.requestor}
Case/Contract #: ${data.contractNumber || '--'}
Property location name: ${propertyDetails.name}
Graves: ${propertyDetails.graves}
Rights: ${propertyDetails.rights}
Max Rights: ${propertyDetails.maxRights}
Total Rights: ${propertyDetails.rights + propertyDetails.additonalRights}
Property Amount: $${getPriceWithDecimial(propertyDetails.total)}
Reservation Type: ${data.reservationType}
Expiration Date: ${data.expiryDate}
Extension till: ${data.extensionDate}
Extension Notes: ${data.notes}\n
Please log on to the OnePortal application and navigate to Approval Request under the Alerts section, to review and approve/decline the approval request.\n- OnePortal`
}

module.exports = {
    reservationEmailWorker
}
