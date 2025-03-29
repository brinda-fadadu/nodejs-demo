/**
 * The value of each key must be equals to the Database value. Instead of directly comparing hard coded values
 * with the Database values, It's better to compare like this.
 * If we want to change the value of Validation Pending in the Database, It's enought to change at one place only.
 */

module.exports = {
    // Used for both addendum and agreement
    agreementStatus: {
        COMPLETED: 'Completed',
        IN_PROGRESS: 'In Progress'
    },
    specialOrderRequests: {
        VALIDATION_PENDING: 'Validation Pending',
        IN_PROGRESS: 'In Progress',
        ACCEPETED: 'Accepeted',
        DECLINED: 'Declined'
    },
    funeralInsuranceSaleTypes: [
        'FORTHOUGHT',
        'GAINS',
        'HOMSTEADER',
        'INS FORETH',
        'PRECOA'
    ],
    purchaseDepartmantInfo: {
        name: process.env.NODE_ENV === 'production' ? 'Purchasing Department' : 'd',
        email: process.env.NODE_ENV === 'production' ? 'oppurchasing@gmail.com' : 'd@gmail.com',
        docusignRole: 'Purchasing Department'
    },
    funeralTrustSalesTypes: ['AFCTS', 'CFT', 'CFTGA', 'MEMBERSHIP', 'TPI'],
    propertyDiscounts: ['PN Discount', 'Pn Property Discount', 'Predeveloped Discount', 'Paid in Full Discount', 'Automatic Payment Discount', 'Finance Discount']
}
