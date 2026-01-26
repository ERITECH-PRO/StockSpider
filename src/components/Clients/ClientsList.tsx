import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import type { Client } from '../../types';

const ClientsList = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ companyName: '', matriculeFiscal: '', address: '', phone: '', email: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiService.getClients();
      setClients(data);
    } catch (e) {
      showError('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [clients]);

  const openCreate = () => {
    setEditing(null);
    setForm({ companyName: '', matriculeFiscal: '', address: '', phone: '', email: '' });
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      companyName: c.companyName || '',
      matriculeFiscal: c.matriculeFiscal || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || ''
    });
    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.companyName.trim()) {
      showError('Erreur', 'Nom de l’entreprise requis');
      return;
    }
    try {
      if (editing) {
        const updated = await apiService.updateClient(editing.id, form);
        setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        showSuccess('Client mis à jour', `${updated.companyName}`);
      } else {
        const created = await apiService.createClient(form);
        setClients((prev) => [...prev, created]);
        showSuccess('Client créé', `${created.companyName}`);
      }
      close();
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Action impossible');
    }
  };

  const remove = async (c: Client) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer le client "${c.companyName}" ?`)) return;
    try {
      await apiService.deleteClient(c.id);
      setClients((prev) => prev.filter((x) => x.id !== c.id));
      showSuccess('Client supprimé', c.companyName);
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Suppression impossible');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Accès réservé</h2>
          <p className="text-gray-600 mt-1">Seuls les administrateurs peuvent gérer les clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Création et gestion des clients</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-600">Chargement...</div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client</h3>
          <p className="text-gray-500 mb-4">Ajoutez votre premier client</p>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Ajouter un client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((c) => (
            <div key={c.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{c.companyName}</h3>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-500">ID: {c.id}</p>
                      {c.matriculeFiscal && <p className="text-xs text-blue-600 font-medium">M.F: {c.matriculeFiscal}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {c.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                    <span>{c.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Modifier le client' : 'Ajouter un client'}
              </h2>
              <button onClick={close} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                ×
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l’entreprise *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Matricule Fiscal (M.F)</label>
                <input
                  type="text"
                  value={form.matriculeFiscal}
                  onChange={(e) => setForm((p) => ({ ...p, matriculeFiscal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 1234567/A/B/C/000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={close} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editing ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;


