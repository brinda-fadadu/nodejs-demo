'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: (queryInterface, Sequelize) => {
    return sequelize.query(` 
    CREATE PROCEDURE [dbo].[updateVeteranAndPaidInFullDiscount] @agreementId INT, @addendumId INT

    AS

    BEGIN

    -- To store discount percentages on each item ---

        DECLARE @veteranDiscountPercentage DECIMAL(10,2) = 0.00

        DECLARE @paidInFullDiscountPercentage DECIMAL(10,2) = 0.00

        DECLARE @addendumPaidInFullDiscountPercentage DECIMAL(10,2) = 0.00

        DECLARE @servicesDiscountPercentage DECIMAL(10,2) =0.00 

        DECLARE @merchandiseDiscountPercentage DECIMAL(10,2)=0.00

        DECLARE @packagesDiscountPercentage DECIMAL(10,2)=0.00

        DECLARE @propertiesDiscountPercentage DECIMAL(10,2)=0.00

    

    -- TO store each item type prices ---

        DECLARE @servicesTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @merchandisesTotalPrice DECIMAL(10,2) =0.00

        DECLARE @packagesTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @cashAdvancedTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @propertiesTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @addendumPropertiesTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @veteranPropertiesTotalPrice DECIMAL(10,2) = 0.00

        DECLARE @propertiesPriceAtAddemdumLevelWithoutAdditionRights DECIMAL(10,2) = 0.00

        DECLARE @veteranPropertiesTotalPriceForAgreement DECIMAL(10,2) = 0.00

        DECLARE @propertiesPreApplyPrice DECIMAL(10,2) = 0.00

        DECLARE @propertiesPreApplyPriceForAgreement DECIMAL(10,2) = 0.00

        DECLARE @addendumPropertiesPreApplyPrice DECIMAL(10,2) = 0.00

    --- Discount amounts --------

        DECLARE @servicesPromoDiscountAmount  DECIMAL(10,2) =0.00

        DECLARE @merchandisesPromoDiscountAmount DECIMAL(10,2) =0.00

        DECLARE @packagesPromoDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @propertiesPromoDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @addendumPropertiesPromoDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @veteranPromoDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @monumentsPromoDiscountAmount DECIMAL(10,2) = 0.00

    

    --- Veteran and Paid in full discount amounts --- 

        DECLARE @veteranDiscountAmount DECIMAL(10,2) =0.00

        DECLARE @propertiesVeteranDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @paidInFullDiscountAmount DECIMAL(10,2) = 0.00

        DECLARE @addendumPaidInFullDiscountAmount DECIMAL(10,2) = 0.00

    

        DECLARE @veteranDiscountId INT = 0

        DECLARE @paidInFullDiscountId INT=0

        DECLARE @addendumPaidInFullDiscountId INT=0

        

        -- Veteran Discount -- 

    

        SELECT @veteranDiscountPercentage = a.discountValue, @veteranDiscountId = aaj.id FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title = 'Veteran Discount'

        WHERE aaj.agreementId = @agreementId AND aaj.deletedAt IS NULL

    

        PRINT @veteranDiscountPercentage

    

        -- Agreement Paid in Full Discount --

        SELECT @paidInFullDiscountPercentage = aaj.maxDiscount, @paidInFullDiscountId= aaj.id FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title = 'Paid in Full Discount'

        WHERE aaj.agreementId = @agreementId AND aaj.deletedAt IS NULL and aaj.addendumId is null

 



        SELECT @addendumPaidInFullDiscountPercentage = aaj.maxDiscount, @addendumPaidInFullDiscountId= aaj.id FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title = 'Paid in Full Discount'

        WHERE aaj.agreementId = @agreementId AND aaj.deletedAt IS NULL and aaj.addendumId is not null and aaj.addendumId=@addendumId

       

       

        

        -- Services part ---------- 

        

            

        SELECT @servicesTotalPrice = ISNULL(SUM(aip.totalPrice),0)  FROM AgreementLocationItem ali 

        INNER JOIN LocationItem li  ON ali.locationItemId = li.id 

        INNER JOIN Item i ON li.itemId = i.id 

        INNER JOIN AgreementItemPrice aip ON aip.id = ali.agreementItemPriceId 

        WHERE ali.agreementId=@agreementId AND ali.deletedAt IS NULL AND 

        i.itemCategoryId IN (

            SELECT ic.id FROM ItemCategory ic INNER JOIN ItemType it ON 

            ic.itemTypeId = it.id WHERE it.name='Services'

        );

 

         DECLARE Agreement_Services_Adjustments_Cursor CURSOR FOR

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Services', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL ORDER BY aaj.createdAt;

         OPEN Agreement_Services_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Services_Adjustments_Cursor INTO @servicesDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @servicesPromoDiscountAmount += (@servicesDiscountPercentage /100) * (@servicesTotalPrice-@servicesPromoDiscountAmount)

                 PRINT @servicesPromoDiscountAmount

             FETCH NEXT FROM Agreement_Services_Adjustments_Cursor INTO @servicesDiscountPercentage 

             END 

         CLOSE Agreement_Services_Adjustments_Cursor;        

         DEALLOCATE Agreement_Services_Adjustments_Cursor;

 

    

         PRINT 'Services promo discount amount'

         PRINT @servicesPromoDiscountAmount        

         SET @veteranDiscountAmount = (@veteranDiscountPercentage/100) * (@servicesTotalPrice- @servicesPromoDiscountAmount)

    

         

        PRINT 'Services total price'

        PRINT @servicesTotalPrice

        PRINT 'VETERAN DISCOUNT'

        PRINT @veteranDiscountAmount

    

        -- Merchandises part --- 

        

    

        SELECT @merchandisesTotalPrice = ISNULL(SUM(aip.totalPrice),0)  FROM AgreementLocationItem ali 

        INNER JOIN LocationItem li  ON ali.locationItemId = li.id 

        INNER JOIN Item i ON li.itemId = i.id 

        INNER JOIN AgreementItemPrice aip ON aip.id = ali.agreementItemPriceId 

        WHERE ali.agreementId=@agreementId AND ali.deletedAt IS NULL AND 

        i.itemCategoryId IN (

            SELECT ic.id FROM ItemCategory ic INNER JOIN ItemType it ON 

            ic.itemTypeId = it.id WHERE it.name='Merchandises'

        )

        DECLARE Agreement_Merchandises_Adjustments_Cursor CURSOR FOR 

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Merchandise', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL ORDER BY aaj.createdAt;

         OPEN Agreement_Merchandises_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Merchandises_Adjustments_Cursor INTO @merchandiseDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @merchandisesPromoDiscountAmount += (@merchandiseDiscountPercentage /100) * (@merchandisesTotalPrice-@merchandisesPromoDiscountAmount)

                 PRINT @servicesPromoDiscountAmount

             FETCH NEXT FROM Agreement_Merchandises_Adjustments_Cursor INTO @merchandiseDiscountPercentage 

             END 

         CLOSE Agreement_Merchandises_Adjustments_Cursor;        

         DEALLOCATE Agreement_Merchandises_Adjustments_Cursor;       

        SET @veteranDiscountAmount +=  (@veteranDiscountPercentage/100) * (@merchandisesTotalPrice- @merchandisesPromoDiscountAmount)

        

        PRINT 'Merchandises total part:::::'

        PRINT @merchandisesTotalPrice

        PRINT 'Veteran Discount'

        PRINT @veteranDiscountAmount

 

 

        -- Packages Discount part ---

    

        SELECT @packagesTotalPrice = ISNULL(sum(aip.totalPrice),0) FROM AgreementPackage ap 

        INNER JOIN Package p ON ap.packageId = p.id 

        INNER JOIN AgreementItemPrice aip ON aip.id = ap.agreementItemPriceId 

        WHERE ap.agreementId=@agreementId AND ap.deletedAt IS NULL 

 

        DECLARE Agreement_Packages_Adjustments_Cursor CURSOR FOR

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Package', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL ORDER BY aaj.createdAt;

         OPEN Agreement_Packages_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Packages_Adjustments_Cursor INTO @packagesDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @packagesPromoDiscountAmount += (@packagesDiscountPercentage /100) * (@packagesTotalPrice-@packagesPromoDiscountAmount)

                 PRINT @packagesPromoDiscountAmount

             FETCH NEXT FROM Agreement_Packages_Adjustments_Cursor INTO @packagesDiscountPercentage 

             END 

         CLOSE Agreement_Packages_Adjustments_Cursor;        

         DEALLOCATE Agreement_Packages_Adjustments_Cursor;

 

        SET @veteranDiscountAmount +=  (@veteranDiscountPercentage/100) * (@packagesTotalPrice- @packagesPromoDiscountAmount)

        

        PRINT 'Packages total price'

        PRINT @packagesTotalPrice

    

        PRINT 'Veteran Discount'

        PRINT @veteranDiscountAmount

    

    

        -- Properties discount

 

        SELECT @propertiesTotalPrice = ISNULL(SUM(aip.totalPrice-p.ecfAmount),0) FROM AgreementProperty ap 

        INNER JOIN Property p ON ap.propertyId = p.id 

        INNER JOIN AgreementItemPrice aip on aip.id = ap.agreementItemPriceId 

        WHERE ap.agreementId=@agreementId AND ap.deletedAt is NULL and ap.addendumId is null



        SELECT @addendumPropertiesTotalPrice = ISNULL(SUM(aip.totalPrice-p.ecfAmount),0) FROM AgreementProperty ap 

        INNER JOIN Property p ON ap.propertyId = p.id 

        INNER JOIN AgreementItemPrice aip on aip.id = ap.agreementItemPriceId 

        WHERE ap.agreementId=@agreementId AND ap.deletedAt is NULL and ap.addendumId=@addendumId





   

        SELECT  @veteranPropertiesTotalPrice = ISNULL(SUM(a.totalPrice + a.totalRightsCount), 0)
FROM
(SELECT ISNULL(SUM(aip.totalPrice-p.ecfAmount),0) as totalPrice, ISNULL(app.totalRightsCount, 0) as totalRightsCount FROM AgreementProperty ap 

        INNER JOIN Property p ON ap.propertyId = p.id 

        INNER JOIN AgreementItemPrice aip on aip.id = ap.agreementItemPriceId 

        LEFT JOIN (

            select ISNULL(sum(aip1.totalPrice),0) as totalRightsCount,APAR.agreementId 
						from AgreementPropertyAdditionalRight APAR 

            LEFT JOIN AgreementItemPrice aip1 on aip1.id = APAR.agreementItemPriceId   
						WHERE  APAR.deletedAt is null group by aip1.totalPrice,APAR.agreementId

        ) app on app.agreementId = ap.agreementId

        WHERE ap.agreementId=@agreementId AND ap.deletedAt is NULL GROUP BY app.totalRightsCount) a

        SELECT @propertiesPriceAtAddemdumLevelWithoutAdditionRights= ISNULL(a.totalPrice, 0)
FROM
(SELECT ISNULL(SUM(aip.totalPrice-p.ecfAmount),0) as totalPrice FROM AgreementProperty ap 

        INNER JOIN Property p ON ap.propertyId = p.id 

        INNER JOIN AgreementItemPrice aip on aip.id = ap.agreementItemPriceId 

        WHERE ap.agreementId=@agreementId AND ap.addendumId=@addendumId AND ap.deletedAt is NULL) a



        SELECT @propertiesPreApplyPrice = ISNULL(SUM(aaj.amount),0) FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title IN ('PN Discount', 'Predeveloped Discount', 'Pn Property Discount')

        WHERE aaj.agreementId =@agreementId AND aaj.deletedAt IS NULL and aaj.addendumId is null

        SELECT @propertiesPreApplyPriceForAgreement = ISNULL(SUM(aaj.amount),0) FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title IN ('PN Discount', 'Predeveloped Discount', 'Pn Property Discount')

        WHERE aaj.agreementId =@agreementId AND aaj.deletedAt IS NULL

        SELECT @addendumPropertiesPreApplyPrice = ISNULL(SUM(aaj.amount),0) FROM AgreementAdjustment aaj  

        INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title IN ('PN Discount', 'Predeveloped Discount', 'Pn Property Discount')

        WHERE aaj.agreementId =@agreementId AND aaj.deletedAt IS NULL and aaj.addendumId =@addendumId



     

        DECLARE Agreement_Properties_Adjustments_Cursor CURSOR FOR

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Property', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL AND aaj.addendumId is NULL ORDER BY aaj.createdAt;

         OPEN Agreement_Properties_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @propertiesPromoDiscountAmount += (@propertiesDiscountPercentage /100) * (@propertiesTotalPrice-@propertiesPromoDiscountAmount)

                 PRINT @packagesPromoDiscountAmount

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             END 

         CLOSE Agreement_Properties_Adjustments_Cursor;        

         DEALLOCATE Agreement_Properties_Adjustments_Cursor;



         DECLARE Agreement_Properties_Adjustments_Cursor CURSOR FOR

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Property', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL AND aaj.addendumId=@addendumId ORDER BY aaj.createdAt;

         OPEN Agreement_Properties_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @addendumPropertiesPromoDiscountAmount += (@propertiesDiscountPercentage /100) * (@addendumPropertiesTotalPrice-@addendumPropertiesPromoDiscountAmount)

                 PRINT @addendumPropertiesPromoDiscountAmount

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             END 

         CLOSE Agreement_Properties_Adjustments_Cursor;        

         DEALLOCATE Agreement_Properties_Adjustments_Cursor;





        DECLARE Agreement_Properties_Adjustments_Cursor CURSOR FOR

         SELECT  ISNULL(aaj.maxDiscount,0) FROM AgreementAdjustment aaj

                 INNER JOIN Adjustment a ON aaj.adjustmentId = a.id and a.discountUnit = '%'

                 INNER JOIN AdjustmentAgreementSection aas ON aas.adjustmentId = a.id 

                 INNER JOIN AgreementSection ags ON aas.agreementSectionId = ags.id AND ags.area IN ('Property', 'Contract')

                 INNER JOIN AdjustmentType at ON a.adjustmentTypeId = at.id AND at.adjustmentType = 'PromoDiscount'

                 WHERE aaj.agreementId=@agreementId AND aaj.deletedAt IS NULL ORDER BY aaj.createdAt;

         OPEN Agreement_Properties_Adjustments_Cursor;

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             WHILE  @@FETCH_STATUS=0

             BEGIN 

                 SET @veteranPromoDiscountAmount += (@propertiesDiscountPercentage /100) * (@veteranPropertiesTotalPrice-@veteranPromoDiscountAmount)

                 PRINT @veteranPromoDiscountAmount

             FETCH NEXT FROM Agreement_Properties_Adjustments_Cursor INTO @propertiesDiscountPercentage 

             END 

         CLOSE Agreement_Properties_Adjustments_Cursor;        

         DEALLOCATE Agreement_Properties_Adjustments_Cursor;



         SET @propertiesTotalPrice = case when @propertiesTotalPrice >0 then  @propertiesTotalPrice- @propertiesPreApplyPrice else 0 end

        SET @veteranPropertiesTotalPriceForAgreement = case when @veteranPropertiesTotalPrice >0 then  @veteranPropertiesTotalPrice- @propertiesPreApplyPriceForAgreement else 0 end

         SET @veteranPropertiesTotalPrice = case when @veteranPropertiesTotalPrice >0 then  @veteranPropertiesTotalPrice- @propertiesPreApplyPrice else 0 end

         SET @propertiesPriceAtAddemdumLevelWithoutAdditionRights = case when @propertiesPriceAtAddemdumLevelWithoutAdditionRights >0 then  @propertiesPriceAtAddemdumLevelWithoutAdditionRights- @propertiesPreApplyPrice else 0 end

         SET @addendumPropertiesTotalPrice = case when @addendumPropertiesTotalPrice >0 then  @addendumPropertiesTotalPrice- @addendumPropertiesPreApplyPrice else 0 end

 


        -- agreement adjustment calculations        

    
        IF (@addendumId IS NULL)
        BEGIN
            SET @veteranDiscountAmount +=  ((@veteranDiscountPercentage/100) * (@veteranPropertiesTotalPrice- @veteranPromoDiscountAmount) )
        END
        ELSE BEGIN
            SET @veteranDiscountAmount +=  ((@veteranDiscountPercentage/100) * (@veteranPropertiesTotalPriceForAgreement- @veteranPromoDiscountAmount) )
        END

        SET @propertiesVeteranDiscountAmount = (@veteranDiscountPercentage/100) * (@veteranPropertiesTotalPrice- @veteranPromoDiscountAmount)


        set @paidInFullDiscountAmount = case when @propertiesTotalPrice > 0 then  (@paidInFullDiscountPercentage/100) * (@propertiesTotalPrice- @propertiesPromoDiscountAmount - @propertiesVeteranDiscountAmount)   else 0 end

        UPDATE dbo.AgreementAdjustment SET amount=@veteranDiscountAmount WHERE id=@veteranDiscountId    

        UPDATE dbo.AgreementAdjustment SET amount=@paidInFullDiscountAmount WHERE id=@paidInFullDiscountId

        UPDATE Agreement SET totalAdjustment = (

         SELECT ISNULL(SUM(adjustmentTotals.adjustmentsTotal),0)  FROM (

             SELECT ISNULL(SUM(aa.amount),0) AS adjustmentsTotal FROM AgreementAdjustment aa 

                 INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=0 WHERE aa.agreementId=@agreementId AND aa.deletedAt IS NULL and aa.addendumId is NULL

                 UNION ALL 

             ----- Status 2 is approved ---------

             SELECT isnull(SUM(aa.amount),0) AS adjustmentsTotal  FROM AgreementAdjustment aa 

                 INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=1

                 INNER JOIN Approval ap ON  ap.resourceId=aa.id AND ap.resourceType = 'AgreementAdjustment'

                 WHERE  aa.agreementId=@agreementId AND aa.deletedAt IS NULL  AND ap.status in (2,5) and aa.addendumId is NULL

         ) adjustmentTotals

         ) from Agreement

      

         WHERE Agreement.id=@agreementId 

        select * from AgreementAdjustment WHERE id IN (@veteranDiscountId,@paidInFullDiscountId)

        -- addendum adjustment calculations



        SET @propertiesVeteranDiscountAmount = (@veteranDiscountPercentage/100) * (@propertiesPriceAtAddemdumLevelWithoutAdditionRights- @veteranPromoDiscountAmount)


        IF (@addendumPaidInFullDiscountId = 0 and @addendumId IS NOT NULL)
        BEGIN
            SELECT @addendumPaidInFullDiscountPercentage= a.discountValue, @addendumPaidInFullDiscountId= aaj.id FROM AgreementAdjustment aaj  
            INNER JOIN Adjustment a ON aaj.adjustmentId = a.id AND a.title = 'Paid in Full Discount'
            WHERE aaj.agreementId = @agreementId AND aaj.deletedAt IS NULL
        END

       

        SET @addendumPaidInFullDiscountAmount =  (@addendumPaidInFullDiscountPercentage/100) * (@addendumPropertiesTotalPrice- @addendumPropertiesPromoDiscountAmount-@propertiesVeteranDiscountAmount)    

        SET @addendumPaidInFullDiscountAmount = case when @addendumPaidInFullDiscountAmount < 0 then 0 else @addendumPaidInFullDiscountAmount end

        UPDATE dbo.AgreementAdjustment SET amount=@addendumPaidInFullDiscountAmount WHERE id=@addendumPaidInFullDiscountId

        UPDATE Agreement SET totalAdjustment = (

         SELECT ISNULL(SUM(adjustmentTotals.adjustmentsTotal),0)  FROM (

             SELECT ISNULL(SUM(aa.amount),0) AS adjustmentsTotal FROM AgreementAdjustment aa 

                 INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=0 WHERE aa.agreementId=@agreementId AND aa.deletedAt IS NULL

                 UNION ALL

             ----- Status 2 is approved ---------

             SELECT isnull(SUM(aa.amount),0) AS adjustmentsTotal  FROM AgreementAdjustment aa 

                 INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=1

            INNER JOIN Approval ap ON  ap.resourceId=aa.id AND ap.resourceType = 'AgreementAdjustment'

                 WHERE  aa.agreementId=@agreementId AND aa.deletedAt IS NULL  AND ap.status in (2,5)

         ) adjustmentTotals

         ) 

         FROM Agreement

         INNER JOIN Addendum ad on ad.agreementId= Agreement.id

         WHERE Agreement.id=@agreementId and ad.id=@addendumId

    

         update ChangeLog set unitPrice=@veteranDiscountAmount, totalPrice=@veteranDiscountAmount where resourceId=@veteranDiscountId and resourceType='AgreementAdjustment'



         update ChangeLog set unitPrice=@paidInFullDiscountAmount, totalPrice=@paidInFullDiscountAmount where resourceId=@paidInFullDiscountId and resourceType='AgreementAdjustment'

         update ChangeLog set unitPrice=@addendumPaidInFullDiscountAmount, totalPrice=@addendumPaidInFullDiscountAmount where resourceId=@addendumPaidInFullDiscountId and resourceType='AgreementAdjustment'

        select * from AgreementAdjustment WHERE id IN (@addendumPaidInFullDiscountId)

        END
GO

    `)
  },

  down: (queryInterface, Sequelize) => {
    return models.sequelize.query(`
      DROP PROCEDURE [dbo].[updateVeteranAndPaidInFullDiscount]
    `)
  }
};
