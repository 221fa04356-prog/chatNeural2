
import React from 'react';
import '../styles/ConfirmModal.css';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, onConfirmMe, onConfirmEveryone, confirmTextMe, confirmTextEveryone, confirmText }) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <div className="confirm-modal-icon-wrapper">
                        <AlertTriangle size={24} color="#ef4444" />
                    </div>
                    <h3>{title || 'Are you sure?'}</h3>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-footer">
                    {onConfirmMe && onConfirmEveryone ? (
                        <>
                            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button className="btn-danger" onClick={onConfirmMe}>{confirmTextMe || 'Delete for me'}</button>
                            <button className="btn-danger" onClick={onConfirmEveryone}>{confirmTextEveryone || 'Delete for everyone'}</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button className="btn-danger" onClick={onConfirm}>{confirmText || 'Confirm'}</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
