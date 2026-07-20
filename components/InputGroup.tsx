import React from 'react';

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'textarea' | 'time';
  multiline?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, value, onChange, placeholder, type = 'text', multiline = false 
}) => {
  return (
    <div className="mb-4 border border-gray-300 rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-200 px-4 py-2 font-bold text-gray-700 text-sm border-b border-gray-300">
        {label}
      </div>
      <div className="bg-white p-3">
        {multiline ? (
          <textarea
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};