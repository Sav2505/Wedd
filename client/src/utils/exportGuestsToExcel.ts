import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ManagedGuest } from '../types/domain';

function translateStatus(status: ManagedGuest['rsvp_status']) {
    switch (status) {
        case 'COMING':
            return 'מגיע';
        case 'NOT_COMING':
            return 'לא מגיע';
        default:
            return 'ממתין לתשובה';
    }
}

function translateDishType(dishType: string | null | undefined): string {
    switch (dishType) {
        case 'vegetarian': return 'צמחונית';
        case 'vegan':       return 'טבעונית';
        case 'regular':     return 'רגילה';
        default:            return 'לא צוין';
    }
}

export async function exportGuestsToExcel(
    guests: ManagedGuest[],
    coupleName: string,
    summary: {
        totalGuests: number;
        totalPeople: number;
        coming: number;
        notComing: number;
        pending: number;
    }
) {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Wedding App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('רשימת מוזמנים', {
        views: [
            {
                rightToLeft: true,
            },
        ],
    });

    // ==========================
    // Title
    // ==========================

    sheet.mergeCells('A1:L1');

    const reportTitle = sheet.getCell('A1');

    reportTitle.value = `רשימת מוזמנים - ${coupleName}`;

    reportTitle.font = {
        size: 20,
        bold: true,
        color: { argb: '2C1810' },
    };

    reportTitle.alignment = {
        horizontal: 'center',
        vertical: 'middle',
    };

    sheet.getRow(1).height = 42;

    // ==========================
    // Columns
    // ==========================

    sheet.columns = [
        { key: 'index', width: 10 },
        { key: 'first_name', width: 18 },
        { key: 'last_name', width: 22 },
        { key: 'phone', width: 22 },
        { key: 'side', width: 14 },
        { key: 'table', width: 14 },
        { key: 'guests', width: 16 },
        { key: 'status', width: 18 },
        { key: 'gift_kind', width: 18 },
        { key: 'gift_amount', width: 16 },
        { key: 'dish_type', width: 16 },
        { key: 'dish_notes', width: 28 },
    ];

    const header = sheet.addRow([
        'מספר',
        'שם פרטי',
        'שם משפחה',
        'טלפון',
        'צד',
        'מספר שולחן',
        'מספר אורחים',
        'סטטוס',
        'סוג מתנה',
        'מתנה בש"ח',
        'סוג מנה',
        'הערות מנה',
    ]);

    header.height = 26;

    header.eachCell((cell) => {
        cell.font = {
            bold: true,
            color: {
                argb: 'FFFFFFFF',
            },
            size: 12,
        };

        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
        };

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: 'C9A84C',
            },
        };

        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'thin' },
        };
    });

    // ==========================
    // Guests
    // ==========================

    guests.forEach((guest, index) => {
        sheet.addRow({
            index: index + 1,
            first_name: guest.first_name,
            last_name: guest.last_name,
            phone: guest.phone,
            side: guest.side ?? '',
            table: guest.table_number ?? '',
            guests: guest.number_of_guests,
            status: translateStatus(guest.rsvp_status),
            gift_kind: guest.gift_kind ?? '',
            gift_amount: guest.gift_amount ?? '',
            dish_type: guest.rsvp_status === 'COMING' ? translateDishType(guest.requested_dish_type) : '',
            dish_notes: guest.rsvp_status === 'COMING' ? (guest.dish_notes ?? '') : '',
        });
    });

    sheet.eachRow((row, index) => {
        if (index <= 2) return;

        row.height = 22;

        row.eachCell((cell) => {
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
            };

            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' },
            };
        });
    });

    // ==========================
    // Summary
    // ==========================

    sheet.addRow([]);
    sheet.addRow([]);

    const summaryTitleRow = sheet.addRow([]);

    sheet.mergeCells(`A${summaryTitleRow.number}:L${summaryTitleRow.number}`);

    const summaryTitleCell = sheet.getCell(`A${summaryTitleRow.number}`);

    summaryTitleCell.value = 'סיכום רשימת המוזמנים';

    summaryTitleCell.font = {
        bold: true,
        size: 16,
        color: {
            argb: 'FFFFFFFF',
        },
    };

    summaryTitleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
    };

    summaryTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
            argb: 'C9A84C',
        },
    };

    summaryTitleCell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'medium' },
        right: { style: 'medium' },
    };

    summaryTitleRow.height = 32;

    function addSummaryRow(
        label: string,
        value: number,
        color: string
    ) {
        const row = sheet.addRow([]);

        sheet.mergeCells(`A${row.number}:F${row.number}`);
        sheet.mergeCells(`G${row.number}:H${row.number}`);

        const labelCell = sheet.getCell(`A${row.number}`);
        const valueCell = sheet.getCell(`G${row.number}`);

        labelCell.value = label;
        valueCell.value = value;

        [labelCell, valueCell].forEach((cell) => {
            cell.font = {
                bold: true,
                size: 13,
                color: {
                    argb: '2C1810',
                },
            };

            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
            };

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: color,
                },
            };

            cell.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        row.height = 28;
    }

    addSummaryRow('סה"כ רשומות מוזמנים', summary.totalGuests, 'F7F2E4');
    addSummaryRow('סה"כ אנשים שהוזמנו', summary.totalPeople, 'E8F1FF');
    addSummaryRow('סה"כ ממתינים לתשובה', summary.pending, 'FFF4D6');
    addSummaryRow('סה"כ לא מגיעים', summary.notComing, 'FBE3E3');
    addSummaryRow('סה"כ אישרו הגעה', summary.coming, 'D9F2E3');

    // ==========================
    // Filter
    // ==========================

    sheet.autoFilter = {
        from: `A${header.number}`,
        to: `L${header.number}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
        new Blob([buffer]),
        `רשימת מוזמנים ${coupleName} - ${new Date().toLocaleDateString('he-IL')}.xlsx`
    );
}