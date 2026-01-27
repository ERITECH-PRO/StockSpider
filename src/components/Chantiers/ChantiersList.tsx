import React, { useEffect, useMemo, useState } from 'react';
import { MapPinned, Plus, Edit, Trash2, Building2, MapPin, Search, ShieldCheck, Info } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredChantiers = useMemo(() => {
    return chantiers
      .filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clientCompanyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [chantiers, searchQuery]);

  const openCreate = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ clientId: null, name: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (c: Chantier) => {
    if (!isAdmin) return;
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
        <div className="card-3s p-10 flex flex-col items-center text-center max-w-2xl mx-auto border-t-4 border-t-3s-red">
          <ShieldCheck className="w-16 h-16 text-3s-red opacity-20 mb-4" />
          <h2 className="text-2xl font-black text-3s-black uppercase tracking-tight">Accès réservé</h2>
          <p className="text-3s-gray-medium mt-2 font-inter">Seuls les administrateurs peuvent gérer le répertoire des chantiers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Répertoire Chantiers</h1>
          <p className="text-3s-gray-medium mt-1">Gérez vos sites d'intervention et leurs affectations clients.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="card-3s px-6 py-3 flex flex-col justify-center border-l-4 border-l-purple-500">
            <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Total Chantiers</span>
            <span className="text-xl font-black text-3s-black">{chantiers.length}</span>
          </div>
          <button
            onClick={openCreate}
            className="btn-3s-primary px-6 py-3 flex items-center gap-2 shadow-3s !bg-purple-600 hover:!bg-purple-700"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Chantier</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-3s p-3 bg-white/80 backdrop-blur-md border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, adresse ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent shadow-sm"></div>
          <p className="text-3s-gray-medium font-bold animate-pulse text-sm">CHARGEMENT DES CHANTIERS...</p>
        </div>
      ) : filteredChantiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <MapPinned className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Aucun site trouvé</h3>
          <p className="text-3s-gray-medium">Ajustez votre recherche ou créez un nouveau chantier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredChantiers.map((c) => (
            <div key={c.id} className="card-3s group hover:scale-[1.02] transform transition-all cursor-default overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-4 flex gap-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 text-purple-600">
                  <MapPinned className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-3s-black truncate leading-tight group-hover:text-purple-600 transition-colors uppercase tracking-tight">{c.name}</h3>
                  <p className="text-[10px] text-3s-gray-medium font-mono mt-1">REF: {c.id.substring(0, 8)}...</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Modifier">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c)} className="p-1.5 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-all" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Site Details */}
              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-3">
                  {c.clientCompanyName ? (
                    <div className="flex items-center gap-3 text-xs text-3s-black font-bold group/link p-2 -mx-2 rounded-lg bg-green-50/50 border border-green-100/50">
                      <div className="p-1.5 bg-white shadow-sm border border-green-200 rounded-md">
                        <Building2 className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <span className="truncate flex-1">{c.clientCompanyName}</span>
                      <Info className="w-3 h-3 text-green-600/40" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs text-3s-gray-medium italic p-2 -mx-2">
                      <div className="p-1.5 bg-gray-50 border border-gray-100 rounded-md opacity-50">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>Aucun client rattaché</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-purple-50/50 rounded-md shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-3s-gray-medium leading-relaxed italic line-clamp-2">
                      {c.address || 'Aucune adresse enregistrée'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="px-5 py-3 bg-purple-50/20 border-t border-purple-50/50 flex justify-between items-center mt-auto">
                <span className="text-[9px] font-black text-purple-400/60 uppercase tracking-tighter italic">Opérationnel</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-3s-black uppercase">Actif</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modernized Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-3s-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform animate-scale-in">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {editing ? <Edit className="w-6 h-6" /> : <MapPinned className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {editing ? 'Modifier Site' : 'Nouveau Chantier'}
                  </h2>
                  <p className="text-white/60 text-xs font-bold">Fichier Opérations StockSpider</p>
                </div>
              </div>
              <button onClick={close} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={submit} className="p-8 space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Affectation Client (optionnel)</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={form.clientId ?? ''}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value || null })}
                      className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm text-sm font-bold"
                    >
                      <option value="">— Aucun client sélectionné —</option>
                      {clientOptions.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Nom du Chantier *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm font-bold"
                    placeholder="Ex: Chantier Central Park, Extension Usine..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Localisation / Adresse</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm resize-none"
                    placeholder="Adresse précise du site"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button type="button" onClick={close} className="btn-3s-secondary px-8 shadow-sm">
                  Annuler
                </button>
                <button type="submit" className="btn-3s-primary px-8 shadow-3s !bg-purple-600 hover:!bg-purple-700">
                  {editing ? 'Mettre à jour' : 'Enregistrer le chantier'}
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


