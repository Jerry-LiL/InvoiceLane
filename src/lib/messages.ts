export type InvoiceLetter = {
  clientName: string;
  numberLabel: string;
  totalLabel: string;
  dueDateLabel: string;
  fromName: string;
};

export function invoiceIssuedMessage(input: InvoiceLetter): { subject: string; text: string } {
  return {
    subject: `Invoice ${input.numberLabel} from ${input.fromName}`,
    text: [
      `Hello ${input.clientName},`,
      '',
      `${input.fromName} sent you invoice ${input.numberLabel} for ${input.totalLabel}.`,
      `Payment is due on ${input.dueDateLabel}.`,
      '',
      'The invoice PDF is attached.',
      '',
      input.fromName,
    ].join('\n'),
  };
}

export function paymentReminderMessage(
  input: InvoiceLetter & { reminderNumber: number },
): { subject: string; text: string } {
  return {
    subject: `Reminder: invoice ${input.numberLabel} is overdue`,
    text: [
      `Hello ${input.clientName},`,
      '',
      `This is reminder ${input.reminderNumber} that invoice ${input.numberLabel} for ${input.totalLabel} was due on ${input.dueDateLabel}.`,
      '',
      'The invoice PDF is attached. Please reply if payment is already on the way.',
      '',
      input.fromName,
    ].join('\n'),
  };
}
