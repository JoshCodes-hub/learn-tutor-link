export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const headers = columns 
    ? columns.map(c => c.label) 
    : Object.keys(data[0]);
  
  const keys = columns 
    ? columns.map(c => c.key) 
    : Object.keys(data[0]) as (keyof T)[];

  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        const cellValue = value === null || value === undefined ? "" : String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (cellValue.includes(",") || cellValue.includes('"') || cellValue.includes("\n")) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
