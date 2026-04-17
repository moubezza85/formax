import React, { useState } from 'react';
import { CreditCard, Printer, Search, Download, Filter, Calendar } from 'lucide-react';

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for payments (should be fetched from API in real implementation)
  const payments = [
    { id: 1, student: 'Sara Idrissi', training: 'Python Masterclass', amount: 1500, date: '2026-04-10', type: 'Installment', status: 'Reçu' },
    { id: 2, student: 'Mohamed Amine', training: 'React & UI Design', amount: 3000, date: '2026-04-12', type: 'Full', status: 'Reçu' },
    { id: 3, student: 'Sara Idrissi', training: 'Python Masterclass', amount: 1000, date: '2026-04-16', type: 'Installment', status: 'Reçu' },
  ];

  const handlePrint = (payment) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Facture Formax - ${payment.student}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .header { border-bottom: 2px solid #1877f2; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: bold; color: #1877f2; }
            .details { margin-bottom: 40px; }
            .details div { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f6f7; }
            .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: bold; }
            .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Formax ERP</div>
            <div>Détails du Paiement</div>
          </div>
          <div class="details">
            <div><strong>Client :</strong> ${payment.student}</div>
            <div><strong>Date :</strong> ${payment.date}</div>
            <div><strong>Mode :</strong> ${payment.type}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${payment.training}</td>
                <td>1</td>
                <td>${payment.amount} MAD</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total Payé : ${payment.amount} MAD</div>
          <div class="footer">Merci de votre confiance. Formax - Route de l'aéroport, Casablanca.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Historique des Paiements</h1>
          <p className="text-muted">Suivez les revenus et générez les factures.</p>
        </div>
        <button className="btn btn-primary">
          <Download size={18} /> Exporter Rapport
        </button>
      </div>

      <div className="card mb-2">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-1 top-1 text-muted" size={18} />
            <input 
              type="text" 
              className="input pl-3 mb-0" 
              placeholder="Rechercher par étudiant ou formation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary bg-glass">
            <Calendar size={18} /> Période
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-glass text-muted text-sm uppercase">
            <tr>
              <th className="p-1">Date</th>
              <th className="p-1">Étudiant</th>
              <th className="p-1">Formation</th>
              <th className="p-1">Montant</th>
              <th className="p-1">Mode</th>
              <th className="p-1 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id} className="border-t border-surface-border hover:bg-glass">
                <td className="p-1 text-sm">{payment.date}</td>
                <td className="p-1 font-bold">{payment.student}</td>
                <td className="p-1">{payment.training}</td>
                <td className="p-1"><span className="text-primary font-bold">{payment.amount} MAD</span></td>
                <td className="p-1"><span className="tag-success tag">{payment.type}</span></td>
                <td className="p-1 text-center">
                  <button onClick={() => handlePrint(payment)} className="btn btn-secondary py-0-5 px-1 bg-glass">
                    <Printer size={16} /> Imprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
