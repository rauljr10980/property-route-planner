# Column Definitions Summary - TRAINED DTR_Summary.959740.csv.xlsx

**Generated:** ${new Date().toLocaleString()}

## 📊 Analysis Summary

- **Total Columns:** 59
- **Relevant Columns:** 53 (have data in at least some rows)
- **Irrelevant/Blank Columns:** 6 (completely empty)
- **Total Data Rows:** 58,614

---

## ✅ Columns with Descriptions (from Row 2)

These columns have descriptions in row 2 explaining what they mean:

| Column | Header | Description | Fill % | Status |
|--------|--------|-------------|--------|--------|
| 1 | REQUEST_SEQ | Internal request number for the report. | 100% | ✅ |
| 2 | RPT_ORDER_SEQ | Determines report ordering inside the system. | 100% | ✅ |
| 3 | DTL_ORDER_SEQ | Detail sequence; used for internal sorting | 100% | ✅ |
| 4 | ASOFDATE | The date the data snapshot was created. | 100% | ✅ |
| 5 | CAN | County Account Number (Parcel ID). This is your primary unique ID. | 100% | ✅ |
| 8 | ADDRSTRING | Owner Name, Mailing Address, City, State, Zip Code | 100% | ✅ |
| 9 | ZIPCODE | Mailing Zip Code | 100% | ✅ |
| 10 | TAXDEFSTRT | Date tax delinquency started. | 11.9% | ✅ |
| 11 | TAXDEFEND | Date tax delinquency ended or last updated. | 1.8% | ✅ |
| 14 | ROLL | Which roll the account is currently in — Real, Personal, Mineral, Omitted, Supplemental, etc. | 100% | ✅ |
| 16 | T_SPLIT_PAYMENT_FLAG | Indicates if the taxpayer is on the "split payment" plan | 5.4% | ✅ |
| 17 | PNUMBER | Target Property number | 94.3% | ✅ |
| 18 | PSTRNAME | Target property street name | 98.6% | ✅ |
| 20 | LEGACRES | Legal acreage of the property. | 100% | ✅ |
| 28 | PP_BEGIN_DATE | Payment Plan BEGIN DATE | 12.4% | ✅ |
| 29 | PP_END_DATE | Payment Plan END DATE | 12.4% | ✅ |
| 31 | LEGALSTATUS | Legal case status: P (Pending), A (Active), J (Judgment) | 16.7% | ✅ |
| 32 | BANKRUPT_NO | Bankruptcy case number | 0.3% | ✅ |
| 33 | BANKRUPT_STATUS | Bankruptcy Status | 0.3% | ✅ |
| 57 | TOT_PERCAN | Total Taxes Owed | 100% | ✅ |

---

## ❓ Columns WITHOUT Descriptions (Blank in Row 2)

These columns are in the file but row 2 (description row) is blank for them:

| Column | Header | Fill % | Sample Values | Status |
|--------|--------|--------|---------------|--------|
| 21 | **HOCAT** | 52.6% | A1 | ✅ Relevant (but no description) |
| 22 | **AGCAT** | 0.3% | 1D1 | ⚠️ Mostly blank (185 rows only) |
| 23 | **NQCAT** | 48% | C1, A1 | ✅ Relevant (but no description) |
| 24 | **OMIT_CODE** | 0% | F (only 8 rows) | ⚠️ Mostly blank - mostly irrelevant |

**Note:** HOCAT, AGCAT, NQCAT, and OMIT_CODE do not have descriptions in row 2. If descriptions exist elsewhere, they need to be added manually.

---

## ❌ Completely Blank/Irrelevant Columns

These columns are 100% empty and can be ignored:

1. **Column 12: MILDEFSTRT** - No data in any row
2. **Column 13: MILDEFEND** - No data in any row
3. **Column 38: TAXUNIT** - No data in any row
4. **Column 39: RECEIPT** - No data in any row
5. **Column 43: DIST_PAIDDATE** - No data in any row
6. **Column 47: DELAYED_OMIT_PROP_DATE** - No data in any row

---

## 🔑 Key Finding: LEGALSTATUS Column

Column 31 (LEGALSTATUS) contains detailed information about property status:
- **P** = Pending (taxes delinquent, lawsuit not started)
- **A** = Active (tax lawsuit filed, in legal process)
- **J** = Judgment (final judgment issued, eligible for sheriff sale)

This is the column that tracks J/A/P status changes for your software!

