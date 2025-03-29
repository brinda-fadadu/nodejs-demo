const {
    convertToJsonRecursive
} = require('../utils')
const models = require('../../../models')
const logger = require('../../../lib/logger')

class CertifierAndOrganisationReportController {
    constructor (personId) {
        this.personId = personId
    }
    /**
     *
    * @param {*} queryObj is the object of all the queries done for fetching the Duplicate calls List
    * @param {Number} limit number of records to fetch
    * @param {Number} page the page number to fetch data
    * @param {string} sortOrder get the calls list based on the first modified or last modified
    */
    static async getDuplicateCertifierReport (queryObj) {
        try {
            let sql = `duplicate.details IS NOT NULL `
            Object.keys(queryObj).map((e) => {
                switch (e) {
                case 'certifierIds':
                    sql += ` AND [p].[id] IN (select value from STRING_SPLIT('${queryObj.certifierIds.join(',')}', ','))`
                    break
                }
            })
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [p].[createdOn] ${sortOrder}`
            let query = `DECLARE @DuplicateCertifier TABLE(
            id int,
            licenseNum VARCHAR(200),
            firstName  VARCHAR(200),
            lastName  VARCHAR(200),
            middleName  VARCHAR(200),
            personId int,
            createdBy VARCHAR(200),
            createdOn Date,
            address VARCHAR(200),
            faxNumber VARCHAR(200)
            );
            Insert @DuplicateCertifier
            select  distinct cer.id as id, cer.licenseNumber as licenseNum, p.firstName as firstName, p.middleName as middleName, p.lastName as lastName, p.id as personId,
            [user].name as createdBy, cer.createdAt as createdOn, CONCAT(a.line1,' ',a.line2,' ',a.city,' ',a.state,' ',a.zipcode) as address, cer.faxNumber as faxNumber
            FROM Certifier cer 
            LEFT JOIN [User] [user] ON [user].[id] = cer.createdBy
            INNER JOIN Person p ON p.id = cer.personId
            INNER JOIN Place addPlace ON addPlace.id = p.addressPlaceId
            INNER JOIN Address a ON a.id = addPlace.addressId


            SELECT p.id as id, p.licenseNum as licenseNum, p.createdBy  as createdBy, p.createdOn as createdOn, p.address as address, p.faxNumber as faxNumber,
            (
            select p.personId as id, p.firstName as firstName, p.middleName as middleName, p.lastName as lastName FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) as decedent, duplicate.details AS duplicateCertifiers from
                @DuplicateCertifier p
                    OUTER APPLY (
                        SELECT (
                            SELECT pp.id as id , pp.licenseNum as licenseNum, pp.createdOn as createdOn, pp.createdBy as createdBy, pp.address as address, pp.faxNumber as faxNumber,
                            CONCAT(pp.firstName,' ',pp.middleName,' ',pp.lastName) as decedent
                            from @DuplicateCertifier pp
                            WHERE p.licenseNum = pp.licenseNum AND p.id != pp.id AND
                                (
                                    dbo.RemoveSpecialChars(pp.firstName) LIKE  '%'+  dbo.RemoveSpecialChars(p.firstName) +'%' 
                                    OR dbo.RemoveSpecialChars(pp.lastName) LIKE  '%'+  dbo.RemoveSpecialChars(p.lastName) +'%'
                                    AND dbo.RemoveSpecialChars(pp.faxNumber) LIKE  '%'+  dbo.RemoveSpecialChars(p.faxNumber) +'%'
                                )
                            FOR JSON PATH
                        ) AS details 
            ) as duplicate WHERE ${sql} ${orderByQuery}`
            if (queryObj.page) {
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY
                        DELETE FROM @DuplicateCertifier`
            }
            const list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJsonRecursive(e))
            logger.info('Duplicate certifier report is fetched')
            return list
        } catch (err) {
            logger.error(err)
            return err
        }
    }
    static async getDuplicateOrganizationReport (queryObj) {
        try {
            let sql = `duplicate.details IS NOT NULL `
            Object.keys(queryObj).map((e) => {
                switch (e) {
                case 'organizationIds':
                    sql += ` AND [p].[id] IN (select value from STRING_SPLIT('${queryObj.organizationIds.join(',')}', ','))`
                    break
                }
            })
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [p].[createdOn] ${sortOrder}`
            let query = `DECLARE @DuplicateOrganisation TABLE(
                id int,
                organizationType int,
                name VARCHAR(200),
                phoneNumber VARCHAR(200),
                city VARCHAR(200),
                address  VARCHAR(200),
                createdBy VARCHAR(200),
                createdOn Date
                );
                Insert @DuplicateOrganisation
                select  distinct org.id as id, org.organizationTypeId as organizationType, org.name as name,org.phoneNumber as phoneNumber, a.city as city, CONCAT(a.line1,' ',a.line2,' ',a.city,' ',a.state,' ',a.zipcode) as address,
                org.createdBy as createdBy, org.createdAt as createdOn
                FROM Organization org 
                INNER JOIN Place addPlace ON addPlace.organizationId = org.id
                INNER JOIN Address a ON a.id = addPlace.addressId
    
    
                SELECT p.id as id, p.name as facilityName, p.createdBy  as createdBy, p.createdOn as createdOn, p.address as address, p.phoneNumber as phoneNumber, p.city as city, p.organizationType as organizationTypeId, duplicate.details AS duplicateOrganization from
                    @DuplicateOrganisation p
                        OUTER APPLY (
                            SELECT (
                                SELECT pp.id as id , pp.name as facilityName, pp.createdOn as createdOn, pp.createdBy as createdBy, pp.address as address, pp.phoneNumber as phoneNumber, pp.city as city, pp.organizationType as organizationTypeId
                                from @DuplicateOrganisation pp
                                WHERE p.organizationType = pp.organizationType AND p.city = pp.city AND p.id != pp.id AND
                                    (
                                        dbo.RemoveSpecialChars(pp.phoneNumber) LIKE  '%'+  dbo.RemoveSpecialChars(p.phoneNumber) +'%' 
                                        OR dbo.RemoveSpecialChars(pp.name) LIKE  '%'+  dbo.RemoveSpecialChars(p.name) +'%'
                                    )
                                FOR JSON PATH
                            ) AS details 
                ) as duplicate WHERE ${sql} ${orderByQuery}`
            if (queryObj.page) {
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY
                        DELETE FROM @DuplicateOrganisation`
            }
            const list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJsonRecursive(e))
            logger.info('Duplicate Organization report is fetched')
            return list
        } catch (err) {
            logger.error(err)
            return err
        }
    }
}
module.exports = CertifierAndOrganisationReportController
