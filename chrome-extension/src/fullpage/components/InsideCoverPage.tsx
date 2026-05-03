import React, { useRef, useState } from 'react';
import { Camera, Plus, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { Relationship, ImportantDate, FamilySubType } from '../../shared/types';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { v4 as uuidv4 } from 'uuid';
import InlineEditField from './InlineEditField';

interface InsideCoverPageProps {
  book: { id: string; personName: string };
  relationship: Relationship | null;
  onUpdate: () => void;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  friend: '👯 Friend',
  family: '👨‍👩‍👧 Family',
  partner: '💕 Romantic Partner',
  colleague: '💼 Colleague',
  other: '✨ Other',
};

const FAMILY_SUBTYPES: { value: FamilySubType; label: string }[] = [
  { value: 'mother', label: '👩 Mother' },
  { value: 'father', label: '👨 Father' },
  { value: 'sibling', label: '🧑 Sibling' },
  { value: 'grandparent', label: '👴 Grandparent' },
  { value: 'child', label: '🧒 Child' },
  { value: 'other_family', label: '👪 Other Family' },
];

const PARTNER_DATE_SUGGESTIONS = ['Anniversary', 'First Date', "Valentine's Day"];
const MOTHER_DATES = ['Mother\'s Day'];
const FATHER_DATES = ['Father\'s Day'];

function getMothersDayDate(year: number): string {
  // 2nd Sunday of May
  const d = new Date(year, 4, 1);
  const day = d.getDay();
  const offset = day === 0 ? 7 : 14 - day;
  return `${String(4 + 1).padStart(2, '0')}-${String(offset).padStart(2, '0')}`;
}

function getFathersDayDate(year: number): string {
  // 3rd Sunday of June
  const d = new Date(year, 5, 1);
  const day = d.getDay();
  const offset = day === 0 ? 14 : 21 - day;
  return `${String(5 + 1).padStart(2, '0')}-${String(offset).padStart(2, '0')}`;
}

function buildGCalUrl(label: string, mmdd: string, year?: number): string {
  const y = year || new Date().getFullYear();
  const dateStr = `${y}${mmdd.replace('-', '')}`;
  const nextDay = new Date(y, parseInt(mmdd.split('-')[0]) - 1, parseInt(mmdd.split('-')[1]) + 1);
  const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: label,
    dates: `${dateStr}/${endStr}`,
    recur: 'RRULE:FREQ=YEARLY',
    details: 'Reminder from Burn Book',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function InsideCoverPage({ book, relationship, onUpdate }: InsideCoverPageProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [addingDate, setAddingDate] = useState(false);
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateReminder, setNewDateReminder] = useState(7);

  const updateRel = async (updates: Partial<Relationship>) => {
    if (!relationship) return;
    await db.updateRelationship(relationship.id, updates);
    onUpdate();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 400;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateRel({ profileImageData: canvas.toDataURL('image/jpeg', 0.85) });
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddDate = async () => {
    if (!newDateLabel || !newDateValue || !relationship) return;
    const mmdd = newDateValue.slice(5); // "YYYY-MM-DD" -> "MM-DD"
    const year = parseInt(newDateValue.slice(0, 4));
    const newDate: ImportantDate = {
      id: uuidv4(),
      type: newDateLabel.toLowerCase().includes('birthday') ? 'birthday'
        : newDateLabel.toLowerCase().includes('anniversary') ? 'anniversary'
        : 'custom',
      label: newDateLabel,
      date: mmdd,
      year: isNaN(year) ? undefined : year,
      reminderDays: newDateReminder,
    };
    await updateRel({ importantDates: [...(relationship.importantDates || []), newDate] });
    setAddingDate(false);
    setNewDateLabel('');
    setNewDateValue('');
    setNewDateReminder(7);
  };

  const handleDeleteDate = async (dateId: string) => {
    if (!relationship) return;
    await updateRel({ importantDates: relationship.importantDates.filter(d => d.id !== dateId) });
  };

  const handleUpdateFavorite = async (index: number, field: 'label' | 'value', val: string) => {
    if (!relationship) return;
    const updated = [...(relationship.favoriteThings || [])];
    updated[index] = { ...updated[index], [field]: val };
    await updateRel({ favoriteThings: updated });
  };

  const handleAddFavorite = async () => {
    if (!relationship) return;
    await updateRel({ favoriteThings: [...(relationship.favoriteThings || []), { label: 'Fave Thing', value: '' }] });
  };

  const handleDeleteFavorite = async (index: number) => {
    if (!relationship) return;
    const updated = [...(relationship.favoriteThings || [])];
    updated.splice(index, 1);
    await updateRel({ favoriteThings: updated });
  };

  const isPartner = relationship?.relationship === 'partner';
  const isMother = relationship?.relationship === 'family' && relationship?.familySubType === 'mother';
  const isFather = relationship?.relationship === 'family' && relationship?.familySubType === 'father';

  const specialDates = [
    ...(isPartner ? PARTNER_DATE_SUGGESTIONS.map(l => ({ label: l, mmdd: '' })) : []),
    ...(isMother ? [{ label: "Mother's Day", mmdd: getMothersDayDate(new Date().getFullYear()) }] : []),
    ...(isFather ? [{ label: "Father's Day", mmdd: getFathersDayDate(new Date().getFullYear()) }] : []),
  ];

  return (
    <div className="w-full h-full p-8 overflow-y-auto font-handwritten" style={{ backgroundColor: '#FFF8DC' }}>
      {/* Top section: photo + name/classification */}
      <div className="flex gap-6 mb-6">
        {/* Profile photo */}
        <div className="flex-shrink-0">
          <div
            className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-[#FF69B4] cursor-pointer shadow-lg bg-[#FFE4F0] flex items-center justify-center"
            onClick={() => photoInputRef.current?.click()}
            title="Click to upload photo"
          >
            {relationship?.profileImageData ? (
              <img src={relationship.profileImageData} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <Camera size={32} className="text-[#FF69B4]" />
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Name and type */}
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-[#1a1a1a] underline mb-1">
            {book.personName}
          </h2>

          {relationship && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={relationship.relationship}
                  onChange={e => updateRel({ relationship: e.target.value as any })}
                  className="bg-transparent border-b border-dashed border-[#FF69B4] outline-none font-handwritten text-sm text-[#333] cursor-pointer"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {relationship.relationship === 'family' && (
                <select
                  value={relationship.familySubType || ''}
                  onChange={e => updateRel({ familySubType: e.target.value as FamilySubType || null })}
                  className="bg-transparent border-b border-dashed border-[#FF69B4] outline-none font-handwritten text-sm text-[#333] cursor-pointer"
                >
                  <option value="">Select family type...</option>
                  {FAMILY_SUBTYPES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}

              {/* Nickname */}
              <div className="mt-1 text-sm text-[#555]">
                aka: <InlineEditField
                  value={relationship.nickname || ''}
                  onSave={v => updateRel({ nickname: v })}
                  placeholder="nickname..."
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {relationship && (
        <>
          {/* Birthday */}
          <div className="mb-4">
            <p className="font-bold text-sm mb-1">🎂 Birthday</p>
            <input
              type="date"
              value={relationship.birthday || ''}
              onChange={e => updateRel({ birthday: e.target.value })}
              className="bg-transparent border-b border-dashed border-[#FF69B4] outline-none font-handwritten text-sm cursor-pointer"
            />
          </div>

          {/* How we met */}
          <div className="mb-4">
            <p className="font-bold text-sm mb-1">💫 How We Met</p>
            <InlineEditField
              value={relationship.howWeMet || ''}
              onSave={v => updateRel({ howWeMet: v })}
              multiline
              rows={2}
              placeholder="The story of how it all started..."
              className="text-sm w-full"
            />
          </div>

          {/* Favorite things */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">✨ Their Favorites</p>
              <button onClick={handleAddFavorite} className="text-[#FF69B4] hover:text-[#FF1493] transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {(relationship.favoriteThings || []).map((fav, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <InlineEditField
                    value={fav.label}
                    onSave={v => handleUpdateFavorite(i, 'label', v)}
                    className="text-sm font-bold w-24 flex-shrink-0"
                    placeholder="Label"
                  />
                  <span className="text-[#999]">:</span>
                  <InlineEditField
                    value={fav.value}
                    onSave={v => handleUpdateFavorite(i, 'value', v)}
                    className="text-sm flex-1"
                    placeholder="..."
                  />
                  <button onClick={() => handleDeleteFavorite(i)} className="text-[#FF69B4]/50 hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {(relationship.favoriteThings || []).length === 0 && (
                <p className="text-xs text-[#999] italic">Add their favorite food, color, show...</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <p className="font-bold text-sm mb-1">📝 Notes</p>
            <InlineEditField
              value={relationship.notes || ''}
              onSave={v => updateRel({ notes: v })}
              multiline
              rows={2}
              placeholder="Anything else worth knowing..."
              className="text-sm w-full"
            />
          </div>

          {/* Important Dates */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">📅 Important Dates</p>
              <button onClick={() => setAddingDate(true)} className="text-[#FF69B4] hover:text-[#FF1493] transition-colors">
                <Plus size={14} />
              </button>
            </div>

            {/* Auto-suggested dates for relationship type */}
            {specialDates.filter(sd => sd.mmdd).map((sd, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-[#FF69B4]/20">
                <span className="text-[#555]">{sd.label}</span>
                <a
                  href={buildGCalUrl(sd.label, sd.mmdd)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#FF69B4] hover:text-[#FF1493] transition-colors"
                >
                  <Calendar size={10} />
                  Add to GCal
                </a>
              </div>
            ))}

            {(relationship.importantDates || []).map(date => (
              <div key={date.id} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-[#FF69B4]/20">
                <span className="text-[#555] font-bold">{date.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#999]">{date.date}{date.year ? ` (${date.year})` : ''}</span>
                  <a
                    href={buildGCalUrl(date.label, date.date, date.year)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FF69B4] hover:text-[#FF1493] transition-colors"
                    title="Add to Google Calendar"
                  >
                    <ExternalLink size={10} />
                  </a>
                  <button onClick={() => handleDeleteDate(date.id)} className="text-[#FF69B4]/50 hover:text-red-500 transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}

            {addingDate && (
              <div className="mt-2 p-3 bg-[#FFE4F0] rounded-lg border border-[#FF69B4]/30 space-y-2">
                <input
                  type="text"
                  value={newDateLabel}
                  onChange={e => setNewDateLabel(e.target.value)}
                  placeholder="Label (e.g. Anniversary)"
                  className="w-full bg-transparent border-b border-[#FF69B4] outline-none font-handwritten text-sm"
                  list="date-suggestions"
                />
                <datalist id="date-suggestions">
                  {[...PARTNER_DATE_SUGGESTIONS, "Birthday", "Friendiversary"].map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  type="date"
                  value={newDateValue}
                  onChange={e => setNewDateValue(e.target.value)}
                  className="w-full bg-transparent border-b border-[#FF69B4] outline-none font-handwritten text-sm"
                />
                <div className="flex items-center gap-2 text-xs">
                  <span>Remind me</span>
                  <select
                    value={newDateReminder}
                    onChange={e => setNewDateReminder(parseInt(e.target.value))}
                    className="bg-transparent border-b border-[#FF69B4] outline-none font-handwritten"
                  >
                    {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days before</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddDate} className="text-xs bg-[#FF69B4] text-white px-3 py-1 rounded hover:bg-[#FF1493] transition-colors">
                    Add
                  </button>
                  <button onClick={() => setAddingDate(false)} className="text-xs text-[#999] hover:text-[#555] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!relationship && (
        <p className="text-sm text-[#999] italic mt-4">No relationship data yet.</p>
      )}
    </div>
  );
}
