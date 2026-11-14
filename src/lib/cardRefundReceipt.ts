import jsPDF from 'jspdf';

export const refundMethods: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'PIX', CARTAO_DEBITO: 'Cartão de débito', CARTAO_CREDITO: 'Cartão de crédito', CHEQUE: 'Cheque',
};

export type CardRefund = {
  id: string; requestId: string; cardCode: string; operator: string; createdAt: string;
  amount: string; previousBalance: string; balance: string; paymentMethod: string; reason: string;
};

export const refundMoney = (value: number | string) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function downloadCardRefundReceipt(refund: CardRefund) {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text('Comprovante de devolução de saldo', 14, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const lines = [
    `Identificador: ${refund.id}`,
    `Data e hora: ${new Date(refund.createdAt).toLocaleString('pt-BR')}`,
    `Cartão: ${refund.cardCode}`,
    `Operador: ${refund.operator}`,
    `Forma de devolução: ${refundMethods[refund.paymentMethod] || refund.paymentMethod}`,
    `Saldo anterior: ${refundMoney(refund.previousBalance)}`,
    `Valor devolvido: ${refundMoney(refund.amount)}`,
    `Saldo após: ${refundMoney(refund.balance)}`,
  ];
  lines.forEach((line, index) => doc.text(line, 14, 30 + index * 7));
  doc.text('Motivo:', 14, 93);
  doc.text(doc.splitTextToSize(refund.reason, 180), 14, 100);
  doc.setFontSize(8);
  doc.text('Comprovante de operação — não é documento fiscal.', 14, 285);
  doc.save(`devolucao-saldo-${refund.id}.pdf`);
}
