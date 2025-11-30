import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreenMobile?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, fullScreenMobile }) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShow(true);
    else setTimeout(() => setShow(false), 300); // Wait for animation
  }, [isOpen]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center sm:p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className={`
        relative bg-kinari w-full max-w-lg shadow-2xl overflow-hidden flex flex-col
        transition-transform duration-300 ease-out
        ${fullScreenMobile ? 'h-full sm:h-auto sm:rounded-3xl' : 'h-auto rounded-t-3xl sm:rounded-3xl bottom-0 fixed sm:relative'}
        ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-xl font-serif font-bold text-stone-800">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;