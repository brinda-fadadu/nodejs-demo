IF OBJECT_ID('GetAgreementDetails','P') IS NOT NULL
	DROP PROCEDURE GetAgreementDetails
GO
CREATE PROCEDURE GetAgreementDetails(
      @AgreementtId INT)
    AS
    BEGIN
      --DECLARE @AgreementtId INT = 111
      DECLARE @AGREEMENTITEM TABLE(
        itemId INT,
        itemName NVARCHAR(512),
        isTaxable BIT,
        itemCode NVARCHAR(512),
        price DECIMAL(18,2),
        tax DECIMAL(18,2),
        statementItemPrice DECIMAL(18,2),
        quantity INT,
        itemCategory NVARCHAR(512),
        itemType NVARCHAR(512),
        industryType NVARCHAR(512),
        locationCode NVARCHAR(512),
        attributeValue NVARCHAR(512),
        statementItemCategoryDesc NVARCHAR(512),
        statementItemAttributeDesc NVARCHAR(512),
        statementItemCodeDesc NVARCHAR(512),
        isCashAdvanceItems BIT,
        isPartOfPackage BIT,
        packageItemPriceMessage NVARCHAR(50),
        DuplicateRows INT
      )
    
      DECLARE @ITEMCODEMAPPER TABLE(
        ITEMCode NVARCHAR(20),
        AgreementItemMapperID INT)
      DECLARE @OTHERREMAINS INT = 0
      DECLARE @REFRIGERATION INT = 0
      DECLARE @FUNERALCEMCHAPEL INT = 0
      DECLARE @VISITATION INT = 0
      DECLARE @ADDVISITATION INT = 0
      DECLARE @GRAVESIDESERVICE INT = 0
      DECLARE @RECEPTIONCENTER INT = 0
      DECLARE @LOCALREMOVAL INT = 0
      DECLARE @CASCKETCOUCH INT = 0
      -- DECLARE @CREMATIONURN INT = 0
      DECLARE @CLOTHING INT = 0
      DECLARE @CERTDEATHCERTIFICATES INT = 0
      DECLARE @DISPOSITIONPERMIT INT = 0
      DECLARE @CORNERFEE INT = 0
      DECLARE @CHURCHOFFERING INT = 0
      DECLARE @CLERGYHONORANIUM INT = 0
      DECLARE @MUSICIANFEE INT = 0
      DECLARE @NEWSPAPERNOTICES INT = 0
      DECLARE @SANCHRONICLE INT = 0
      DECLARE @OTHERNEWSPAPER INT  = 0
      DECLARE @Limousine INT = 0
      DECLARE @BASICSTAFF INT = 0
      DECLARE @EMBALMING INT = 0
      DECLARE @MEMORIALSERVICE INT = 0
      DECLARE @ARRANGEINTRTRANSPORT INT = 0
      DECLARE @UTILITYFLOWER INT = 0
      DECLARE @FORWARDREMAINS INT = 0
      DECLARE @RECEIVINGREMAINS INT = 0
      DECLARE @CREMATORYCHARGES INT = 0
    
      SELECT @EMBALMING = Id FROM AgreementItemMapper WHERE NAME = 'Embalming' 
      SELECT @BASICSTAFF = Id FROM AgreementItemMapper WHERE NAME = 'Baisc service of funeral Director and Staff'
      SELECT @OTHERREMAINS = Id FROM AgreementItemMapper WHERE NAME = 'Other preperation of Remains'
      SELECT @REFRIGERATION = Id FROM AgreementItemMapper WHERE NAME = 'Refrigeration'
      SELECT @FUNERALCEMCHAPEL = Id FROM AgreementItemMapper WHERE NAME = 'Funeral cemetery at mortuary chappel'
      SELECT @VISITATION = Id FROM AgreementItemMapper WHERE NAME = 'Visitation/Viewing/Vigil Services'
      SELECT @ADDVISITATION = Id FROM AgreementItemMapper WHERE NAME = 'Additional visitation'
      SELECT @GRAVESIDESERVICE = Id FROM AgreementItemMapper WHERE NAME = 'Graveside commital service'
      SELECT @RECEPTIONCENTER = Id FROM AgreementItemMapper WHERE NAME = 'Reception center'
      SELECT @LOCALREMOVAL = Id FROM AgreementItemMapper WHERE NAME = 'Local removal from place of death to funeral home'
      SELECT @CASCKETCOUCH = Id FROM AgreementItemMapper WHERE NAME = 'Casket couch'
      -- SELECT @CREMATIONURN = Id FROM AgreementItemMapper WHERE NAME = 'Cremation urn'
      SELECT @CLOTHING = Id FROM AgreementItemMapper WHERE NAME = 'Clothing'
      SELECT @CERTDEATHCERTIFICATES = Id FROM AgreementItemMapper WHERE NAME = 'Certified death certificates'
      SELECT @DISPOSITIONPERMIT = Id FROM AgreementItemMapper WHERE NAME = 'Disposition Permit'
      SELECT @CORNERFEE = Id FROM AgreementItemMapper WHERE NAME = 'Coroners fee'
      SELECT @CHURCHOFFERING = Id FROM AgreementItemMapper WHERE NAME = 'Church Offering'
      SELECT @CLERGYHONORANIUM = Id FROM AgreementItemMapper WHERE NAME = 'Clergy Honorarium'
      SELECT @MUSICIANFEE = Id FROM AgreementItemMapper WHERE NAME = 'Musician Fee'
      SELECT @NEWSPAPERNOTICES = Id FROM AgreementItemMapper WHERE NAME = 'Newspaper Notices'
      SELECT @SANCHRONICLE = Id FROM AgreementItemMapper WHERE NAME = 'San Francisco Chronicle'
      SELECT @OTHERNEWSPAPER = Id FROM AgreementItemMapper WHERE NAME = 'Other Newspaper'
      SELECT @Limousine = Id FROM AgreementItemMapper WHERE NAME = 'Limousine'
      SELECT @MEMORIALSERVICE = Id FROM AgreementItemMapper WHERE NAME = 'Memorial Service'
      SELECT @ARRANGEINTRTRANSPORT = Id FROM AgreementItemMapper WHERE NAME = 'Arrange International Transport with consulate'
      SELECT @UTILITYFLOWER = Id FROM AgreementItemMapper WHERE NAME = 'Utility Flower/Vehicle care'
      /* SELECT @FORWARDREMAINS = Id FROM AgreementItemMapper WHERE NAME = 'Forwarding remains to another Funeral home'
      SELECT @RECEIVINGREMAINS = Id FROM AgreementItemMapper WHERE NAME = 'Receiving remains from another Funeral Home' */
    
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CEMBM', @EMBALMING
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CSTAF', @BASICSTAFF
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CPREP', @OTHERREMAINS
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CREFI', @REFRIGERATION
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CFSVS', @FUNERALCEMCHAPEL
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CVISI', @VISITATION
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CVISIA', @ADDVISITATION
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CGRSVS', @GRAVESIDESERVICE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CRECE', @RECEPTIONCENTER
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CTRSF', @LOCALREMOVAL
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CSVSCA-TC1', @CASCKETCOUCH
      /* INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'BV148341', @CREMATIONURN
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CFTF218-1', @CREMATIONURN
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CYP1002', @CREMATIONURN */
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CCLOT', @CLOTHING
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CDC', @CERTDEATHCERTIFICATES
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CDP', @DISPOSITIONPERMIT
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CCORN', @CORNERFEE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CCHUR', @CHURCHOFFERING
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CCLRG', @CLERGYHONORANIUM
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CMUSI', @MUSICIANFEE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBITPOST', @NEWSPAPERNOTICES
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBITSF', @SANCHRONICLE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBIT', @OTHERNEWSPAPER
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBITMN', @OTHERNEWSPAPER
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBITPOST', @OTHERNEWSPAPER
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'COBITSM', @OTHERNEWSPAPER
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CLIMO', @Limousine
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CLIMO8', @Limousine
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CMSVS', @MEMORIALSERVICE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CMSVSS', @MEMORIALSERVICE
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CINTLPROFE', @ARRANGEINTRTRANSPORT
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CSVSCA', @UTILITYFLOWER
      /* INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CSP-F1', @FORWARDREMAINS
      INSERT INTO @ITEMCODEMAPPER(ITEMCode,AgreementItemMapperID)
        SELECT 'CSP-R1', @RECEIVINGREMAINS */
        
    
      INSERT INTO @AGREEMENTITEM  
      SELECT DISTINCT I.id AS ITEMID,  
        I.name as ItemName,  
        I.isTaxable,  
        i.code,  
        LI.price,  
        L.Tax,  
        AIP.unitPrice AS StatementItemPrice,  
        AIP.quantity,  
        IC.name,  
        IT.name,  
        II.name,  
        L.Code AS LocationCode,  
        AV.name,  
        SIM.Name AS StatementItemCategoryDesc,  
        SIMA.Name AS StatementItemAttributeDesc,  
        SIM1.Name AS StatementItemCodeDesc,  
        0 AS isCashAdvanceItems,  
        0 AS isPartOfPackage, 
        NULL,
		ROW_NUMBER() OVER (PARTITION BY I.ID ORDER BY AV.NAME DESC) AS RANK1
      FROM AgreementLocationItem ALI  
        INNER JOIN AgreementItemPrice AIP  
          ON ALI.agreementItemPriceId = AIP.id  
        INNER JOIN LocationItem LI  
          ON ALI.locationItemId = LI.id  
        INNER JOIN Item I  
          ON LI.itemId = I.id  
        INNER JOIN ItemCategory IC  
          ON I.itemCategoryId = IC.id  
        INNER JOIN ItemType IT  
          ON IC.itemTypeId = IT.id  
        INNER JOIN ItemCategoryIndustry ICI  
          ON IC.id = ICI.itemCategoryId  
        INNER JOIN ItemIndustry II  
          ON ICI.itemIndustryId = II.id  
        INNER JOIN Location L  
          ON LI.locationId = L.id  
        LEFT JOIN ItemAttributeValue IAV  
          ON I.id = IAV.itemId  
        LEFT JOIN AttributeValue AV  
          ON IAV.attributeValueId = AV.id AND AV.name IN ('Folders','Register','Acknowledgement Cards','Funeral Cremation Service','Cemetery Cremation Service','Cemetery Witness Cremation Services','Funeral Witness Cremation Service')  
        LEFT JOIN AgreementItemAttributeValueMapper SIAVM  
          ON AV.id = SIAVM.AttributeValueId  
        LEFT JOIN AgreementItemCategoryMapper SICM  
          ON IC.id = SICM.ItemCategoryId  
        LEFT JOIN AgreementItemMapper SIM  
          ON SICM.agreementItemMapperId = SIM.Id  
        LEFT JOIN AgreementItemMapper SIMA  
          ON SIAVM.agreementItemMapperId = SIMA.Id  
        LEFT JOIN @ITEMCODEMAPPER ICM  
          ON I.code = ICM.ITEMCode  
        LEFT JOIN AgreementItemMapper SIM1  
          ON ICM.agreementItemMapperId = SIM1.Id  
      WHERE ALI.deletedBy IS NULL AND ALI.agreementId = @AgreementtId AND II.name = 'Funeral'  
	
      DELETE FROM @AGREEMENTITEM WHERE DuplicateRows > 1 AND attributeValue IS NULL

      -- SELECT * FROM @AGREEMENTITEM
    
      INSERT INTO @AGREEMENTITEM
      SELECT I.id AS ITEMID,
        I.name as ItemName,
        I.isTaxable,
        i.code,
        LI.price,
        L.Tax,
        AIP.unitPrice AS StatementItemPrice,
        AIP.quantity,
        IC.name,
        IT.name,
        II.name,
        L.Code AS LocationCode,
        AV.name,
        SIM.Name AS StatementItemCategoryDesc,
        SIMA.Name AS StatementItemAttributeDesc,
        SIM1.Name AS StatementItemCodeDesc,
        1 AS isCashAdvanceItems,
        0 AS isPartOfPackage,
        NULL,
        0
      FROM AgreementCashAdvancedItem SLCAI
        INNER JOIN AgreementItemPrice AIP
          ON SLCAI.agreementItemPriceId = AIP.id
        INNER JOIN LocationItem LI
          ON SLCAI.locationItemId = LI.id
        INNER JOIN Item I
          ON LI.itemId = I.id
        INNER JOIN ItemCategory IC
          ON I.itemCategoryId = IC.id
        INNER JOIN ItemType IT
          ON IC.itemTypeId = IT.id
        INNER JOIN ItemCategoryIndustry ICI
          ON IC.id = ICI.itemCategoryId
        INNER JOIN ItemIndustry II
          ON ICI.itemIndustryId = II.id
        INNER JOIN Location L
          ON LI.locationId = L.id
        LEFT JOIN ItemAttributeValue IAV
          ON I.id = IAV.itemId
        LEFT JOIN AttributeValue AV
          ON IAV.attributeValueId = AV.id AND AV.name IN ('Folders','Register','Acknowledgement Cards')
        LEFT JOIN AgreementItemAttributeValueMapper SIAVM
          ON AV.id = SIAVM.AttributeValueId
        LEFT JOIN AgreementItemCategoryMapper SICM
          ON IC.id = SICM.ItemCategoryId
        LEFT JOIN AgreementItemMapper SIM
          ON SICM.agreementItemMapperId = SIM.Id
        LEFT JOIN AgreementItemMapper SIMA
          ON SIAVM.agreementItemMapperId = SIMA.Id
        LEFT JOIN @ITEMCODEMAPPER ICM
          ON I.code = ICM.ITEMCode
        LEFT JOIN AgreementItemMapper SIM1
          ON ICM.AgreementItemMapperID = SIM1.Id
      WHERE SLCAI.deletedBy IS NULL AND SLCAI.agreementId = @AgreementtId AND II.name = 'Funeral'
    
      -- SELECT * FROM @AGREEMENTITEM
    
      SELECT DISTINCT I.id AS ITEMID,
        I.name as ItemName,
        I.isTaxable,
        i.code,
        LI.price,
        L.Tax,
        AIP.unitPrice AS StatementItemPrice,
        AIP.quantity,
        IC.name AS itemCategory,
        IT.name AS itemType,
        II.name AS industryType,
        L.Code AS LocationCode,
        AV.name,
        SIM.Name AS StatementItemCategoryDesc,
        SIMA.Name AS StatementItemAttributeDesc,
        SIM1.Name AS StatementItemCodeDesc,
        1 AS isCashAdvanceItems,
        P.name AS packageName INTO #PACKAGEITEMS
      FROM AgreementPackage SP
        INNER JOIN AgreementPackageItem SPLI
          ON SP.id = SPLI.agreementPackageId
        INNER JOIN AgreementItemPrice AIP
          ON SP.agreementItemPriceId = AIP.id
        INNER JOIN Package P
          ON SP.packageId = P.id
        INNER JOIN LocationItem LI
          ON SPLI.locationItemId = LI.id
        INNER JOIN Item I
          ON LI.itemId = I.id
        INNER JOIN ItemCategory IC
          ON I.itemCategoryId = IC.id
        INNER JOIN ItemType IT
          ON IC.itemTypeId = IT.id
        INNER JOIN ItemCategoryIndustry ICI
          ON IC.id = ICI.itemCategoryId
        INNER JOIN ItemIndustry II
          ON ICI.itemIndustryId = II.id
        INNER JOIN Location L
          ON LI.locationId = L.id
        LEFT JOIN ItemAttributeValue IAV
          ON I.id = IAV.itemId
        LEFT JOIN AttributeValue AV
          ON IAV.attributeValueId = AV.id AND AV.name IN ('Folders','Register','Acknowledgement Cards')
        LEFT JOIN AgreementItemAttributeValueMapper SIAVM
          ON AV.id = SIAVM.AttributeValueId
        LEFT JOIN AgreementItemCategoryMapper SICM
          ON IC.id = SICM.ItemCategoryId
        LEFT JOIN AgreementItemMapper SIM
          ON SICM.agreementItemMapperId = SIM.Id
        LEFT JOIN AgreementItemMapper SIMA
          ON SIAVM.agreementItemMapperId = SIMA.Id
        LEFT JOIN @ITEMCODEMAPPER ICM
          ON I.code LIKE ICM.ITEMCode +'%'
        LEFT JOIN AgreementItemMapper SIM1
          ON ICM.AgreementItemMapperID = SIM1.Id
      WHERE SP.deletedBy IS NULL AND SP.agreementId = @AgreementtId AND II.name = 'Funeral'
    
      DECLARE @CASCKETITEMDESC NVARCHAR(MAX) = ''
    
      SELECT @CASCKETITEMDESC = @CASCKETITEMDESC+ItemName+',' FROM @AGREEMENTITEM WHERE statementItemCategoryDesc = 'Casket'
    
      INSERT INTO @AGREEMENTITEM(itemId,itemCode,itemName,isTaxable,price,tax,statementItemPrice,quantity,itemCategory,itemType,industryType,locationCode,attributeValue,statementItemCategoryDesc,statementItemAttributeDesc,statementItemCodeDesc,isCashAdvanceItems,isPartOfPackage,packageItemPriceMessage)
      SELECT ISNULL(PI1.ITEMID, SI.itemId) AS itemId,
        ISNULL(PI1.code, SI.itemCode) AS itemCode,
        ISNULL(PI1.itemName, SI.itemName) AS itemName,
        ISNULL(PI1.isTaxable ,SI.isTaxable) AS isTaxable,
        ISNULL(PI1.price, SI.price) AS price,
        ISNULL(PI1.tax,SI.tax) AS tax,
        0 AS statementItemPrice,
        ISNULL(PI1.quantity,SI.quantity) AS quantity,
        ISNULL(PI1.itemCategory,SI.itemCategory) AS itemCategory,
        ISNULL(PI1.itemType,SI.itemType) AS itemType,
        ISNULL(PI1.industryType,SI.industryType) AS industryType,
        ISNULL(PI1.locationCode,SI.locationCode) AS locationCode,
        ISNULL(PI1.name,SI.attributeValue) AS attributeValue,
        ISNULL(PI1.statementItemCategoryDesc,SI.statementItemCategoryDesc) AS statementItemCategoryDesc,
        ISNULL(PI1.statementItemAttributeDesc,SI.statementItemAttributeDesc) AS statementItemAttributeDesc,
        ISNULL(PI1.statementItemCodeDesc,SI.statementItemCodeDesc) AS statementItemCodeDesc,
        ISNULL(PI1.isCashAdvanceItems,SI.isCashAdvanceItems) AS isCashAdvanceItems,
        1,
        CASE WHEN ICM.ITEMCode IS NOT NULL THEN 'Included' ELSE NULL END AS packageItemPriceMessage
      FROM #PACKAGEITEMS PI1
        LEFT JOIN @AGREEMENTITEM SI
          ON PI1.code = SI.itemCode
        LEFT JOIN @ITEMCODEMAPPER ICM
         ON PI1.code LIKE ICM.ITEMCode +'%'
        --WHERE SI.itemCode IS NOT NULL
    
      -- If items are part of package then items added will be part of others calculation, so removing below fields will group them into 'Others'
      UPDATE SI SET statementItemCodeDesc=NULL,statementItemAttributeDesc=NULL,statementItemCategoryDesc=NULL FROM @AGREEMENTITEM SI
        INNER JOIN #PACKAGEITEMS PI1
          ON SI.itemCode = PI1.code
      WHERE SI.isPartOfPackage = 0
    
      SELECT DISTINCT PI1.packageName,PI1.quantity,PI1.StatementItemPrice	FROM  #PACKAGEITEMS PI1
    
      -- PRINT @CASCKETITEMDESC
      -- SELECT * FROM @AGREEMENTITEM
    
      SELECT
        CASE WHEN statementItemCategoryDesc = 'Casket' AND statementItemCodeDesc IS NULL AND statementItemAttributeDesc IS NULL THEN SUBSTRING(@CASCKETITEMDESC,1,LEN(@CASCKETITEMDESC)-1)
              ELSE NULL END AS descr,
        ISNULL(statementItemCodeDesc,ISNULL(statementItemAttributeDesc,ISNULL(statementItemCategoryDesc,'OTHER'))) AS lineItemName,
        itemType,
        SUM(quantity) AS quantity,
        SUM(STATEMENTITEMPRICE*quantity) AS totalValue,
        packageItemPriceMessage 
      FROM @AGREEMENTITEM SI
      WHERE (SI.statementItemCodeDesc IS NOT NULL OR SI.statementItemAttributeDesc IS NOT NULL OR SI.statementItemCategoryDesc IS NOT NULL)
      OR (SI.statementItemCodeDesc IS NULL AND SI.statementItemAttributeDesc IS NULL AND SI.statementItemCategoryDesc IS NULL AND SI.packageItemPriceMessage IS NULL)
      GROUP BY itemType,statementItemCategoryDesc,statementItemAttributeDesc,statementItemCodeDesc,packageItemPriceMessage
    
      SELECT CASE WHEN itemType = 'Merchandises' THEN 'totalMerchandise' 
        WHEN itemType ='Services' THEN 'totalService' 
        ELSE 'totalCashAdvance' END AS name,
        itemType,
        SUM(STATEMENTITEMPRICE*quantity) AS totalValue FROM @AGREEMENTITEM
      WHERE packageItemPriceMessage IS NULL
      GROUP BY itemType
    
      
      select totalPurchasePrice,totalPrice,totalCashPrice,totalTax,totalAdjustment,totalPaid,due from Agreement WHERE ID = @AgreementtId
    
      SELECT P.firstName+' '+ISNULL(P.middleName,'')+ ' ' +ISNULL(P.lastName,'') AS fullName,
        p.dateOfBirth,
        DD.dateOfDeath,
        RE.name,
        A.line1 +','+ ISNULL(A.line2,'') AS address,
        A.city,
        A.state,
        A.zipcode,
        P.phoneNumber,
        RE.name as relation,
        R.Name AS roleName,
        P.id AS personId
        INTO #personDetails
      FROM Agreement S
        INNER JOIN AgreementPerson AP
          ON S.id = AP.agreementId
        LEFT JOIN Relation RE
          ON AP.relationId = RE.id
        --INNER JOIN AgreementPersonRole APR
        --	ON AP.id = APR.agreementPersonId
        INNER JOIN AgreementRole R
          ON AP.roleId = R.id
        INNER JOIN Person P
          ON AP.personId = P.id
        LEFT JOIN DeathDetails DD
          ON P.id = DD.personId
        --LEFT JOIN PersonInfo PI1
        --	ON P.id = PI1.personId
        LEFT JOIN Place PL
          ON P.addressPlaceId = PL.id
        LEFT JOIN Address A
          ON PL.addressId = A.id
      WHERE S.id = @AgreementtId AND AP.deletedAt IS NULL--AND R.id = 4
    
      INSERT INTO #personDetails(fullName,roleName,personId)
      SELECT P.firstName+' '+ISNULL(P.middleName,'')+' '+ISNULL(P.lastName,'') AS fullName,R.Name,P.id FROM  PersonContact CP
          INNER JOIN #personDetails PD
            ON CP.personId = PD.personId
          INNER JOIN PersonContactRole CCR
            ON CP.id = CCR.personContactId
          INNER JOIN ContactRole R
            ON CCR.roleId = R.id
          INNER JOIN Person P
            ON CP.resourceId = P.id
      WHERE R.Name = 'Musician' AND PD.roleName = 'Beneficiary'
    
      SELECT * FROM #personDetails
      --SELECT * FROM Role WHERE personId = 56
      DROP TABLE #personDetails,#PACKAGEITEMS
    END
GO