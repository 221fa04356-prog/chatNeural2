import React, { useEffect, useState } from 'react';
import '../styles/Snackbar.css';
import { X, MoreHorizontal, Send } from 'lucide-react';
import logo from '../assets/logo.png'; // Import App Logo

const Snackbar = ({ message, senderName, senderAvatar, type = 'info', onClose, duration = 5000, onReply, onAction, actionLabel, variant = 'default' }) => {
    const [replyText, setReplyText] = useState('');
    const [isPaused, setIsPaused] = useState(false);

    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const isTyping = replyText.trim().length > 0;
        if (!isPaused && !isTyping && !isFocused && duration && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose, isPaused, replyText, isFocused]);

    const handleSendReply = () => {
        if (replyText.trim() && onReply) {
            onReply(replyText);
            setReplyText('');
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    return (
        <div
            className={`snackbar-container ${variant}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className={`snackbar-card ${type} ${variant}`}>
                {/* Header - Show for default AND system */}
                {(variant === 'default' || variant === 'system') && (
                    <div className="snackbar-header">
                        <div className="snackbar-app-info">
                            <img src={logo} alt="Neural Chat" className="snackbar-app-icon" />
                            <span className="snackbar-app-name">Neural Chat</span>
                        </div>
                        <div className="snackbar-header-actions">
                            <MoreHorizontal size={16} className="snackbar-more-icon" />
                            <X size={16} className="snackbar-close-icon" onClick={onClose} />
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="snackbar-body">
                    {/* Avatar and Sender Name - ONLY for default variant */}
                    {variant === 'default' && (
                        <>
                            <div className="snackbar-avatar">
                                {senderAvatar ? (
                                    <img src={senderAvatar} alt={senderName} />
                                ) : (
                                    <div className="snackbar-initial-avatar">
                                        {senderName ? senderName.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="snackbar-content-text">
                        {variant === 'default' && (
                            <div className="snackbar-sender-name">
                                {senderName || 'Unknown User'}
                            </div>
                        )}
                        <div className="snackbar-message-preview">{message}</div>
                    </div>

                    {onAction && actionLabel && (
                        <div className="snackbar-action-btn" onClick={() => { onAction(); onClose(); }}>
                            {actionLabel}
                        </div>
                    )}

                    {/* Simple Close Icon - Only for simple variant */}
                    {(variant === 'simple' || variant === 'dark-toast') && (
                        <X size={16} className="snackbar-close-icon-simple" onClick={onClose} style={{ cursor: 'pointer', marginLeft: 'auto', color: '#fff', opacity: 0.8 }} />
                    )}
                </div>

                {/* Footer (Reply) - Only show if onReply is provided and NOT simple/system if desired, but user only asked for visual changes */}
                {onReply && (
                    <div className="snackbar-footer">
                        <div className="snackbar-reply-wrapper">
                            <textarea
                                className="snackbar-reply-input"
                                placeholder="Type a reply"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply();
                                    }
                                }}
                                rows={1}
                            />
                            <button
                                className="snackbar-send-btn"
                                onClick={handleSendReply}
                                disabled={!replyText.trim()}
                            >
                                <span className="send-text">Send</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snackbar;
