'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Load_Valid_CemeteryContract_Data') IS NOT NULL
    --DROP PROCEDURE Load_Valid_CemeteryContract_Data

    CREATE PROCEDURE Load_Valid_CemeteryContract_Data
    AS
    BEGIN
        DECLARE @VALIDCONTRACTS TABLE(
            id INT IDENTITY(1,1),
            arrangementId INT,
            txnId INT,
            isAn BIT,
            salesId INT,
            salesFinanceId INT,
            isLinked BIT,
            contractRelationId INT,
            linkedArrangementId INT,
            linkedSalesId INT,
            ContractNbr NVARCHAR(50),
            ISINPROGRESSCONTRACT BIT
        )

        SELECT T1.* INTO #TEMPTXN FROM cemportal.dbo.Txn T1
            INNER JOIN (SELECT MIN(cemportal.dbo.Txn.id) as id FROM cemportal.dbo.Txn  GROUP BY cemportal.dbo.Txn.arrangement) as T2
                ON T1.id = T2.id
        
        SELECT TL.txn,SUM(TL.price) AS TRANSACTIONPRICE INTO #TransactionLineItems
        FROM cemportal.DBO.TxnLine TL 
        WHERE TL.qty>0 AND TL.salesItemID IS NOT NULL 
        GROUP BY TL.txn

        SELECT TL.txn,WO.* INTO #WORKORDERITEMS
        FROM cemportal.DBO.TXNLINE TL
            INNER JOIN cemportal.DBO.WorkOrder WO
                ON TL.id = WO.txnLine
        
        SELECT TL.txn,PO.* INTO #PURCAHSEORDERS
        FROM cemportal.DBO.TXNLINE TL
            INNER JOIN cemportal.DBO.PurchOrder PO
                ON TL.id = PO.txnLine
        
        INSERT INTO @VALIDCONTRACTS(arrangementId,txnId,isAn,ContractNbr,salesId,linkedSalesId,isLinked,contractRelationId,linkedArrangementId,ISINPROGRESSCONTRACT)
        SELECT A.ID AS ARRANGEMENTID,T.id AS TXNID,T.isAtNeed,T.contractNbr,MH.hmisSalesID,NULL AS contract,0,NULL,
            NULL,0
        FROM cemportal.dbo.Arrangement A
            INNER JOIN cemportal.dbo.MigrationHistory MH
                ON  A.id = MH.arrangementID
            INNER JOIN #TEMPTXN T
                ON A.id = T.arrangement

        -- SELECT * FROM @VALIDCONTRACTS WHERE salesId = 23982510

        --INSERT INTO @VALIDCONTRACTS(arrangementId,txnId,isAn,ContractNbr,salesId,linkedSalesId,isLinked,contractRelationId,linkedArrangementId,ISINPROGRESSCONTRACT)
        --SELECT DISTINCT NULL,NULL,NULL,S.Sales_Contract_Nbr,S.Sales_ID,NULL,1,NULL,NULL,0 FROM @VALIDCONTRACTS VC
        --    INNER JOIN cemportal.DBO.ContractRelation CR
        --        ON VC.arrangementId = CR.arrangement
        --    INNER JOIN h_000.DBO.Sales S
        --        ON CR.contract = S.Sales_ID
        --    -- LEFT JOIN @VALIDCONTRACTS VC1
        --    --     ON VC.salesId = VC1.salesId
        --    -- INNER JOIN h_000.DBO.Sales_Finance SF
        --    --     ON S.Sales_ID = SF.Sales_ID AND SF.Active = 1
        --WHERE contract IS NOT NULL

        -- SELECT * FROM @VALIDCONTRACTS WHERE salesId = 23982510

        SELECT A.ID as AgreementId,T.ID as TxnId,T.CONTRACTNBR,TL1.TRANSACTIONPRICE,CR.contract,WOT.id AS WORKORDERID,
                        S1.Sales_ID,S1.Sales_Contract_Nbr,S.Sales_ID AS LinkedSalesId,S.Sales_Contract_Nbr AS LinkedHMISContractNbr,
                        S.Sale_Dt,MH1.hmisSalesID AS LinkedContractSalesId,MH1.arrangementID as LinkedContractArrangemntId,T1.id AS LINKEDTXNID ,
                        T1.contractNbr AS LinkedContractNbr,TL2.TRANSACTIONPRICE AS LinkedPrice INTO #INVALIDWORKORDERCONTRACTS 
            FROM cemportal.dbo.Arrangement A
            INNER JOIN #TEMPTXN T
                ON A.id = T.arrangement
            LEFT JOIN #WORKORDERITEMS WOT
                ON T.ID = WOT.txn
            LEFT JOIN #TransactionLineItems TL1
                ON T.id = TL1.txn
            LEFT JOIN cemportal.DBO.ContractRelation CR
                ON A.id = CR.arrangement
            LEFT JOIN cemportal.dbo.MigrationHistory MH
                ON A.id = MH.arrangementID
            LEFT JOIN h_000.DBO.Sales S1
                ON MH.arrangementID = S1.Sales_ID
            LEFT JOIN h_000.DBO.Sales S
                ON CR.contract = S.Sales_ID
            LEFT JOIN cemportal.DBO.MigrationHistory MH1
                ON S.Sales_ID = MH1.hmisSalesID
            LEFT JOIN #TEMPTXN T1
                ON MH1.arrangementID = T1.arrangement
            LEFT JOIN #TransactionLineItems TL2
                ON T1.id = TL2.txn
        WHERE MH.id IS NULL AND CR.CONTRACT IS NOT NULL AND (T.contractNbr = T1.contractNbr OR T.contractNbr = S.Sales_Contract_Nbr)

        SELECT A.ID as AgreementId,T.ID as TxnId,T.CONTRACTNBR,TL1.TRANSACTIONPRICE,CR.contract,WOT.id AS PURCAHSEORDERID,
                WOT.dateOrdered,WOT.dateExpected,S1.Sales_ID,S1.Sales_Contract_Nbr,S.Sales_ID AS LinkedSalesId,S.Sales_Contract_Nbr AS LinkedHMISContractNbr,
                S.Sale_Dt,MH1.hmisSalesID AS LinkedContractSalesId,MH1.arrangementID as LinkedContractArrangemntId,T1.id AS LINKEDTXNID ,
                T1.contractNbr AS LinkedContractNbr,TL2.TRANSACTIONPRICE AS LinkedPrice INTO #INVALIDPURCAHSEORDERCONTRACTS 
            FROM cemportal.dbo.Arrangement A
            INNER JOIN #TEMPTXN T
                ON A.id = T.arrangement
            LEFT JOIN #PURCAHSEORDERS WOT
                ON T.ID = WOT.txn
            LEFT JOIN #TransactionLineItems TL1
                ON T.id = TL1.txn
            LEFT JOIN cemportal.DBO.ContractRelation CR
                ON A.id = CR.arrangement
            LEFT JOIN cemportal.dbo.MigrationHistory MH
                ON A.id = MH.arrangementID
            LEFT JOIN h_000.DBO.Sales S1
                ON MH.arrangementID = S1.Sales_ID
            LEFT JOIN h_000.DBO.Sales S
                ON CR.contract = S.Sales_ID
            LEFT JOIN cemportal.DBO.MigrationHistory MH1
                ON S.Sales_ID = MH1.hmisSalesID
            LEFT JOIN #TEMPTXN T1
                ON MH1.arrangementID = T1.arrangement
            LEFT JOIN #TransactionLineItems TL2
                ON T1.id = TL2.txn
        WHERE MH.id IS NULL AND CR.CONTRACT IS NOT NULL AND (T.contractNbr = T1.contractNbr OR T.contractNbr = S.Sales_Contract_Nbr) AND WOT.dateReceived IS NOT NULL

        INSERT INTO @VALIDCONTRACTS(arrangementId,txnId,isAn,salesId,salesFinanceId,isLinked,ContractNbr,linkedSalesId,contractRelationId,linkedArrangementId,ISINPROGRESSCONTRACT)
        SELECT DISTINCT A.ID AS ARRANGEMENTID,T.ID AS TXNID,T.isAtNeed,NULL,NULL,NULL,T.CONTRACTNBR,NULL,NULL, 
            NULL,1
        FROM cemportal.dbo.Arrangement A
            INNER JOIN #TEMPTXN T
                ON A.id = T.arrangement
            INNER JOIN cemportal.DBO.CaseStatus CS
                ON T.caseStatus = CS.id
            INNER JOIN cemportal.DBO.TxnLine TL
                ON T.id = TL.txn
            LEFT JOIN #INVALIDPURCAHSEORDERCONTRACTS IPOC
                ON T.id = IPOC.TxnId AND IPOC.PURCAHSEORDERID IS NOT NULL AND ISNULL(IPOC.TRANSACTIONPRICE,0)=0
            LEFT JOIN #INVALIDWORKORDERCONTRACTS IWOC
                ON T.id = IWOC.TxnId AND IWOC.WORKORDERID IS NULL AND ISNULL(IWOC.TRANSACTIONPRICE,0)=0
            LEFT JOIN @VALIDCONTRACTS VC
                ON A.id = VC.arrangementId
        WHERE IPOC.AgreementId IS NULL AND IWOC.AgreementId IS NULL AND CS.[status] IN ('NEW','pending') AND ISNULL(T.contractNbr,'') <> '' AND VC.id IS NULL
        ORDER BY A.id DESC

        -- SELECT * FROM @VALIDCONTRACTS WHERE salesId = 23982510

        -- SELECT * FROM @VALIDCONTRACTS
        INSERT INTO @VALIDCONTRACTS(arrangementId,txnId,isAn,ContractNbr,salesId,linkedSalesId,isLinked,contractRelationId,linkedArrangementId,ISINPROGRESSCONTRACT)
        SELECT DISTINCT NULL,NULL,NULL,S.Sales_Contract_Nbr,contract,NULL,NULL,NULL,NULL,0 FROM (SELECT * FROM (SELECT ID,Arrangement,contract,RANK() OVER (PARTITION BY ARRANGEMENT,CONTRACT ORDER BY ID DESC) AS CR1 
        FROM cemportal.DBO.ContractRelation) T WHERE T.CR1 = 1 AND T.contract IS NOT NULL) CR
            INNER JOIN h_000.DBO.Sales S
                ON CR.contract = S.Sales_ID
            LEFT JOIN @VALIDCONTRACTS VC
                ON CR.contract = VC.salesId
        WHERE VC.id IS NULL

        -- --ORDER BY RANK1 DESC
        -- ---- 24093
        DECLARE @CURRENTTIME DATETIME = GETDATE()
        INSERT INTO LinkAgreement(Arrangement,Txn,hmisSalesId,hmisSalesFinanceId,IsLinkedContract,ContractRelationId,LinkedArrangementId,LinkedSalesId,hmisContractNumber,hmisContractType,statusId,createdAt,updatedAt)
        SELECT  arrangementId,txnId,salesId,salesFinanceId,isLinked,contractRelationId,linkedArrangementId,linkedSalesId,ContractNbr,'Cem',1,@CURRENTTIME,@CURRENTTIME  FROM @VALIDCONTRACTS
    
        DROP TABLE #PURCAHSEORDERS
        DROP TABLE #TEMPTXN
        DROP TABLE #TransactionLineItems
        DROP TABLE #WORKORDERITEMS
        DROP TABLE #INVALIDPURCAHSEORDERCONTRACTS
        DROP TABLE #INVALIDWORKORDERCONTRACTS

    END`,)
    return true
  },

  down: (queryInterface, Sequelize) => {
    // TODO: DB: Add method to drop all the log tables.
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};
