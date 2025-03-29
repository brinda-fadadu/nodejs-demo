'use strict';
module.exports = (sequelize, DataTypes) => {
  const ScheduledFuneralService = sequelize.define('ScheduledFuneralService', {
    personId: DataTypes.INTEGER,
    agreementLocationItemId: DataTypes.INTEGER,
    agreementPackageItemId: DataTypes.INTEGER,
    agreementCashAdvancedItemId: DataTypes.INTEGER,
    schedulingSectionId: DataTypes.INTEGER,
    cemeteryInformationSectionId: DataTypes.INTEGER,
    resourceSectionId: DataTypes.INTEGER,
    casketSectionId: DataTypes.INTEGER,
    urnInformationSectionId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    tableName: 'ScheduledFuneralService',
    timestamps: true
  });
  ScheduledFuneralService.associate = function (models) {
    // associations can be defined here
    ScheduledFuneralService.belongsTo(models.SchedulingSection, { foreignKey: 'schedulingSectionId', as: 'schedulingDetails' })
    ScheduledFuneralService.belongsTo(models.CemeteryInformationSection, { foreignKey: 'cemeteryInformationSectionId', as: 'cemeteryInformationDetails' })
    ScheduledFuneralService.belongsTo(models.ResourceSection, { foreignKey: 'resourceSectionId', as: 'resourcesDetails' })
    ScheduledFuneralService.hasMany(models.SubServiceSection, { foreignKey: 'scheduledFuneralServiceId', as: 'subServicesDetails' })
    ScheduledFuneralService.hasOne(models.SchedulingFile, { foreignKey: 'schedulingId', as: 'schedulingFile' })
    ScheduledFuneralService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketItemUsageDetails',
      scope: {
        ResourceType: 'ItemUsage'
      }
    })
    ScheduledFuneralService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketItemDetails',
      scope: {
        ResourceType: 'AgreementLocationItem'
      }
    })
    ScheduledFuneralService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketDetails',
      scope: {
        ResourceType: null
      }
    })

    ScheduledFuneralService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationItemUsageDetails',
      scope: {
        ResourceType: 'ItemUsage'
      }
    })
    ScheduledFuneralService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationItemDetails',
      scope: {
        ResourceType: 'AgreementLocationItem'
      }
    })
    ScheduledFuneralService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationDetails',
      scope: {
        ResourceType: null
      }
    })
    ScheduledFuneralService.belongsTo(models.Person, { foreignKey: 'personId', as: 'person' })
    ScheduledFuneralService.belongsTo(models.AgreementLocationItem, { foreignKey: 'agreementLocationItemId', as: 'agreementLocationItem' })
    ScheduledFuneralService.belongsTo(models.AgreementPackageItem, { foreignKey: 'agreementPackageItemId', as: 'agreementPackageItem' })
    ScheduledFuneralService.belongsTo(models.AgreementCashAdvancedItem, { foreignKey: 'agreementCashAdvancedItemId', as: 'agreementCashAdvancedItem' })
    ScheduledFuneralService.hasOne(models.WorkOrder, {
      foreignKey: 'resourceId', as: 'workOrder'
    })
    ScheduledFuneralService.hasMany(models.Note, {
      as: 'notesSections',
      foreignKey: 'resourceId'
    })
    ScheduledFuneralService.addScope('schedulingSectionScope', {
      include: [{
        model: models.SchedulingSection,
        as: 'schedulingDetails',
        attributes: ['id', 'date', 'beginningTime', 'endingTime', 'cremationType', 'graveSideReason'],
        include: [{
          model: models.Location,
          as: 'clFacilityLocation',
          attributes: ['id', 'name', 'code']
        }, {
          model: models.Place,
          as: 'serviceLocation',
          attributes: ['id'],
          include: [{
            model: models.Organization,
            as: 'organization',
            attributes: ['id', 'name'],
            include: [{
              model: models.OrganizationType,
              as: 'organizationType'
            }]
          }, {
            model: models.Address,
            as: 'address'
          }]
        },
        {
          model: models.ReservedResource,
          as: 'reservedChapel',
          attributes: ['id', 'resourceType', 'resourceId', 'reservationDate', 'startTime', 'endTime'],
          include: [{
            model: models.Chapel,
            as: 'reservedChapelDetails',
            attributes: ['id', 'name'],
            include: [{
              model: models.ChapelTypeChapel,
              include: [{
                model: models.ChapelType,
              }]
            }]
          }],
          required: false
        }]
      }]
    })
    ScheduledFuneralService.addScope('schedulingSectionScopeDaySheet', (where, isRequired) => ({
      include: [{
        model: models.SchedulingSection,
        as: 'schedulingDetails',
        attributes: ['id', 'date', 'beginningTime', 'endingTime'],
        include: [{
          model: models.Location,
          as: 'clFacilityLocation',
          attributes: ['id', 'name', 'code']
        }, {
          model: models.Place,
          as: 'serviceLocation',
          attributes: ['id'],
          include: [{
            model: models.Organization,
            as: 'organization',
            attributes: ['id', 'name'],
            include: [{
              model: models.OrganizationType,
              as: 'organizationType'
            }]
          }, {
            model: models.Address,
            as: 'address'
          }]
        },
        {
          model: models.ReservedResource,
          as: 'reservedChapel',
          attributes: ['id', 'resourceType', 'resourceId', 'reservationDate', 'startTime', 'endTime'],
          include: [{
            model: models.Chapel,
            as: 'reservedChapelDetails',
            attributes: ['id', 'name'],
            where: where,
            required: isRequired,
            include: [{
              model: models.ChapelTypeChapel,
              include: [{
                model: models.ChapelType,
              }]
            }]
          }],
          required: isRequired
        }]
      }]
    }))

    ScheduledFuneralService.addScope('vechileScope', {
      include: [{
        model: models.WorkOrder,
        as: 'workOrder',
        where: { resourceType: 'ScheduledFuneralService' },
        attributes: ['id'],
        include: [{
          model: models.EmployeeSchedule.scope('notDeleted'),
          as: 'assignedResources',
          include: [{
            model: models.WorkOrderTask,
            as: 'task',
            required: false,
            attributes: ['id', 'name', 'resourceReservationId'],
            include: [{
              model: models.ReservedResource,
              as: 'reservedResource',
              required: false,
              where: { resourceType: 'Vehicles' },
              attributes: ['id', 'resourceType', 'resourceId', 'startTime', 'endTime'],
              include: [{
                required: false,
                model: models.Vehicles,
                as: 'reservedVehicleDetails'
              }]
            }]
          }, {
            model: models.Employee,
            as: 'employee',
            attributes: ['name', 'email']
          }]
        }, {
          model: models.Note,
          as: 'notes',
          required: false,
          attributes: ['id', 'content', 'categoryId', 'createdAt'],
          include: [
            {
              model: models.User,
              as: 'createdByUser',
              attributes: ['name']
            },
            {
              model: models.NoteLevel,
              as: 'noteLevel',
              attributes: ['name']
            }
          ]
        }]
      }]
    })

    ScheduledFuneralService.addScope('cemeteryInformationScope', {
      include: [{
        model: models.CemeteryInformationSection,
        as: 'cemeteryInformationDetails',
        attributes: ['id', 'burialSite'],
        include: [{
          model: models.Location,
          as: 'clCemeteryLocation',
          attributes: ['id', 'name', 'code']
        }, {
          model: models.Place,
          as: 'cemeteryLocation',
          attributes: ['id'],
          include: [
            {
              model: models.Organization,
              as: 'organization',
              attributes: ['id', 'name'],
              include: [{
                model: models.OrganizationType,
                as: 'organizationType'
              }]
            }, {
              model: models.Address,
              as: 'address'
            }
          ]
        }]
      }]
    })
    ScheduledFuneralService.addScope('cemeteryInformationScopeAddress', {
      include: [{
        model: models.CemeteryInformationSection,
        as: 'cemeteryInformationDetails',
        attributes: ['id', 'burialSite'],
        include: [{
          model: models.Location,
          as: 'clCemeteryLocation',
          attributes: ['id', 'name', 'code', 'phoneNumber'],
          include: [
            {
              model: models.Place,
              as: 'place',
              include: [
                {
                  model: models.Address,
                  as: 'address'
                }
              ]
            }
          ]
        }, {
          model: models.Place,
          as: 'cemeteryLocation',
          attributes: ['id'],
          include: [
            {
              model: models.Organization,
              as: 'organization',
              include: [{
                model: models.OrganizationType,
                as: 'organizationType'
              }]
            }, {
              model: models.Address,
              as: 'address'
            }
          ]
        }]
      }]
    })
    ScheduledFuneralService.addScope('resourceSectionNotesScope', {
      include: [{
        model: models.ResourceSection,
        as: 'resourcesDetails',
        attributes: ['id', 'isHearseNeeded', 'isUtilityCarNeeded', 'crematoryDate', 'crematoryStartTime', 'crematoryEndTime'],
        include: [{
          model: models.Note,
          as: 'resourceSectionNotes',
          where: { resourceType: 'ResourceSection' },
          attributes: ['id', 'content', 'categoryId', 'createdAt'],
          required: false,
          include: [{
            model: models.User,
            as: 'createdByUser',
            attributes: ['name']
          },
          {
            model: models.NoteLevel,
            as: 'noteLevel',
            attributes: ['name'],
            required: false
          }, {
            model: models.NoteCategory,
            as: 'NoteCategory',
            where: { name: 'Funeral Scheduling Resource Section' },
            attributes: [],
            required: false
          }],
        }]
      }]
    })
    ScheduledFuneralService.addScope('resourceSectionScope', {
      include: [{
        model: models.ResourceSection,
        as: 'resourcesDetails',
        attributes: ['id', 'isHearseNeeded', 'isUtilityCarNeeded', 'crematoryDate', 'crematoryStartTime', 'crematoryEndTime'],
        include: [{
          model: models.Chapel,
          as: 'crematory',
          attributes: ['id', 'name'],
          required: false,
          include: [{
            model: models.Location,
            as: 'location',
            attributes: ['name', 'phoneNumber']
          }]
        }, {
          model: models.ResourcePallbearer,
          as: 'pallbearers',
          attributes: ['id'],
          required: false,
          include: [{
            model: models.PersonContact,
            attributes: ['id'],
            include: [{
              model: models.Employee,
              as: 'employee',
              attributes: ['name', 'email', 'id'],
            }, {
              model: models.Person,
              as: 'person',
              attributes: ['firstName', 'middleName', 'lastName', 'email', 'id'],
            }]
          }]
        }
        ]
      }]
    })
    ScheduledFuneralService.addScope('casketSectionScope', {
      include: [
        {
          model: models.CasketSection,
          where: { resourceType: 'ItemUsage' },
          attributes: { exclude: ['casketId'] },
          required: false,
          as: 'casketItemUsageDetails',
          include: [
            {
              model: models.ItemUsage,
              attributes: ['id'],
              include: [
                {
                  model: models.AgreementLocationItem,
                  as: 'agreementItems',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.LocationItem,
                      as: 'locationItem',
                      attributes: ['id'],
                      include: [
                        {
                          model: models.Item,
                          attributes: ['id', 'name']
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: models.CasketSection,
          where: { resourceType: 'AgreementLocationItem' },
          required: false,
          attributes: { exclude: ['casketId'] },
          as: 'casketItemDetails',
          include: [
            {
              model: models.AgreementLocationItem,
              as: 'casket',
              attributes: ['id'],
              include: [
                {
                  model: models.LocationItem,
                  as: 'locationItem',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Item,
                      attributes: ['id', 'name']
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: models.CasketSection,
          where: { resourceType: null },
          required: false,
          attributes: { exclude: ['casketId'] },
          as: 'casketDetails',
        }
      ]
    })
    ScheduledFuneralService.addScope('urnInformationScope', {
      include: [
        {
          model: models.UrnInformationSection,
          where: { resourceType: 'ItemUsage' },
          required: false,
          attributes: { exclude: ['urnId'] },
          as: 'urnInformationItemUsageDetails',
          include: [
            {
              model: models.ItemUsage,
              attributes: ['id'],
              include: [
                {
                  model: models.AgreementLocationItem,
                  as: 'agreementItems',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.LocationItem,
                      as: 'locationItem',
                      attributes: ['id'],
                      include: [
                        {
                          model: models.Item,
                          attributes: ['id', 'name']
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              model: models.AttributeValue,
              as: 'urnTypeDetails',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: models.UrnInformationSection,
          where: { resourceType: 'AgreementLocationItem' },
          attributes: { exclude: ['urnId'] },
          required: false,
          as: 'urnInformationItemDetails',
          include: [
            {
              model: models.AgreementLocationItem,
              as: 'urn',
              attributes: ['id'],
              include: [
                {
                  model: models.LocationItem,
                  as: 'locationItem',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Item,
                      attributes: ['id', 'name']
                    }
                  ]
                }
              ]
            },
            {
              model: models.AttributeValue,
              as: 'urnTypeDetails',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          where: { resourceType: null },
          required: false,
          model: models.UrnInformationSection,
          as: 'urnInformationDetails',
          attributes: { exclude: ['urnId'] },
          include: [{
            model: models.AttributeValue,
            as: 'urnTypeDetails',
            attributes: ['id', 'name']
          }]
        }
      ]
    })
    ScheduledFuneralService.addScope('subServicesSectionScope', {
      include: [{
        model: models.SubServiceSection,
        as: 'subServicesDetails',
        attributes: ['id', 'subServiceId', 'startTime', 'endTime'],
        include: [{
          model: models.SubService,
          as: 'subService'
        }]
      }]
    })
    ScheduledFuneralService.addScope('schedulingFileScope', {
      include: [{
        model: models.SchedulingFile,
        as: 'schedulingFile',
        where: { schedulingType: 'funeral' },
        required: false,
        include: [{
          model: models.File,
          as: 'schedulingFileUrl',
          where: { resourceName: 'SchedulingFile' },
          required: false
        }]
      }]
    })
    ScheduledFuneralService.addScope('personScope', {
      include: [{
        model: models.Person.scope('withVerificationDetails'),
        as: 'person',
        attributes: ['id', 'firstName', 'middleName', 'lastName', 'isAlive'],
        include: [{
          model: models.PersonRemainsInfo,
          as: 'PersonRemainsInfo',
          include: [{
            model: models.Employee,
            as: 'embalmer',
            attributes: ['name']
          }]
        },
        {
          model: models.CaseInfoForm,
          where: { formId: 21 },
          as: 'CaseInfoForm',
          required: false
        }]
      }]
    })

    ScheduledFuneralService.addScope('noteSectionsScope', {
      include: [
        {
          model: models.Note,
          as: 'notesSections',
          required: false,
          where: { resourceType: 'ScheduledCemeteryService' },
          attributes: ['id', 'content', 'categoryId', 'createdAt'],
          include: [
            {
              model: models.User,
              as: 'createdByUser',
              attributes: ['name']
            },
            {
              model: models.NoteLevel,
              as: 'noteLevel',
              attributes: ['name']
            },
            {
              model: models.NoteCategory,
              as: 'NoteCategory',
              where: { name: 'Cemetery Scheduling' },
              attributes: []
            }
          ]
        }
      ]
    })

    ScheduledFuneralService.addScope('agreementLocationItemScope', {
      include: [{
        model: models.AgreementLocationItem,
        as: 'agreementLocationItem',
        include: [{
          model: models.LocationItem.scope('withSchedulingService'),
          as: 'locationItem'
        }, {
          model: models.Agreement,
          as: 'agreementDetails',
          attributes: ['type', 'contractNumber', 'arrangerId'],
          include: [{
            model: models.Employee,
            as: 'arranger'
          }]
        }, {
          model: models.Addendum,
          as: 'addendumDetails',
        }]
      }]
    })
    ScheduledFuneralService.addScope('agreementPackageItemScope', {
      include: [{
        model: models.AgreementPackageItem,
        as: 'agreementPackageItem',
        include: [{
          model: models.LocationItem.scope('withSchedulingService'),
          as: 'locationItem'
        }, {
          model: models.AgreementPackage,
          as: 'agreementPackage',
          include: [{
            model: models.Agreement,
            as: 'agreementDetails',
            attributes: ['type', 'contractNumber', 'arrangerId'],
            include: [{
              model: models.Employee,
              as: 'arranger'
            }]
          },
          {
            model: models.Addendum,
            as: 'addendumDetails',
          }]
        }]
      }]
    })
    ScheduledFuneralService.addScope('agreementCAItemScope', {
      include: [{
        model: models.AgreementCashAdvancedItem,
        as: 'agreementCashAdvancedItem',
        include: [{
          model: models.LocationItem.scope('withSchedulingService'),
          as: 'locationItem'
        }, {
          model: models.Agreement,
          as: 'agreementDetails',
          attributes: ['type', 'contractNumber', 'arrangerId'],
          include: [{
            model: models.Employee,
            as: 'arranger'
          }]
        },
        {
          model: models.Addendum,
          as: 'addendumDetails',
        }]
      }]
    });
    ScheduledFuneralService.addScope('workOrderScope', {
      include: [{
        model: models.WorkOrder,
        where:{
          resourceType: 'ScheduledFuneralService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderStatus,
            as: 'status'
          }
        ]
      }]
    })

    ScheduledFuneralService.addScope('workOrderScopeGetscheduleList', {
      include: [{
        model: models.WorkOrder,
        where:{
          resourceType: 'ScheduledFuneralService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderStatus,
            as: 'status'
          }
        ],
        required : false
      }]
    })

    ScheduledFuneralService.addScope('workOrderNotesScope', (where, isRequired) => ({
      include: [{
        model: models.WorkOrder,
        as: 'workOrder',
        required: isRequired,
        include: [
          {
            model: models.Note,
            as: 'notes',
            required: false,
            where: {
              resourceType: 'WorkOrder'
            }
          },
          {
            model: models.WorkOrderChamberAccountabilityLog,
            as: 'ChamberAccountabilityLog',
            where:{
              "type":"chamberPlacement"
            },
            required: false,
            include :[
              {
              model: models.CrematoryRetorts,
              as: 'chamber',
              required: false,
              }
            ]
          },
          {
            model: models.WorkOrderDetail.scope('notDeleted'),
            as: 'workOrderDetail',
            include: [
              {
                model: models.CrematoryRetorts,
                as: 'crematoryRetort',
                where: where,
                required: isRequired
              }
            ],
            required: isRequired
          }
        ]
      }]
    }))
    ScheduledFuneralService.addScope('workOrderScopeWeb', categoryId => ({
      include: [{
        model: models.WorkOrder,
        where:{
          resourceType: 'ScheduledFuneralService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderStatus,
            as: 'status',
            where: {
              name: 'closed'
            }
          },
          {
            model: models.Note,
            as: 'notes',
            required: false,
            where: {
              categoryId: categoryId,
              resourceType: 'WorkOrder'
            }

          }
        ]
      }]
    }))
    ScheduledFuneralService.addScope('workOrderClosedStatusScope', {
      include: [{
        model: models.WorkOrder,
        where:{
          resourceType: 'ScheduledFuneralService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderStatus,
            as: 'status',
            where: {
              name: 'closed'
            }
          }
        ]
      }]
    })
    ScheduledFuneralService.hasMany(models.UrnTransfer, { foreignKey: 'resourceId', as: 'resourcesFuneralUrnTransferDetails' })
  };
  return ScheduledFuneralService;
};