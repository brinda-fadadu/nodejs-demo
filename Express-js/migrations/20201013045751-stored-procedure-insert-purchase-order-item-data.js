'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Purchase_Order_Item_Data') IS NOT NULL
    --DROP PROCEDURE Insert_Purchase_Order_Item_Data


    CREATE PROCEDURE Insert_Purchase_Order_Item_Data
    AS
    BEGIN

        MERGE INTO PurchaseOrderItem as TGT
        USING ( 
            SELECT *
            FROM #CemSchedulePurchaseOrder CSPO
            WHERE CSPO.OnePortalPurchaseOrderId is not NULL
        ) AS D ON TGT.purchaseOrderId = D.OnePortalPurchaseOrderId
        WHEN NOT MATCHED
        THEN INSERT (
            orderDenyReasonId,
            statusId,
            quantity,
            unitPrice,
            shippingCost,
            locationItemId,
            unitTax,
            purchaseOrderId,
            orderDate,
            expectedDeliveryDate,
            receivedDate,
            receivingDocumentNumber,
            orderStatusId,
            purchaseOrderNumber,
            itemUsageId,
            replacedLocationItemId,
            caseInfoFormId,
            createdAt,
            updatedAt,
            createdBy,
            updatedBy
        )   VALUES (
            D.OrderDenyReasonId,
            D.StatusId,
            D.Quantity,
            D.UnitPrice,
            D.ShippingCost,
            D.PurchaseOrderItemLocationItemId,
            D.UnitTax,
            D.OnePortalPurchaseOrderId,
            D.OrderDate,
            D.ExpectedDeliveryDate,
            D.ReceivedDate,
            D.ReceivingDocumentNumber,
            D.OrderStatusId,
            D.PurchaseOrderNumber,
            D.OnePortalItemUsageId,
            null,
            null,
            D.CreatedAt,
            D.UpdatedAt,
            D.CreatedBy,
            D.UpdatedBy
        )
        WHEN MATCHED 
            THEN 
            UPDATE SET
                TGT.orderDenyReasonId = D.OrderDenyReasonId,
                TGT.statusId = D.StatusId,
                TGT.quantity = D.Quantity,
                TGT.unitPrice = D.UnitPrice,
                TGT.shippingCost = D.ShippingCost,
                TGT.locationItemId = D.PurchaseOrderItemLocationItemId,
                TGT.unitTax = D.UnitTax,
                TGT.purchaseOrderId = D.OnePortalPurchaseOrderId,
                TGT.orderDate = D.OrderDate,
                TGT.expectedDeliveryDate = D.ExpectedDeliveryDate,
                TGT.receivedDate = D.ReceivedDate,
                TGT.receivingDocumentNumber = D.ReceivingDocumentNumber,
                TGT.orderStatusId = D.OrderStatusId,
                TGT.purchaseOrderNumber = D.PurchaseOrderNumber,
                TGT.itemUsageId = D.OnePortalItemUsageId,
                TGT.replacedLocationItemId = null,
                TGT.caseInfoFormId = null,
                TGT.updatedAt = D.UpdatedAt,
                TGT.updatedBy = D.UpdatedBy;

            UPDATE CSPO
                SET OnePortalPurchaseOrderItemId = POI.id
                FROM #CemSchedulePurchaseOrder CSPO
                    INNER JOIN PurchaseOrderItem POI
                    ON CSPO.OnePortalPurchaseOrderId = POI.purchaseOrderId

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
