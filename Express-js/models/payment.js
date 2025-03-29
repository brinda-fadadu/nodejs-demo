'use strict'
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      referenceNumber: {
        type: DataTypes.STRING
      },
      receiptNumber: {
        type: DataTypes.STRING,
        unique: true
      },
      addendumId: DataTypes.INTEGER,
      transactionId: DataTypes.STRING,
      resourceType: DataTypes.STRING,
      resourceId: DataTypes.INTEGER,
      payorId: DataTypes.INTEGER,
      amount: DataTypes.DOUBLE,
      paymentType: DataTypes.INTEGER,
      status: DataTypes.STRING,
      createdBy: DataTypes.INTEGER,
      createdAt: DataTypes.DATE,
      cardId: DataTypes.STRING,
      remarks: DataTypes.STRING,
      otherInfo: DataTypes.STRING,
      receiptUrl: DataTypes.STRING,
      receivedBy: DataTypes.INTEGER,
      emailUrl: DataTypes.STRING,
      organizationId: DataTypes.INTEGER,
      fileUrl: DataTypes.STRING, // storing uploaded file url for check and moneyorder payments
      partnerId: DataTypes.INTEGER,
      cashReceiptId: DataTypes.INTEGER,
      voidedCashReceiptId: DataTypes.INTEGER,
      voidType: DataTypes.STRING, // values should be Void - Wrong Amount, Void - Duplicated Entry, Void - Incorrect Contract, Void - Payment Method Change, Void - Payment Return to Family, Void - Credit Card Dispute, Void - Credit Card Reversal, Void - PNF AN Before Submit - Payment Reconciliation
      voidedRemarks: DataTypes.STRING,
      voidedTime: DataTypes.DATE,
      webHookEventId: DataTypes.STRING
    },
    {
      tableName: 'Payment',
      timestamps: true
    }
  )

  Payment.getPaymentDetailsById = async function(paymentId, type) {
    const { sequelize } = require('./index')
    const payment = await this.findOne({
      where: {
        id: paymentId
      },
      attributes: ['id', 'payorId', 'partnerId', 'resourceId']
    })
    let paymentQuery
    if (payment && payment.partnerId) {
      paymentQuery = `SELECT p.amount,
      p.referenceNumber,
      p.receiptNumber ,
      p.resourceId,
      p.remarks,
      p.paymentType,
      p.addendumId,
      p.otherInfo,
      p.transactionId,
      payor.partnerName AS payorName,
      payor.stripeCustomerId,
      payor.id,
      l.name as agreementLocation,
      l.code as agreementLocationCode,
      l.phoneNumber as agreementPhone,
      CONCAT(a.line1,' ',a.line2,' ',a.city,' ',a.state,' ',a.zipcode) as agreementAddress,
      p.createdAt AS paymentTime,
      pr.email AS payerEmail,
      pr.phoneNumber AS payerPhoneNo,
      ad.line1,
      ad.line2,
      ad.city,
      ad.state,
      ad.county,
      ad.country,
      ad.zipcode
      FROM Payment p
      INNER JOIN Agreement s ON s.id = p.resourceId
      INNER JOIN Location l ON l.id = s.locationId
      INNER JOIN Place lp ON lp.id = l.addressId
      INNER JOIN Address a ON a.id = lp.addressId
      INNER JOIN Partners payor ON payor.id = p.partnerId 
      LEFT JOIN Person pr ON pr.id = payor.contactId
      LEFT JOIN Place pl ON pl.id = payor.addressPlaceId
      LEFT JOIN Address ad ON ad.id = pl.addressId
      WHERE p.id=:paymentId`
    } else if (type === 5) {
      paymentQuery = `SELECT p.amount,
      p.referenceNumber,
      p.receiptNumber ,
      p.resourceId,
      p.addendumId,
      p.remarks,
      p.paymentType,
      p.otherInfo,
      p.transactionId,
      payor.stripeCustomerId,
      payor.id,
      l.name as agreementLocation,
      l.code as agreementLocationCode,
      l.phoneNumber as agreementPhone,
      CONCAT(a.line1,' ',a.line2,' ',a.city,' ',a.state,' ',a.zipcode) as agreementAddress,
      CONCAT(payor.firstName, ' ', payor.middleName,' ',payor.lastName) AS payorName,
      p.createdAt AS paymentTime,
      payor.email AS payerEmail,
      payor.phoneNumber AS payerPhoneNo,
      p.partnerId,
      ad.line1,
      ad.line2,
      ad.city,
      ad.state,
      ad.county,
      ad.country,
      ad.zipcode
      FROM Payment p
      INNER JOIN Agreement s ON s.id = p.resourceId
      INNER JOIN Location l ON l.id = s.locationId
      INNER JOIN Place lp ON lp.id = l.addressId
      INNER JOIN Address a ON a.id = lp.addressId
      INNER JOIN AgreementPerson agp ON agp.id = p.payorId 
      INNER JOIN Person payor ON payor.id = agp.personId 
      LEFT JOIN Place pl ON pl.id = payor.addressPlaceId
      LEFT JOIN Address ad ON ad.id = pl.addressId
      WHERE p.id=:paymentId`
    } else {
      paymentQuery = `SELECT p.amount,
      p.referenceNumber,
      p.receiptNumber ,
      p.resourceId,
      p.addendumId,
      p.remarks,
      p.paymentType,
      p.otherInfo,
      p.transactionId,
      payor.stripeCustomerId,
      payor.id,
      l.name as agreementLocation,
      l.code as agreementLocationCode,
      l.phoneNumber as agreementPhone,
      CONCAT(a.line1,' ',a.line2,' ',a.city,' ',a.state,' ',a.zipcode) as agreementAddress,
      CONCAT(payor.firstName, ' ', payor.middleName,' ',payor.lastName) AS payorName,
      CONCAT(beneficiary.firstName, '', beneficiary.middleName, '', beneficiary.lastName) AS beneficiaryName,
      p.createdAt AS paymentTime,
      payor.email AS payerEmail,
      payor.phoneNumber AS payerPhoneNo,
      p.partnerId,
      ad.line1,
      ad.line2,
      ad.city,
      ad.state,
      ad.county,
      ad.country,
      ad.zipcode
      FROM Payment p
      INNER JOIN Agreement s ON s.id = p.resourceId
      INNER JOIN Location l ON l.id = s.locationId
      INNER JOIN Place lp ON lp.id = l.addressId
      INNER JOIN Address a ON a.id = lp.addressId
      INNER JOIN AgreementPerson ag ON ag.agreementId=s.id 
      INNER JOIN AgreementPerson agp ON agp.id = p.payorId 
      INNER JOIN AgreementRole apr ON apr.id=ag.roleId 
      INNER JOIN Person payor ON payor.id = agp.personId 
      INNER JOIN Person beneficiary ON beneficiary.id=ag.personId
      LEFT JOIN Place pl ON pl.id = payor.addressPlaceId
      LEFT JOIN Address ad ON ad.id = pl.addressId
      WHERE p.id=:paymentId AND apr.name=:roleName`
    }
    const rows = await sequelize.query(paymentQuery,{
      replacements: {
        paymentId: paymentId,
        roleName: 'Beneficiary'
      },
      log: console.log,
      type: sequelize.QueryTypes.SELECT
    })
    if(rows && rows[0]) {
      return rows[0]
    } else {
      throw new Error('STATEMENT_PAYOR_DETAILS_NOT_FOUND')
    }
  }

  Payment.associate = function(models) {
    // associations can be defined here
    Payment.belongsTo(models.User, { foreignKey: 'createdBy' })
    Payment.belongsTo(models.Agreement, {
      foreignKey: 'resourceId',
      constraints: false
    })
    Payment.belongsTo(models.User, { foreignKey: 'receivedBy' })
    Payment.belongsTo(models.AgreementPerson, { foreignKey: 'payorId' })
    Payment.belongsTo(models.Organization, { foreignKey: 'organizationId' })
    Payment.belongsTo(models.Person, { foreignKey: 'payorId' })
    Payment.hasOne(models.PaymentFailure, { foreignKey: 'paymentId' })
    Payment.belongsTo(models.Partners, { foreignKey: 'partnerId' })
    Payment.belongsTo(models.Addendum, { foreignKey: 'addendumId' })
    Payment.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'paymentFileUrl'
    })
    Payment.hasOne(models.AnticipatedPayment, { foreignKey: 'paymentId', as: 'anticipatedPayment' })
  }
  return Payment
}
