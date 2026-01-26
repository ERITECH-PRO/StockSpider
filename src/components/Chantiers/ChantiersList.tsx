import React, { useEffect, useMemo, useState } from 'react';
import { MapPinned, Plus, Edit, Trash2, Building2, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import type { Chantier, Client } from '../../types';

const ChantiersList = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Chantier | null>(null);
  const [form, setForm] = useState<{ clientId?: string | null; name: string; address: string }>({
    clientId: null,
    name: '',
    address: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [clientsData, chantiersData] = await Promise.all([apiService.getClients(), apiService.getChantiers()]);
      setClients(clientsData);
      setChantiers(chantiersData);
    } catch {
      showError('Erreur', 'Impossible de charger les chantiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientOptions = useMemo(() => [...clients].sort((a, b) => a.companyName.localeCompare(b.companyName)), [clients]);
  const chantierList = useMemo(() => [...chantiers].sort((a, b) => a.name.localeCompare(b.name)), [chantiers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ clientId: null, name: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (c: Chantier) => {
    setEditing(c);
    setForm({ clientId: c.clientId ?? null, name: c.name || '', address: c.address || '' });
    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.name.trim()) {
      showError('Erreur', 'Nom du chantier requis');
      return;
    }
    try {
      if (editing) {
        const updated = await apiService.updateChantier(editing.id, form);
        setChantiers((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        showSuccess('Chantier mis à jour', updated.name);
      } else {
        const created = await apiService.createChantier(form);
        setChantiers((prev) => [...prev, created]);
        showSuccess('Chantier créé', created.name);
      }
      close();
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Action impossible');
    }
  };

  const remove = async (c: Chantier) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer le chantier "${c.name}" ?`)) return;
    try {
      await apiService.deleteChantier(c.id);
      setChantiers((prev) => prev.filter((x) => x.id !== c.id));
      showSuccess('Chantier supprimé', c.name);
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Suppression impossible');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Accès réservé</h2>
          <p className="text-gray-600 mt-1">Seuls les administrateurs peuvent gérer les chantiers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chantiers</h1>
          <p className="text-gray-600">Création et gestion des chantiers</p>
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
      ) : chantierList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <MapPinned className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chantier</h3>
          <p className="text-gray-500 mb-4">Ajoutez votre premier chantier</p>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Ajouter un chantier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chantierList.map((c) => (
            <div key={c.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPinned className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-500">{c.id}</p>
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
                {c.clientCompanyName && (
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>{c.clientCompanyName}</span>
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
                {editing ? 'Modifier le chantier' : 'Ajouter un chantier'}
              </h2>
              <button onClick={close} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                ×
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client (optionnel)</label>
                <select
                  value={form.clientId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— Aucun —</option>
                  {clientOptions.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du chantier *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

export default ChantiersList;


