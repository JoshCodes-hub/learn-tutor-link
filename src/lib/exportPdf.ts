// jsPDF is loaded lazily so it doesn't ship in the main bundle.

interface Column {
  key: string;
  label: string;
}

export async function exportToPdf(
  data: Record<string, unknown>[],
  filename: string,
  title: string,
  columns: Column[]
) {
  if (data.length === 0) return;

  const [{ default: jsPDF }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF() as any;
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);

  // Prepare table data
  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      return value === null || value === undefined ? "" : String(value);
    })
  );

  // Add table
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 38,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
  });

  doc.save(`${filename}-${new Date().toISOString().split("T")[0]}.pdf`);
}
