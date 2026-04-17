import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, className = "" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content card ${className}`}>
        <div className="modal-header">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
