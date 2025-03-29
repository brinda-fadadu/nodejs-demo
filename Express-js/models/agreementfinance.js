'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementFinance = sequelize.define('AgreementFinance', {
    addendumId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isRecent: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // status: DataTypes.STRING, // Approved, Pending, Declined, Completed
    financeType: DataTypes.STRING, // Finance, Refinance, Special-equal, Special-unequal
    remainingBalance: DataTypes.DECIMAL(10, 2),
    remainingInterest: DataTypes.DECIMAL(10, 2),
    ppifAmount: {  // Property Paid In Full Amount
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0
    },
    downPaymentAmount: DataTypes.DECIMAL(10, 2), // DP+ppifAmount = Down Payment
    downPaymentPercent: DataTypes.DECIMAL(10, 2),
    interestRate: DataTypes.DECIMAL(10, 2),
    interestAmount: DataTypes.DECIMAL(10, 2),
    financedAmount: DataTypes.DECIMAL(10, 2),
    totalAmount: DataTypes.DECIMAL(10, 2),
    tenureMonths: DataTypes.INTEGER,
    paymentsPerYear: DataTypes.INTEGER,
    isACHPayment: DataTypes.BOOLEAN,
    notes: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    tableName: 'AgreementFinance',
    timestamps: true
  });
  AgreementFinance.associate = function(models) {
    // associations can be defined here
    AgreementFinance.hasMany(models.AgreementFinanceSchedule, { foreignKey: 'agreementFinanceId', as: 'agreementFinanceSchedule' })
    AgreementFinance.hasOne(models.Approval, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'AgreementFinance'
    }, as: 'approval'})
    AgreementFinance.belongsTo(models.Agreement, {foreignKey: 'agreementId', as: 'agreement'})
    AgreementFinance.belongsTo(models.Addendum, {foreignKey: 'addendumId', as: 'addendum'})


    // Scopes
    AgreementFinance.addScope('withFinanceSchedule', {
      include: [{
        model: models.AgreementFinanceSchedule,
        as: 'agreementFinanceSchedule',
        include: [{
          model: models.AgreementFinanceSchedulePayment,
          as: 'schedulePayment',
          required: false
        }]
      }]
    })

    AgreementFinance.addScope('withApproval', {
      include: [
        {
          model: models.Approval,
          as: 'approval'
        }
      ]
    })
  };

  return AgreementFinance;
};