import { Project, Transaction, Balances } from '../types';

export const calculateSettlements = (project: Project): { transactions: Transaction[]; balances: Balances } => {
  const balances: Balances = {};

  // Initialize 0 balance for all members
  project.members.forEach(member => {
    balances[member.id] = 0;
  });

  // Calculate net balances
  project.expenses.forEach(expense => {
    const paidBy = expense.payerId;
    const amount = expense.amount;
    
    // Add to payer
    balances[paidBy] = (balances[paidBy] || 0) + amount;

    // Subtract from splitters
    expense.splits.forEach(split => {
      balances[split.userId] = (balances[split.userId] || 0) - split.amount;
    });
  });

  // Separate into debtors (owe money) and creditors (owed money)
  let debtors: { id: string; amount: number }[] = [];
  let creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, amount]) => {
    // Floating point correction
    const val = Math.round(amount * 100) / 100;
    if (val < -0.01) debtors.push({ id, amount: val });
    if (val > 0.01) creditors.push({ id, amount: val });
  });

  // Sort by magnitude (descending) to optimize number of transactions
  debtors.sort((a, b) => a.amount - b.amount); // Most negative first
  creditors.sort((a, b) => b.amount - a.amount); // Most positive first

  const transactions: Transaction[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the minimum of debt or credit
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    
    // Create transaction
    transactions.push({
      fromId: debtor.id,
      toId: creditor.id,
      amount: Math.round(amount * 100) / 100
    });

    // Adjust remaining balances
    debtor.amount += amount;
    creditor.amount -= amount;

    // Check if settled (with small epsilon for float errors)
    if (Math.abs(debtor.amount) < 0.01) {
      i++;
    }
    if (creditor.amount < 0.01) {
      j++;
    }
  }

  return { transactions, balances };
};

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};