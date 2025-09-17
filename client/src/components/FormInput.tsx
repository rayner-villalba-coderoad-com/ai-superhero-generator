import React from 'react';

type FormTabProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  listId?: string;
  options?: string[];
};
const FormInput: React.FC<FormTabProps> = ({ id, label, type = 'text',  listId, options, placeholder, value, onChange, error }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 text-left">
      {label}
    </label>
    <input
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full border rounded-lg p-2 transition-colors ${
        error
          ? 'border-purple-500 focus:ring-purple-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
      }`}
      list={listId}
      required
    />
    {listId && options && (
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    )}
    {error && <p className="mt-1 text-sm text-purple-600">{error}</p>}
  </div>
);

export default FormInput;
