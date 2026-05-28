import React, { useState, useCallback, useRef, useEffect } from 'react';

let toastListeners = [];
let toastIdCounter = 0;

export const showToast = (message, type = 'SUCCESS') => {
    const id = ++toastIdCounter;
    const toast = { id, message, type, timestamp: Date.now() };
    toastListeners.forEach(fn => fn(toast));
};

const TerminalToast = () => {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const addToast = useCallback((toast) => {
        setToasts(prev => {
            const next = [...prev, { ...toast, entering: true }];
            if (next.length > 5) next.shift();
            return next;
        });

        timersRef.current[toast.id] = setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
                delete timersRef.current[toast.id];
            }, 400);
        }, 3000);
    }, []);

    useEffect(() => {
        toastListeners.push(addToast);
        return () => {
            toastListeners = toastListeners.filter(fn => fn !== addToast);
            Object.values(timersRef.current).forEach(clearTimeout);
        };
    }, [addToast]);

    if (toasts.length === 0) return null;

    const getTypeColor = (type) => {
        switch (type) {
            case 'SUCCESS': return '#4FD6BE';
            case 'WARNING': return '#E8C060';
            case 'ERROR': return '#FF6B35';
            case 'INFO': return '#888';
            default: return '#4FD6BE';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'SUCCESS': return '✓';
            case 'WARNING': return '⚠';
            case 'ERROR': return '✗';
            case 'INFO': return '−';
            default: return '>';
        }
    };

    return (
        <div className="fixed bottom-28 right-6 z-[300] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
            {toasts.map((toast) => {
                const color = getTypeColor(toast.type);
                const icon = getTypeIcon(toast.type);
                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto"
                        style={{
                            animation: toast.exiting
                                ? 'toast-exit 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
                                : 'toast-enter 0.3s cubic-bezier(0, 0, 0.2, 1) forwards',
                        }}
                    >
                        <div
                            className="relative overflow-hidden border backdrop-blur-md"
                            style={{
                                backgroundColor: 'rgba(14, 14, 16, 0.95)',
                                borderColor: `${color}33`,
                            }}
                        >
                            {/* Top accent line */}
                            <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}></div>

                            {/* Content */}
                            <div className="px-4 py-3 flex items-center gap-3">
                                {/* Icon */}
                                <div
                                    className="w-5 h-5 flex items-center justify-center text-[11px] font-bold flex-shrink-0 border"
                                    style={{ color: color, borderColor: `${color}44`, backgroundColor: `${color}11` }}
                                >
                                    {icon}
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold font-mono tracking-widest" style={{ color: color }}>
                                            [{toast.type}]
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-[#ccc] tracking-wider mt-0.5 truncate">
                                        {toast.message}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-[8px] font-mono text-[#444] flex-shrink-0 self-start mt-1">
                                    {new Date(toast.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                            </div>

                            {/* Scanline effect */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-5"
                                style={{
                                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                                }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TerminalToast;
