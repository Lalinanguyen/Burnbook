import React, { useState, useRef, useEffect } from 'react';

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export default function InlineEditField({
  value,
  onSave,
  multiline = false,
  placeholder = 'Click to edit...',
  className = '',
  rows = 3,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    if (e.key === 'Enter' && !multiline) commit();
  };

  const sharedProps = {
    ref: inputRef,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: handleKeyDown,
    placeholder,
    className: `bg-transparent border-b-2 border-[#FF69B4] outline-none w-full font-handwritten ${className}`,
  };

  if (editing) {
    return multiline
      ? <textarea {...sharedProps} rows={rows} style={{ resize: 'none' }} />
      : <input type="text" {...sharedProps} />;
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`cursor-text border-b border-transparent hover:border-dashed hover:border-[#FF69B4] transition-colors ${className} ${!value ? 'text-gray-400 italic' : ''}`}
    >
      {value || placeholder}
    </span>
  );
}
