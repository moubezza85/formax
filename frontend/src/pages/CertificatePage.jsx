import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentService } from '../services/api';
import { Printer, ChevronLeft, Award, CheckCircle } from 'lucide-react';

export default function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollment();
  }, [id]);

  const fetchEnrollment = async () => {
    try {
      const data = await enrollmentService.getById(id);
      setEnrollment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-3 text-center">Chargement du certificat...</div>;
  if (!enrollment) return <div className="p-3 text-center text-error">Certificat non trouvé.</div>;

  const studentName = `${enrollment.student?.user?.first_name} ${enrollment.student?.user?.last_name}`;
  const trainingTitle = enrollment.training?.title || enrollment.pack?.name;
  const duration = enrollment.training?.masse_horaire || "N/A";
  const dateStr = new Date(enrollment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="certificate-page-container">
      {/* Sidebar and header hidden in @media print */}
      <div className="no-print flex justify-between items-center mb-2 px-2 pt-2">
        <button className="btn bg-glass flex items-center gap-0-5" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Retour
        </button>
        <button className="btn btn-primary flex items-center gap-0-5" onClick={handlePrint}>
          <Printer size={18} /> Imprimer / Enregistrer PDF
        </button>
      </div>

      <div className="certificate-wrapper">
        <div className="certificate-outer-border">
          <div className="certificate-inner-border">
            
            {/* Decors */}
            <div className="cert-corner top-left"></div>
            <div className="cert-corner top-right"></div>
            <div className="cert-corner bottom-left"></div>
            <div className="cert-corner bottom-right"></div>

            <div className="certificate-content">
              <div className="cert-header">
                <div className="cert-logo">Formax</div>
                <div className="cert-subtitle">ACADÉMIE D'EXCELLENCE</div>
              </div>

              <div className="cert-main-title">Certificat de Réussite</div>
              
              <div className="cert-intro">Ce certificat est fièrement décerné à</div>
              
              <div className="cert-student-name">{studentName}</div>
              
              <div className="cert-description">
                Pour avoir complété avec succès le programme de formation intensive en :
              </div>
              
              <div className="cert-training-title">{trainingTitle}</div>
              
              <div className="cert-details">
                <div className="cert-detail-item">
                  <span className="label">Volume Horaire</span>
                  <span className="value">{duration} Heures</span>
                </div>
                <div className="cert-detail-item">
                  <span className="label">Délivré le</span>
                  <span className="value">{dateStr}</span>
                </div>
              </div>

              <div className="cert-footer">
                <div className="cert-signature">
                  <div className="signature-line"></div>
                  <div className="signature-name">Le Directeur Pédagogique</div>
                </div>
                
                <div className="cert-seal">
                  <div className="seal-inner">
                    <Award size={40} className="seal-icon" />
                    <span>CERTIFIÉ</span>
                  </div>
                </div>

                <div className="cert-signature">
                  <div className="signature-line"></div>
                  <div className="signature-name">Sceau de l'Établissement</div>
                </div>
              </div>

              <div className="cert-id">ID Certificat: FORMAX-{enrollment.id}-{new Date().getFullYear()}</div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .certificate-page-container {
          min-height: 100vh;
          background: #f0f2f5;
          padding-bottom: 40px;
        }

        @media print {
          .no-print { display: none !important; }
          body, .certificate-page-container { background: white; padding: 0; margin: 0; }
          .certificate-wrapper { padding: 0; margin: 0; box-shadow: none; }
          @page { size: landscape; margin: 0; }
        }

        .certificate-wrapper {
          width: 297mm;
          height: 210mm;
          background: white;
          margin: 0 auto;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          position: relative;
          color: #1a1a1a;
          font-family: 'Playfair Display', serif;
        }

        .certificate-outer-border {
          border: 10px double #c5a059;
          height: 100%;
          padding: 5px;
        }

        .certificate-inner-border {
          border: 2px solid #c5a059;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
        }

        .cert-corner {
          position: absolute;
          width: 50px;
          height: 50px;
          border: 4px solid #c5a059;
        }
        .top-left { top: 10px; left: 10px; border-right: 0; border-bottom: 0; }
        .top-right { top: 10px; right: 10px; border-left: 0; border-bottom: 0; }
        .bottom-left { bottom: 10px; left: 10px; border-right: 0; border-top: 0; }
        .bottom-right { bottom: 10px; right: 10px; border-left: 0; border-top: 0; }

        .certificate-content {
          text-align: center;
          width: 100%;
        }

        .cert-header { margin-bottom: 30px; }
        .cert-logo { font-size: 32px; font-weight: 900; color: #1e3a8a; letter-spacing: 4px; }
        .cert-subtitle { font-size: 10px; letter-spacing: 5px; color: #666; font-weight: bold; }

        .cert-main-title {
          font-size: 48px;
          font-weight: 800;
          color: #c5a059;
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        .cert-intro { font-style: italic; font-size: 18px; margin-bottom: 10px; }
        .cert-student-name {
          font-size: 42px;
          font-weight: bold;
          border-bottom: 2px solid #ddd;
          display: inline-block;
          min-width: 400px;
          margin-bottom: 20px;
          padding-bottom: 5px;
        }

        .cert-description { font-size: 18px; margin-bottom: 15px; }
        .cert-training-title {
          font-size: 28px;
          font-weight: bold;
          color: #1e3a8a;
          margin-bottom: 30px;
        }

        .cert-details {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-bottom: 40px;
        }
        .cert-detail-item { text-align: center; }
        .cert-detail-item .label { display: block; font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; }
        .cert-detail-item .value { font-size: 16px; font-weight: bold; }

        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 100%;
          padding: 0 60px;
          margin-top: 20px;
        }

        .cert-signature { width: 200px; text-align: center; }
        .signature-line { border-top: 1px solid #1a1a1a; margin-bottom: 5px; }
        .signature-name { font-size: 12px; font-weight: bold; }

        .cert-seal {
          width: 100px;
          height: 100px;
          border: 4px solid #c5a059;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #c5a059;
          position: relative;
        }
        .seal-inner { display: flex; flex-direction: column; align-items: center; }
        .seal-inner span { font-size: 8px; font-weight: 900; }

        .cert-id {
          position: absolute;
          bottom: 20px;
          width: 100%;
          left: 0;
          font-size: 8px;
          color: #bbb;
        }
      ` }} />
    </div>
  );
}
