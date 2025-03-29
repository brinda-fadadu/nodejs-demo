'use strict'
// const {getAgreementRoles} = require('../controllers/refactorControllers/utils')
const _ = require('lodash')

module.exports = (sequelize, DataTypes) => {
  const Agreement = sequelize.define(
    'Agreement',
    {
      saleTypeId: DataTypes.INTEGER,
      arrangerId: DataTypes.INTEGER,
      contractNumber: DataTypes.STRING,
      status: DataTypes.STRING,
      locationId: DataTypes.INTEGER,
      type: DataTypes.INTEGER,
      needType: DataTypes.INTEGER,
      totalPrice: DataTypes.DECIMAL(28, 2),
      // AgreementLocationItem + AgreementPackage + AgreementProperty + AgreementCAI +  AgreementSpecialOrderItem  (totalPrice)
      totalTax: DataTypes.DOUBLE, //
      // // AgreementLocationItem + AgreementPackage + AgreementProperty + AgreementCAI +  AgreementSpecialOrderItem  (totalTax)
      totalPurchasePrice: {
        // TotalPrice + TotalTax
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      totalAdjustment: {
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      totalCashPrice: {
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      totalPaid: {
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      due: {
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      previousDue: {
        type: DataTypes.DECIMAL(28, 2),
        defaultValue: 0.0
      },
      createdBy: DataTypes.INTEGER,
      updatedBy: DataTypes.INTEGER,
      isValidated: DataTypes.BOOLEAN,
      propertyPaidInFullDate: DataTypes.DATE
    },
    {
      tableName: 'Agreement',
      timestamps: true
    }
  )

  Agreement.updateAndGetTotal = async function(agreementId, userId, transaction, addendumId = null) {
    try {
      const models = require('./index')
      const { sequelize } = require('./index')
      const FinanceController = require('../controllers/refactorControllers/financeController/financeOptionController')
      const financeController = new FinanceController(agreementId)
      let extraInterestCharges = await financeController.getTotalInterest([], transaction)
      const result = await sequelize.query(
        `SELECT ISNULL(SUM(tbl.totalPrice), 0) AS agreementTotalPrice,  ISNULL(SUM(tbl.totalTax), 0) AS agreementTotalTax
      FROM (
          SELECT sum(aip.totalPrice) AS totalPrice, sum(aip.totalTax) AS totalTax FROM AgreementPackage ap INNER JOIN AgreementItemPrice aip ON aip.id=ap.agreementItemPriceId WHERE ap.agreementId=:agreementId AND deletedAt IS  NULL 
            UNION ALL 
          SELECT (sum(aip.totalPrice)+sum(ISNULL(totalECFAmount, 0))) AS totalPrice, SUM(aip.totalTax) AS totalTax FROM AgreementProperty ap INNER JOIN AgreementItemPrice aip ON ap.agreementItemPriceId=aip.id WHERE ap.agreementId=:agreementId AND deletedAt IS  NULL 
            UNION ALL 
          SELECT sum(aip.totalPrice) AS totalPrice, SUM(aip.totalTax) AS totalTax FROM AgreementCashAdvancedItem aci INNER JOIN AgreementItemPrice aip ON aci.agreementItemPriceId = aip.id WHERE aci.agreementId=:agreementId AND deletedAt IS  NULL 
            UNION ALL 
          SELECT SUM(aip.totalPrice) AS totalPrice, SUM(aip.totalTax) AS totalTax FROM AgreementLocationItem ali INNER JOIN AgreementItemPrice aip ON ali.agreementItemPriceId=aip.id WHERE ali.agreementId=:agreementId AND deletedAt IS  NULL
            UNION ALL 
          SELECT SUM(aip.totalPrice) AS totalPrice, SUM(aip.totalTax) AS totalTax FROM AgreementPropertyAdditionalRight apar INNER JOIN AgreementItemPrice aip ON apar.agreementItemPriceId=aip.id WHERE apar.agreementId=:agreementId AND deletedAt IS  NULL
            UNION ALL 
          SELECT SUM(aip.totalPrice) AS totalPrice, SUM(aip.totalTax) AS totalTax FROM AgreementMemorialItem ami INNER JOIN AgreementItemPrice aip ON ami.agreementItemPriceId=aip.id INNER JOIN AgreementMemorial am ON am.id = ami.agreementMemorialId WHERE am.agreementId=:agreementId AND am.deletedAt IS  NULL AND ami.deletedAt IS NULL
      ) tbl`,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            agreementId: agreementId
          },
          transaction
        }
      )

      if (result && result.length) {
        const { upsert } = require('../controllers/refactorControllers/utils')
        const [stmtValues] = result
        const addendum = await models.Addendum.findOne({ where: {agreementId, status:'In progress'}, transaction})
        const hmisConfig = require('../config/hmis-config')

        const hmisDBName = hmisConfig[process.env.NODE_ENV].database
        const hmisDBConfigHost = hmisConfig[process.env.NODE_ENV].host

        const salesPrice = await models.sequelize.query(`  SELECT SUM(Sales_Price) AS Sales_Price from Property P
        INNER JOIN AgreementProperty ap on ap.propertyId = p.id
        INNER JOIN  [${hmisDBConfigHost}].[${hmisDBName}].dbo.Sales_Item SI on (SI.Lot_Sell_Unit_ID=p.lotSellUnitId AND  SI.Product_Item_Cd=P.propertyItemCode)
        INNER JOIN  [${hmisDBConfigHost}].[${hmisDBName}].dbo.Sales S on S.Sales_Id= SI.Sales_ID
        INNER JOIN Agreement AG ON AG.contractNumber=S.Sales_Contract_Nbr
        WHERE AG.id= ${agreementId}  AND ap.addendumId IS NULL AND ap.deletedAt IS NULL `,{
          type: sequelize.QueryTypes.SELECT,
          transaction
        })

        const totalSalePrice = _.get(salesPrice, '[0].Sales_Price', 0) 

        if (salesPrice.length && salesPrice[0].Sales_Price) {
          const oldPifAdjustment = await models.AgreementAdjustment.findOne({
            where: {
              agreementId,
              addendumId: null,
              maxDiscount: null,
              percentage: null
            },
            include: [
              {
                model: models.Adjustment,
                where: {
                  title: 'Paid In Full Discount'
                }
              }
            ],
            transaction
          })

          if (oldPifAdjustment) {
            const propertyDiscounts = await models.sequelize.query(`SELECT ISNULL(SUM(AD.amount), 0) AS totalPrice FROM AgreementAdjustment AD
            INNER JOIN Adjustment A ON AD.AdjustmentId=A.id WHERE 
            A.title IN ('PN Discount', 'Pn Property Discount', 'Predeveloped Discount', 'Automatic Payment Discount', 'Finance Discount') AND AD.deletedAt IS NULL AND AD.deletedBy IS NULL AND AD.agreementId= :agreementId `, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId,
                },
                transaction
            })
            const percentage = (
              Math.abs(
                _.get(oldPifAdjustment, 'amount', 0) / (totalSalePrice -
                  _.get(propertyDiscounts, '[0].totalPrice', 0) )
              ) * 100
            ).toFixed(8)
            oldPifAdjustment.percentage = percentage
            oldPifAdjustment.maxDiscount = percentage
            await upsert('AgreementAdjustment', oldPifAdjustment, transaction)
          }
        }
        const pifAdjustment = await models.AgreementAdjustment.findOne({
          where: {
            agreementId,
            addendumId,
            deletedAt: null,
            percentage: null,
            maxDiscount: null,
            [models.Sequelize.Op.or]: [
              {
                description: 'Paid In Full Discount',
              },
              {
                 adjustmentId: 4
              }
          ]
          },
          transaction
        })
        const adjustmentRecord = await models.Adjustment.findOne({
          where: {
            id: 4
          },
          transaction
        })
        if(pifAdjustment) {
            pifAdjustment.percentage = adjustmentRecord.discountValue
            pifAdjustment.maxDiscount = adjustmentRecord.discountValue
            await upsert('AgreementAdjustment', pifAdjustment, transaction)
        }
        // un-commented code because totalAdjustment in agreemnet, not updating while applying discount
        await sequelize.query(
          'updateVeteranAndPaidInFullDiscount :agreementId, :addendumId',
          {
            replacements: {
              agreementId: agreementId,
              addendumId: addendumId || _.get(addendum,'id',null)
          },
            transaction
          }
        )

        let agreement = await this.findOne({
          where: {
            id: agreementId
          },
          transaction
        })
        // Updating propertyPaidInFullDate with current date if only (total paid for contract > confirmed (property price + efc amount)) for the 1st instance
        const { certificateOfSepulcherCondition } = require('../controllers/refactorControllers/utils')
        let showCertificateOfSepulcher = await certificateOfSepulcherCondition(agreementId, agreement.totalPaid, transaction)
        if (!showCertificateOfSepulcher || (showCertificateOfSepulcher && !agreement.propertyPaidInFullDate)) {
          agreement.propertyPaidInFullDate = showCertificateOfSepulcher ? new Date() : null
          if (!agreement.propertyPaidInFullDate) {
            await models.CertificateOfSepulcher.update({
                deletedAt: new Date(),
                deletedBy: userId
            }, {
                where: { agreementId: agreementId }, transaction
            })
          }
          await agreement.save({
            transaction
          })
        }
        // const agreementFinanced = await sequelize.query(`SELECT ISNULL(SUM(sf.interestAmount), 0) AS agreementFinanceInterest
        //   FROM AgreementFinance as sf WHERE agreementId=:agreementId`, {
        //   type: sequelize.QueryTypes.SELECT,
        //   replacements: {
        //     agreementId: agreementId
        //   },
        //   transaction
        // })


        //for wholesale cremation : percentage discount on basic services only hence agreementBasicServicesTotalPrice
        //basicServices item category name : 'Wholesale Cremation'
        let agreementBasicServicesTotalPrice
        if(agreement.type === 4){
          agreementBasicServicesTotalPrice = await sequelize.query(
            `SELECT ISNULL(SUM(tbl.totalPrice), 0) AS agreementBasicServicesTotalPrice
          FROM (
               SELECT SUM(aip.totalPrice) AS totalPrice FROM AgreementLocationItem ali
               INNER JOIN LocationItem as li ON ali.locationItemId = li.id 
               INNER JOIN Item as i ON li.itemId = i.id
               INNER JOIN AgreementItemPrice as aip ON ali.agreementItemPriceId = aip.id
               INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
               INNER JOIN ItemType it ON it.id = ic.itemTypeId
               WHERE ali.agreementId=:agreementId AND ic.name = 'Wholesale Cremation' and deletedAt IS  NULL
              ) tbl`,
            {
              type: sequelize.QueryTypes.SELECT,
              replacements: {
                agreementId: agreementId
              },
              transaction
            }
          )
          agreementBasicServicesTotalPrice = agreementBasicServicesTotalPrice[0].agreementBasicServicesTotalPrice; 
          agreement = await this.findOne({
            where: {
              id: agreementId
            },
            include: [
              {
                model: models.AgreementAdjustment,
                as: 'agreementAdjustments',
                include: [{ model: models.Adjustment }],
                required: false
              }
            ],
            transaction
          })
        }

        let agreementSummary = {}
        agreementSummary.totalPrice = agreement.totalPrice = Number(
          stmtValues.agreementTotalPrice
        )
        agreementSummary.totalTax = agreement.totalTax = Number(
          stmtValues.agreementTotalTax
        )
        agreementSummary.totalPurchasePrice = agreement.totalPurchasePrice = Number(
          agreement.totalPrice + agreement.totalTax
        )
        if(agreement.type === 4 && agreement.agreementAdjustments[0].dataValues.percentage){
          agreementSummary.totalAdjustment  = agreement.totalAdjustment  = agreementBasicServicesTotalPrice*Number(agreement.agreementAdjustments[0].dataValues.percentage)/100;
        }else if(agreement.type === 4 && agreement.agreementAdjustments[0].dataValues.amount){
          agreementSummary.totalAdjustment = agreement.totalAdjustment  = Number(agreement.agreementAdjustments[0].dataValues.amount);
        }else{
          agreementSummary.totalAdjustment = agreement.totalAdjustment = Number(
            agreement.totalAdjustment
          )
        }
        //agreementSummary.financedInterest = agreement.financedInterest = Number(agreementFinanced[0].agreementFinanceInterest)
        // agreementSummary.totalCashPrice = agreement.totalCashPrice = Number(agreement.totalPurchasePrice - agreement.totalAdjustment + agreement.financedInterest)
        agreementSummary.totalCashPrice = agreement.totalCashPrice = Number(
          agreement.totalPurchasePrice - agreement.totalAdjustment
        )
        agreementSummary.totalPaid = agreement.totalPaid
        agreementSummary.due = agreement.due = Number(
          agreement.totalCashPrice - agreement.totalPaid + extraInterestCharges
        )
        agreementSummary.id = agreement.id

        await sequelize.query(
          `UPDATE Agreement SET totalPaid=:totalPaid,totalAdjustment=:totalAdjustment,totalPurchasePrice=:totalPurchasePrice,due=:due,totalCashPrice=:totalCashPrice,totalPrice=:totalPrice,totalTax=:totalTax WHERE id=:id`,
          {
            replacements: {
              totalCashPrice: Number(agreement.totalCashPrice).toFixed(2),
              due: Number(agreement.due).toFixed(2),
              totalPurchasePrice: Number(agreement.totalPurchasePrice).toFixed(2),
              totalPrice: Number(agreement.totalPrice).toFixed(2),
              totalTax: Number(agreement.totalTax).toFixed(2),
              totalPaid: Number(agreement.totalPaid).toFixed(2),
              totalAdjustment: Number(agreement.totalAdjustment).toFixed(2),
              id: agreement.id
            },
            transaction: transaction,
            type: sequelize.QueryTypes.UPDATE
          }
        )
        return agreementSummary
      } else {
        throw new Error('SOME_THING_WENT_WRONG')
      }
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  Agreement.updateTotalPaidAndDue = async function(agreementId, userId, transaction) {
    try {
      const models = require('./index')
      const { sequelize } = require('./index')
      const FinanceController = require('../controllers/refactorControllers/financeController/financeOptionController')
      const financeController = new FinanceController(agreementId)

      let extraInterestCharges = await financeController.getTotalInterest([], transaction)

      const agreementDetails = await this.findOne({
        where: {
          id: agreementId
        },
        transaction
      })

      let totalPaid = await sequelize.query(
        `SELECT SUM(amount) totalPaid 
        FROM Payment WHERE Payment.status = 'success' AND Payment.resourceId =:agreementId;`,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            agreementId: agreementId
          },
          transaction
        }
      )

      let due = agreementDetails.totalCashPrice - totalPaid[0].totalPaid + extraInterestCharges

      agreementDetails.totalPaid = Number(totalPaid[0].totalPaid).toFixed(2)
      agreementDetails.due = Number(due).toFixed(2)
      // Updating propertyPaidInFullDate with current date if only (total paid for contract > confirmed (property price + efc amount)) for the 1st instance
      const { certificateOfSepulcherCondition } = require('../controllers/refactorControllers/utils')
      const AgreementPropertyController = require('../controllers/refactorControllers/agreementController/agreementPropertiesController')
      let showCertificateOfSepulcher = await certificateOfSepulcherCondition(agreementId, agreementDetails.totalPaid, transaction)
      if (!showCertificateOfSepulcher || (showCertificateOfSepulcher && !agreementDetails.propertyPaidInFullDate)) {
        agreementDetails.propertyPaidInFullDate = showCertificateOfSepulcher ? new Date() : null
        if (!agreementDetails.propertyPaidInFullDate) {
          await models.CertificateOfSepulcher.update({
              deletedAt: new Date(),
              deletedBy: userId
          }, {
              where: { agreementId: agreementId }, transaction
          })
        } else {
          let agreementPropertyController = new AgreementPropertyController(agreementId)
          await agreementPropertyController.generateCertificateOfSepulcherFilesAndUploadToAzure(userId, agreementDetails.totalPaid, transaction, false, true)
        }
      }
      await agreementDetails.save({
        transaction
      })
      return agreementDetails
    } catch (error) {
      throw error
    }
  }

  Agreement.updateTotalAdjustment = async function(agreementId, transaction) {
    const models = require('./index')
    try {
      const agreement = await this.findOne({
        where: { id: agreementId },
        include: [
          {
            model: models.AgreementAdjustment,
            as: 'agreementAdjustments',
            include: [{ model: models.Adjustment }],
            required: false
          }
        ],
        transaction
      })

      // Dollar discount summation
      let dollarStmtAdjustmentsValue = 0
      if (
        agreement.agreementAdjustments &&
        agreement.agreementAdjustments.length
      ) {
        const dollarStmtAdjustments = agreement.agreementAdjustments.filter(
          sa => sa.deletedAt == null && sa.deletedBy == null
        )
        dollarStmtAdjustmentsValue = dollarStmtAdjustments.reduce(
          (accumulator, ele) => {
            return ele.amount + accumulator
          },
          0
        )
      }
      const due = agreement.due - dollarStmtAdjustmentsValue
      const totalAdjustment = dollarStmtAdjustmentsValue // + percentageStmtAdjustmentsValue + step3 discount value
      await sequelize.query(
        `UPDATE Agreement SET totalAdjustment=:totalAdjustment,due=:due WHERE id=:id`,
        {
          replacements: {
            due: due,
            totalAdjustment: totalAdjustment,
            id: agreement.id
          },
          transaction: transaction,
          type: sequelize.QueryTypes.UPDATE
        }
      )
      return
    } catch (err) {
      throw err
    }
  }

  Agreement.updateSpecificAdjustment = async function(
    agreementDetails,
    adjustmentAmount,
    transaction
  ) {
    try {
      await sequelize.query(
        `UPDATE Agreement SET totalAdjustment=:totalAdjustment,due=:due WHERE id=:id`,
        {
          replacements: {
            due: agreementDetails.due - adjustmentAmount,
            totalAdjustment:
              agreementDetails.totalAdjustment + adjustmentAmount,
            id: agreementDetails.id
          },
          transaction: transaction,
          type: sequelize.QueryTypes.UPDATE
        }
      )
      return
    } catch (err) {
      throw err
    }
  }

  Agreement.getPurchasersList = async function(agreementId, types) {
    const { sequelize } = require('./index')
    const result = await sequelize.query(
      `SELECT CONCAT(p.firstName,' ',p.middleName,' ', p.lastName) as PurchaserName, p.id, pvd.onePortalId, p.isAlive, COALESCE(p.email, '--') AS purchaserEmail, COALESCE(p.phoneNumber, '--') as purchaserPhone FROM Agreement s 
    INNER JOIN AgreementPerson ap ON ap.agreementId=s.id
    INNER JOIN AgreementRole apr ON apr.id=ap.roleId
    INNER JOIN Person p ON p.id = ap.personId
    INNER JOIN PersonVerificationDetails pvd ON pvd.personId = p.id
    WHERE s.id=${agreementId} AND apr.name IN (${types}) AND ap.deletedAt IS NULL AND ap.deletedBy IS NULL`,
      {
        log: console.log,
        type: sequelize.QueryTypes.SELECT
      }
    )
    if (result && result.length) {
      return result
    } else {
      return []
    }
  }

  Agreement.associate = async function(models) {
    // associations can be defined here
    // const roles = await getAgreementRoles('map')
    Agreement.belongsTo(models.Employee, {
      foreignKey: 'arrangerId',
      as: 'arranger'
    })
    Agreement.belongsTo(models.SaleType, {
      foreignKey: 'saleTypeId',
      as: 'saleType'
    })
    Agreement.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    })
    Agreement.belongsTo(models.User, { foreignKey: 'createdBy' })
    Agreement.belongsTo(models.User, { foreignKey: 'updatedBy' })
    Agreement.hasOne(models.AgreementPerson, {
      foreignKey: 'agreementId',
      as: 'purchaser',
      scope: {
        roleId: 1
      }
    })
    Agreement.hasMany(models.Payment, {
      foreignKey: 'resourceId',
      constraints: false
    })
    Agreement.hasMany(models.AgreementPerson, {
      foreignKey: 'agreementId',
      as: 'beneficiary',
      scope: {
        roleId: 3
      }
    })
    Agreement.hasMany(models.AgreementPerson, {
      foreignKey: 'agreementId',
      as: 'payor',
      scope: {
        roleId: 4
      }
    })
    Agreement.hasMany(models.AgreementLocationItem, {
      foreignKey: 'agreementId',
      as: 'agreementItems'
    })
    Agreement.hasMany(models.AgreementMemorial, {
      foreignKey: 'agreementId',
      as: 'agreementMemorials'
    })
    Agreement.hasMany(models.AgreementPackage, {
      foreignKey: 'agreementId',
      as: 'agreementPackages'
    })
    Agreement.hasMany(models.AgreementCashAdvancedItem, {
      foreignKey: 'agreementId',
      as: 'agreementCashAdvanceItems'
    })
    Agreement.hasMany(models.AgreementProperty, {
      foreignKey: 'agreementId',
      as: 'agreementProperties'
    })
    Agreement.hasMany(models.AgreementPerson, {
      foreignKey: 'agreementId',
      as: 'coPurchasers',
      scope: {
        roleId: 2
      }
    })
    Agreement.hasMany(models.AgreementAdjustment, {
      foreignKey: 'agreementId',
      as: 'agreementAdjustments'
    })
    Agreement.hasMany(models.AgreementFinance, {
      foreignKey: 'agreementId',
      as: 'financeDetails'
    })

    Agreement.hasOne(models.LinkAgreement, {
      foreignKey: 'agreementId',
      as: 'linkAgreement'
    })
    Agreement.hasOne(models.AgreementPartner, {
      foreignKey: 'agreementId',
      as: 'agreementPartner'
    })
    Agreement.hasOne(models.HMISDataSync, {
      foreignKey: 'agreementId',
      as: 'hmisSyncDetails'
    })

    Agreement.belongsTo(models.AgreementType, {
      foreignKey: 'type',
      as: 'agreementType'
    })

    Agreement.addScope('withAgreementPersons', {
      include: [
        {
          model: models.AgreementPerson,
          attributes: ['isOwner', 'id', 'roleId', 'relationId', 'personId', 'deletedInAddendumId', 'addedInAddendumId'],
          as: 'beneficiary',
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: [
                'prefix',
                'firstName',
                'middleName',
                'lastName',
                'email',
                'phoneNumber',
                'isAlive'
              ],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                }
              ]
            }
          ],
          required: false
        },
        {
          model: models.AgreementPerson,
          as: 'purchaser',
          attributes: ['id', 'roleId', 'relationId', 'personId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: [
                'prefix',
                'firstName',
                'middleName',
                'lastName',
                'email',
                'phoneNumber',
                'isAlive'
              ],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                },
                {
                  model: models.Place,
                  as: 'addressPlace',
                  include: [
                    {
                      model: models.Organization,
                      as: 'organization'
                    },
                    {
                      model: models.Address,
                      as: 'address'
                    }
                  ]
                }
              ]
            },
            {
              model: models.Relation,
              as: 'relation',
              attributes: ['name']
            }
          ],
          required: false
        },
        {
          model: models.AgreementPerson,
          as: 'coPurchasers',
          attributes: ['id', 'roleId', 'relationId', 'personId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: [
                'prefix',
                'firstName',
                'middleName',
                'lastName',
                'email',
                'phoneNumber',
                'isAlive'
              ],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                }
              ]
            },
            {
              model: models.Relation,
              as: 'relation',
              attributes: ['name']
            }
          ],
          required: false
        },
        {
          model: models.AgreementPerson,
          as: 'payor',
          attributes: ['id', 'roleId', 'relationId', 'personId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: [
                'prefix',
                'firstName',
                'middleName',
                'lastName',
                'email',
                'phoneNumber',
                'isAlive'
              ],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                }
              ]
            },
            {
              model: models.Relation,
              as: 'relation',
              attributes: ['name']
            }
          ],
          required: false
        }
      ]
    })

    Agreement.addScope('agreementPropertyOwners', {
      include: [
        {
          model: models.AgreementProperty,
          as: 'agreementProperties',
          attributes: ['id'],
          where: { deletedAt: null, deletedBy: null },
          required: false,
          include:[
            {
              model: models.AgreementPropertyOwner,
              as: 'agreementPropertyOwner',
              attributes: ['id', 'ownerId', 'deletedAt'],
              include:[{
                  model: models.Person,
                  as: 'person',
                  attributes: [
                    'prefix',
                    'firstName',
                    'middleName',
                    'lastName',
                    'email',
                    'phoneNumber',
                    'isAlive'
                  ]
                }
              ]
            }
          ]
        }
      ]
    })

    Agreement.addScope('commonIncludes', {
      include: [
        {
          model: models.SaleType,
          as: 'saleType',
          attributes: ['id', 'code', 'description', 'agreementType'],
          required: false
        },
        {
          model: models.Location,
          as: 'location',
          attributes: ['id', 'name', 'tax', 'phoneNumber'],
          include: [{
            model: models.Place,
            as: 'place',
            include: [{
              model: models.Address,
              as: 'address'
            }]
          }]
        },
        {
          model: models.Employee,
          as: 'arranger',
          attributes: ['id', 'name', 'email']
        },
        {
          model: models.LinkAgreement,
          as: 'linkAgreement'
        }, 
        {
          model: models.HMISDataSync,
          as: 'hmisSyncDetails',
          attributes: ['id', 'createdAt'],
          include: [{
            model: models.HMISDataSyncStatus,
            as: 'HMISDataSyncStatus',
            attributes: ['name']
          }]
        }
      ]
    })

    Agreement.addScope('wholeSaleCremationIncludesWithOutItemUsage', {
      include: [
        {
          model: models.AgreementPerson,
          as: 'beneficiary',
          attributes: ['id', 'personId', 'agreementId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: ['id', 'firstName', 'middleName', 'lastName'],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId', 'ssn']
                },
                {
                  model: models.DeathDetails,
                  as: 'deathDetails',
                  attributes: ['partnerRefNumber']
                }
              ]
            }
          ]
        },
        {
          model: models.AgreementAdjustment,
          as: 'agreementAdjustments',
          attributes: ['percentage', 'amount']
        }
      ]
    })

    Agreement.addScope('wholeSaleCremationIncludesWithItemUsage', {
      include: [
        {
          model: models.AgreementPerson,
          as: 'beneficiary',
          attributes: ['id', 'personId', 'agreementId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: ['id', 'firstName', 'middleName', 'lastName'],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                },
                {
                  model: models.DeathDetails,
                  as: 'deathDetails',
                  attributes: ['partnerRefNumber']
                },
              ]
            }
          ]
        }
      ]
    })

    Agreement.addScope('withPartner', {
      include: [
        {
          model: models.AgreementPartner,
          as: 'agreementPartner',
          include: [
            {
              model: models.Partners,
              as: 'partner',
              include: [
                {
                  model: models.Person,
                  attributes: ['firstName', 'middleName', 'lastName', 'phoneNumber', 'email'],
                  as: 'contact'
                },
                {
                  model: models.Place,
                  as: 'addressPlace',
                  attributes: ['id', 'addressId'],
                  include: [
                    {
                      model: models.Address,
                      as: 'address'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })

    Agreement.addScope('withOnlyPartnerDetails', {
      include: [
        {model: models.AgreementPartner,
        as: 'agreementPartner',
        include: [
          {
            model: models.Partners,
            as: 'partner',
            attributes: ['id', 'partnerName']
          }
      ]}
    ]
    })

    Agreement.addScope('withParticularPartner', partnerIds => ({
      include: [{
        model: models.AgreementPartner,
        as: 'agreementPartner',
        where: {
          partnerId: partnerIds
        },
        include: [
          {
            model: models.Partners,
            as: 'partner',
            attributes: ['id', 'partnerName']
          }
        ]
      }]
    }))

    Agreement.addScope('miscSalesIncludesWithItemUsage', {
      include: [
        {
          model: models.AgreementPerson,
          as: 'beneficiary',
          attributes: ['id', 'personId'],
          required: false,
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: ['id', 'firstName', 'middleName', 'lastName', 'email', 'phoneNumber'],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                },
                {
                  model: models.Place,
                  as: 'addressPlace',
                  attributes: ['id', 'addressId'],
                  include: [
                    {
                      model: models.Address,
                      as: 'address'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: models.AgreementPerson,
          as: 'purchaser',
          attributes: ['id', 'personId'],
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: ['id', 'firstName', 'middleName', 'lastName', 'email', 'phoneNumber'],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                },
                {
                  model: models.Place,
                  as: 'addressPlace',
                  attributes: ['id', 'addressId'],
                  include: [
                    {
                      model: models.Address,
                      as: 'address'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })

    Agreement.addScope('withAgreementFinance', {
      include: [
        {
          model: models.AgreementFinance,
          as: 'financeDetails',
          include: [
            {
              model: models.Approval,
              as: 'approval',
              required: false
            }
          ]
        }
      ]
    })

    Agreement.addScope('withBeneficiariesOrDecedents', {
      include: [
        {
          model: models.AgreementPerson,
          attributes: ['id', 'roleId', 'personId'],
          as: 'beneficiary',
          where: {isOWner: 1},
          include: [
            {
              model: models.Person,
              as: 'person',
              attributes: [
                'id',
                'prefix',
                'firstName',
                'middleName',
                'lastName',
                'isAlive'
              ],
              include: [
                {
                  model: models.PersonVerificationDetails,
                  as: 'personVerificationDetails',
                  attributes: ['onePortalId']
                }
              ]
            }
          ]
        }
      ]
    })

  
  }

  Agreement.updateAndGetTotal
  return Agreement
}
