import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReceiptSale = {
  number: number;
  createdAt: string;
  status: string;
  location: { name: string };
  registeredBy: { name: string };
  paymentMethod: string;
  customerName?: string | null;
  subtotal: number | string;
  discount: number | string;
  totalAmount: number | string;
  items: Array<{
    quantity: number;
    unitPrice: number | string;
    total: number | string;
    product: { name: string; unit: string; sku?: string | null; barcode?: string | null };
  }>;
};

const methods: Record<string, string> = {
  PIX: 'PIX', DINHEIRO: 'Dinheiro', CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito', COMANDA: 'Comanda RFID', OUTRO: 'Outro',
};
const money = (value: number | string) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function receiptRows(sale: ReceiptSale): string[][] {
  return sale.items.map((item, index) => [
    String(index + 1).padStart(3, '0'),
    item.product.sku || item.product.barcode || '—',
    item.product.name,
    `${Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${item.product.unit}`,
    money(item.unitPrice),
    money(item.total),
  ]);
}

export function downloadSaleReceipt(sale: ReceiptSale) {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Comprovante de venda', 14, 18);
  doc.setFontSize(10);
  doc.text(`Venda #${sale.number}`, 196, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Data: ${new Date(sale.createdAt).toLocaleString('pt-BR')}`, 14, 26);
  doc.text(`Local: ${sale.location.name}`, 14, 32, { maxWidth: 180 });
  doc.text(`Operador: ${sale.registeredBy.name}`, 14, 38, { maxWidth: 180 });
  doc.text(`Pagamento: ${methods[sale.paymentMethod] || sale.paymentMethod}`, 14, 44);
  const status = sale.status === 'CONCLUIDA' ? 'Concluída' : 'Estornada';
  doc.text(`Situação: ${status}`, 196, 44, { align: 'right' });
  if (sale.customerName) doc.text(`Cliente: ${sale.customerName}`, 14, 50, { maxWidth: 180 });

  autoTable(doc, {
    startY: sale.customerName ? 56 : 50,
    head: [['Item', 'Código', 'Descrição', 'Qtde.', 'Unitário', 'Total']],
    body: receiptRows(sale),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 13 }, 1: { cellWidth: 28 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    margin: { left: 14, right: 14, bottom: 30 },
  });
  let y = ((doc as any).lastAutoTable?.finalY || 50) + 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.text(`Subtotal: ${money(sale.subtotal)}`, 196, y, { align: 'right' });
  doc.text(`Desconto: ${money(sale.discount)}`, 196, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Total: ${money(sale.totalAmount)}`, 196, y + 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Comprovante de operação — não é documento fiscal.', 14, 285);
  doc.save(`comprovante-venda-${sale.number}.pdf`);
}
