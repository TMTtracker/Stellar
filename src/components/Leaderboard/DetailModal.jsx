import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DetailModal.css';

function useEscapeToClose(onClose) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);
}

function DetailModal({ avatar, name, label, onClose, children }) {
    const [closing, setClosing] = useState(false);
    const [entered, setEntered] = useState(false);

    useEscapeToClose(requestClose);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    function requestClose() {
        setClosing(true);
        setTimeout(() => onClose(), 180);
    }

    const visible = entered && !closing;

    return (
        <div
            className="detailmodal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) requestClose();
            }}
        >
            <div className={`detailmodal-backdrop ${visible ? 'is-visible' : ''}`} />

            <div className={`detailmodal-card ${visible ? 'is-visible' : ''}`}>
                <button className="detailmodal-close" onClick={requestClose}>
                    <X size={18} />
                </button>

                <div className="detailmodal-header">
                    <span className="detailmodal-avatar">{avatar}</span>
                    <div>
                        <h2>{name}</h2>
                        <p>{label}</p>
                    </div>
                </div>

                <div className="detailmodal-body leaderboard-scroll">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default DetailModal;
