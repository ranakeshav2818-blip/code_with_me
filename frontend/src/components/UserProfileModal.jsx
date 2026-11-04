import React, { useState } from 'react';
import { User, Phone, Heart, AlertCircle, Plus, Trash2, X, Check } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, userProfile, onSaveProfile }) {
  const [profile, setProfile] = useState(userProfile || {
    id: "USR-9921",
    name: "Priya Sharma",
    phone: "+91 98765 43210",
    blood_group: "O+ Positive",
    allergies: "Penicillin",
    emergency_contacts: [
      { name: "Rohit Sharma", phone: "+91 98111 22233", relation: "Brother", notify_sms: true },
      { name: "Dr. Anita Desai", phone: "+91 98222 33344", relation: "Doctor", notify_sms: true },
      { name: "Site Safety Supv (Vikram)", phone: "+91 98333 44455", relation: "Site Officer", notify_sms: true }
    ],
    medical_notes: "Asthma inhaler in backpack"
  });

  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('');

  if (!isOpen) return null;

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    setProfile(prev => ({
      ...prev,
      emergency_contacts: [
        ...prev.emergency_contacts,
        {
          name: newContactName,
          phone: newContactPhone,
          relation: newContactRel || 'Contact',
          notify_sms: true,
          notify_call: true
        }
      ]
    }));

    setNewContactName('');
    setNewContactPhone('');
    setNewContactRel('');
  };

  const handleRemoveContact = (index) => {
    setProfile(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSaveProfile(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold">Medical ID & Emergency Contacts</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Vitals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Phone Number</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Blood Group</label>
            <input
              type="text"
              value={profile.blood_group}
              onChange={(e) => setProfile({ ...profile, blood_group: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Allergies</label>
            <input
              type="text"
              value={profile.allergies}
              onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Medical Notes & Directives</label>
            <input
              type="text"
              value={profile.medical_notes}
              onChange={(e) => setProfile({ ...profile, medical_notes: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>
        </div>

        {/* Emergency Contacts List */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Emergency Contacts (Auto SMS & WhatsApp Dispatched)
          </span>

          <div className="space-y-2 mb-4">
            {profile.emergency_contacts.map((contact, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">{contact.name} ({contact.relation})</div>
                  <div className="text-[11px] text-slate-400 font-mono">{contact.phone}</div>
                </div>
                <button
                  onClick={() => handleRemoveContact(idx)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Contact Form */}
          <form onSubmit={handleAddContact} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 block">Add New Contact</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="Phone (e.g. +91 ...)"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="Relation"
                value={newContactRel}
                onChange={(e) => setNewContactRel(e.target.value)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              + Add Guardian Contact
            </button>
          </form>
        </div>

        {/* Save & Close */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow"
          >
            Save Medical Profile
          </button>
        </div>
      </div>
    </div>
  );
}
