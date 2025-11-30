// src/components/CustomModal.jsx
import React from 'react';

const CustomModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = "OK", cancelText = "Hủy", showCancel = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#282828] w-full max-w-md rounded-lg shadow-2xl border border-white/10 p-6 transform scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        
        {/* Content (Input hoặc Text) */}
        <div className="mb-6 text-neutral-300">
          {children}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          {showCancel && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded-full font-bold text-white hover:bg-white/10 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className="px-6 py-2 rounded-full font-bold bg-green-500 text-black hover:scale-105 active:scale-95 transition-transform"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;