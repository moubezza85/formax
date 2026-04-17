import React, { useState, useEffect } from 'react';
import { paymentsService } from '../services/api';
import { CreditCard, Printer, Search, Download, Filter, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await paymentsService.listAll();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (payment) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Facture Formax - ${payment.student_name}</title>
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
            <div>Facture de Paiement #${payment.id}</div>
          </div>
          <div class="details">
            <div><strong>Étudiant :</strong> ${payment.student_name}</div>
            <div><strong>Date :</strong> ${new Date(payment.date).toLocaleDateString()}</div>
            <div><strong>Mode :</strong> ${payment.payment_type}</div>
            <div><strong>Référence :</strong> ${payment.paid_by || 'N/A'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Paiement pour : ${payment.training_title}</td>
                <td>${payment.amount.toLocaleString()} MAD</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total Encaissé : ${payment.amount.toLocaleString()} MAD</div>
          <div class="footer">Formax ERP - Excellence en formation.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Étudiant", "Formation", "Montant", "Type", "Mode"];
    const rows = filteredPayments.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.student_name,
      p.training_title,
      p.amount,
      p.payment_type,
      p.paid_by || 'N/A'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paiements_formax_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = payments.filter(p => 
    p.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.training_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Historique des Paiements</h1>
          <p className="text-muted">Suivez les revenus réels et gérez les encaissements.</p>
        </div>
        <div className="flex gap-1">
            <button className="btn bg-glass border flex subtitle-center gap-0-5" onClick={handleExportCSV}>
                <Download size={18} /> Export CSV
            </button>
            <button className="btn btn-primary">
                <Plus size={18} /> Nouvel Encaissement
            </button>
        </div>
      </div>

      <div className="dashboard-grid grid-3 mb-2">
         <div className="card border-l-4 border-success">
            <p className="text-xs font-bold text-muted uppercase">Encaissement Total</p>
            <h3 className="text-2xl font-bold">{payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()} MAD</h3>
         </div>
         <div className="card">
            <p className="text-xs font-bold text-muted uppercase">Transactions</p>
            <h3 className="text-2xl font-bold">{payments.length}</h3>
         </div>
         <div className="card">
            <p className="text-xs font-bold text-muted uppercase">Dernier Paiement</p>
            <h3 className="text-xl font-bold">{payments.length > 0 ? `${payments[0].amount.toLocaleString()} MAD` : 'N/A'}</h3>
         </div>
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
        {loading ? (
            <div className="p-3 text-center text-muted">Chargement des transactions...</div>
        ) : (
            <table className="w-full text-left">
            <thead className="bg-glass text-muted text-sm uppercase">
                <tr>
                    <th className="p-1">Date</th>
                    <th className="p-1">Étudiant</th>
                    <th className="p-1">Formation / Pack</th>
                    <th className="p-1">Montant</th>
                    <th className="p-1">Type</th>
                    <th className="p-1">Mode</th>
                    <th className="p-1 text-center">Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredPayments.map(payment => (
                <tr key={payment.id} className="border-t border-surface-border hover:bg-glass">
                    <td className="p-1 text-sm whitespace-nowrap">{new Date(payment.date).toLocaleDateString()}</td>
                    <td className="p-1 font-bold">{payment.student_name}</td>
                    <td className="p-1 text-sm">{payment.training_title}</td>
                    <td className="p-1"><span className="text-success font-bold">{payment.amount.toLocaleString()} MAD</span></td>
                    <td className="p-1"><span className="tag">{payment.payment_type}</span></td>
                    <td className="p-1 text-xs text-muted font-bold uppercase">{payment.paid_by || 'N/A'}</td>
                    <td className="p-1 text-center">
                    <button onClick={() => handlePrint(payment)} className="btn btn-secondary py-0-5 px-1 bg-glass text-xs">
                        <Printer size={14} className="mr-0-5" /> Facture
                    </button>
                    </td>
                </tr>
                ))}
                {filteredPayments.length === 0 && (
                    <tr><td colSpan="7" className="p-3 text-center text-muted">Aucun paiement trouvé.</td></tr>
                )}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
}

function Plus({size}) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
}
