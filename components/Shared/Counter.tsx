import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface CounterProps {
    label: string;
    sublabel?: string; // e.g. "Edad: 13 años o más"
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
}

const Counter: React.FC<CounterProps> = ({ label, sublabel, value, onChange, min = 0, max = 20 }) => {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex flex-col">
                <span className="font-medium text-gray-800">{label}</span>
                {sublabel && <span className="text-sm text-gray-500">{sublabel}</span>}
            </div>
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value === min}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${value === min
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                            : 'border-gray-300 text-gray-600 hover:border-gray-800 hover:text-gray-800'
                        }`}
                    aria-label="Disminuir"
                >
                    <Minus size={16} />
                </button>
                <span className="w-4 text-center text-gray-700 font-medium">{value}</span>
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value === max}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${value === max
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                            : 'border-gray-300 text-gray-600 hover:border-gray-800 hover:text-gray-800'
                        }`}
                    aria-label="Aumentar"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
};

export default Counter;
